import type { AppLocale } from "@/i18n/config";

// Mirrors localizedCity()'s fallback shape (src/lib/cityAr.ts): never render blank even if a
// translation is somehow missing/empty - fall back to the English value instead.
export function localizedField(locale: AppLocale, en: string, ar: string | null | undefined): string {
  return locale === "ar" && ar ? ar : en;
}
