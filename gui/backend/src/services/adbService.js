const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const configService = require('./configService');
const security = require('../utils/security');

const binaryCache = {};

function findBinary(binaryName) {
  if (binaryCache[binaryName] && fs.existsSync(binaryCache[binaryName])) {
    return binaryCache[binaryName];
  }

  const isWin = process.platform === 'win32';
  const binExe = isWin ? `${binaryName}.exe` : binaryName;

  // 1. Check custom settings path
  const settings = configService.getSettings();
  const customKey = binaryName === 'adb' ? 'customAdbPath' : 'customScrcpyPath';
  if (settings[customKey] && fs.existsSync(settings[customKey])) {
    const stat = fs.statSync(settings[customKey]);
    if (stat.isDirectory()) {
      const candidate = path.join(settings[customKey], binExe);
      if (fs.existsSync(candidate)) {
        binaryCache[binaryName] = candidate;
        return candidate;
      }
    } else {
      binaryCache[binaryName] = settings[customKey];
      return settings[customKey];
    }
  }

  // 2. Check explicit system drive folders and PATH directories
  const pathEntries = (process.env.PATH || '').split(path.delimiter).filter(Boolean);

  const candidateFolders = [
    'C:\\platform-tools',
    'C:\\scrcpy-win64-v4.1',
    'C:\\scrcpy-win64',
    'C:\\scrcpy',
    'D:\\platform-tools',
    'D:\\scrcpy-win64-v4.1',
    'D:\\scrcpy-win64',
    'D:\\scrcpy',
    path.join(__dirname, '..', '..', '..', '..'), // C:\Project\
    path.join(__dirname, '..', '..', '..'), // C:\Project\scrcpy-qol\
    path.join(__dirname, '..', '..', '..', 'bin'),
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools') : null,
    process.env.ANDROID_HOME ? path.join(process.env.ANDROID_HOME, 'platform-tools') : null,
    ...pathEntries,
  ].filter(Boolean);

  for (const folder of candidateFolders) {
    try {
      const candidate = path.join(folder, binExe);
      if (fs.existsSync(candidate)) {
        binaryCache[binaryName] = candidate;
        return candidate;
      }
    } catch (_) {}
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
        stdout: (stdout || '').toString().trim(),
        stderr: (stderr || '').toString().trim(),
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

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const parts = line.split(/\s+/);
    if (parts.length >= 2) {
      const serial = parts[0];
      const state = parts[1];

      const modelMatch = line.match(/model:([^\s]+)/);
      const productMatch = line.match(/product:([^\s]+)/);
      const rawModel = modelMatch ? modelMatch[1].replace(/_/g, ' ') : (productMatch ? productMatch[1] : 'Android Device');

      const isMdnsWifi = serial.includes('._adb-tls-connect') || serial.includes('_adb.');
      const isDirectWifi = serial.includes(':');
      const isWifi = isDirectWifi || isMdnsWifi;

      let ip = '';
      let port = 5555;
      if (isDirectWifi) {
        const [ipPart, portPart] = serial.split(':');
        ip = ipPart;
        port = parseInt(portPart, 10) || 5555;
      }

      devices.push({
        serial,
        state,
        model: rawModel,
        type: isWifi ? 'wifi' : 'usb',
        isMdns: isMdnsWifi,
        ip,
        port,
        battery: null,
      });
    }
  }

  await Promise.all(
    devices.map(async (dev) => {
      if (dev.state === 'device') {
        dev.battery = await getDeviceBattery(dev.serial);
      }
    })
  );

  const hasDirectWifi = devices.some((d) => d.type === 'wifi' && !d.isMdns);
  const filteredDevices = hasDirectWifi
    ? devices.filter((d) => !d.isMdns)
    : devices;

  return { success: true, devices: filteredDevices };
}

async function getDeviceBattery(serial) {
  const adbPath = findBinary('adb');
  const res = await runCommand(adbPath, ['-s', serial, 'shell', 'dumpsys', 'battery']);
  if (!res.success) return null;

  const levelMatch = res.stdout.match(/level:\s*(\d+)/i);
  const statusMatch = res.stdout.match(/status:\s*(\d+)/i);
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

  const combined = `${res.stdout} ${res.stderr} ${res.error || ''}`.trim();
  const isSuccess = res.success && /Successfully paired/i.test(combined);

  return {
    success: isSuccess,
    output: combined,
    error: isSuccess ? null : (combined || 'Failed to pair device. Ensure the pairing code dialog is open on your phone.'),
  };
}

async function connectDevice(ip, port, nickname) {
  const adbPath = findBinary('adb');
  const target = `${ip}:${port || 5555}`;
  const res = await runCommand(adbPath, ['connect', target]);

  const combined = `${res.stdout} ${res.stderr} ${res.error || ''}`.trim();
  const isSuccess = res.success && (/connected to/i.test(combined) && !/cannot connect|failed/i.test(combined));

  if (isSuccess) {
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
    output: combined,
    serial: target,
    error: isSuccess ? null : (combined || 'Failed to connect. Make sure Wireless Debugging is on and port is correct.'),
  };
}

async function disconnectDevice(serial) {
  const adbPath = findBinary('adb');
  const res = await runCommand(adbPath, ['disconnect', serial]);
  return {
    success: res.success,
    output: `${res.stdout} ${res.stderr}`.trim(),
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

/**
 * Beautifies package name for user-facing display (e.g. com.spotify.music -> Spotify Music)
 */
function beautifyPackageName(pkg) {
  if (!pkg) return 'Unknown App';
  const parts = pkg.split('.').filter(Boolean);
  if (parts.length === 1) return parts[0];

  const meaningful = parts.filter(
    (p) => !['com', 'org', 'net', 'io', 'android', 'google', 'app', 'mobile', 'games'].includes(p.toLowerCase())
  );

  if (meaningful.length > 0) {
    return meaningful
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }
  return parts[parts.length - 1].charAt(0).toUpperCase() + parts[parts.length - 1].slice(1);
}

/**
 * Scans installed 3rd-party packages on connected device
 */
async function getInstalledPackages(serial) {
  if (!security.isValidSerial(serial)) {
    return { success: false, error: 'Invalid device serial.', packages: [] };
  }

  const adbPath = findBinary('adb');
  const res = await runCommand(adbPath, ['-s', serial, 'shell', 'pm', 'list', 'packages', '-3', '-f']);

  if (!res.success) {
    return { success: false, error: res.stderr || res.error, packages: [] };
  }

  const lines = res.stdout.split('\n').map((l) => l.trim()).filter(Boolean);
  const packages = [];

  for (const line of lines) {
    // Format: package:/data/app/~~.../base.apk=com.example.app
    const match = line.match(/^package:(.+?)=([a-zA-Z0-9_.]+)$/);
    if (match) {
      const apkPath = match[1];
      const packageName = match[2];

      if (security.isValidPackageName(packageName)) {
        const cachedIconPath = configService.getCachedIconPath(packageName);
        const hasCachedIcon = !!(cachedIconPath && fs.existsSync(cachedIconPath));

        packages.push({
          packageName,
          displayName: beautifyPackageName(packageName),
          apkPath,
          hasCachedIcon,
        });
      }
    }
  }

  // Sort alphabetically by displayName
  packages.sort((a, b) => a.displayName.localeCompare(b.displayName));

  return { success: true, packages };
}

/**
 * Extracts and caches launcher icon directly from APK on device
 */
async function extractAppIcon(serial, apkPath, packageName) {
  if (!security.isValidSerial(serial) || !security.isValidPackageName(packageName) || !apkPath) {
    return null;
  }

  // 1. Check if already cached
  const cachedPath = configService.getCachedIconPath(packageName);
  if (cachedPath && fs.existsSync(cachedPath)) {
    return cachedPath;
  }

  const adbPath = findBinary('adb');

  // 2. Query zip listing for launcher PNGs
  const listRes = await runCommand(adbPath, ['-s', serial, 'shell', 'unzip', '-l', apkPath]);
  if (!listRes.success || !listRes.stdout) {
    return null;
  }

  const lines = listRes.stdout.split('\n').map((l) => l.trim());
  const pngEntries = [];

  for (const line of lines) {
    const match = line.match(/\s+(\d+)\s+[\d-]+\s+[\d:]+\s+(.+)$/);
    if (match) {
      const entryName = match[2];
      if (
        entryName.endsWith('.png') &&
        (entryName.includes('ic_launcher') || entryName.includes('app_icon') || entryName.includes('icon'))
      ) {
        pngEntries.push(entryName);
      }
    }
  }

  if (pngEntries.length === 0) {
    return null;
  }

  // Rank PNG entries: xxxhdpi > xxhdpi > xhdpi > hdpi > mdpi
  const priority = ['xxxhdpi', 'xxhdpi', 'xhdpi', 'hdpi', 'mdpi'];
  let bestEntry = pngEntries[0];
  for (const density of priority) {
    const found = pngEntries.find((e) => e.includes(density) && (e.includes('ic_launcher') || e.includes('app_icon')));
    if (found) {
      bestEntry = found;
      break;
    }
  }

  // 3. Extract binary PNG using exec-out
  return new Promise((resolve) => {
    execFile(
      adbPath,
      ['-s', serial, 'exec-out', 'unzip', '-p', apkPath, bestEntry],
      { encoding: 'buffer', maxBuffer: 5 * 1024 * 1024, timeout: 10000 },
      (err, stdout) => {
        if (!err && stdout && security.validatePngBuffer(stdout)) {
          try {
            const savedPath = configService.saveCachedIcon(packageName, stdout);
            return resolve(savedPath);
          } catch (_) {
            return resolve(null);
          }
        }
        resolve(null);
      }
    );
  });
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
  beautifyPackageName,
  getInstalledPackages,
  extractAppIcon,
};
