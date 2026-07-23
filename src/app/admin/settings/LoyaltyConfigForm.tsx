"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Input, Card, CardContent } from "@/components/ui";
import { toast } from "@/lib/toast";

export function LoyaltyConfigForm({
  initialValues,
}: {
  initialValues: { pointsPerJdSpent: string; redemptionValuePerPoint: string };
}) {
  const router = useRouter();
  const t = useTranslations("admin.settings.loyaltyConfig");
  const [pointsPerJdSpent, setPointsPerJdSpent] = useState(initialValues.pointsPerJdSpent);
  const [redemptionValuePerPoint, setRedemptionValuePerPoint] = useState(initialValues.redemptionValuePerPoint);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    const res = await fetch("/api/admin/settings/loyalty-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pointsPerJdSpent: Number(pointsPerJdSpent),
        redemptionValuePerPoint: Number(redemptionValuePerPoint),
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      toast.error(t("couldntSaveTitle"), data.error);
      return;
    }
    toast.success(t("saved"));
    router.refresh();
  }

  return (
    <Card className="max-w-lg">
      <CardContent className="flex flex-col gap-4">
        <Input
          label={t("pointsPerJd")}
          type="number"
          step="0.01"
          value={pointsPerJdSpent}
          onChange={(e) => setPointsPerJdSpent(e.target.value)}
        />
        <Input
          label={t("redemptionValue")}
          type="number"
          step="0.0001"
          value={redemptionValuePerPoint}
          onChange={(e) => setRedemptionValuePerPoint(e.target.value)}
          hint={t("redemptionValueHint")}
        />
        <Button onClick={submit} disabled={submitting} className="w-fit">
          {submitting ? t("saving") : t("save")}
        </Button>
      </CardContent>
    </Card>
  );
}
