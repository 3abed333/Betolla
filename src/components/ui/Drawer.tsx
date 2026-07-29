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
  ComponentProps<typeof DialogPrimitive.Content> & { title: string; side?: "start" | "end" }
>(({ className, children, title, side = "start", onTouchStart, onTouchEnd, ...props }, ref) => {
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
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 transition-opacity duration-300 data-[state=closed]:opacity-0 data-[state=open]:opacity-100" />
      <DialogPrimitive.Content
        ref={ref}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={cn(
          "fixed inset-y-0 z-50 h-full w-72 max-w-[80vw] overflow-y-auto bg-surface p-6 shadow-xl transition-transform duration-300 ease-in-out focus:outline-none",
          "data-[state=open]:translate-x-0",
          side === "start"
            ? "start-0 border-e border-border data-[state=closed]:-translate-x-full rtl:data-[state=closed]:translate-x-full"
            : "end-0 border-s border-border data-[state=closed]:translate-x-full rtl:data-[state=closed]:-translate-x-full",
          className,
        )}
        {...props}
      >
        <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
        <DialogPrimitive.Close ref={closeRef} className="sr-only" tabIndex={-1}>
          Close
        </DialogPrimitive.Close>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});
DrawerContent.displayName = "DrawerContent";
