export interface BatteryInfo {
  level: number;
  charging: boolean;
}

export interface Device {
  serial: string;
  state: string; // 'device', 'offline', 'unauthorized'
  model: string;
  nickname?: string;
  type: 'usb' | 'wifi';
  ip: string;
  port: number;
  battery: BatteryInfo | null;
}

export interface RememberedDevice {
  id: string;
  nickname: string;
  model: string;
  ip: string;
  port: number;
  serial: string;
  type: 'usb' | 'wifi';
  lastConnected: string;
  isOnline?: boolean;
}

export interface BinaryStatus {
  found: boolean;
  path: string;
  version: string | null;
  error: string | null;
}

export interface SystemStatus {
  adb: BinaryStatus;
  scrcpy: BinaryStatus;
}

export interface AppSettings {
  customAdbPath: string;
  customScrcpyPath: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
  undoAction?: {
    label: string;
    onClick: () => void;
  };
}
