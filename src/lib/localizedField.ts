import type { AppLocale } from "@/i18n/config";

// Mirrors localizedCity()'s fallback shape (src/lib/cityAr.ts): never render blank even if a
// translation is somehow missing/empty - fall back to the English value instead.
export function localizedField(locale: AppLocale, en: string, ar: string | null | undefined): string {
  return locale === "ar" && ar ? ar : en;
}

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

/**
 * Product descriptions are now sanitized HTML (see lib/server/sanitizeHtml.ts), not plain text -
 * this reduces one down to a plain-text preview for contexts that can't render markup, like the
 * two-line teaser on a product card. Not a security boundary (the source is already
 * server-sanitized); purely cosmetic tag stripping for a short text snippet.
 */
export function stripHtmlToText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, (entity) => HTML_ENTITIES[entity])
    .replace(/\s+/g, " ")
    .trim();
}
