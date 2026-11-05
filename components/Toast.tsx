"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export interface Toast {
  id: string;
  type: "success" | "error" | "info";
  title?: string;
  message: string;
}

interface ToastContextType {
  addToast: (type: "success" | "error" | "info", message: string, title?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: "success" | "error" | "info", message: string, title?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      setToasts((prev) => [...prev, { id, type, title, message }]);

      // Auto-dismiss after 4.5 seconds
      setTimeout(() => {
        removeToast(id);
      }, 4500);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Floating Toast Notification Stack in bottom-right */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto flex items-start justify-between p-3.5 rounded-xl shadow-lg border text-xs transition-all duration-200 backdrop-blur-xs ${
              toast.type === "success"
                ? "bg-emerald-950/95 text-emerald-100 border-emerald-800 shadow-emerald-950/30"
                : toast.type === "error"
                ? "bg-rose-950/95 text-rose-100 border-rose-800 shadow-rose-950/30"
                : "bg-zinc-900/95 text-zinc-100 border-zinc-700 shadow-zinc-900/30"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <span
                className={`text-sm font-black flex items-center justify-center w-4 h-4 rounded-full ${
                  toast.type === "success"
                    ? "text-emerald-400"
                    : toast.type === "error"
                    ? "text-rose-400"
                    : "text-blue-400"
                }`}
              >
                {toast.type === "success"
                  ? "✓"
                  : toast.type === "error"
                  ? "!"
                  : "ℹ"}
              </span>
              <div className="flex-1">
                {toast.title && (
                  <div className="font-bold text-white mb-0.5">{toast.title}</div>
                )}
                <div className="leading-relaxed opacity-95">{toast.message}</div>
              </div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-3 text-white/50 hover:text-white font-bold text-base leading-none transition-colors"
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

