import { AppSettings, Device, RememberedDevice, SystemStatus } from '../types';

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

export function subscribeToWebSocket(onMessage: (data: any) => void): () => void {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // Use port 5050 directly or proxied
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
