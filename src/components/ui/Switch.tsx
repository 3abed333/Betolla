"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import { type ComponentProps, forwardRef } from "react";
import { cn } from "@/lib/cn";

export const Switch = forwardRef<
  React.ComponentRef<typeof SwitchPrimitive.Root>,
  ComponentProps<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-6 w-11 shrink-0 rounded-full bg-surface-secondary border border-border transition-colors data-[state=checked]:border-success data-[state=checked]:bg-success",
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="block h-4 w-4 translate-x-1 rounded-full bg-surface shadow transition-transform data-[state=checked]:translate-x-6 rtl:data-[state=checked]:-translate-x-6" />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";
