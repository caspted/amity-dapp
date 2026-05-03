"use client";

import { useState, useCallback } from "react";

export type ToastVariant = "default" | "success" | "error" | "warning";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

let toastQueue: ((toast: Toast) => void) | null = null;

export function registerToastHandler(handler: (toast: Toast) => void) {
  toastQueue = handler;
}

export function toast(opts: Omit<Toast, "id">) {
  if (toastQueue) {
    toastQueue({ ...opts, id: Math.random().toString(36).slice(2) });
  }
}

export function useToastState() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((t: Toast) => {
    setToasts((prev) => [...prev, t]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== t.id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, dismiss };
}
