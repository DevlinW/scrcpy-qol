import React, { useState, useEffect, useRef } from 'react';
import { LogEntry, ScrcpySession } from '../../types';
import { Terminal, X, Trash2, Copy, Check, ChevronUp, ChevronDown, Square, Radio } from 'lucide-react';
import { Button } from '../common/Button';

interface TerminalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  logs: LogEntry[];
  activeSessions: ScrcpySession[];
  onStopSession: (serial: string) => Promise<void>;
  onClearLogs: () => void;
}

export const TerminalDrawer: React.FC<TerminalDrawerProps> = ({
  isOpen,
  onClose,
  logs,
  activeSessions,
  onStopSession,
  onClearLogs,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isStopping, setIsStopping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeSession = activeSessions.find((s) => s.status === 'running') || null;

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleCopyLogs = () => {
    const text = logs.map((l) => `[${l.timestamp.split('T')[1]?.slice(0, 8)}] [${l.type.toUpperCase()}] ${l.line}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStop = async () => {
    if (!activeSession) return;
    setIsStopping(true);
    await onStopSession(activeSession.serial);
    setIsStopping(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 bg-[#0E0E12] border-t border-zinc-800 shadow-2xl transition-all duration-300 flex flex-col ${
        isMinimized ? 'h-11' : 'h-80 sm:h-96'
      }`}
    >
      {/* Header Bar */}
      <div className="h-11 px-4 bg-[#121215] border-b border-zinc-800/80 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-zinc-300" />
            <span className="text-xs font-bold text-white tracking-tight">scrcpy Console</span>
          </div>

          {/* Active Status Badge */}
          {activeSession ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
              <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
              <span>LIVE ({activeSession.serial}) PID: {activeSession.pid}</span>
            </span>
          ) : (
            <span className="text-[11px] font-mono text-zinc-400">Idle</span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {activeSession && !isMinimized && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleStop}
              loading={isStopping}
              icon={<Square className="w-3 h-3 fill-red-400" />}
              className="py-1 text-[11px]"
            >
              Stop Session
            </Button>
          )}

          {!isMinimized && (
            <>
              <button
                type="button"
                onClick={() => setAutoScroll(!autoScroll)}
                className={`px-2 py-1 text-[11px] font-mono rounded border transition-colors ${
                  autoScroll
                    ? 'bg-zinc-800 text-white border-zinc-700'
                    : 'bg-transparent text-zinc-400 border-transparent hover:text-white'
                }`}
                title="Toggle auto-scroll to bottom"
              >
                Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
              </button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyLogs}
                title="Copy all logs to clipboard"
                icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                className="py-1 px-2"
              />

              <Button
                variant="ghost"
                size="sm"
                onClick={onClearLogs}
                title="Clear console output"
                icon={<Trash2 className="w-3.5 h-3.5" />}
                className="py-1 px-2 text-zinc-400 hover:text-rose-400"
              />
            </>
          )}

          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors"
            title={isMinimized ? 'Expand console' : 'Minimize console'}
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors"
            title="Close console"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Log Output Area */}
      {!isMinimized && (
        <div
          ref={scrollRef}
          className="flex-1 p-3.5 overflow-y-auto font-mono text-xs leading-relaxed space-y-1 bg-[#0A0A0C] selection:bg-zinc-700 select-text"
        >
          {logs.length === 0 ? (
            <div className="text-zinc-400 italic text-[11px] py-4 text-center">
              No session logs recorded yet. Launch scrcpy or an app from the library to view live stdout/stderr.
            </div>
          ) : (
            logs.map((log, i) => {
              const time = log.timestamp ? log.timestamp.split('T')[1]?.slice(0, 8) : '';
              let lineStyle = 'text-zinc-300';
              let badgeStyle = 'text-zinc-400';

              if (log.type === 'stderr') {
                lineStyle = 'text-rose-300';
                badgeStyle = 'text-rose-400 font-bold';
              } else if (log.type === 'system') {
                lineStyle = 'text-cyan-300';
                badgeStyle = 'text-cyan-400';
              }

              return (
                <div key={i} className="flex items-start gap-2 break-all hover:bg-zinc-900/50 px-1 py-0.5 rounded">
                  <span className="text-[10px] text-zinc-400 shrink-0 select-none">[{time}]</span>
                  <span className={`text-[10px] uppercase shrink-0 select-none ${badgeStyle}`}>
                    [{log.type}]
                  </span>
                  <span className={lineStyle}>{log.line}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
