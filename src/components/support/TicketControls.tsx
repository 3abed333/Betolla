"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui";
import { toast } from "@/lib/toast";

const STATUSES = ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export function TicketControls({
  ticketId,
  status,
  assignedToId,
  assignableUsers,
}: {
  ticketId: string;
  status: string;
  assignedToId: string | null;
  assignableUsers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const t = useTranslations("admin.support.controls");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("common.ticketStatus");
  const [busy, setBusy] = useState(false);

  async function updateStatus(newStatus: string) {
    setBusy(true);
    const res = await fetch(`/api/admin/support-tickets/${ticketId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast.error(t("couldntUpdateStatusTitle"), data.error);
      return;
    }
    toast.success(t("statusUpdated"));
    router.refresh();
  }

  async function updateAssignee(newAssigneeId: string) {
    setBusy(true);
    const res = await fetch(`/api/admin/support-tickets/${ticketId}/assign`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToId: newAssigneeId === "unassigned" ? null : newAssigneeId }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast.error(t("couldntUpdateAssignmentTitle"), data.error);
      return;
    }
    toast.success(t("assignmentUpdated"));
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-ink-muted">{t("status")}</label>
        <Select value={status} onValueChange={updateStatus} disabled={busy}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {tStatus(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-ink-muted">{t("assignedTo")}</label>
        <Select value={assignedToId ?? "unassigned"} onValueChange={updateAssignee} disabled={busy}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">{tCommon("unassigned")}</SelectItem>
            {assignableUsers.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
