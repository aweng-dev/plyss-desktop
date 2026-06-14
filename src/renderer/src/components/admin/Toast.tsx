import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X, type LucideIcon } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | undefined>(undefined);

export const useToast = (): ToastApi => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};

const STYLES: Record<ToastKind, { icon: LucideIcon; accent: string }> = {
  success: { icon: CheckCircle2, accent: 'text-forest' },
  error: { icon: AlertCircle, accent: 'text-danger' },
  info: { icon: Info, accent: 'text-accent-deep' },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = nextId.current++;
    setToasts((cur) => [...cur, { id, kind, message }]);
    window.setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);

  const api: ToastApi = {
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-5 right-5 z-[400] flex flex-col gap-2.5 w-[min(92vw,22rem)]" role="region" aria-label="Notifications">
        {toasts.map((t) => {
          const { icon: Icon, accent } = STYLES[t.kind];
          return (
            <div
              key={t.id}
              role="status"
              className="flex items-start gap-3 rounded-lg border border-rule bg-paper shadow-xl px-4 py-3 animate-[hm-rise_0.22s_ease-out]"
            >
              <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${accent}`} strokeWidth={2} />
              <p className="flex-1 text-sm text-ink leading-snug">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="-mr-1 -mt-0.5 text-muted hover:text-ink transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
