"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { type ComponentProps, forwardRef } from "react";
import { cn } from "@/lib/cn";

export const Checkbox = forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  ComponentProps<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "flex h-5 w-5 items-center justify-center rounded border border-border bg-surface data-[state=checked]:border-cta data-[state=checked]:bg-cta",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator>
      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 text-cta-foreground">
        <path
          d="M3 8.5l3 3 7-7"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = "Checkbox";
