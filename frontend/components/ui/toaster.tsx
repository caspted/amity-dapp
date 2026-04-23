"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useToastState, registerToastHandler, type ToastVariant } from "@/hooks/use-toast";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

const icons: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle className="h-4 w-4 text-success" />,
  error: <XCircle className="h-4 w-4 text-destructive" />,
  warning: <AlertTriangle className="h-4 w-4 text-warning" />,
  default: <Info className="h-4 w-4 text-primary" />,
};

export function Toaster() {
  const { toasts, addToast, dismiss } = useToastState();

  useEffect(() => {
    registerToastHandler(addToast);
  }, [addToast]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex items-start gap-3 rounded-lg border bg-card p-4 shadow-lg animate-in slide-in-from-right-full duration-300",
            t.variant === "error" && "border-destructive/50",
            t.variant === "success" && "border-success/50",
            t.variant === "warning" && "border-warning/50"
          )}
        >
          <div className="mt-0.5">{icons[t.variant ?? "default"]}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{t.title}</p>
            {t.description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.description}</p>
            )}
          </div>
          <button
            onClick={() => dismiss(t.id)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
