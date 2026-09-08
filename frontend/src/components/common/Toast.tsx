import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
}

interface ToastContextType {
  showToast: (first: ToastType | string, second?: string | ToastType, title?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((first: ToastType | string, second?: string | ToastType, title?: string) => {
    let type: ToastType = 'info';
    let message = '';

    if (first === 'success' || first === 'error' || first === 'warning' || first === 'info') {
      type = first;
      message = typeof second === 'string' ? second : '';
    } else {
      message = typeof first === 'string' ? first : '';
      if (second === 'success' || second === 'error' || second === 'warning' || second === 'info') {
        type = second;
      }
    }

    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, message, title }]);
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          let borderColor = 'border-cyber-cyan/50';
          let bgColor = 'bg-cyber-card/95';
          let textColor = 'text-cyber-cyan';
          let Icon = Info;

          if (toast.type === 'success') {
            borderColor = 'border-cyber-emerald/50';
            textColor = 'text-cyber-emerald';
            Icon = CheckCircle;
          } else if (toast.type === 'warning') {
            borderColor = 'border-cyber-amber/50';
            textColor = 'text-cyber-amber';
            Icon = AlertTriangle;
          } else if (toast.type === 'error') {
            borderColor = 'border-cyber-crimson/50';
            textColor = 'text-cyber-crimson';
            Icon = XCircle;
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 ${bgColor} ${borderColor}`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${textColor}`} />
              <div className="flex-1 text-sm">
                {toast.title && <div className="font-semibold text-cyber-text">{toast.title}</div>}
                <div className="text-cyber-muted text-xs mt-0.5">{toast.message}</div>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-cyber-muted hover:text-cyber-text transition-colors"
                aria-label="Close alert"
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

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
