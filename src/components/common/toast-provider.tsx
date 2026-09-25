"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

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

// Meaning colors only: green success, red error, blue for plain information.
const toneStyles = {
  success: { icon: CheckCircle2, stripe: "bg-emerald-500", tile: "bg-emerald-50 text-emerald-600", bar: "bg-emerald-400" },
  error: { icon: AlertCircle, stripe: "bg-red-500", tile: "bg-red-50 text-red-600", bar: "bg-red-400" },
  info: { icon: Info, stripe: "bg-blue-600", tile: "bg-blue-50 text-blue-600", bar: "bg-blue-400" }
};

type Timer = { handle: number; startedAt: number; remaining: number };

export function ToastProvider({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pausedId, setPausedId] = useState<number | null>(null);
  // A counter keeps ids unique even when two toasts fire in the same millisecond.
  const nextIdRef = useRef(0);
  const timersRef = useRef(new Map<number, Timer>());

  const dismiss = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer) window.clearTimeout(timer.handle);
    timersRef.current.delete(id);
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const startTimer = useCallback(
    (id: number, duration: number) => {
      timersRef.current.set(id, { handle: window.setTimeout(() => dismiss(id), duration), startedAt: Date.now(), remaining: duration });
    },
    [dismiss]
  );

  const notify = useCallback(
    (toast: Omit<Toast, "id">) => {
      nextIdRef.current += 1;
      const id = nextIdRef.current;
      setToasts((current) => [...current, { ...toast, id }]);
      startTimer(id, TOAST_MS);
    },
    [startTimer]
  );

  // Hovering a toast holds it (and its timer bar) so a longer message can be read.
  function pause(id: number) {
    const timer = timersRef.current.get(id);
    if (!timer) return;
    window.clearTimeout(timer.handle);
    timersRef.current.set(id, { ...timer, remaining: Math.max(400, timer.remaining - (Date.now() - timer.startedAt)) });
    setPausedId(id);
  }

  function resume(id: number) {
    const timer = timersRef.current.get(id);
    setPausedId(null);
    if (timer) startTimer(id, timer.remaining);
  }

  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach((timer) => window.clearTimeout(timer.handle));
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Top center on phones, top right on larger screens. */}
      <div
        className="pointer-events-none fixed inset-x-4 top-4 z-[200] mx-auto flex max-w-sm flex-col gap-3 sm:inset-x-auto sm:right-6 sm:top-6 sm:mx-0 sm:w-96"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const style = toneStyles[toast.tone ?? "info"];
            const Icon = style.icon;
            return (
              <motion.div
                key={toast.id}
                layout={!reduceMotion}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 40, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 40 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                onMouseEnter={() => pause(toast.id)}
                onMouseLeave={() => resume(toast.id)}
                className="glass-panel-strong pointer-events-auto relative overflow-hidden rounded-2xl border pl-1.5"
                role={toast.tone === "error" ? "alert" : "status"}
              >
                <span className={cn("absolute inset-y-0 left-0 w-1.5", style.stripe)} aria-hidden="true" />
                <div className="flex items-start gap-3 p-3.5">
                  <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", style.tile)}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-sm font-bold text-ink">{toast.title}</p>
                    {toast.description ? <p className="mt-0.5 text-sm leading-5 text-slate-600">{toast.description}</p> : null}
                  </div>
                  <button
                    type="button"
                    aria-label="Dismiss notification"
                    onClick={() => dismiss(toast.id)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <span
                  className={cn("toast-timer absolute bottom-0 left-1.5 right-0 h-1 origin-left", style.bar)}
                  style={{ animationDuration: `${TOAST_MS}ms`, animationPlayState: pausedId === toast.id ? "paused" : "running" }}
                  aria-hidden="true"
                />
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
