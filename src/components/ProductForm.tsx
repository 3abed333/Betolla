"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Button, Input, Textarea, Checkbox, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui";
import { SingleImageUploader, GalleryUploader } from "@/components/ImageUploader";
import { toast } from "@/lib/toast";
import { localizedField } from "@/lib/localizedField";
import type { AppLocale } from "@/i18n/config";

export type ProductFormValues = {
  sku: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  lowStockThreshold: string;
  categoryId: string;
  mainImageUrl: string;
  galleryUrls: string[];
  isActive: boolean;
  isFeatured: boolean;
  knowledgeHtmlEn: string;
  knowledgeHtmlAr: string;
  knowledgeActive: boolean;
};

const EMPTY: ProductFormValues = {
  sku: "",
  nameEn: "",
  nameAr: "",
  descriptionEn: "",
  descriptionAr: "",
  price: "",
  compareAtPrice: "",
  stock: "0",
  lowStockThreshold: "",
  categoryId: "",
  mainImageUrl: "",
  galleryUrls: [],
  isActive: true,
  isFeatured: false,
  knowledgeHtmlEn: "",
  knowledgeHtmlAr: "",
  knowledgeActive: false,
};

export function ProductForm({
  categories,
  initialValues,
  productId,
  redirectPath = "/admin/products",
}: {
  categories: { id: string; nameEn: string; nameAr: string }[];
  initialValues?: ProductFormValues;
  productId?: string;
  redirectPath?: string;
}) {
  const router = useRouter();
  const t = useTranslations("admin.productForm");
  const locale = useLocale() as AppLocale;
  const [values, setValues] = useState<ProductFormValues>(initialValues ?? { ...EMPTY, categoryId: categories[0]?.id ?? "" });
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function submit() {
    if (!values.mainImageUrl) {
      toast.error(t("mainPhotoRequired"));
      return;
    }
    setSubmitting(true);
    const payload = {
      sku: values.sku,
      nameEn: values.nameEn,
      nameAr: values.nameAr,
      descriptionEn: values.descriptionEn,
      descriptionAr: values.descriptionAr,
      price: Number(values.price),
      compareAtPrice: values.compareAtPrice ? Number(values.compareAtPrice) : null,
      stock: Number(values.stock),
      lowStockThreshold: values.lowStockThreshold ? Number(values.lowStockThreshold) : null,
      categoryId: values.categoryId,
      mainImageUrl: values.mainImageUrl,
      galleryUrls: values.galleryUrls,
      isActive: values.isActive,
      isFeatured: values.isFeatured,
      knowledgeHtmlEn: values.knowledgeHtmlEn,
      knowledgeHtmlAr: values.knowledgeHtmlAr,
      knowledgeActive: values.knowledgeActive,
    };
    const res = await fetch(productId ? `/api/products/${productId}` : "/api/products", {
      method: productId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      toast.error(t("couldntSaveTitle"), data.error);
      return;
    }
    toast.success(productId ? t("updated") : t("created"));
    router.push(redirectPath);
    router.refresh();
  }

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div>
        <label className="text-sm font-medium text-ink">{t("mainPhoto")}</label>
        <div className="mt-1.5">
          <SingleImageUploader value={values.mainImageUrl} onChange={(url) => set("mainImageUrl", url)} />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-ink">{t("galleryPhotos")}</label>
        <div className="mt-1.5">
          <GalleryUploader value={values.galleryUrls} onChange={(urls) => set("galleryUrls", urls)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input label={t("sku")} value={values.sku} onChange={(e) => set("sku", e.target.value)} />
        <div>
          <label className="text-sm font-medium text-ink">{t("category")}</label>
          <Select value={values.categoryId} onValueChange={(v) => set("categoryId", v)}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {localizedField(locale, c.nameEn, c.nameAr)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input label={t("nameEn")} value={values.nameEn} onChange={(e) => set("nameEn", e.target.value)} />
        <Input label={t("nameAr")} value={values.nameAr} onChange={(e) => set("nameAr", e.target.value)} dir="rtl" />
        <Textarea
          label={t("descriptionEn")}
          hint={t("descriptionHint")}
          rows={6}
          value={values.descriptionEn}
          onChange={(e) => set("descriptionEn", e.target.value)}
          placeholder="<p>...</p><details><summary>Ingredients</summary><p>...</p></details>"
          className="col-span-2 font-mono"
        />
        <Textarea
          label={t("descriptionAr")}
          hint={t("descriptionHint")}
          rows={6}
          value={values.descriptionAr}
          onChange={(e) => set("descriptionAr", e.target.value)}
          placeholder="<p>...</p><details><summary>المكونات</summary><p>...</p></details>"
          dir="rtl"
          className="col-span-2 font-mono"
        />
        <Input label={t("priceJD")} type="number" step="0.001" value={values.price} onChange={(e) => set("price", e.target.value)} />
        <Input
          label={t("compareAtPrice")}
          type="number"
          step="0.001"
          value={values.compareAtPrice}
          onChange={(e) => set("compareAtPrice", e.target.value)}
        />
        <Input label={t("stock")} type="number" value={values.stock} onChange={(e) => set("stock", e.target.value)} />
        <Input
          label={t("lowStockThreshold")}
          type="number"
          value={values.lowStockThreshold}
          onChange={(e) => set("lowStockThreshold", e.target.value)}
          hint={t("lowStockThresholdHint")}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-ink">
        <Checkbox checked={values.isActive} onCheckedChange={(c) => set("isActive", c === true)} />
        {t("activeCheckbox")}
      </label>

      <section className="rounded-xl border border-border bg-surface-secondary p-4">
        <label className="flex items-start gap-3 text-sm text-ink">
          <Checkbox
            checked={values.isFeatured}
            onCheckedChange={(checked) => set("isFeatured", checked === true)}
          />
          <span>
            <span className="block font-medium">{t("featuredCheckbox")}</span>
            <span className="mt-1 block text-xs text-ink-muted">{t("featuredHint")}</span>
          </span>
        </label>
      </section>

      <section className="rounded-xl border border-border bg-surface-secondary p-4">
        <div className="mb-4">
          <h3 className="font-heading text-lg font-semibold text-ink">Know more about this product</h3>
          <p className="text-sm text-ink-muted">
            Safe HTML is supported. Scripts, embedded frames, forms, and unsafe links are removed automatically.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <Textarea
            label="English HTML"
            rows={10}
            value={values.knowledgeHtmlEn}
            onChange={(e) => set("knowledgeHtmlEn", e.target.value)}
            placeholder="<h2>Key facts</h2><p>...</p>"
            className="font-mono"
          />
          <Textarea
            label="Arabic HTML"
            rows={10}
            value={values.knowledgeHtmlAr}
            onChange={(e) => set("knowledgeHtmlAr", e.target.value)}
            placeholder="<h2>معلومات مهمة</h2><p>...</p>"
            className="font-mono"
            dir="rtl"
          />
          <label className="flex items-center gap-2 text-sm text-ink">
            <Checkbox
              checked={values.knowledgeActive}
              onCheckedChange={(checked) => set("knowledgeActive", checked === true)}
            />
            Show the “Know more” button to customers
          </label>
          <p className="text-xs text-ink-muted">Clear both HTML boxes and save to delete this product’s extra content.</p>
        </div>
      </section>

      <Button onClick={submit} disabled={submitting} className="w-fit">
        {submitting ? t("saving") : productId ? t("saveChanges") : t("createProduct")}
      </Button>
    </div>
  );
}
