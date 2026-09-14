"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const TOAST_MS = 3000;

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
  const reduceMotion = useReducedMotion();
  const [toasts, setToasts] = useState<Toast[]>([]);
  // A counter keeps ids unique even when two toasts fire in the same millisecond.
  const nextIdRef = useRef(0);
  const timersRef = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) window.clearTimeout(timer);
    timersRef.current.delete(id);
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback(
    (toast: Omit<Toast, "id">) => {
      nextIdRef.current += 1;
      const id = nextIdRef.current;
      setToasts((current) => [...current, { ...toast, id }]);
      timersRef.current.set(id, window.setTimeout(() => dismiss(id), TOAST_MS));
    },
    [dismiss]
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[200] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3">
        <AnimatePresence initial={false}>
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
              <motion.div
                key={toast.id}
                layout={!reduceMotion}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 40 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className={`pointer-events-auto rounded-lg border bg-white p-4 shadow-soft ${toneClass}`}
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
                    onClick={() => dismiss(toast.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
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
