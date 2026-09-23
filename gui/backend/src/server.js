const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');

const devicesRouter = require('./routes/devices');
const settingsRouter = require('./routes/settings');
const adbService = require('./services/adbService');

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/devices', devicesRouter);
app.use('/api/settings', settingsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create HTTP server
const server = http.createServer(app);

// Attach WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  // Send immediate status on connection
  adbService.checkStatus().then((status) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: 'system:status', status }));
    }
  });

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg.toString());
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (_) {}
  });
});

function broadcast(payload) {
  const message = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // OPEN
      client.send(message);
    }
  });
}

// Device Heartbeat: Poll every 3 seconds and broadcast
let lastDeviceHash = '';
setInterval(async () => {
  if (wss.clients.size === 0) return; // Skip if no clients are listening

  try {
    const res = await adbService.listDevices();
    const hash = JSON.stringify(res.devices.map((d) => `${d.serial}:${d.state}:${d.battery ? d.battery.level : ''}`));
    if (hash !== lastDeviceHash) {
      lastDeviceHash = hash;
      broadcast({
        type: 'device:heartbeat',
        devices: res.devices,
        error: res.error,
      });
    }
  } catch (err) {
    // Ignore heartbeat errors
  }
}, 3000);

server.listen(PORT, () => {
  console.log(`[scrcpy-qol-backend] Server listening on http://localhost:${PORT}`);
  console.log(`[scrcpy-qol-backend] WebSocket server active`);
});
