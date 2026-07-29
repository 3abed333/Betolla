"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import { toast } from "@/lib/toast";

const nextByStatus = {
  REQUESTED: ["APPROVED", "REJECTED"],
  APPROVED: ["RECEIVED"],
  RECEIVED: ["REFUNDED"],
  REJECTED: [],
  REFUNDED: [],
} as const;

export function ReturnActions({
  id,
  status,
  labels,
}: {
  id: string;
  status: keyof typeof nextByStatus;
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function update(nextStatus: string) {
    setPending(true);
    const response = await fetch(`/api/admin/returns/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const data = await response.json();
    setPending(false);
    if (!response.ok) {
      toast.error(labels.error, data.error);
      return;
    }
    router.refresh();
  }
  return (
    <div className="flex flex-wrap gap-2">
      {nextByStatus[status].map((next) => (
        <Button
          key={next}
          size="sm"
          variant={next === "REJECTED" ? "outline" : "primary"}
          disabled={pending}
          onClick={() => update(next)}
        >
          {labels[next]}
        </Button>
      ))}
    </div>
  );
}
