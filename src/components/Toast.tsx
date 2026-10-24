import React, { useEffect, useState } from 'react';
import { useStore } from '../domain/store.tsx';
import { ToastNotification } from '../types/index.ts';
import {
  CheckCircle2,
  Bell,
  AlertCircle,
  Info,
  X,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface ToastItemProps {
  toast: ToastNotification;
  onDismiss: (id: string) => void;
}

export const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(100);
  const duration = toast.durationMs || 6000;

  useEffect(() => {
    if (isHovered) return;

    const timeout = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPercent = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remainingPercent);
    }, 50);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [isHovered, duration, onDismiss, toast.id]);

  const getIcon = () => {
    switch (toast.type) {
      case 'claim':
        return (
          <span className="w-8 h-8 rounded-xl bg-[#2D6A4F]/15 text-[#2D6A4F] flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 animate-bounce" />
          </span>
        );
      case 'success':
        return (
          <span className="w-8 h-8 rounded-xl bg-[#2D6A4F]/15 text-[#2D6A4F] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </span>
        );
      case 'warning':
        return (
          <span className="w-8 h-8 rounded-xl bg-[#BA181B]/15 text-[#BA181B] flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4" />
          </span>
        );
      case 'info':
      default:
        return (
          <span className="w-8 h-8 rounded-xl bg-[#D97706]/15 text-[#D97706] flex items-center justify-center shrink-0">
            <Info className="w-4 h-4" />
          </span>
        );
    }
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="pointer-events-auto relative w-full overflow-hidden rounded-2xl bg-white/95 backdrop-blur-md border border-[#E8DEC9] shadow-xl p-4 transition-all duration-300 hover:shadow-2xl animate-in slide-in-from-top-3 fade-in"
    >
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <h4 className="text-xs font-bold font-display text-[#1E1611] tracking-tight truncate">
                {toast.title}
              </h4>
              {toast.type === 'claim' && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-[#2D6A4F] text-white">
                  <Sparkles className="w-2.5 h-2.5" />
                  Live Alert
                </span>
              )}
            </div>
            <span className="text-[10px] text-[#7E7063] font-mono shrink-0">
              {new Date(toast.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          <p className="mt-1 text-xs text-[#4E4035] leading-relaxed break-words">
            {toast.message}
          </p>

          {toast.actionLabel && toast.onAction && (
            <div className="mt-2.5">
              <button
                type="button"
                onClick={() => {
                  toast.onAction?.();
                  onDismiss(toast.id);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#2D6A4F] hover:bg-[#1B4332] rounded-lg transition-colors shadow-xs"
              >
                <span>{toast.actionLabel}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Dismiss Close Button */}
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="absolute top-3 right-3 p-1 rounded-lg text-[#7E7063] hover:text-[#1E1611] hover:bg-[#F3ECE1] transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar indicating countdown */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#FAF7F2]">
        <div
          className={`h-full transition-all duration-75 ease-linear ${
            toast.type === 'claim'
              ? 'bg-[#2D6A4F]'
              : toast.type === 'warning'
              ? 'bg-[#BA181B]'
              : 'bg-[#D97706]'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useStore();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications Toast Container"
      className="fixed top-20 right-4 left-4 sm:left-auto sm:right-6 z-[70] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
};
