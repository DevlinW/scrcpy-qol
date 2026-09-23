import React, { useState } from 'react';
import { Device } from '../../types';
import { Wifi, Usb, Battery, BatteryCharging, Activity, Unplug, Play } from 'lucide-react';
import { Button } from '../common/Button';

interface DeviceCardProps {
  device: Device;
  onDisconnect: (serial: string) => Promise<void>;
  onPing: (serial: string) => Promise<number | null>;
  onLaunch?: (device: Device) => void;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  onDisconnect,
  onPing,
  onLaunch,
}) => {
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);

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

  return (
    <div className="group relative bg-[#121215] hover:bg-[#15151A] border border-zinc-800/80 hover:border-zinc-700 rounded-xl p-5 transition-all duration-200 shadow-lg">
      {/* Top Row: Type & Status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium border ${
              device.type === 'wifi'
                ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
                : 'bg-zinc-800 text-zinc-300 border-zinc-700'
            }`}
          >
            {device.type === 'wifi' ? <Wifi className="w-3 h-3 text-white" /> : <Usb className="w-3 h-3 text-white" />}
            {device.type.toUpperCase()}
          </span>

          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Online
          </span>
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
      <div className="mb-4">
        <h4 className="text-base font-bold text-white tracking-tight group-hover:text-zinc-100 transition-colors">
          {device.model}
        </h4>
        <p className="text-xs font-mono text-zinc-400 mt-0.5 select-all">
          {device.serial}
        </p>
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
        <Button
          variant="primary"
          size="sm"
          className="flex-1"
          onClick={() => onLaunch?.(device)}
          icon={<Play className="w-3.5 h-3.5 fill-black" />}
        >
          Launch scrcpy
        </Button>

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
