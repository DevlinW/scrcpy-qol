const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const configService = require('./configService');

function findBinary(binaryName) {
  const isWin = process.platform === 'win32';
  const binExe = isWin ? `${binaryName}.exe` : binaryName;

  // 1. Check custom settings path
  const settings = configService.getSettings();
  const customKey = binaryName === 'adb' ? 'customAdbPath' : 'customScrcpyPath';
  if (settings[customKey] && fs.existsSync(settings[customKey])) {
    const stat = fs.statSync(settings[customKey]);
    if (stat.isDirectory()) {
      const candidate = path.join(settings[customKey], binExe);
      if (fs.existsSync(candidate)) return candidate;
    } else {
      return settings[customKey];
    }
  }

  // 2. Check local repo paths (e.g. Project/scrcpy-qol or scrcpy release folders)
  const candidateFolders = [
    path.join(__dirname, '..', '..', '..', '..'), // C:\Project\
    path.join(__dirname, '..', '..', '..'), // C:\Project\scrcpy-qol\
    path.join(__dirname, '..', '..', '..', 'bin'),
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools') : null,
    process.env.ANDROID_HOME ? path.join(process.env.ANDROID_HOME, 'platform-tools') : null,
  ].filter(Boolean);

  for (const folder of candidateFolders) {
    const candidate = path.join(folder, binExe);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // 3. Fallback to system command name
  return binExe;
}

function runCommand(binPath, args = [], options = {}) {
  return new Promise((resolve) => {
    execFile(binPath, args, { timeout: 15000, ...options }, (error, stdout, stderr) => {
      resolve({
        success: !error,
        code: error ? error.code : 0,
        stdout: (stdout || '').trim(),
        stderr: (stderr || '').trim(),
        error: error ? error.message : null,
      });
    });
  });
}

async function checkStatus() {
  const adbPath = findBinary('adb');
  const scrcpyPath = findBinary('scrcpy');

  const adbCheck = await runCommand(adbPath, ['version']);
  const scrcpyCheck = await runCommand(scrcpyPath, ['--version']);

  return {
    adb: {
      found: adbCheck.success,
      path: adbPath,
      version: adbCheck.success ? adbCheck.stdout.split('\n')[0] : null,
      error: !adbCheck.success ? (adbCheck.stderr || adbCheck.error) : null,
    },
    scrcpy: {
      found: scrcpyCheck.success,
      path: scrcpyPath,
      version: scrcpyCheck.success ? scrcpyCheck.stdout.split('\n')[0] : null,
      error: !scrcpyCheck.success ? (scrcpyCheck.stderr || scrcpyCheck.error) : null,
    },
  };
}

async function listDevices() {
  const adbPath = findBinary('adb');
  const res = await runCommand(adbPath, ['devices', '-l']);

  if (!res.success) {
    return { success: false, error: res.stderr || res.error, devices: [] };
  }

  const lines = res.stdout.split('\n').map((l) => l.trim()).filter(Boolean);
  const devices = [];

  // Line 0 is usually "List of devices attached"
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Pattern: serial state model:XXX device:YYY
    const parts = line.split(/\s+/);
    if (parts.length >= 2) {
      const serial = parts[0];
      const state = parts[1]; // 'device', 'offline', 'unauthorized'

      // Extract model:XXX if present
      const modelMatch = line.match(/model:([^\s]+)/);
      const productMatch = line.match(/product:([^\s]+)/);
      const rawModel = modelMatch ? modelMatch[1].replace(/_/g, ' ') : (productMatch ? productMatch[1] : 'Android Device');

      const isWifi = serial.includes(':'); // IP:PORT format
      let ip = '';
      let port = 5555;
      if (isWifi) {
        const [ipPart, portPart] = serial.split(':');
        ip = ipPart;
        port = parseInt(portPart, 10) || 5555;
      }

      devices.push({
        serial,
        state,
        model: rawModel,
        type: isWifi ? 'wifi' : 'usb',
        ip,
        port,
        battery: null, // Will fetch concurrently
      });
    }
  }

  // Fetch battery levels concurrently for devices in 'device' state
  await Promise.all(
    devices.map(async (dev) => {
      if (dev.state === 'device') {
        dev.battery = await getDeviceBattery(dev.serial);
      }
    })
  );

  return { success: true, devices };
}

async function getDeviceBattery(serial) {
  const adbPath = findBinary('adb');
  const res = await runCommand(adbPath, ['-s', serial, 'shell', 'dumpsys', 'battery']);
  if (!res.success) return null;

  const levelMatch = res.stdout.match(/level:\s*(\d+)/i);
  const statusMatch = res.stdout.match(/status:\s*(\d+)/i); // 2: charging
  if (levelMatch) {
    return {
      level: parseInt(levelMatch[1], 10),
      charging: statusMatch ? statusMatch[1] === '2' : false,
    };
  }
  return null;
}

async function pairDevice(ip, port, code) {
  const adbPath = findBinary('adb');
  const target = `${ip}:${port}`;
  const res = await runCommand(adbPath, ['pair', target, code]);

  const output = `${res.stdout} ${res.stderr}`.trim();
  const isSuccess = res.success && /Successfully paired/i.test(output);

  return {
    success: isSuccess,
    output,
    error: isSuccess ? null : (output || 'Failed to pair device. Please check pairing code and port.'),
  };
}

async function connectDevice(ip, port, nickname) {
  const adbPath = findBinary('adb');
  const target = `${ip}:${port || 5555}`;
  const res = await runCommand(adbPath, ['connect', target]);

  const output = `${res.stdout} ${res.stderr}`.trim();
  const isSuccess = res.success && (/connected to/i.test(output) && !/cannot connect|failed/i.test(output));

  if (isSuccess) {
    // Save to remembered devices
    configService.saveRememberedDevice({
      ip,
      port: parseInt(port, 10) || 5555,
      serial: target,
      nickname: nickname || `Wi-Fi Device (${target})`,
      type: 'wifi',
    });
  }

  return {
    success: isSuccess,
    output,
    serial: target,
    error: isSuccess ? null : (output || 'Failed to connect. Make sure Wireless Debugging is on and port is correct.'),
  };
}

async function disconnectDevice(serial) {
  const adbPath = findBinary('adb');
  const res = await runCommand(adbPath, ['disconnect', serial]);
  const output = `${res.stdout} ${res.stderr}`.trim();
  return {
    success: res.success,
    output,
  };
}

async function pingDevice(serial) {
  const adbPath = findBinary('adb');
  const startTime = Date.now();
  const res = await runCommand(adbPath, ['-s', serial, 'shell', 'echo', 'pong']);
  const latencyMs = Date.now() - startTime;

  const isPong = res.success && res.stdout.includes('pong');
  return {
    success: isPong,
    latencyMs,
    error: isPong ? null : (res.stderr || 'No response from device'),
  };
}

module.exports = {
  findBinary,
  checkStatus,
  listDevices,
  getDeviceBattery,
  pairDevice,
  connectDevice,
  disconnectDevice,
  pingDevice,
};
