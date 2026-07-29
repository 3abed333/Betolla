"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Checkbox, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from "@/components/ui";
import { toast } from "@/lib/toast";
import { getYouTubeEmbedUrl } from "@/lib/youtube";

export type BannerFormValues = {
  mediaType: "IMAGE" | "VIDEO" | "YOUTUBE";
  desktopMediaUrl: string;
  mobileMediaUrl: string;
  posterUrl: string;
  titleEn: string;
  titleAr: string;
  subtitleEn: string;
  subtitleAr: string;
  ctaLabelEn: string;
  ctaLabelAr: string;
  linkUrl: string;
  focalPointX: string;
  focalPointY: string;
  sortOrder: string;
  autoAdvanceSeconds: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

const EMPTY: BannerFormValues = {
  mediaType: "IMAGE", desktopMediaUrl: "", mobileMediaUrl: "", posterUrl: "",
  titleEn: "", titleAr: "", subtitleEn: "", subtitleAr: "", ctaLabelEn: "Shop now",
  ctaLabelAr: "تسوّق الآن", linkUrl: "/products", focalPointX: "50", focalPointY: "50",
  sortOrder: "0", autoAdvanceSeconds: "6", startsAt: "", endsAt: "", isActive: true,
};

function toInputDate(value: string) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function MediaUploader({
  label, value, accept, onChange,
}: { label: string; value: string; accept: string; onChange: (value: string) => void }) {
  const t = useTranslations("admin.banners");
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  async function upload(file: File) {
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/admin/banner-media", { method: "POST", body: form });
    const data = await response.json();
    setUploading(false);
    if (!response.ok) return toast.error(t("uploadFailed"), data.error);
    onChange(data.url);
  }
  const video = /\.(mp4|webm)$/i.test(value);
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className="relative aspect-[3/1] w-full overflow-hidden rounded-xl border border-border bg-surface-secondary">
        {value && (video
          ? <video src={value} muted playsInline controls className="h-full w-full object-cover" />
          : <Image src={value} alt="" fill sizes="600px" className="object-cover" />)}
      </div>
      <div className="flex flex-wrap gap-2">
        <input ref={ref} type="file" accept={accept} className="hidden" onChange={(event) => event.target.files?.[0] && upload(event.target.files[0])} />
        <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => ref.current?.click()}>
          {uploading ? t("uploading") : t("chooseFile")}
        </Button>
        {value && <Button type="button" size="sm" variant="ghost" onClick={() => onChange("")}>{t("removeMedia")}</Button>}
      </div>
    </div>
  );
}

export function BannerForm({ initialValues, bannerId }: { initialValues?: BannerFormValues; bannerId?: string }) {
  const t = useTranslations("admin.banners");
  const router = useRouter();
  const [values, setValues] = useState(initialValues ?? EMPTY);
  const [submitting, setSubmitting] = useState(false);
  function set<K extends keyof BannerFormValues>(key: K, value: BannerFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }
  async function submit() {
    if (!values.desktopMediaUrl) return toast.error(t("mediaRequired"));
    setSubmitting(true);
    const response = await fetch(bannerId ? `/api/admin/banners/${bannerId}` : "/api/admin/banners", {
      method: bannerId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        mobileMediaUrl: values.mobileMediaUrl || null,
        posterUrl: values.posterUrl || null,
        subtitleEn: values.subtitleEn || null,
        subtitleAr: values.subtitleAr || null,
        ctaLabelEn: values.ctaLabelEn || null,
        ctaLabelAr: values.ctaLabelAr || null,
        linkUrl: values.linkUrl || null,
        focalPointX: Number(values.focalPointX),
        focalPointY: Number(values.focalPointY),
        sortOrder: Number(values.sortOrder),
        autoAdvanceSeconds: Number(values.autoAdvanceSeconds),
        startsAt: values.startsAt ? new Date(values.startsAt).toISOString() : null,
        endsAt: values.endsAt ? new Date(values.endsAt).toISOString() : null,
      }),
    });
    const data = await response.json();
    setSubmitting(false);
    if (!response.ok) return toast.error(t("saveFailed"), data.error);
    toast.success(bannerId ? t("updated") : t("created"));
    router.push("/admin/banners");
    router.refresh();
  }

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <div className="rounded-2xl border border-border bg-surface-secondary p-5 text-sm text-ink-muted">
        <p className="font-semibold text-ink">{t("mediaGuideTitle")}</p>
        <p className="mt-1">{t("desktopGuide")}</p>
        <p>{t("mobileGuide")}</p>
        <p>{t("videoGuide")}</p>
        <p>{t("youtubeGuide")}</p>
      </div>
      <div className="max-w-xs">
        <label className="text-sm font-medium text-ink">{t("mediaType")}</label>
        <Select value={values.mediaType} onValueChange={(value) => set("mediaType", value as BannerFormValues["mediaType"])}>
          <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="IMAGE">{t("image")}</SelectItem>
            <SelectItem value="VIDEO">{t("video")}</SelectItem>
            <SelectItem value="YOUTUBE">{t("youtube")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {values.mediaType === "YOUTUBE" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label={t("youtubeLink")}
            value={values.desktopMediaUrl}
            onChange={(event) => set("desktopMediaUrl", event.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            hint={t("youtubeLinkHint")}
          />
          <div className="aspect-video overflow-hidden rounded-xl border border-border bg-surface-secondary">
            {getYouTubeEmbedUrl(values.desktopMediaUrl, false) ? (
              <iframe
                src={getYouTubeEmbedUrl(values.desktopMediaUrl, false)!}
                title={t("youtubePreview")}
                loading="lazy"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-4 text-center text-sm text-ink-muted">
                {t("youtubePreviewHint")}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <MediaUploader label={t("desktopMedia")} value={values.desktopMediaUrl} accept={values.mediaType === "VIDEO" ? "video/mp4,video/webm" : "image/jpeg,image/png,image/webp"} onChange={(url) => set("desktopMediaUrl", url)} />
          <MediaUploader label={t("mobileMedia")} value={values.mobileMediaUrl} accept={values.mediaType === "VIDEO" ? "video/mp4,video/webm" : "image/jpeg,image/png,image/webp"} onChange={(url) => set("mobileMediaUrl", url)} />
          {values.mediaType === "VIDEO" && <MediaUploader label={t("poster")} value={values.posterUrl} accept="image/jpeg,image/png,image/webp" onChange={(url) => set("posterUrl", url)} />}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label={t("titleEn")} value={values.titleEn} onChange={(e) => set("titleEn", e.target.value)} />
        <Input label={t("titleAr")} dir="rtl" value={values.titleAr} onChange={(e) => set("titleAr", e.target.value)} />
        <Textarea label={t("subtitleEn")} value={values.subtitleEn} onChange={(e) => set("subtitleEn", e.target.value)} />
        <Textarea label={t("subtitleAr")} dir="rtl" value={values.subtitleAr} onChange={(e) => set("subtitleAr", e.target.value)} />
        <Input label={t("ctaEn")} value={values.ctaLabelEn} onChange={(e) => set("ctaLabelEn", e.target.value)} />
        <Input label={t("ctaAr")} dir="rtl" value={values.ctaLabelAr} onChange={(e) => set("ctaLabelAr", e.target.value)} />
        <Input label={t("link")} value={values.linkUrl} onChange={(e) => set("linkUrl", e.target.value)} />
        <Input label={t("duration")} type="number" min="3" max="30" value={values.autoAdvanceSeconds} onChange={(e) => set("autoAdvanceSeconds", e.target.value)} />
        <Input label={t("focalX")} type="range" min="0" max="100" value={values.focalPointX} onChange={(e) => set("focalPointX", e.target.value)} hint={`${values.focalPointX}%`} />
        <Input label={t("focalY")} type="range" min="0" max="100" value={values.focalPointY} onChange={(e) => set("focalPointY", e.target.value)} hint={`${values.focalPointY}%`} />
        <Input label={t("startsAt")} type="datetime-local" value={toInputDate(values.startsAt)} onChange={(e) => set("startsAt", e.target.value)} />
        <Input label={t("endsAt")} type="datetime-local" value={toInputDate(values.endsAt)} onChange={(e) => set("endsAt", e.target.value)} />
        <Input label={t("sortOrder")} type="number" min="0" value={values.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} />
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <Checkbox checked={values.isActive} onCheckedChange={(checked) => set("isActive", checked === true)} />
        {t("active")}
      </label>
      <Button type="button" className="w-fit" disabled={submitting} onClick={submit}>{submitting ? t("saving") : t("save")}</Button>
    </div>
  );
}
