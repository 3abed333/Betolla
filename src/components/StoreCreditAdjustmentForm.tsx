"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Input, Card, CardContent } from "@/components/ui";
import { toast } from "@/lib/toast";

export function StoreCreditAdjustmentForm({ userId }: { userId: string }) {
  const router = useRouter();
  const t = useTranslations("admin.users.storeCreditForm");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const parsedAmount = Number(amount);
    if (!parsedAmount || !reason.trim()) {
      toast.error(t("amountRequired"));
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/admin/users/${userId}/store-credit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: parsedAmount, reason: reason.trim() }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      toast.error(t("couldntAdjustTitle"), data.error);
      return;
    }
    toast.success(t("adjusted"));
    setAmount("");
    setReason("");
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <p className="font-medium text-ink">{t("title")}</p>
        <div className="flex flex-wrap items-end gap-3">
          <Input
            label={t("amountLabel")}
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            hint={t("amountHint")}
            className="w-40"
          />
          <Input
            label={t("reasonLabel")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("reasonPlaceholder")}
            className="w-72"
          />
          <Button onClick={submit} disabled={submitting}>
            {submitting ? t("saving") : t("apply")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
