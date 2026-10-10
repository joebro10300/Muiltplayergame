// Online Multiplayer Room Sync & Input Relay Client

class NetworkManager {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.roomCode = null;
    this.isHost = false;
    this.myPlayerId = null;
    this.ping = 0;
    this.callbacks = {};
  }

  init(serverUrl) {
    if (this.socket) {
      if (!this.socket.connected) {
        this.socket.connect();
      }
      return;
    }

    if (typeof io === 'undefined') {
      console.warn('Socket.io library not loaded.');
      this.trigger('connectionStatus', { status: 'error', message: 'Socket.io library not loaded' });
      return;
    }

    // Connect to server (support same-origin or localhost:3000 fallback for previews)
    let url = serverUrl;
    if (!url) {
      if (window.location.protocol === 'file:') {
        url = 'http://localhost:3000';
      } else if (window.location.hostname && window.location.port && window.location.port !== '3000') {
        url = `${window.location.protocol}//${window.location.hostname}:3000`;
      }
    }

    this.trigger('connectionStatus', { status: 'connecting', message: 'Connecting to server...' });

    this.socket = url ? io(url, { reconnectionAttempts: 10, reconnectionDelay: 1000 }) : io({ reconnectionAttempts: 10, reconnectionDelay: 1000 });

    this.socket.on('connect', () => {
      this.connected = true;
      this.myPlayerId = this.socket.id;
      console.log('Connected to multiplayer server. ID:', this.myPlayerId);
      this.trigger('connectionStatus', { status: 'connected', id: this.myPlayerId });
      this.trigger('connect', this.myPlayerId);
    });

    this.socket.on('connect_error', (err) => {
      this.connected = false;
      console.warn('Socket connection error:', err);
      this.trigger('connectionStatus', { status: 'error', message: 'Connection to server failed' });
      this.trigger('connect_error', err);
    });

    this.socket.on('disconnect', (reason) => {
      this.connected = false;
      console.log('Socket disconnected:', reason);
      this.trigger('connectionStatus', { status: 'disconnected', reason });
      this.trigger('disconnect', reason);
    });

    this.socket.on('roomCreated', (data) => {
      this.roomCode = data.roomCode;
      this.isHost = true;
      this.trigger('roomCreated', data);
    });

    this.socket.on('roomJoined', (data) => {
      this.roomCode = data.roomCode;
      this.isHost = false;
      this.trigger('roomJoined', data);
    });

    this.socket.on('playerJoined', (data) => {
      this.trigger('playerJoined', data);
    });

    this.socket.on('roomUpdate', (data) => {
      this.trigger('roomUpdate', data);
    });

    this.socket.on('matchStarted', (data) => {
      this.trigger('matchStarted', data);
    });

    this.socket.on('remoteInput', (data) => {
      this.trigger('remoteInput', data);
    });

    this.socket.on('serverSync', (data) => {
      this.trigger('serverSync', data);
    });

    this.socket.on('playerKOBroadcast', (data) => {
      this.trigger('playerKOBroadcast', data);
    });

    this.socket.on('matchFinished', (data) => {
      this.trigger('matchFinished', data);
    });

    this.socket.on('playerLeft', (data) => {
      this.trigger('playerLeft', data);
    });

    this.socket.on('errorMsg', (msg) => {
      alert(msg);
      this.trigger('errorMsg', msg);
    });
  }

  leaveRoom() {
    if (this.socket && this.roomCode) {
      this.socket.emit('leaveRoom', { roomCode: this.roomCode });
    }
    this.roomCode = null;
    this.isHost = false;
    this.trigger('leftRoom');
  }

  on(event, callback) {
    this.callbacks[event] = callback;
  }

  trigger(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event](data);
    }
  }

  createRoom(playerName, characterId, stageId) {
    if (!this.socket) return;
    this.socket.emit('createRoom', { playerName, characterId, stageId });
  }

  joinRoom(roomCode, playerName, characterId) {
    if (!this.socket) return;
    this.socket.emit('joinRoom', { roomCode, playerName, characterId });
  }

  updatePlayer(characterId, stageId, ready) {
    if (!this.socket || !this.roomCode) return;
    this.socket.emit('updatePlayer', { roomCode: this.roomCode, characterId, stageId, ready });
  }

  startMatch() {
    if (!this.socket || !this.roomCode) return;
    this.socket.emit('startMatch', { roomCode: this.roomCode });
  }

  sendInput(frame, input) {
    if (!this.socket || !this.roomCode) return;
    this.socket.emit('playerInput', { roomCode: this.roomCode, frame, input });
  }

  sendSync(frame, state) {
    if (!this.socket || !this.roomCode || !this.isHost) return;
    this.socket.emit('hostSync', { roomCode: this.roomCode, frame, state });
  }

  broadcastKO(victimId, stocksRemaining) {
    if (!this.socket || !this.roomCode) return;
    this.socket.emit('playerKO', { roomCode: this.roomCode, victimId, stocksRemaining });
  }

  broadcastMatchEnd(winnerId) {
    if (!this.socket || !this.roomCode) return;
    this.socket.emit('matchEnded', { roomCode: this.roomCode, winnerId });
  }
}

const network = new NetworkManager();
