"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui";
import { RichContent } from "@/components/RichContent";
import { cn } from "@/lib/cn";
import { popupMatchesPath } from "@/lib/popupCampaigns";

type PopupData = {
  id: string;
  template: string;
  trigger: string;
  imageUrl: string | null;
  titleEn: string;
  titleAr: string;
  announcementEn: string | null;
  announcementAr: string | null;
  bodyHtmlEn: string;
  bodyHtmlAr: string;
  ctaLabelEn: string | null;
  ctaLabelAr: string | null;
  ctaUrl: string | null;
};

const STYLES: Record<string, string> = {
  SALE: "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950",
  ANNOUNCEMENT: "border-blue-300 bg-blue-50 dark:border-blue-900 dark:bg-blue-950",
  NEW_PRODUCT: "border-violet-300 bg-violet-50 dark:border-violet-900 dark:bg-violet-950",
  WELCOME: "border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950",
  LIMITED_TIME: "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950",
  FREE_SHIPPING: "border-cyan-300 bg-cyan-50 dark:border-cyan-900 dark:bg-cyan-950",
  LOYALTY: "border-fuchsia-300 bg-fuchsia-50 dark:border-fuchsia-900 dark:bg-fuchsia-950",
  BACK_IN_STOCK: "border-lime-300 bg-lime-50 dark:border-lime-900 dark:bg-lime-950",
  EVENT: "border-orange-300 bg-orange-50 dark:border-orange-900 dark:bg-orange-950",
  CUSTOM: "border-border bg-surface",
};

export function StorefrontPopup({ popups }: { popups: PopupData[] }) {
  const locale = useLocale();
  const pathname = usePathname();
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const hydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const popup = popups.find((candidate) => popupMatchesPath(candidate.trigger, pathname)) ?? null;
  const previouslyDismissed = hydrated && popup
    ? sessionStorage.getItem(`betolla-popup:${popup.id}`) === "dismissed"
    : true;

  if (!popup || dismissedId === popup.id || previouslyDismissed) return null;
  const arabic = locale === "ar";
  const title = arabic ? popup.titleAr : popup.titleEn;
  const announcement = arabic ? popup.announcementAr : popup.announcementEn;
  const body = arabic ? popup.bodyHtmlAr : popup.bodyHtmlEn;
  const ctaLabel = arabic ? popup.ctaLabelAr : popup.ctaLabelEn;

  function dismiss() {
    sessionStorage.setItem(`betolla-popup:${popup!.id}`, "dismissed");
    setDismissedId(popup!.id);
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 p-3 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`popup-${popup.id}`}
    >
      <div className={cn("relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border shadow-2xl", STYLES[popup.template] ?? STYLES.CUSTOM)}>
        <button
          type="button"
          onClick={dismiss}
          aria-label={arabic ? "إغلاق" : "Close"}
          className="absolute end-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-xl text-ink"
        >
          ×
        </button>
        {popup.imageUrl && (
          <div className="relative aspect-video w-full bg-black/5">
            <Image
              src={popup.imageUrl}
              alt={title}
              fill
              priority
              unoptimized={popup.imageUrl.startsWith("/uploads/")}
              sizes="(max-width: 640px) calc(100vw - 24px), 512px"
              className="object-cover"
            />
          </div>
        )}
        <div className="p-6">
          {announcement && <p className="mb-2 pe-10 text-xs font-semibold tracking-widest text-ink-muted uppercase">{announcement}</p>}
          <h2 id={`popup-${popup.id}`} className="pe-10 font-heading text-3xl font-semibold text-ink">{title}</h2>
          <RichContent html={body} className="mt-4 text-sm" />
          <div className="mt-6 flex flex-wrap gap-3">
            {ctaLabel && popup.ctaUrl && (
              <Button asChild>
                <Link href={popup.ctaUrl} onClick={dismiss}>{ctaLabel}</Link>
              </Button>
            )}
            <Button type="button" variant="outline" onClick={dismiss}>
              {arabic ? "إغلاق" : "Close"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
