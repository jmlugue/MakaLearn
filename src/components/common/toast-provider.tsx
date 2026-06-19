"use client";

import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Toast = {
  id: number;
  title: string;
  description?: string;
  tone?: "success" | "info" | "error";
};

type ToastContextValue = {
  notify: (toast: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((toast: Omit<Toast, "id">) => {
    const id = Date.now();
    setToasts((current) => [...current, { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3">
        {toasts.map((toast) => {
          const Icon = toast.tone === "success" ? CheckCircle2 : toast.tone === "error" ? AlertCircle : Info;
          const toneClass =
            toast.tone === "error"
              ? "border-red-200"
              : toast.tone === "success"
                ? "border-emerald-200"
                : "border-blue-100";
          const iconClass =
            toast.tone === "error"
              ? "text-red-600"
              : toast.tone === "success"
                ? "text-emerald-600"
                : "text-blue-600";
          return (
            <div
              key={toast.id}
              className={`rounded-lg border bg-white p-4 shadow-soft ${toneClass}`}
              role="status"
            >
              <div className="flex items-start gap-3">
                <Icon className={`mt-0.5 h-5 w-5 ${iconClass}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{toast.title}</p>
                  {toast.description ? (
                    <p className="mt-1 text-sm leading-5 text-slate-600">{toast.description}</p>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Dismiss notification"
                  onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return value;
}
