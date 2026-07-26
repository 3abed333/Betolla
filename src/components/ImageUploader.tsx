"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/toast";

async function uploadFile(file: File, errorTitle: string, subfolder?: "avatars"): Promise<string | null> {
  const formData = new FormData();
  formData.append("file", file);
  if (subfolder) formData.append("subfolder", subfolder);
  const res = await fetch("/api/uploads", { method: "POST", body: formData });
  const data = await res.json();
  if (!res.ok) {
    toast.error(errorTitle, data.error);
    return null;
  }
  return data.url;
}

export function SingleImageUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const t = useTranslations("common.imageUploader");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    const url = await uploadFile(file, t("uploadFailedTitle"));
    setUploading(false);
    if (url) onChange(url);
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-24 w-24 overflow-hidden rounded-xl border border-border bg-surface-secondary">
        {value && <Image src={value} alt={t("mainProductImageAlt")} fill sizes="96px" className="object-cover" />}
      </div>
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded-full border border-border px-4 py-2 text-sm text-ink hover:bg-surface-secondary"
        >
          {uploading ? t("uploading") : t("uploadMainPhoto")}
        </button>
      </div>
    </div>
  );
}

export function GalleryUploader({ value, onChange }: { value: string[]; onChange: (urls: string[]) => void }) {
  const t = useTranslations("common.imageUploader");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList) {
    setUploading(true);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const url = await uploadFile(file, t("uploadFailedTitle"));
      if (url) urls.push(url);
    }
    setUploading(false);
    onChange([...value, ...urls]);
  }

  function remove(url: string) {
    onChange(value.filter((u) => u !== url));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        {value.map((url) => (
          <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-border">
            <Image src={url} alt={t("galleryImageAlt")} fill sizes="80px" className="object-cover" />
            <button
              type="button"
              onClick={() => remove(url)}
              className="absolute end-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-fit rounded-full border border-border px-4 py-2 text-sm text-ink hover:bg-surface-secondary"
      >
        {uploading ? t("uploading") : t("addGalleryPhotos")}
      </button>
    </div>
  );
}

// Customer-facing single-photo upload for a product review. The server always forces
// CUSTOMER-role uploads into reviews/ regardless of what's requested, so this never needs to pass
// a subfolder itself - same shape as ReportPhotoUploader, kept as its own small component rather
// than a shared abstraction since the two are conceptually different features that just happen to
// look identical today.
export function ReviewPhotoUploader({ value, onChange }: { value: string | null; onChange: (url: string | null) => void }) {
  const t = useTranslations("common.imageUploader");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    const url = await uploadFile(file, t("uploadFailedTitle"));
    setUploading(false);
    if (url) onChange(url);
  }

  return (
    <div className="flex items-center gap-4">
      {value && (
        <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-border">
          <Image src={value} alt={t("attachedPhotoAlt")} fill sizes="80px" className="object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute end-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white"
          >
            &times;
          </button>
        </div>
      )}
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded-full border border-border px-4 py-2 text-sm text-ink hover:bg-surface-secondary"
        >
          {uploading ? t("uploading") : value ? t("replacePhoto") : t("addPhotoOptional")}
        </button>
      </div>
    </div>
  );
}

// Driver-facing single-photo upload for a delivery problem report. The server always forces
// DELIVERY-role uploads into delivery-reports/ regardless of what's requested, so this never
// needs to pass a subfolder itself.
export function ReportPhotoUploader({ value, onChange }: { value: string | null; onChange: (url: string | null) => void }) {
  const t = useTranslations("common.imageUploader");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    const url = await uploadFile(file, t("uploadFailedTitle"));
    setUploading(false);
    if (url) onChange(url);
  }

  return (
    <div className="flex items-center gap-4">
      {value && (
        <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-border">
          {/* unoptimized: served through an authenticated route, not a public static file. */}
          <Image src={value} alt={t("attachedPhotoAlt")} fill sizes="80px" className="object-cover" unoptimized />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute end-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white"
          >
            &times;
          </button>
        </div>
      )}
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded-full border border-border px-4 py-2 text-sm text-ink hover:bg-surface-secondary"
        >
          {uploading ? t("uploading") : value ? t("replacePhoto") : t("addPhotoOptional")}
        </button>
      </div>
    </div>
  );
}
