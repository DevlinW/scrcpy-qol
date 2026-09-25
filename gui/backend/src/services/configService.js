const fs = require('fs');
const path = require('path');
const security = require('../utils/security');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const ICONS_DIR = path.join(DATA_DIR, 'icons');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

const DEFAULT_STORE = {
  settings: {
    customAdbPath: '',
    customScrcpyPath: '',
  },
  rememberedDevices: [],
  library: [],
  profiles: {},
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify(DEFAULT_STORE, null, 2), 'utf-8');
  }
}

function getStore() {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STORE,
      ...parsed,
      settings: { ...DEFAULT_STORE.settings, ...(parsed.settings || {}) },
      library: Array.isArray(parsed.library) ? parsed.library : [],
      rememberedDevices: Array.isArray(parsed.rememberedDevices) ? parsed.rememberedDevices : [],
    };
  } catch (err) {
    console.error('Error reading store.json, resetting to default:', err.message);
    return { ...DEFAULT_STORE };
  }
}

function saveStore(store) {
  ensureDataDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

function getSettings() {
  const store = getStore();
  return store.settings || DEFAULT_STORE.settings;
}

function updateSettings(newSettings) {
  const store = getStore();
  store.settings = { ...store.settings, ...newSettings };
  saveStore(store);
  return store.settings;
}

function getRememberedDevices() {
  const store = getStore();
  return store.rememberedDevices || [];
}

function saveRememberedDevice(device) {
  const store = getStore();
  if (!store.rememberedDevices) {
    store.rememberedDevices = [];
  }
  const id = device.id || `${device.ip}:${device.port || 5555}`;
  const idx = store.rememberedDevices.findIndex((d) => d.id === id || (d.ip === device.ip && d.port === device.port));

  const record = {
    id,
    nickname: device.nickname || device.model || `Device ${device.ip || device.serial}`,
    model: device.model || 'Android Device',
    ip: device.ip || '',
    port: device.port || 5555,
    serial: device.serial || id,
    type: device.type || 'wifi', // 'wifi' or 'usb'
    lastConnected: new Date().toISOString(),
  };

  if (idx >= 0) {
    store.rememberedDevices[idx] = { ...store.rememberedDevices[idx], ...record };
  } else {
    store.rememberedDevices.push(record);
  }

  saveStore(store);
  return store.rememberedDevices;
}

function removeRememberedDevice(id) {
  const store = getStore();
  const beforeCount = (store.rememberedDevices || []).length;
  store.rememberedDevices = (store.rememberedDevices || []).filter((d) => d.id !== id && d.serial !== id);
  saveStore(store);
  return { success: true, removed: beforeCount > store.rememberedDevices.length };
}

function updateRememberedDevice(id, updates) {
  const store = getStore();
  const idx = (store.rememberedDevices || []).findIndex((d) => d.id === id || d.serial === id);
  if (idx >= 0) {
    store.rememberedDevices[idx] = { ...store.rememberedDevices[idx], ...updates };
    saveStore(store);
    return store.rememberedDevices[idx];
  }
  return null;
}

// --- Quick Launch Curated Library CRUD ---

function getLibrary() {
  const store = getStore();
  return store.library || [];
}

function addLibraryItem(item) {
  if (!item || !item.packageName) {
    throw new Error('Invalid library item: packageName is required.');
  }

  const store = getStore();
  if (!store.library) store.library = [];

  const id = item.id || `app_${item.packageName.replace(/[^a-zA-Z0-9_]/g, '_')}`;
  const existingIdx = store.library.findIndex((app) => app.id === id || app.packageName === item.packageName);

  const entry = {
    id,
    title: item.title || item.displayName || item.packageName,
    packageName: item.packageName,
    description: item.description || '',
    iconUrl: item.iconUrl || `/api/library/icons/${item.packageName}.png`,
    bannerUrl: item.bannerUrl || '',
    source: item.source || 'extracted', // 'extracted' | 'api' | 'manual'
    bitRate: security.sanitizeBitrate(item.bitRate, '8M'),
    turnScreenOff: !!item.turnScreenOff,
    stayAwake: item.stayAwake !== undefined ? !!item.stayAwake : true,
    fullscreen: !!item.fullscreen,
    customFlags: typeof item.customFlags === 'string' ? item.customFlags.trim() : '',
    lastPlayed: item.lastPlayed || null,
    addedAt: item.addedAt || new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    store.library[existingIdx] = { ...store.library[existingIdx], ...entry };
  } else {
    store.library.push(entry);
  }

  saveStore(store);
  return entry;
}

function removeLibraryItem(id) {
  const store = getStore();
  const beforeCount = (store.library || []).length;
  store.library = (store.library || []).filter((app) => app.id !== id && app.packageName !== id);
  saveStore(store);
  return { success: true, removed: beforeCount > store.library.length };
}

function updateLibraryItem(id, updates) {
  const store = getStore();
  const idx = (store.library || []).findIndex((app) => app.id === id || app.packageName === id);
  if (idx >= 0) {
    const current = store.library[idx];
    store.library[idx] = {
      ...current,
      ...updates,
      bitRate: updates.bitRate ? security.sanitizeBitrate(updates.bitRate, current.bitRate) : current.bitRate,
    };
    saveStore(store);
    return store.library[idx];
  }
  return null;
}

// --- Icon Caching Helpers ---

function getIconsDir() {
  ensureDataDir();
  return ICONS_DIR;
}

function getCachedIconPath(packageName) {
  ensureDataDir();
  try {
    return security.getSafeIconPath(ICONS_DIR, packageName);
  } catch (_) {
    return null;
  }
}

function saveCachedIcon(packageName, buffer) {
  if (!security.isValidPackageName(packageName)) {
    throw new Error('Invalid package name for icon caching.');
  }
  if (!security.validatePngBuffer(buffer)) {
    throw new Error('Invalid PNG data: magic bytes verification failed.');
  }

  const iconPath = getCachedIconPath(packageName);
  if (iconPath) {
    fs.writeFileSync(iconPath, buffer);
    return iconPath;
  }
  throw new Error('Could not resolve icon path.');
}

module.exports = {
  getStore,
  saveStore,
  getSettings,
  updateSettings,
  getRememberedDevices,
  saveRememberedDevice,
  removeRememberedDevice,
  updateRememberedDevice,
  getLibrary,
  addLibraryItem,
  removeLibraryItem,
  updateLibraryItem,
  getIconsDir,
  getCachedIconPath,
  saveCachedIcon,
};
