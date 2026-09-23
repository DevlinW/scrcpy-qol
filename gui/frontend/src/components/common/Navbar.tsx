import React from 'react';
import { Wifi, Settings, RefreshCw, Smartphone } from 'lucide-react';
import { Button } from './Button';
import { SystemStatus } from '../../types';

interface NavbarProps {
  systemStatus: SystemStatus | null;
  onOpenPairModal: () => void;
  onOpenSettingsModal: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  systemStatus,
  onOpenPairModal,
  onOpenSettingsModal,
  onRefresh,
  isRefreshing,
}) => {
  const adbReady = systemStatus?.adb.found;

  return (
    <header className="sticky top-0 z-30 w-full border-b border-zinc-800/80 bg-[#0A0A0C]/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand & Status Pill */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-bold text-sm tracking-wider shadow-sm">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white">scrcpy<span className="text-zinc-400 font-normal">.qol</span></span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-mono tracking-widest px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">v4.1 GUI</span>
            </div>
          </div>

          {/* ADB Status Indicator */}
          <div
            onClick={onOpenSettingsModal}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer border transition-colors ${
              adbReady
                ? 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                : 'bg-rose-950/40 text-rose-300 border-rose-900/60 hover:bg-rose-950/60'
            }`}
            title={adbReady ? `ADB Ready (${systemStatus?.adb.version || 'detected'})` : 'ADB not found. Click to configure path.'}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                adbReady ? 'bg-emerald-400 ring-2 ring-emerald-400/20' : 'bg-rose-400 animate-pulse'
              }`}
            />
            <span className="text-[11px] font-mono">
              {adbReady ? 'ADB Ready' : 'ADB Missing'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            loading={isRefreshing}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
            title="Refresh connected devices"
          >
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenPairModal}
            icon={<Wifi className="w-3.5 h-3.5" />}
          >
            Wireless Pair
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenSettingsModal}
            icon={<Settings className="w-4 h-4 text-zinc-300" />}
            aria-label="Settings"
          />
        </div>
      </div>
    </header>
  );
};
