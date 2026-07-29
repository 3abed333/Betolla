"use client";

import { Button } from "@/components/ui";
import { toast } from "@/lib/toast";

export function CopyButton({ value, label, copiedLabel }: { value: string; label: string; copiedLabel: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(copiedLabel);
    } catch {
      // Clipboard API can be unavailable (older browsers, insecure context) - fail quietly.
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={copy}>
      {label}
    </Button>
  );
}
