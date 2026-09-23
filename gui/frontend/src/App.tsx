import React, { useState, useEffect, useCallback } from 'react';
import { Device, RememberedDevice, SystemStatus, AppSettings, ToastMessage } from './types';
import {
  fetchDevices,
  fetchStatus,
  updateSettings,
  disconnectDevice,
  pingDevice,
  connectDevice,
  forgetDevice,
  updateRememberedDevice,
  subscribeToWebSocket,
} from './api/client';
import { Navbar } from './components/common/Navbar';
import { AdbStatusBar } from './components/connection/AdbStatusBar';
import { ActiveDevicesGrid } from './components/connection/ActiveDevicesGrid';
import { RememberedList } from './components/connection/RememberedList';
import { WirelessPairModal } from './components/connection/WirelessPairModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { ToastContainer } from './components/common/Toast';

export const App: React.FC = () => {
  const [activeDevices, setActiveDevices] = useState<Device[]>([]);
  const [rememberedDevices, setRememberedDevices] = useState<RememberedDevice[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Toast Helpers
  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch initial data
  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setIsRefreshing(true);
    try {
      const [devRes, statRes] = await Promise.all([
        fetchDevices().catch((e) => ({ active: [], remembered: [], adbError: e.message })),
        fetchStatus().catch(() => null),
      ]);

      if (devRes) {
        setActiveDevices(devRes.active || []);
        setRememberedDevices(devRes.remembered || []);
      }

      if (statRes) {
        setSystemStatus(statRes.status);
        setSettings(statRes.settings);
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Connection Error',
        description: err.message || 'Could not load device data from backend.',
      });
    } finally {
      if (!quiet) setIsRefreshing(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadData();

    // Subscribe to WebSocket live updates
    const unsubscribe = subscribeToWebSocket((data) => {
      if (data.type === 'device:heartbeat') {
        setActiveDevices(data.devices || []);
      } else if (data.type === 'system:status') {
        setSystemStatus(data.status);
      }
    });

    return () => unsubscribe();
  }, [loadData]);

  // Action: Disconnect
  const handleDisconnect = async (serial: string) => {
    try {
      const res = await disconnectDevice(serial);
      if (res.success) {
        addToast({
          type: 'info',
          title: 'Device Disconnected',
          description: `Disconnected session for ${serial}`,
        });
        loadData(true);
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Failed to Disconnect',
        description: err.message,
      });
    }
  };

  // Action: Ping
  const handlePing = async (serial: string): Promise<number | null> => {
    try {
      const res = await pingDevice(serial);
      if (res.success && res.latencyMs !== undefined) {
        addToast({
          type: 'success',
          title: 'Ping Successful',
          description: `Device responded in ${res.latencyMs} ms.`,
        });
        return res.latencyMs;
      } else {
        addToast({
          type: 'error',
          title: 'Ping Failed',
          description: res.error || 'Device did not reply with pong.',
        });
        return null;
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Ping Error',
        description: err.message,
      });
      return null;
    }
  };

  // Action: Reconnect from Remembered
  const handleReconnect = async (dev: RememberedDevice) => {
    try {
      const res = await connectDevice(dev.ip, dev.port, dev.nickname);
      if (res.success) {
        addToast({
          type: 'success',
          title: 'Connected Successfully',
          description: `Connected to ${dev.nickname} (${res.serial})`,
        });
        loadData(true);
      } else {
        addToast({
          type: 'error',
          title: 'Connection Failed',
          description: res.error || 'Could not connect. Ensure Wireless Debugging is on.',
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Connection Error',
        description: err.message,
      });
    }
  };

  // Action: Forget Device (with Golden Rule 6: Permit easy reversal of actions via Undo)
  const handleForget = async (dev: RememberedDevice) => {
    try {
      await forgetDevice(dev.id);
      setRememberedDevices((prev) => prev.filter((d) => d.id !== dev.id));

      addToast({
        type: 'info',
        title: 'Device Forgotten',
        description: `${dev.nickname} removed from saved cache.`,
        undoAction: {
          label: 'Undo',
          onClick: async () => {
            // Restore device
            await connectDevice(dev.ip, dev.port, dev.nickname);
            loadData(true);
          },
        },
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Error',
        description: err.message,
      });
    }
  };

  // Action: Update inline port
  const handleUpdatePort = async (id: string, newPort: number) => {
    try {
      await updateRememberedDevice(id, { port: newPort });
      setRememberedDevices((prev) =>
        prev.map((d) => (d.id === id ? { ...d, port: newPort } : d))
      );
      addToast({
        type: 'success',
        title: 'Port Updated',
        description: `Port updated to ${newPort}.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Failed to update port',
        description: err.message,
      });
    }
  };

  // Action: Save settings
  const handleSaveSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      const res = await updateSettings(newSettings);
      setSettings(res.settings);
      setSystemStatus(res.status);
      addToast({
        type: 'success',
        title: 'Settings Saved',
        description: 'Executable paths updated successfully.',
      });
      loadData(true);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Settings Error',
        description: err.message,
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-[#F4F4F5] flex flex-col font-sans">
      <Navbar
        systemStatus={systemStatus}
        onOpenPairModal={() => setIsPairModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onRefresh={() => loadData(false)}
        isRefreshing={isRefreshing}
      />

      <AdbStatusBar
        systemStatus={systemStatus}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        <ActiveDevicesGrid
          devices={activeDevices}
          onDisconnect={handleDisconnect}
          onPing={handlePing}
          onOpenPairModal={() => setIsPairModalOpen(true)}
          onLaunch={(dev) => {
            addToast({
              type: 'info',
              title: 'Launch Scrcpy',
              description: `Ready to stream ${dev.model} (${dev.serial}). Video controls are coming in Phase 2!`,
            });
          }}
        />

        <RememberedList
          devices={rememberedDevices}
          onConnect={handleReconnect}
          onForget={handleForget}
          onUpdatePort={handleUpdatePort}
        />
      </main>

      {/* Modals */}
      <WirelessPairModal
        isOpen={isPairModalOpen}
        onClose={() => setIsPairModalOpen(false)}
        onSuccess={(serial, nick) => {
          addToast({
            type: 'success',
            title: 'Wireless Device Connected!',
            description: `Successfully paired and connected to ${nick || serial}`,
          });
          loadData(true);
        }}
        onError={(msg) => {
          addToast({
            type: 'error',
            title: 'Wireless Connection Failed',
            description: msg,
          });
        }}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        systemStatus={systemStatus}
        onSaveSettings={handleSaveSettings}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default App;
