"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useTransition } from "react";
import { setLocaleCookie } from "@/lib/i18n/actions";
import type { AppLocale } from "@/i18n/config";

export function LanguageSwitcher() {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchTo(next: AppLocale) {
    if (next === locale || isPending) return;
    startTransition(async () => {
      await setLocaleCookie(next);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center rounded-full border border-border p-1 text-sm">
      <button
        type="button"
        onClick={() => switchTo("en")}
        aria-pressed={locale === "en"}
        className={`rounded-full px-3 py-1 transition-colors ${
          locale === "en" ? "bg-cta text-cta-foreground" : "text-ink-muted hover:text-ink"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => switchTo("ar")}
        aria-pressed={locale === "ar"}
        className={`rounded-full px-3 py-1 transition-colors ${
          locale === "ar" ? "bg-cta text-cta-foreground" : "text-ink-muted hover:text-ink"
        }`}
      >
        عربي
      </button>
    </div>
  );
}
