"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  Button,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui";
import { ReportPhotoUploader } from "@/components/ImageUploader";
import { PROBLEM_TYPE_OPTIONS, URGENCY_OPTIONS } from "@/lib/deliverySupport";
import { toast } from "@/lib/toast";

export function ReportProblemDialog({
  deliveryAssignmentId,
  trigger,
}: {
  deliveryAssignmentId?: string;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const t = useTranslations("delivery.reportProblemDialog");
  const tCommon = useTranslations("common");
  const tProblemType = useTranslations("common.deliveryProblemType");
  const tUrgency = useTranslations("common.deliveryUrgency");
  const [open, setOpen] = useState(false);
  const [problemType, setProblemType] = useState<(typeof PROBLEM_TYPE_OPTIONS)[number]>(PROBLEM_TYPE_OPTIONS[0]);
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [urgency, setUrgency] = useState<(typeof URGENCY_OPTIONS)[number]>("NORMAL");
  const [submitting, setSubmitting] = useState(false);

  const descriptionRequired = problemType === "OTHER";

  async function submit() {
    setSubmitting(true);
    const res = await fetch("/api/delivery/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        problemType,
        description: description.trim() || undefined,
        photoUrl: photoUrl ?? undefined,
        urgency,
        deliveryAssignmentId,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      toast.error(t("couldntFileTitle"), data.error);
      return;
    }
    setOpen(false);
    setProblemType(PROBLEM_TYPE_OPTIONS[0]);
    setDescription("");
    setPhotoUrl(null);
    setUrgency("NORMAL");
    router.push(`/delivery/reports/${data.report.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button variant="outline">{t("trigger")}</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-sm font-medium text-ink">{t("problemTypeLabel")}</label>
            <Select value={problemType} onValueChange={(v) => setProblemType(v as (typeof PROBLEM_TYPE_OPTIONS)[number])}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROBLEM_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {tProblemType(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-ink">{t("urgencyLabel")}</label>
            <Select value={urgency} onValueChange={(v) => setUrgency(v as (typeof URGENCY_OPTIONS)[number])}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {URGENCY_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {tUrgency(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            label={descriptionRequired ? t("descriptionRequired") : t("descriptionOptional")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
          <div>
            <label className="text-sm font-medium text-ink">{t("photoLabel")}</label>
            <div className="mt-1.5">
              <ReportPhotoUploader value={photoUrl} onChange={setPhotoUrl} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={submitting}>
              {tCommon("cancel")}
            </Button>
          </DialogClose>
          <Button onClick={submit} disabled={submitting || (descriptionRequired && !description.trim())}>
            {submitting ? t("submitting") : t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
