import React from 'react';
import { Zap, EyeOff, Sun, Maximize } from 'lucide-react';

interface BitrateControlsProps {
  bitRate: string;
  onChangeBitRate: (val: string) => void;
  turnScreenOff: boolean;
  onChangeTurnScreenOff: (val: boolean) => void;
  stayAwake: boolean;
  onChangeStayAwake: (val: boolean) => void;
  fullscreen: boolean;
  onChangeFullscreen: (val: boolean) => void;
  compact?: boolean;
}

const PRESETS = [
  { label: '4M', desc: 'Fast', value: '4M', speed: 'Low latency' },
  { label: '8M', desc: 'Balanced', value: '8M', speed: 'Default' },
  { label: '16M', desc: 'High', value: '16M', speed: 'Crisp' },
  { label: '32M', desc: 'Ultra', value: '32M', speed: 'Max fidelity' },
];

export const BitrateControls: React.FC<BitrateControlsProps> = ({
  bitRate,
  onChangeBitRate,
  turnScreenOff,
  onChangeTurnScreenOff,
  stayAwake,
  onChangeStayAwake,
  fullscreen,
  onChangeFullscreen,
  compact = false,
}) => {
  const currentNum = parseInt(bitRate.replace(/\D/g, ''), 10) || 8;

  return (
    <div className={`space-y-4 ${compact ? 'text-xs' : 'text-sm'}`}>
      {/* Bitrate Selector */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Video Bitrate
          </label>
          <span className="font-mono text-xs font-bold text-white px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700">
            {bitRate.toUpperCase()}
          </span>
        </div>

        {/* Preset Chips */}
        <div className="grid grid-cols-4 gap-1.5 mb-2.5">
          {PRESETS.map((p) => {
            const isSelected = bitRate.toUpperCase() === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => onChangeBitRate(p.value)}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all text-center ${
                  isSelected
                    ? 'bg-white text-black border-white font-bold shadow-sm'
                    : 'bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80'
                }`}
              >
                <span className="text-xs font-mono">{p.label}</span>
                <span className={`text-[10px] ${isSelected ? 'text-zinc-700 font-medium' : 'text-zinc-500'}`}>
                  {p.desc}
                </span>
              </button>
            );
          })}
        </div>

        {/* Slider for custom value */}
        {!compact && (
          <div className="flex items-center gap-3 pt-1">
            <input
              type="range"
              min="2"
              max="32"
              step="2"
              value={currentNum}
              onChange={(e) => onChangeBitRate(`${e.target.value}M`)}
              className="w-full accent-white bg-zinc-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Display Behavior Toggles */}
      <div className="space-y-2 pt-2 border-t border-zinc-800/80">
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
          Display Flags
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Turn Screen Off */}
          <button
            type="button"
            onClick={() => onChangeTurnScreenOff(!turnScreenOff)}
            className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
              turnScreenOff
                ? 'bg-zinc-800 text-white border-zinc-600 shadow-sm'
                : 'bg-zinc-900/60 text-zinc-400 border-zinc-800/80 hover:text-zinc-200'
            }`}
          >
            <EyeOff className={`w-4 h-4 ${turnScreenOff ? 'text-emerald-400' : 'text-zinc-500'}`} />
            <div>
              <div className="text-xs font-semibold">Screen Off</div>
              <div className="text-[10px] text-zinc-400">Phone stays dark (-S)</div>
            </div>
          </button>

          {/* Stay Awake */}
          <button
            type="button"
            onClick={() => onChangeStayAwake(!stayAwake)}
            className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
              stayAwake
                ? 'bg-zinc-800 text-white border-zinc-600 shadow-sm'
                : 'bg-zinc-900/60 text-zinc-400 border-zinc-800/80 hover:text-zinc-200'
            }`}
          >
            <Sun className={`w-4 h-4 ${stayAwake ? 'text-amber-400' : 'text-zinc-500'}`} />
            <div>
              <div className="text-xs font-semibold">Stay Awake</div>
              <div className="text-[10px] text-zinc-400">Prevents sleep (-w)</div>
            </div>
          </button>

          {/* Fullscreen */}
          <button
            type="button"
            onClick={() => onChangeFullscreen(!fullscreen)}
            className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
              fullscreen
                ? 'bg-zinc-800 text-white border-zinc-600 shadow-sm'
                : 'bg-zinc-900/60 text-zinc-400 border-zinc-800/80 hover:text-zinc-200'
            }`}
          >
            <Maximize className={`w-4 h-4 ${fullscreen ? 'text-indigo-400' : 'text-zinc-500'}`} />
            <div>
              <div className="text-xs font-semibold">Fullscreen</div>
              <div className="text-[10px] text-zinc-400">Start in full screen (-f)</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
