import React, { useState, useEffect, useCallback } from 'react';
import {
  Device,
  RememberedDevice,
  SystemStatus,
  AppSettings,
  ToastMessage,
  LibraryItem,
  ScrcpySession,
  LogEntry,
} from './types';
import {
  fetchDevices,
  fetchStatus,
  fetchLibrary,
  fetchActiveSessions,
  fetchSessionLogs,
  launchScrcpy,
  stopScrcpy,
  removeLibraryItem,
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
import { LibraryShelf } from './components/library/LibraryShelf';
import { AddAppModal } from './components/library/AddAppModal';
import { TerminalDrawer } from './components/console/TerminalDrawer';
import { WirelessPairModal } from './components/connection/WirelessPairModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { ToastContainer } from './components/common/Toast';

export const App: React.FC = () => {
  const [activeDevices, setActiveDevices] = useState<Device[]>([]);
  const [rememberedDevices, setRememberedDevices] = useState<RememberedDevice[]>([]);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [activeSessions, setActiveSessions] = useState<ScrcpySession[]>([]);
  const [sessionLogs, setSessionLogs] = useState<LogEntry[]>([]);

  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // Modals & Drawers
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAddAppModalOpen, setIsAddAppModalOpen] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
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
  const loadData = useCallback(
    async (quiet = false) => {
      if (!quiet) setIsRefreshing(true);
      try {
        const [devRes, statRes, libRes, sessRes] = await Promise.all([
          fetchDevices().catch((e) => ({ active: [], remembered: [], adbError: e.message })),
          fetchStatus().catch(() => null),
          fetchLibrary().catch(() => ({ success: true, library: [] })),
          fetchActiveSessions().catch(() => ({ success: true, sessions: [] })),
        ]);

        if (devRes) {
          setActiveDevices(devRes.active || []);
          setRememberedDevices(devRes.remembered || []);
        }

        if (statRes) {
          setSystemStatus(statRes.status);
          setSettings(statRes.settings);
        }

        if (libRes) {
          setLibrary(libRes.library || []);
        }

        if (sessRes) {
          setActiveSessions(sessRes.sessions || []);
          if (sessRes.sessions?.length > 0) {
            // Load logs for primary active session
            const firstSerial = sessRes.sessions[0].serial;
            fetchSessionLogs(firstSerial).then((l) => setSessionLogs(l.logs || []));
          }
        }
      } catch (err: any) {
        addToast({
          type: 'error',
          title: 'Connection Error',
          description: err.message || 'Could not load data from backend.',
        });
      } finally {
        if (!quiet) setIsRefreshing(false);
      }
    },
    [addToast]
  );

  useEffect(() => {
    loadData();

    // Subscribe to WebSocket live updates
    const unsubscribe = subscribeToWebSocket((data) => {
      if (data.type === 'device:heartbeat') {
        setActiveDevices(data.devices || []);
      } else if (data.type === 'system:status') {
        setSystemStatus(data.status);
      } else if (data.type === 'scrcpy:sessions') {
        setActiveSessions(data.sessions || []);
      } else if (data.type === 'scrcpy:status') {
        if (data.status === 'running') {
          setActiveSessions((prev) => {
            const filtered = prev.filter((s) => s.serial !== data.serial);
            return [
              ...filtered,
              {
                serial: data.serial,
                pid: data.pid,
                startTime: new Date().toISOString(),
                status: 'running',
                options: data.options,
              },
            ];
          });
        } else if (data.status === 'stopped') {
          setActiveSessions((prev) => prev.filter((s) => s.serial !== data.serial));
        }
      } else if (data.type === 'scrcpy:log') {
        setSessionLogs((prev) => {
          const updated = [...prev, data.log];
          return updated.length > 200 ? updated.slice(updated.length - 200) : updated;
        });
      }
    });

    return () => unsubscribe();
  }, [loadData]);

  // --- Scrcpy Session Actions ---

  const handleLaunchDevice = async (device: Device, bitRate = '8M') => {
    try {
      setIsTerminalOpen(true);
      const res = await launchScrcpy({
        serial: device.serial,
        bitRate,
        stayAwake: true,
      });

      if (res.success) {
        addToast({
          type: 'success',
          title: 'scrcpy Started',
          description: `Streaming ${device.nickname || device.model} at ${bitRate} (PID: ${res.pid})`,
        });
      } else {
        addToast({
          type: 'error',
          title: 'Launch Failed',
          description: res.error || 'Failed to spawn scrcpy process.',
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Launch Error',
        description: err.message,
      });
    }
  };

  const handleLaunchLibraryApp = async (item: LibraryItem, serial: string) => {
    try {
      setIsTerminalOpen(true);
      const res = await launchScrcpy({
        serial,
        bitRate: item.bitRate || '8M',
        turnScreenOff: item.turnScreenOff,
        stayAwake: item.stayAwake !== undefined ? item.stayAwake : true,
        fullscreen: item.fullscreen,
        packageName: item.packageName,
        customFlags: item.customFlags,
      });

      if (res.success) {
        addToast({
          type: 'success',
          title: `Launching ${item.title}`,
          description: `Streaming app on ${serial} (PID: ${res.pid})`,
        });
      } else {
        addToast({
          type: 'error',
          title: 'App Launch Failed',
          description: res.error || 'Failed to launch scrcpy for this app.',
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Launch Error',
        description: err.message,
      });
    }
  };

  const handleStopSession = async (serial: string) => {
    try {
      const res = await stopScrcpy(serial);
      if (res.success) {
        addToast({
          type: 'info',
          title: 'scrcpy Terminated',
          description: `Stopped session for ${serial}`,
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Error Stopping Session',
        description: err.message,
      });
    }
  };

  const handleRemoveLibraryApp = async (item: LibraryItem) => {
    try {
      await removeLibraryItem(item.id);
      setLibrary((prev) => prev.filter((i) => i.id !== item.id));

      addToast({
        type: 'info',
        title: 'Removed from Library',
        description: `${item.title} removed from quick launch shelf.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Remove Error',
        description: err.message,
      });
    }
  };

  // --- Device Actions ---

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

  const activeStreamingCount = activeSessions.filter((s) => s.status === 'running').length;

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-[#F4F4F5] flex flex-col font-sans pb-16">
      <Navbar
        systemStatus={systemStatus}
        activeSessionsCount={activeStreamingCount}
        onOpenPairModal={() => setIsPairModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenTerminal={() => setIsTerminalOpen((prev) => !prev)}
        onRefresh={() => loadData(false)}
        isRefreshing={isRefreshing}
      />

      <AdbStatusBar
        systemStatus={systemStatus}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* Quick Launch Library (Playnite style) */}
        <LibraryShelf
          library={library}
          activeDevices={activeDevices}
          activeSessions={activeSessions}
          onLaunchApp={handleLaunchLibraryApp}
          onStopSession={handleStopSession}
          onRemoveApp={handleRemoveLibraryApp}
          onOpenAddModal={() => setIsAddAppModalOpen(true)}
          onOpenTerminal={() => setIsTerminalOpen(true)}
        />

        {/* Active Connected Devices */}
        <ActiveDevicesGrid
          devices={activeDevices}
          activeSessions={activeSessions}
          onDisconnect={handleDisconnect}
          onPing={handlePing}
          onOpenPairModal={() => setIsPairModalOpen(true)}
          onLaunch={handleLaunchDevice}
          onStop={handleStopSession}
          onOpenTerminal={() => setIsTerminalOpen(true)}
        />

        {/* Remembered Offline Devices */}
        <RememberedList
          devices={rememberedDevices}
          onConnect={handleReconnect}
          onForget={handleForget}
          onUpdatePort={handleUpdatePort}
        />
      </main>

      {/* Terminal Drawer Console */}
      <TerminalDrawer
        isOpen={isTerminalOpen}
        onClose={() => setIsTerminalOpen(false)}
        logs={sessionLogs}
        activeSessions={activeSessions}
        onStopSession={handleStopSession}
        onClearLogs={() => setSessionLogs([])}
      />

      {/* Modals */}
      <AddAppModal
        isOpen={isAddAppModalOpen}
        onClose={() => setIsAddAppModalOpen(false)}
        activeDevices={activeDevices}
        existingLibrary={library}
        onAppAdded={(newItem) => {
          setLibrary((prev) => {
            const exists = prev.some((i) => i.id === newItem.id || i.packageName === newItem.packageName);
            return exists
              ? prev.map((i) => (i.id === newItem.id || i.packageName === newItem.packageName ? newItem : i))
              : [...prev, newItem];
          });
          addToast({
            type: 'success',
            title: 'Added to Library',
            description: `${newItem.title} added to your quick launch library.`,
          });
        }}
      />

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
