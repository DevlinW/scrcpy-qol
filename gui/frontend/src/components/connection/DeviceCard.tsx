import React, { useState } from 'react';
import { Device, ScrcpySession } from '../../types';
import { Wifi, Usb, Battery, BatteryCharging, Activity, Unplug, Play, Square, Terminal, Zap, Radio } from 'lucide-react';
import { Button } from '../common/Button';

interface DeviceCardProps {
  device: Device;
  activeSession?: ScrcpySession | null;
  onDisconnect: (serial: string) => Promise<void>;
  onPing: (serial: string) => Promise<number | null>;
  onLaunch: (device: Device, bitRate?: string) => Promise<void>;
  onStop: (serial: string) => Promise<void>;
  onOpenTerminal: () => void;
}

const BITRATE_PRESETS = ['4M', '8M', '16M', '32M'];

export const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  activeSession,
  onDisconnect,
  onPing,
  onLaunch,
  onStop,
  onOpenTerminal,
}) => {
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [selectedBitrate, setSelectedBitrate] = useState<string>('8M');

  const isStreaming = activeSession && activeSession.status === 'running';

  const handlePing = async () => {
    setIsPinging(true);
    const ms = await onPing(device.serial);
    setLatency(ms);
    setIsPinging(false);
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    await onDisconnect(device.serial);
    setIsDisconnecting(false);
  };

  const handleLaunchClick = async () => {
    setIsLaunching(true);
    try {
      await onLaunch(device, selectedBitrate);
    } finally {
      setIsLaunching(false);
    }
  };

  const handleStopClick = async () => {
    setIsStopping(true);
    try {
      await onStop(device.serial);
    } finally {
      setIsStopping(false);
    }
  };

  return (
    <div
      className={`group relative bg-[#121215] hover:bg-[#15151A] border ${
        isStreaming ? 'border-emerald-700/80 shadow-emerald-950/20' : 'border-zinc-800/80 hover:border-zinc-700'
      } rounded-xl p-5 transition-all duration-200 shadow-lg`}
    >
      {/* Top Row: Type & Status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium border bg-zinc-800 text-zinc-300 border-zinc-700"
          >
            {device.type === 'wifi' ? <Wifi className="w-3 h-3 text-white" /> : <Usb className="w-3 h-3 text-white" />}
            {device.type.toUpperCase()}
          </span>

          {isStreaming ? (
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-mono font-semibold">
              <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              PID: {activeSession.pid}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online
            </span>
          )}
        </div>

        {/* Battery Info */}
        {device.battery !== null && (
          <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-400" title={`Battery: ${device.battery.level}%`}>
            {device.battery.charging ? (
              <BatteryCharging className="w-4 h-4 text-emerald-400" />
            ) : (
              <Battery className="w-4 h-4 text-zinc-300" />
            )}
            <span>{device.battery.level}%</span>
          </div>
        )}
      </div>

      {/* Middle Row: Device Info */}
      <div className="mb-3">
        <h4 className="text-base font-bold text-white tracking-tight group-hover:text-zinc-100 transition-colors truncate">
          {device.nickname || device.model}
        </h4>
        <p className="text-xs font-mono text-zinc-400 mt-0.5 select-all truncate">
          {device.nickname && device.nickname !== device.model ? (
            <span>
              <span className="text-zinc-300">{device.model}</span>
              <span className="text-zinc-600 mx-1.5">•</span>
            </span>
          ) : null}
          {device.serial}
        </p>
      </div>

      {/* Bitrate Selector Row */}
      <div className="mb-3 flex items-center justify-between bg-zinc-900/80 px-2.5 py-1.5 rounded-lg border border-zinc-800">
        <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-400" /> Bitrate:
        </span>
        <div className="flex items-center gap-1">
          {BITRATE_PRESETS.map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => setSelectedBitrate(rate)}
              className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition-colors ${
                selectedBitrate === rate
                  ? 'bg-white text-black font-bold'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {rate}
            </button>
          ))}
        </div>
      </div>

      {/* Latency badge if tested */}
      {latency !== null && (
        <div className="mb-3 text-[11px] font-mono text-zinc-400 bg-zinc-900/80 px-2 py-1 rounded border border-zinc-800/80 inline-flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-white" />
          <span>Ping: <strong className="text-white">{latency} ms</strong></span>
        </div>
      )}

      {/* Action Row */}
      <div className="flex items-center gap-2 pt-3 border-t border-zinc-800/60">
        {isStreaming ? (
          <Button
            variant="danger"
            size="sm"
            className="flex-1"
            onClick={handleStopClick}
            loading={isStopping}
            icon={<Square className="w-3.5 h-3.5 fill-red-400" />}
          >
            Stop scrcpy
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={handleLaunchClick}
            loading={isLaunching}
            icon={<Play className="w-3.5 h-3.5 fill-black" />}
          >
            Launch ({selectedBitrate})
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenTerminal}
          title="Open scrcpy terminal logs"
          icon={<Terminal className="w-3.5 h-3.5" />}
        />

        <Button
          variant="ghost"
          size="sm"
          onClick={handlePing}
          loading={isPinging}
          title="Test ADB latency ping"
          icon={<Activity className="w-3.5 h-3.5" />}
        />

        {device.type === 'wifi' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDisconnect}
            loading={isDisconnecting}
            title="Disconnect Wi-Fi device"
            className="text-zinc-400 hover:text-red-400"
            icon={<Unplug className="w-3.5 h-3.5" />}
          />
        )}
      </div>
    </div>
  );
};
