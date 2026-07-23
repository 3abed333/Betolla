"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Textarea, Button } from "@/components/ui";
import { toast } from "@/lib/toast";

const STATUSES = ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export function DeliverySupportControls({
  reportId,
  status,
  assignedToId,
  staffNote,
  assignableUsers,
}: {
  reportId: string;
  status: string;
  assignedToId: string | null;
  staffNote: string | null;
  assignableUsers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const t = useTranslations("admin.deliverySupport.controls");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("common.ticketStatus");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(staffNote ?? "");

  async function updateStatus(newStatus: string) {
    setBusy(true);
    const res = await fetch(`/api/admin/delivery-support/${reportId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, staffNote: note || undefined }),
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

  async function saveNote() {
    setBusy(true);
    const res = await fetch(`/api/admin/delivery-support/${reportId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, staffNote: note || undefined }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast.error(t("couldntSaveNoteTitle"), data.error);
      return;
    }
    toast.success(t("noteSaved"));
    router.refresh();
  }

  async function updateAssignee(newAssigneeId: string) {
    setBusy(true);
    const res = await fetch(`/api/admin/delivery-support/${reportId}/assign`, {
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
    <div className="flex flex-col gap-4">
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
      <div className="flex flex-col gap-2">
        <Textarea label={t("noteLabel")} value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
        <Button size="sm" className="w-fit" onClick={saveNote} disabled={busy || note === (staffNote ?? "")}>
          {t("saveNote")}
        </Button>
      </div>
    </div>
  );
}
