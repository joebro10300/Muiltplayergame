const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), rooms: Object.keys(rooms).length });
});

// Multiplayer Room State Management
const rooms = {};

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // Create new multiplayer room
  socket.on('createRoom', ({ playerName, characterId, stageId }) => {
    let roomCode = generateRoomCode();
    while (rooms[roomCode]) {
      roomCode = generateRoomCode();
    }

    rooms[roomCode] = {
      code: roomCode,
      hostId: socket.id,
      stageId: stageId || 'battlefield',
      gameState: 'lobby', // lobby, playing, finished
      players: {
        [socket.id]: {
          id: socket.id,
          slot: 0,
          name: playerName || 'Player 1',
          characterId: characterId || 'brawler',
          ready: false,
          stocks: 3,
          damage: 0,
          isHost: true
        }
      }
    };

    socket.join(roomCode);
    socket.emit('roomCreated', { roomCode, room: rooms[roomCode] });
    console.log(`[Room ${roomCode}] Created by ${socket.id}`);
  });

  // Join existing room
  socket.on('joinRoom', ({ roomCode, playerName, characterId }) => {
    const code = (roomCode || '').toUpperCase().trim();
    const room = rooms[code];

    if (!room) {
      socket.emit('errorMsg', 'Room not found. Please check the code.');
      return;
    }

    const playerKeys = Object.keys(room.players);
    if (playerKeys.length >= 2) {
      // Allow spectator or reject
      socket.emit('errorMsg', 'Room is full (max 2 players for 1v1).');
      return;
    }

    const slot = playerKeys.length;
    room.players[socket.id] = {
      id: socket.id,
      slot: slot,
      name: playerName || `Player ${slot + 1}`,
      characterId: characterId || 'space_ace',
      ready: false,
      stocks: 3,
      damage: 0,
      isHost: false
    };

    socket.join(code);
    socket.emit('roomJoined', { roomCode: code, room });
    socket.to(code).emit('playerJoined', { player: room.players[socket.id], room });
    console.log(`[Room ${code}] Player ${socket.id} joined.`);
  });

  // Update player setup (character / stage)
  socket.on('updatePlayer', ({ roomCode, characterId, stageId, ready }) => {
    const room = rooms[roomCode];
    if (!room || !room.players[socket.id]) return;

    const p = room.players[socket.id];
    if (characterId) p.characterId = characterId;
    if (ready !== undefined) p.ready = ready;
    if (stageId && p.isHost) room.stageId = stageId;

    io.to(roomCode).emit('roomUpdate', { room });
  });

  // Start match
  socket.on('startMatch', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || room.hostId !== socket.id) return;

    room.gameState = 'playing';
    io.to(roomCode).emit('matchStarted', {
      stageId: room.stageId,
      players: room.players,
      seed: Math.floor(Math.random() * 1000000)
    });
    console.log(`[Room ${roomCode}] Match started!`);
  });

  // Client relay input packet (60Hz)
  socket.on('playerInput', ({ roomCode, frame, input }) => {
    socket.to(roomCode).emit('remoteInput', {
      playerId: socket.id,
      frame,
      input
    });
  });

  // Host authoritative game state snapshot (reconciliation)
  socket.on('hostSync', ({ roomCode, frame, state }) => {
    socket.to(roomCode).emit('serverSync', {
      frame,
      state
    });
  });

  // Match end / KO broadcast
  socket.on('playerKO', ({ roomCode, victimId, stocksRemaining }) => {
    const room = rooms[roomCode];
    if (!room) return;
    io.to(roomCode).emit('playerKOBroadcast', { victimId, stocksRemaining });
  });

  socket.on('matchEnded', ({ roomCode, winnerId }) => {
    const room = rooms[roomCode];
    if (!room) return;
    room.gameState = 'finished';
    io.to(roomCode).emit('matchFinished', { winnerId });
  });

  function handlePlayerLeave(socketId) {
    for (const code in rooms) {
      const room = rooms[code];
      if (room.players[socketId]) {
        delete room.players[socketId];
        io.to(code).emit('playerLeft', { playerId: socketId });

        // If host left, assign new host or delete room if empty
        const remaining = Object.keys(room.players);
        if (remaining.length === 0) {
          delete rooms[code];
          console.log(`[Room ${code}] Destroyed (empty).`);
        } else {
          room.hostId = remaining[0];
          room.players[remaining[0]].isHost = true;
          io.to(code).emit('roomUpdate', { room });
        }
        break;
      }
    }
  }

  // Explicit leave room handler
  socket.on('leaveRoom', () => {
    console.log(`[Socket] Leave room requested: ${socket.id}`);
    handlePlayerLeave(socket.id);
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
    handlePlayerLeave(socket.id);
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`\n⚠️  Port ${PORT} is ALREADY IN USE by another running instance.`);
    console.log(`👉 The server is ALREADY active on port ${PORT}! You can open http://localhost:${PORT} in Preview.`);
    console.log(`👉 If you need to stop it or restart fresh, run: npm run stop\n`);
    process.exit(0);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  try {
    fs.writeFileSync(path.join(__dirname, 'server.pid'), String(process.pid));
  } catch (e) {}

  console.log(`===============================================`);
  console.log(`🚀 Smash Bros Clone Server running on port ${PORT}`);
  console.log(`🎮 Local & Online multiplayer ready!`);
  console.log(`===============================================`);
});

process.on('exit', () => {
  try {
    const pidFile = path.join(__dirname, 'server.pid');
    if (fs.existsSync(pidFile) && fs.readFileSync(pidFile, 'utf8') === String(process.pid)) {
      fs.unlinkSync(pidFile);
    }
  } catch (e) {}
});
