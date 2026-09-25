const path = require('path');

/**
 * Validates standard Android package names (e.g. com.example.app, com.riotgames.league.wildrift)
 */
function isValidPackageName(pkg) {
  if (typeof pkg !== 'string') return false;
  const trimmed = pkg.trim();
  if (trimmed.length < 3 || trimmed.length > 256) return false;
  return /^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)+$/.test(trimmed);
}

/**
 * Validates ADB device serials (alphanumeric USB serials or IP:Port format)
 */
function isValidSerial(serial) {
  if (typeof serial !== 'string') return false;
  const trimmed = serial.trim();
  if (trimmed.length < 1 || trimmed.length > 128) return false;
  return /^[a-zA-Z0-9_.:-]+$/.test(trimmed);
}

/**
 * Sanitizes and validates bitrate strings (e.g. "4M", "8M", "16M", "32M", "128K")
 */
function sanitizeBitrate(bitRate, defaultRate = '8M') {
  if (!bitRate || typeof bitRate !== 'string') return defaultRate;
  const cleaned = bitRate.trim().toUpperCase();
  if (/^\d{1,4}[MK]?$/.test(cleaned)) {
    return cleaned.endsWith('M') || cleaned.endsWith('K') ? cleaned : `${cleaned}M`;
  }
  return defaultRate;
}

/**
 * Ensures resolved icon path is safely contained within baseDir to prevent path traversal
 */
function getSafeIconPath(baseDir, packageName) {
  const safeName = path.basename(packageName).replace(/[^a-zA-Z0-9_.-]/g, '');
  const resolved = path.resolve(baseDir, `${safeName}.png`);
  if (!resolved.startsWith(path.resolve(baseDir))) {
    throw new Error('Security Error: Path traversal attempt detected');
  }
  return resolved;
}

/**
 * Validates PNG magic bytes (first 8 bytes must be: 89 50 4E 47 0D 0A 1A 0A)
 */
function validatePngBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 8) return false;
  const pngHeader = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < pngHeader.length; i++) {
    if (buffer[i] !== pngHeader[i]) return false;
  }
  return true;
}

module.exports = {
  isValidPackageName,
  isValidSerial,
  sanitizeBitrate,
  getSafeIconPath,
  validatePngBuffer,
};
