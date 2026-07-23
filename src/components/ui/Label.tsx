"use client";

import * as LabelPrimitive from "@radix-ui/react-label";
import { type ComponentProps, forwardRef } from "react";
import { cn } from "@/lib/cn";

export const Label = forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  ComponentProps<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn("text-sm font-medium text-ink", className)} {...props} />
));
Label.displayName = "Label";
