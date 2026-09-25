import { AppSettings, Device, RememberedDevice, SystemStatus, LibraryItem, ScrcpySession, LogEntry, ScannedPackage, MetadataResult } from '../types';

const BASE_URL = '/api';

export async function fetchStatus(): Promise<{ settings: AppSettings; status: SystemStatus }> {
  const res = await fetch(`${BASE_URL}/settings`);
  if (!res.ok) throw new Error('Failed to fetch status');
  return res.json();
}

export async function updateSettings(settings: Partial<AppSettings>): Promise<{ settings: AppSettings; status: SystemStatus }> {
  const res = await fetch(`${BASE_URL}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
}

export async function testFolderPath(folderPath: string): Promise<{ success: boolean; hasAdb: boolean; hasScrcpy: boolean; error?: string }> {
  const res = await fetch(`${BASE_URL}/settings/test-path`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folderPath }),
  });
  return res.json();
}

export async function fetchDevices(): Promise<{ active: Device[]; remembered: RememberedDevice[]; adbError?: string }> {
  const res = await fetch(`${BASE_URL}/devices`);
  if (!res.ok) throw new Error('Failed to fetch devices');
  return res.json();
}

export async function pairDevice(ip: string, port: number, code: string): Promise<{ success: boolean; output: string; error?: string }> {
  const res = await fetch(`${BASE_URL}/devices/pair`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ip, port, code }),
  });
  return res.json();
}

export async function connectDevice(ip: string, port: number, nickname?: string): Promise<{ success: boolean; output: string; serial?: string; error?: string }> {
  const res = await fetch(`${BASE_URL}/devices/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ip, port, nickname }),
  });
  return res.json();
}

export async function disconnectDevice(serial: string): Promise<{ success: boolean; output: string }> {
  const res = await fetch(`${BASE_URL}/devices/disconnect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serial }),
  });
  return res.json();
}

export async function pingDevice(serial: string): Promise<{ success: boolean; latencyMs?: number; error?: string }> {
  const res = await fetch(`${BASE_URL}/devices/ping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serial }),
  });
  return res.json();
}

export async function forgetDevice(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/devices/remembered/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function updateRememberedDevice(id: string, updates: Partial<RememberedDevice>): Promise<{ success: boolean; device?: RememberedDevice }> {
  const res = await fetch(`${BASE_URL}/devices/remembered`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, updates }),
  });
  return res.json();
}

// --- Quick Launch Curated Library ---

export async function fetchLibrary(): Promise<{ success: boolean; library: LibraryItem[] }> {
  const res = await fetch(`${BASE_URL}/library`);
  if (!res.ok) throw new Error('Failed to fetch library');
  return res.json();
}

export async function addLibraryItem(item: Partial<LibraryItem>): Promise<{ success: boolean; item: LibraryItem; error?: string }> {
  const res = await fetch(`${BASE_URL}/library`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  return res.json();
}

export async function removeLibraryItem(id: string): Promise<{ success: boolean; removed: boolean }> {
  const res = await fetch(`${BASE_URL}/library/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function updateLibraryItem(id: string, updates: Partial<LibraryItem>): Promise<{ success: boolean; item?: LibraryItem }> {
  const res = await fetch(`${BASE_URL}/library/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return res.json();
}

// --- Device App Scanner & Icon Extraction ---

export async function scanDevicePackages(serial: string): Promise<{ success: boolean; packages: ScannedPackage[]; error?: string }> {
  const res = await fetch(`${BASE_URL}/devices/${encodeURIComponent(serial)}/packages`);
  if (!res.ok) throw new Error('Failed to scan device packages');
  return res.json();
}

export function getDeviceIconUrl(serial: string, packageName: string, apkPath?: string): string {
  const base = `${BASE_URL}/devices/${encodeURIComponent(serial)}/icons/${encodeURIComponent(packageName)}`;
  return apkPath ? `${base}?apkPath=${encodeURIComponent(apkPath)}` : base;
}

export function getLibraryIconUrl(packageName: string): string {
  return `${BASE_URL}/library/icons/${encodeURIComponent(packageName)}.png`;
}

// --- Metadata Search ---

export async function searchMetadata(query: string): Promise<{ success: boolean; results: MetadataResult[]; error?: string }> {
  const res = await fetch(`${BASE_URL}/metadata/search?query=${encodeURIComponent(query)}`);
  return res.json();
}

// --- Scrcpy Process Controller ---

export interface LaunchScrcpyParams {
  serial: string;
  bitRate?: string;
  turnScreenOff?: boolean;
  stayAwake?: boolean;
  fullscreen?: boolean;
  packageName?: string;
  customFlags?: string;
}

export async function launchScrcpy(params: LaunchScrcpyParams): Promise<{ success: boolean; serial?: string; pid?: number; args?: string[]; error?: string }> {
  const res = await fetch(`${BASE_URL}/scrcpy/launch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}

export async function stopScrcpy(serial: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${BASE_URL}/scrcpy/stop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serial }),
  });
  return res.json();
}

export async function fetchActiveSessions(): Promise<{ success: boolean; sessions: ScrcpySession[] }> {
  const res = await fetch(`${BASE_URL}/scrcpy/sessions`);
  if (!res.ok) throw new Error('Failed to fetch active sessions');
  return res.json();
}

export async function fetchSessionLogs(serial: string): Promise<{ success: boolean; serial: string; logs: LogEntry[] }> {
  const res = await fetch(`${BASE_URL}/scrcpy/logs/${encodeURIComponent(serial)}`);
  if (!res.ok) throw new Error('Failed to fetch session logs');
  return res.json();
}

// --- WebSocket Live Stream ---

export function subscribeToWebSocket(onMessage: (data: any) => void): () => void {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.hostname}:5050`;

  let ws: WebSocket | null = null;
  let retryTimer: any = null;

  function connect() {
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          onMessage(parsed);
        } catch (_) {}
      };
      ws.onclose = () => {
        retryTimer = setTimeout(connect, 3000);
      };
    } catch (_) {
      retryTimer = setTimeout(connect, 5000);
    }
  }

  connect();

  return () => {
    if (retryTimer) clearTimeout(retryTimer);
    if (ws) ws.close();
  };
}
