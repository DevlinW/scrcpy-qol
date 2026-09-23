import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { SystemStatus } from '../../types';

interface AdbStatusBarProps {
  systemStatus: SystemStatus | null;
  onOpenSettings: () => void;
}

export const AdbStatusBar: React.FC<AdbStatusBarProps> = ({ systemStatus, onOpenSettings }) => {
  if (!systemStatus || systemStatus.adb.found) return null;

  return (
    <div className="w-full bg-zinc-900/90 border-b border-zinc-800 text-xs text-zinc-300 py-2.5 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong className="text-white font-medium">ADB Executable Not Found:</strong> Windows could not locate <code className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-200">adb.exe</code> in PATH.
          </span>
        </div>
        <button
          onClick={onOpenSettings}
          className="inline-flex items-center gap-1 font-semibold text-white hover:text-zinc-200 underline underline-offset-4 transition-colors"
        >
          Configure Executable Folder <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
