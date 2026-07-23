"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Button, Input, Textarea, Checkbox } from "@/components/ui";
import { SingleImageUploader } from "@/components/ImageUploader";
import { toast } from "@/lib/toast";
import { formatCurrency } from "@/lib/format";
import type { AppLocale } from "@/i18n/config";

export type BundleFormValues = {
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  bundlePrice: string;
  mainImageUrl: string;
  isActive: boolean;
  itemProductIds: string[];
};

export function BundleForm({
  products,
  initialValues,
  bundleId,
}: {
  products: { id: string; nameEn: string; price: string }[];
  initialValues?: BundleFormValues;
  bundleId?: string;
}) {
  const router = useRouter();
  const t = useTranslations("admin.bundleForm");
  const locale = useLocale() as AppLocale;
  const [values, setValues] = useState<BundleFormValues>(
    initialValues ?? {
      nameEn: "",
      nameAr: "",
      descriptionEn: "",
      descriptionAr: "",
      bundlePrice: "",
      mainImageUrl: "",
      isActive: true,
      itemProductIds: [],
    },
  );
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof BundleFormValues>(key: K, value: BundleFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function toggleProduct(id: string) {
    set(
      "itemProductIds",
      values.itemProductIds.includes(id)
        ? values.itemProductIds.filter((p) => p !== id)
        : [...values.itemProductIds, id],
    );
  }

  const componentTotal = products
    .filter((p) => values.itemProductIds.includes(p.id))
    .reduce((sum, p) => sum + Number(p.price), 0);

  async function submit() {
    if (!values.mainImageUrl || values.itemProductIds.length === 0) {
      toast.error(t("requiredFields"));
      return;
    }
    setSubmitting(true);
    const payload = {
      nameEn: values.nameEn,
      nameAr: values.nameAr,
      descriptionEn: values.descriptionEn,
      descriptionAr: values.descriptionAr,
      bundlePrice: Number(values.bundlePrice),
      mainImageUrl: values.mainImageUrl,
      isActive: values.isActive,
      items: values.itemProductIds.map((productId) => ({ productId, quantity: 1 })),
    };
    const res = await fetch(bundleId ? `/api/bundles/${bundleId}` : "/api/bundles", {
      method: bundleId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      toast.error(t("couldntSaveTitle"), data.error);
      return;
    }
    toast.success(bundleId ? t("updated") : t("created"));
    router.push("/admin/bundles");
    router.refresh();
  }

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div>
        <label className="text-sm font-medium text-ink">{t("mainPhoto")}</label>
        <div className="mt-1.5">
          <SingleImageUploader value={values.mainImageUrl} onChange={(url) => set("mainImageUrl", url)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label={t("nameEn")} value={values.nameEn} onChange={(e) => set("nameEn", e.target.value)} />
        <Input label={t("nameAr")} value={values.nameAr} onChange={(e) => set("nameAr", e.target.value)} dir="rtl" />
        <Textarea
          label={t("descriptionEn")}
          value={values.descriptionEn}
          onChange={(e) => set("descriptionEn", e.target.value)}
          className="col-span-2"
        />
        <Textarea
          label={t("descriptionAr")}
          value={values.descriptionAr}
          onChange={(e) => set("descriptionAr", e.target.value)}
          dir="rtl"
          className="col-span-2"
        />
        <Input
          label={t("bundlePriceJD")}
          type="number"
          step="0.001"
          value={values.bundlePrice}
          onChange={(e) => set("bundlePrice", e.target.value)}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-ink">
          {t("productsInBundle")}{" "}
          {componentTotal > 0 && t("componentsSum", { amount: formatCurrency(componentTotal, locale) })}
        </label>
        <div className="mt-2 grid max-h-64 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-border p-3">
          {products.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm text-ink">
              <Checkbox
                checked={values.itemProductIds.includes(p.id)}
                onCheckedChange={() => toggleProduct(p.id)}
              />
              {p.nameEn}
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink">
        <Checkbox checked={values.isActive} onCheckedChange={(c) => set("isActive", c === true)} />
        {t("activeCheckbox")}
      </label>

      <Button onClick={submit} disabled={submitting} className="w-fit">
        {submitting ? t("saving") : bundleId ? t("saveChanges") : t("createBundle")}
      </Button>
    </div>
  );
}
