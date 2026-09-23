import React from 'react';
import { ToastMessage } from '../../types';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />,
          error: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />,
          info: <Info className="w-4 h-4 text-white shrink-0 mt-0.5" />,
        };

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 p-3.5 bg-[#18181C] border border-zinc-700/80 rounded-xl shadow-xl text-xs text-zinc-200 animate-in slide-in-from-bottom-3 duration-150"
          >
            {icons[toast.type]}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white tracking-tight">{toast.title}</p>
              {toast.description && (
                <p className="text-zinc-400 mt-0.5 text-[11px] leading-relaxed break-words">
                  {toast.description}
                </p>
              )}
              {toast.undoAction && (
                <button
                  onClick={() => {
                    toast.undoAction?.onClick();
                    onDismiss(toast.id);
                  }}
                  className="mt-2 text-[11px] font-semibold text-white underline hover:text-zinc-300 underline-offset-2 transition-colors"
                >
                  {toast.undoAction.label}
                </button>
              )}
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-zinc-400 hover:text-white p-0.5 rounded transition-colors"
              aria-label="Dismiss toast"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
