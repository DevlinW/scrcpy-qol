const express = require('express');
const router = express.Router();
const scrcpyService = require('../services/scrcpyService');
const security = require('../utils/security');

// Global WebSocket broadcast hook passed from server.js
let broadcastFn = () => {};
function setBroadcaster(fn) {
  broadcastFn = fn;
}

// POST /api/scrcpy/launch - Spawn scrcpy for a device
router.post('/launch', (req, res) => {
  try {
    const { serial, bitRate, turnScreenOff, stayAwake, fullscreen, packageName, customFlags } = req.body;

    if (!serial || !security.isValidSerial(serial)) {
      return res.status(400).json({ success: false, error: 'A valid device serial is required.' });
    }

    if (packageName && !security.isValidPackageName(packageName)) {
      return res.status(400).json({ success: false, error: 'Invalid Android package name format.' });
    }

    const options = {
      bitRate: security.sanitizeBitrate(bitRate, '8M'),
      turnScreenOff: !!turnScreenOff,
      stayAwake: stayAwake !== undefined ? !!stayAwake : true,
      fullscreen: !!fullscreen,
      packageName,
      customFlags,
    };

    const sessionRes = scrcpyService.launchSession(serial, options, {
      onLog: (logEntry) => {
        broadcastFn({
          type: 'scrcpy:log',
          serial,
          log: logEntry,
        });
      },
      onExit: ({ code, signal, serial: exitSerial }) => {
        broadcastFn({
          type: 'scrcpy:status',
          serial: exitSerial,
          status: 'stopped',
          exitCode: code,
          signal,
        });
      },
    });

    broadcastFn({
      type: 'scrcpy:status',
      serial,
      status: 'running',
      pid: sessionRes.pid,
      options,
    });

    res.json({
      success: true,
      serial,
      pid: sessionRes.pid,
      args: sessionRes.args,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/scrcpy/stop - Stop an active scrcpy session
router.post('/stop', (req, res) => {
  try {
    const { serial } = req.body;
    if (!serial || !security.isValidSerial(serial)) {
      return res.status(400).json({ success: false, error: 'A valid device serial is required.' });
    }

    const result = scrcpyService.stopSession(serial);

    if (result.success) {
      broadcastFn({
        type: 'scrcpy:status',
        serial,
        status: 'stopped',
        exitCode: 0,
      });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/scrcpy/sessions - Get all currently running scrcpy sessions
router.get('/sessions', (req, res) => {
  try {
    const sessions = scrcpyService.getActiveSessions();
    res.json({ success: true, sessions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/scrcpy/logs/:serial - Retrieve recent stdout/stderr history
router.get('/logs/:serial', (req, res) => {
  try {
    const { serial } = req.params;
    const logs = scrcpyService.getSessionLogs(serial);
    res.json({ success: true, serial, logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = {
  router,
  setBroadcaster,
};
