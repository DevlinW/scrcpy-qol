import React from 'react';
import { Device } from '../../types';
import { DeviceCard } from './DeviceCard';
import { Smartphone, Plus } from 'lucide-react';
import { Button } from '../common/Button';

interface ActiveDevicesGridProps {
  devices: Device[];
  onDisconnect: (serial: string) => Promise<void>;
  onPing: (serial: string) => Promise<number | null>;
  onOpenPairModal: () => void;
  onLaunch?: (device: Device) => void;
}

export const ActiveDevicesGrid: React.FC<ActiveDevicesGridProps> = ({
  devices,
  onDisconnect,
  onPing,
  onOpenPairModal,
  onLaunch,
}) => {
  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-bold text-white tracking-tight">Active Devices</h2>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/80">
            {devices.length}
          </span>
        </div>
      </div>

      {devices.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 sm:p-12 bg-[#121215]/60 border border-zinc-800/80 border-dashed rounded-2xl text-center">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3 text-zinc-400">
            <Smartphone className="w-6 h-6 text-zinc-400" />
          </div>
          <h3 className="text-sm font-semibold text-white">No active devices detected</h3>
          <p className="text-xs text-zinc-400 max-w-sm mt-1 mb-5">
            Connect an Android phone via USB cable (with USB debugging enabled) or use Wireless Debugging over Wi-Fi.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenPairModal}
            icon={<Plus className="w-4 h-4" />}
          >
            Pair Wireless Device
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((device) => (
            <DeviceCard
              key={device.serial}
              device={device}
              onDisconnect={onDisconnect}
              onPing={onPing}
              onLaunch={onLaunch}
            />
          ))}
        </div>
      )}
    </section>
  );
};
