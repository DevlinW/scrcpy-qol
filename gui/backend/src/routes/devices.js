const express = require('express');
const router = express.Router();
const fs = require('fs');
const adbService = require('../services/adbService');
const configService = require('../services/configService');
const security = require('../utils/security');

// GET /api/devices - Get both live active devices and cached remembered devices
router.get('/', async (req, res) => {
  try {
    const listRes = await adbService.listDevices();
    const activeDevices = listRes.devices || [];
    const remembered = configService.getRememberedDevices();

    // Map saved nicknames from rememberedDevices onto activeDevices
    const activeWithNicknames = activeDevices.map((dev) => {
      const match = remembered.find((r) => r.serial === dev.serial || (dev.ip && r.ip === dev.ip && r.port === dev.port));
      return {
        ...dev,
        nickname: match ? match.nickname : undefined,
      };
    });

    // Mark remembered devices as online or offline
    const activeSerials = new Set(activeDevices.map((d) => d.serial));
    const processedRemembered = remembered.map((rem) => ({
      ...rem,
      isOnline: activeSerials.has(rem.serial) || activeSerials.has(`${rem.ip}:${rem.port}`),
    }));

    // Auto-remember any active devices that aren't cached yet (ignore mDNS pseudodevices)
    activeDevices.forEach((dev) => {
      if (dev.isMdns) return;
      const isCached = remembered.some((r) => r.serial === dev.serial || (dev.ip && r.ip === dev.ip && r.port === dev.port));
      if (!isCached && dev.state === 'device') {
        configService.saveRememberedDevice({
          serial: dev.serial,
          ip: dev.ip,
          port: dev.port,
          model: dev.model,
          type: dev.type,
          nickname: `${dev.model} (${dev.serial})`,
        });
      }
    });

    res.json({
      success: true,
      active: activeWithNicknames,
      remembered: processedRemembered,
      adbError: listRes.error,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/devices/:serial/packages - Scan installed 3rd-party packages on device
router.get('/:serial/packages', async (req, res) => {
  try {
    const { serial } = req.params;
    if (!security.isValidSerial(serial)) {
      return res.status(400).json({ success: false, error: 'Invalid device serial.' });
    }
    const result = await adbService.getInstalledPackages(serial);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/devices/:serial/icons/:packageName - Extract & stream app icon
router.get('/:serial/icons/:packageName', async (req, res) => {
  try {
    const { serial, packageName } = req.params;
    const { apkPath } = req.query;

    const safePkg = packageName.replace(/\.png$/i, '');
    if (!security.isValidSerial(serial) || !security.isValidPackageName(safePkg)) {
      return res.status(400).json({ error: 'Invalid serial or package name' });
    }

    // 1. Check disk cache first
    const cachedPath = configService.getCachedIconPath(safePkg);
    if (cachedPath && fs.existsSync(cachedPath)) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.sendFile(cachedPath);
    }

    // 2. If not in cache and apkPath provided, extract directly
    let targetApk = apkPath;
    if (!targetApk) {
      // Look up apk path
      const scan = await adbService.getInstalledPackages(serial);
      const match = (scan.packages || []).find((p) => p.packageName === safePkg);
      if (match) targetApk = match.apkPath;
    }

    if (!targetApk) {
      return res.status(404).json({ error: 'APK path not found for package' });
    }

    const iconPath = await adbService.extractAppIcon(serial, targetApk, safePkg);
    if (iconPath && fs.existsSync(iconPath)) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.sendFile(iconPath);
    }

    return res.status(404).json({ error: 'Icon could not be extracted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/devices/pair - adb pair IP:PORT CODE
router.post('/pair', async (req, res) => {
  const { ip, port, code } = req.body;
  if (!ip || !port || !code) {
    return res.status(400).json({ success: false, error: 'IP, pairing port, and 6-digit code are required.' });
  }
  const result = await adbService.pairDevice(ip, port, code);
  res.json(result);
});

// POST /api/devices/connect - adb connect IP:PORT
router.post('/connect', async (req, res) => {
  const { ip, port, nickname } = req.body;
  if (!ip) {
    return res.status(400).json({ success: false, error: 'IP address is required.' });
  }
  const result = await adbService.connectDevice(ip, port || 5555, nickname);
  res.json(result);
});

// POST /api/devices/disconnect - adb disconnect SERIAL
router.post('/disconnect', async (req, res) => {
  const { serial } = req.body;
  if (!serial) {
    return res.status(400).json({ success: false, error: 'Device serial/IP is required.' });
  }
  const result = await adbService.disconnectDevice(serial);
  res.json(result);
});

// POST /api/devices/ping - Ping diagnostic test
router.post('/ping', async (req, res) => {
  const { serial } = req.body;
  if (!serial) {
    return res.status(400).json({ success: false, error: 'Device serial is required.' });
  }
  const result = await adbService.pingDevice(serial);
  res.json(result);
});

// POST /api/devices/remembered - Update an existing remembered device (e.g. port or nickname)
router.post('/remembered', (req, res) => {
  const { id, updates } = req.body;
  if (!id || !updates) {
    return res.status(400).json({ success: false, error: 'id and updates are required.' });
  }
  const updated = configService.updateRememberedDevice(id, updates);
  res.json({ success: !!updated, device: updated });
});

// DELETE /api/devices/remembered/:id - Forget a device
router.delete('/remembered/:id', (req, res) => {
  const { id } = req.params;
  const result = configService.removeRememberedDevice(id);
  res.json(result);
});

module.exports = router;
