"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { type ComponentProps, forwardRef, useRef } from "react";
import { cn } from "@/lib/cn";

export const Drawer = DialogPrimitive.Root;
export const DrawerTrigger = DialogPrimitive.Trigger;
export const DrawerClose = DialogPrimitive.Close;

const SWIPE_CLOSE_THRESHOLD_PX = 60;

export const DrawerContent = forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  ComponentProps<typeof DialogPrimitive.Content> & { title: string; closeLabel?: string; side?: "start" | "end" }
>(({ className, children, title, closeLabel = "Close", side = "start", onTouchStart, onTouchEnd, ...props }, ref) => {
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    touchStartX.current = e.touches[0].clientX;
    onTouchStart?.(e);
  }

  function handleTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    if (touchStartX.current != null) {
      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      const isRtl = document.documentElement.dir === "rtl";
      const anchoredRight = side === "start" ? isRtl : !isRtl;
      const swipedTowardEdge = anchoredRight
        ? deltaX > SWIPE_CLOSE_THRESHOLD_PX
        : deltaX < -SWIPE_CLOSE_THRESHOLD_PX;
      if (swipedTowardEdge) closeRef.current?.click();
    }
    touchStartX.current = null;
    onTouchEnd?.(e);
  }

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="drawer-overlay fixed inset-0 z-50 bg-black/50" />
      <DialogPrimitive.Content
        ref={ref}
        data-side={side}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={cn(
          "drawer-panel fixed inset-y-0 z-50 h-full w-72 max-w-[80vw] overflow-y-auto bg-surface p-6 shadow-xl focus:outline-none",
          side === "start"
            ? "start-0 border-e border-border"
            : "end-0 border-s border-border",
          className,
        )}
        {...props}
      >
        <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
        <DialogPrimitive.Close ref={closeRef} className="sr-only" tabIndex={-1}>
          {closeLabel}
        </DialogPrimitive.Close>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});
DrawerContent.displayName = "DrawerContent";
