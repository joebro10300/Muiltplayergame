const fs = require('fs');
const path = require('path');

const pidFile = path.join(__dirname, 'server.pid');

if (fs.existsSync(pidFile)) {
  const pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10);
  if (!isNaN(pid)) {
    try {
      process.kill(pid, 'SIGTERM');
      console.log(`✅ Successfully stopped game server (PID ${pid}). Port 3000 is now free.`);
    } catch (e) {
      console.log(`ℹ️ Process PID ${pid} was not running.`);
    }
  }
  try {
    fs.unlinkSync(pidFile);
  } catch (e) {}
} else {
  console.log('ℹ️ No active server.pid found. Port 3000 should already be free.');
}
