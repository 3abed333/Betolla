"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Input, Checkbox, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui";
import { toast } from "@/lib/toast";

export type PromoCodeFormValues = {
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: string;
  minOrderTotal: string;
  targetSegment: "ALL" | "TOP_30" | "BOTTOM_30";
  startsAt: string;
  expiresAt: string;
  usageLimitTotal: string;
  usageLimitPerUser: string;
  isActive: boolean;
};

const EMPTY_VALUES: PromoCodeFormValues = {
  code: "",
  discountType: "PERCENTAGE",
  discountValue: "",
  minOrderTotal: "0",
  targetSegment: "ALL",
  startsAt: "",
  expiresAt: "",
  usageLimitTotal: "",
  usageLimitPerUser: "",
  isActive: true,
};

function toDateInputValue(value: string) {
  return value ? value.slice(0, 10) : "";
}

export function PromoCodeForm({
  initialValues,
  promoCodeId,
}: {
  initialValues?: PromoCodeFormValues;
  promoCodeId?: string;
}) {
  const router = useRouter();
  const t = useTranslations("admin.promoCodeForm");
  const tSegment = useTranslations("common.promoSegment");
  const [values, setValues] = useState<PromoCodeFormValues>(
    initialValues
      ? { ...initialValues, startsAt: toDateInputValue(initialValues.startsAt), expiresAt: toDateInputValue(initialValues.expiresAt) }
      : EMPTY_VALUES,
  );
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof PromoCodeFormValues>(key: K, value: PromoCodeFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function submit() {
    if (!values.code.trim() || !values.discountValue) {
      toast.error(t("codeRequired"));
      return;
    }
    setSubmitting(true);
    const payload = {
      code: values.code,
      discountType: values.discountType,
      discountValue: Number(values.discountValue),
      minOrderTotal: Number(values.minOrderTotal || 0),
      targetSegment: values.targetSegment,
      startsAt: values.startsAt || null,
      expiresAt: values.expiresAt || null,
      usageLimitTotal: values.usageLimitTotal ? Number(values.usageLimitTotal) : null,
      usageLimitPerUser: values.usageLimitPerUser ? Number(values.usageLimitPerUser) : null,
      isActive: values.isActive,
    };
    const res = await fetch(promoCodeId ? `/api/admin/promo-codes/${promoCodeId}` : "/api/admin/promo-codes", {
      method: promoCodeId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      toast.error(t("couldntSaveTitle"), data.error);
      return;
    }
    toast.success(promoCodeId ? t("updated") : t("created"));
    router.push("/admin/promo-codes");
    router.refresh();
  }

  return (
    <div className="flex max-w-xl flex-col gap-5">
      <Input
        label={t("code")}
        value={values.code}
        onChange={(e) => set("code", e.target.value.toUpperCase())}
        placeholder={t("codePlaceholder")}
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink">{t("discountType")}</label>
          <Select value={values.discountType} onValueChange={(v) => set("discountType", v as PromoCodeFormValues["discountType"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PERCENTAGE">{t("percentage")}</SelectItem>
              <SelectItem value="FIXED">{t("fixedAmount")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Input
          label={values.discountType === "PERCENTAGE" ? t("discountPercent") : t("discountJD")}
          type="number"
          step="0.001"
          value={values.discountValue}
          onChange={(e) => set("discountValue", e.target.value)}
        />
        <Input
          label={t("minOrderTotal")}
          type="number"
          step="0.001"
          value={values.minOrderTotal}
          onChange={(e) => set("minOrderTotal", e.target.value)}
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink">{t("targetSegment")}</label>
          <Select value={values.targetSegment} onValueChange={(v) => set("targetSegment", v as PromoCodeFormValues["targetSegment"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{tSegment("ALL")}</SelectItem>
              <SelectItem value="TOP_30">{tSegment("TOP_30")}</SelectItem>
              <SelectItem value="BOTTOM_30">{tSegment("BOTTOM_30")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Input
          label={t("startsAt")}
          type="date"
          value={values.startsAt}
          onChange={(e) => set("startsAt", e.target.value)}
        />
        <Input
          label={t("expiresAt")}
          type="date"
          value={values.expiresAt}
          onChange={(e) => set("expiresAt", e.target.value)}
        />
        <Input
          label={t("usageLimitTotal")}
          type="number"
          min={1}
          value={values.usageLimitTotal}
          onChange={(e) => set("usageLimitTotal", e.target.value)}
          hint={t("unlimitedHint")}
        />
        <Input
          label={t("usageLimitPerUser")}
          type="number"
          min={1}
          value={values.usageLimitPerUser}
          onChange={(e) => set("usageLimitPerUser", e.target.value)}
          hint={t("unlimitedHint")}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-ink">
        <Checkbox checked={values.isActive} onCheckedChange={(c) => set("isActive", c === true)} />
        {t("activeCheckbox")}
      </label>

      <Button onClick={submit} disabled={submitting} className="w-fit">
        {submitting ? t("saving") : promoCodeId ? t("saveChanges") : t("createPromoCode")}
      </Button>
    </div>
  );
}
