import React, { useState } from 'react';
import { Device, LibraryItem, ScrcpySession } from '../../types';
import { AppIcon } from '../common/AppIcon';
import { Button } from '../common/Button';
import { Play, Square, Plus, Trash2, Gamepad2, Radio } from 'lucide-react';

interface LibraryShelfProps {
  library: LibraryItem[];
  activeDevices: Device[];
  activeSessions: ScrcpySession[];
  onLaunchApp: (item: LibraryItem, serial: string) => Promise<void>;
  onStopSession: (serial: string) => Promise<void>;
  onRemoveApp: (item: LibraryItem) => Promise<void>;
  onOpenAddModal: () => void;
  onOpenTerminal: () => void;
}

export const LibraryShelf: React.FC<LibraryShelfProps> = ({
  library,
  activeDevices,
  activeSessions,
  onLaunchApp,
  onStopSession,
  onRemoveApp,
  onOpenAddModal,
  onOpenTerminal,
}) => {
  const [selectedDeviceSerials, setSelectedDeviceSerials] = useState<{ [appId: string]: string }>({});
  const [launchingAppId, setLaunchingAppId] = useState<string | null>(null);

  const getTargetSerial = (appId: string): string => {
    if (selectedDeviceSerials[appId]) {
      return selectedDeviceSerials[appId];
    }
    return activeDevices.length > 0 ? activeDevices[0].serial : '';
  };

  const handleDeviceChange = (appId: string, serial: string) => {
    setSelectedDeviceSerials((prev) => ({ ...prev, [appId]: serial }));
  };

  const handleLaunch = async (item: LibraryItem) => {
    const serial = getTargetSerial(item.id);
    if (!serial) return;
    setLaunchingAppId(item.id);
    try {
      await onLaunchApp(item, serial);
    } finally {
      setLaunchingAppId(null);
    }
  };

  return (
    <section className="mb-10">
      {/* Shelf Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-white" />
            <h2 className="text-base font-bold text-white tracking-tight">Quick Launch Library</h2>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/80">
            {library.length}
          </span>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenAddModal}
          icon={<Plus className="w-3.5 h-3.5" />}
        >
          Add App / Game
        </Button>
      </div>

      {/* Grid or Empty State */}
      {library.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 sm:p-10 bg-[#121215]/60 border border-zinc-800/80 border-dashed rounded-2xl text-center">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3 text-zinc-400">
            <Gamepad2 className="w-6 h-6 text-zinc-400" />
          </div>
          <h3 className="text-sm font-semibold text-white">Your Quick Launch Library is Empty</h3>
          <p className="text-xs text-zinc-400 max-w-sm mt-1 mb-5">
            Curate your favorite games and apps. Scan a connected phone to auto-import apps with real icons, or add them manually.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenAddModal}
            icon={<Plus className="w-4 h-4" />}
          >
            Add First App
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {library.map((item) => {
            const targetSerial = getTargetSerial(item.id);
            const activeSession = activeSessions.find(
              (s) => s.serial === targetSerial && s.status === 'running'
            );
            const isPlayingThisApp =
              activeSession && activeSession.options?.packageName === item.packageName;
            const isLaunching = launchingAppId === item.id;
            const hasConnectedDevice = activeDevices.length > 0;

            return (
              <div
                key={item.id}
                className="group relative bg-[#121215] hover:bg-[#15151A] border border-zinc-800/80 hover:border-zinc-700 rounded-xl p-4 transition-all duration-200 shadow-md flex flex-col justify-between"
              >
                {/* Top: Icon + App Info */}
                <div>
                  <div className="flex items-start gap-3.5 mb-3">
                    <AppIcon
                      src={item.iconUrl || `/api/library/icons/${item.packageName}.png`}
                      fallbackName={item.title}
                      size="md"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-sm font-bold text-white tracking-tight truncate group-hover:text-zinc-100 transition-colors">
                          {item.title}
                        </h4>

                        <button
                          type="button"
                          onClick={() => onRemoveApp(item)}
                          className="text-zinc-500 hover:text-rose-400 p-1 -mt-1 -mr-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove from library"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-[11px] font-mono text-zinc-400 truncate mt-0.5">
                        {item.packageName}
                      </p>

                      {item.description && (
                        <p className="text-xs text-zinc-400 line-clamp-1 mt-1">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Metadata Chips: Bitrate & Flags */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3.5 text-[10px] font-mono text-zinc-400">
                    <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                      ⚡ {item.bitRate || '8M'}
                    </span>
                    {item.turnScreenOff && (
                      <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                        Screen Off
                      </span>
                    )}
                    {item.fullscreen && (
                      <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                        Fullscreen
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom: Device Selection & Launch Action */}
                <div className="pt-3 border-t border-zinc-800/80 space-y-2">
                  {/* Target Device Dropdown if multiple devices */}
                  {activeDevices.length > 1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-400 uppercase font-mono">Device:</span>
                      <select
                        value={targetSerial}
                        onChange={(e) => handleDeviceChange(item.id, e.target.value)}
                        className="flex-1 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-600"
                      >
                        {activeDevices.map((d) => (
                          <option key={d.serial} value={d.serial}>
                            {d.nickname || d.model}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Launch / Stop Row */}
                  <div className="flex items-center gap-2">
                    {isPlayingThisApp ? (
                      <div className="flex-1 flex items-center justify-between bg-emerald-950/60 border border-emerald-900/80 px-3 py-1.5 rounded-lg">
                        <button
                          type="button"
                          onClick={onOpenTerminal}
                          className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-emerald-400 hover:underline"
                        >
                          <Radio className="w-3.5 h-3.5 animate-pulse" />
                          <span>Playing (PID: {activeSession.pid})</span>
                        </button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => onStopSession(targetSerial)}
                          icon={<Square className="w-3 h-3 fill-red-400" />}
                          className="py-1 px-2 text-xs"
                        >
                          Stop
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={!hasConnectedDevice}
                        loading={isLaunching}
                        onClick={() => handleLaunch(item)}
                        className="flex-1"
                        icon={<Play className="w-3.5 h-3.5 fill-black" />}
                      >
                        {hasConnectedDevice ? 'Play Game' : 'Device Offline'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
