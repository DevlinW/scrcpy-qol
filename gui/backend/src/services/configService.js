const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

const DEFAULT_STORE = {
  settings: {
    customAdbPath: '',
    customScrcpyPath: '',
  },
  rememberedDevices: [],
  profiles: {},
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify(DEFAULT_STORE, null, 2), 'utf-8');
  }
}

function getStore() {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    return { ...DEFAULT_STORE, ...JSON.parse(raw) };
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
  // Check if already exists by id or ip:port
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

module.exports = {
  getStore,
  saveStore,
  getSettings,
  updateSettings,
  getRememberedDevices,
  saveRememberedDevice,
  removeRememberedDevice,
  updateRememberedDevice,
};
