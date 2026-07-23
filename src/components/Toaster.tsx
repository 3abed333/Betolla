"use client";

import * as ToastPrimitive from "@radix-ui/react-toast";
import { useToastStore } from "@/store/toast-store";
import { cn } from "@/lib/cn";

const VARIANT_STYLES = {
  success: "border-success/40 bg-surface text-ink",
  error: "border-red-500/40 bg-surface text-ink",
  info: "border-border bg-surface text-ink",
} as const;

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  return (
    <ToastPrimitive.Provider swipeDirection="right" duration={5000}>
      {toasts.map((t) => (
        <ToastPrimitive.Root
          key={t.id}
          onOpenChange={(open) => {
            if (!open) removeToast(t.id);
          }}
          className={cn(
            "rounded-xl border p-4 shadow-lg data-[state=closed]:hidden",
            VARIANT_STYLES[t.variant],
          )}
        >
          <ToastPrimitive.Title className="font-medium">{t.title}</ToastPrimitive.Title>
          {t.description && (
            <ToastPrimitive.Description className="mt-1 text-sm text-ink-muted">
              {t.description}
            </ToastPrimitive.Description>
          )}
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport className="fixed bottom-0 end-0 z-[100] m-0 flex w-full max-w-sm flex-col gap-2 p-6 outline-none" />
    </ToastPrimitive.Provider>
  );
}
