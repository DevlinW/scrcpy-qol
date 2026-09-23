import React, { useState } from 'react';
import { RememberedDevice } from '../../types';
import { Wifi, Usb, Trash2, Unplug, Clock, Edit2, Check, ArrowRight } from 'lucide-react';
import { Button } from '../common/Button';

interface RememberedListProps {
  devices: RememberedDevice[];
  onConnect: (device: RememberedDevice) => Promise<void>;
  onForget: (device: RememberedDevice) => Promise<void>;
  onUpdatePort: (id: string, newPort: number) => Promise<void>;
}

export const RememberedList: React.FC<RememberedListProps> = ({
  devices,
  onConnect,
  onForget,
  onUpdatePort,
}) => {
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPortVal, setEditPortVal] = useState<string>('');
  const [confirmForgetId, setConfirmForgetId] = useState<string | null>(null);

  const startEdit = (dev: RememberedDevice) => {
    setEditingId(dev.id);
    setEditPortVal(dev.port.toString());
  };

  const saveEdit = async (id: string) => {
    const p = parseInt(editPortVal, 10);
    if (p > 0 && p <= 65535) {
      await onUpdatePort(id, p);
    }
    setEditingId(null);
  };

  const handleConnect = async (dev: RememberedDevice) => {
    setConnectingId(dev.id);
    await onConnect(dev);
    setConnectingId(null);
  };

  if (devices.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-bold text-white tracking-tight">Remembered Devices</h2>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/80">
            {devices.length}
          </span>
        </div>
      </div>

      <div className="bg-[#121215] border border-zinc-800/80 rounded-xl divide-y divide-zinc-800/80 overflow-hidden shadow-sm">
        {devices.map((device) => {
          const isConnecting = connectingId === device.id;
          const isEditing = editingId === device.id;
          const isConfirmingForget = confirmForgetId === device.id;

          return (
            <div
              key={device.id}
              className="p-4 sm:px-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-[#15151A] transition-colors"
            >
              {/* Left Info */}
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 text-zinc-400">
                  {device.type === 'wifi' ? (
                    <Wifi className="w-4 h-4 text-zinc-300" />
                  ) : (
                    <Usb className="w-4 h-4 text-zinc-300" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-white">{device.nickname}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                        device.isOnline
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-900/60'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700/60'
                      }`}
                    >
                      {device.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>

                  {/* IP and inline port editor */}
                  <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mt-1">
                    <span>{device.ip || device.serial}</span>

                    {device.type === 'wifi' && (
                      <div className="inline-flex items-center gap-1">
                        <span>:</span>
                        {isEditing ? (
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              min="1"
                              max="65535"
                              value={editPortVal}
                              onChange={(e) => setEditPortVal(e.target.value)}
                              className="w-16 px-1.5 py-0.5 text-xs bg-zinc-900 border border-zinc-600 rounded text-white font-mono focus:outline-none focus:border-white"
                              autoFocus
                            />
                            <button
                              onClick={() => saveEdit(device.id)}
                              className="p-1 hover:text-white text-zinc-400 transition-colors"
                              title="Save port"
                            >
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(device)}
                            className="inline-flex items-center gap-1 hover:text-zinc-200 text-zinc-400 group transition-colors"
                            title="Edit port if changed"
                          >
                            <span>{device.port}</span>
                            <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        )}
                      </div>
                    )}

                    <span className="text-zinc-600">•</span>
                    <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                      <Clock className="w-3 h-3" />
                      {new Date(device.lastConnected).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                {isConfirmingForget ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-rose-400 font-medium">Forget device?</span>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        onForget(device);
                        setConfirmForgetId(null);
                      }}
                    >
                      Yes, Forget
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmForgetId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    {!device.isOnline && device.type === 'wifi' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleConnect(device)}
                        loading={isConnecting}
                        icon={<ArrowRight className="w-3.5 h-3.5" />}
                      >
                        Connect
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmForgetId(device.id)}
                      className="text-zinc-400 hover:text-rose-400"
                      title="Forget device"
                      icon={<Trash2 className="w-3.5 h-3.5" />}
                    />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
