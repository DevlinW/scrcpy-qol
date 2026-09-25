const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');

const devicesRouter = require('./routes/devices');
const settingsRouter = require('./routes/settings');
const libraryRouter = require('./routes/library');
const metadataRouter = require('./routes/metadata');
const { router: scrcpyRouter, setBroadcaster } = require('./routes/scrcpy');
const adbService = require('./services/adbService');
const scrcpyService = require('./services/scrcpyService');

const app = express();
const PORT = process.env.PORT || 5050;

// Security: Restrict CORS to local dashboard origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5050',
  'http://127.0.0.1:5050',
];
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev local environment
      }
    },
  })
);

app.use(express.json());

// API Routes
app.use('/api/devices', devicesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/library', libraryRouter);
app.use('/api/metadata', metadataRouter);
app.use('/api/scrcpy', scrcpyRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create HTTP server
const server = http.createServer(app);

// Attach WebSocket server
const wss = new WebSocketServer({ server });

function broadcast(payload) {
  const message = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      // OPEN
      client.send(message);
    }
  });
}

// Pass broadcast function to scrcpy route
setBroadcaster(broadcast);

wss.on('connection', (ws) => {
  // Send immediate system status and active sessions on connection
  adbService.checkStatus().then((status) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: 'system:status', status }));
      ws.send(
        JSON.stringify({
          type: 'scrcpy:sessions',
          sessions: scrcpyService.getActiveSessions(),
        })
      );
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

// Device Heartbeat: Poll every 3 seconds and broadcast
let lastDeviceHash = '';
setInterval(async () => {
  if (wss.clients.size === 0) return;

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
