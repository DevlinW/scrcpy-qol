const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const configService = require('../services/configService');
const adbService = require('../services/adbService');

// GET /api/settings - Read current settings & check binary status
router.get('/', async (req, res) => {
  try {
    const settings = configService.getSettings();
    const status = await adbService.checkStatus();
    res.json({
      success: true,
      settings,
      status,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/settings - Save custom paths
router.post('/', async (req, res) => {
  try {
    const { customAdbPath, customScrcpyPath } = req.body;
    const updated = configService.updateSettings({
      ...(customAdbPath !== undefined ? { customAdbPath: customAdbPath.trim() } : {}),
      ...(customScrcpyPath !== undefined ? { customScrcpyPath: customScrcpyPath.trim() } : {}),
    });

    const status = await adbService.checkStatus();
    res.json({
      success: true,
      settings: updated,
      status,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/settings/test-path - Test if a directory contains adb or scrcpy
router.post('/test-path', (req, res) => {
  const { folderPath } = req.body;
  if (!folderPath) {
    return res.status(400).json({ success: false, error: 'Path is required.' });
  }

  const cleanPath = folderPath.trim();
  if (!fs.existsSync(cleanPath)) {
    return res.json({ success: false, error: 'Folder does not exist.' });
  }

  const stat = fs.statSync(cleanPath);
  const isDir = stat.isDirectory();
  const dir = isDir ? cleanPath : path.dirname(cleanPath);

  const adbExe = path.join(dir, 'adb.exe');
  const scrcpyExe = path.join(dir, 'scrcpy.exe');

  res.json({
    success: true,
    hasAdb: fs.existsSync(adbExe) || (!isDir && cleanPath.endsWith('adb.exe')),
    hasScrcpy: fs.existsSync(scrcpyExe) || (!isDir && cleanPath.endsWith('scrcpy.exe')),
    resolvedDirectory: dir,
  });
});

module.exports = router;
