import type { AppLocale } from "@/i18n/config";

// "د.أ" is the standard Jordanian Dinar abbreviation in Arabic commercial UI, mirroring how "JD"
// is used in English - kept here (not the message catalog) since this is a plain locale-keyed
// lookup, the same pattern dirForLocale() already uses, not a translatable sentence.
const CURRENCY_UNIT: Record<AppLocale, string> = { en: "JD", ar: "د.أ" };

// "ar-JO" defaults to Arabic-Indic digits (١٢٣) under ICU - explicitly forcing the Latin numbering
// system via "-u-nu-latn" keeps Western digits (123), the documented convention (see
// I18N_AR_REVIEW.md) matching existing precedent (ShippingZone.cityAr, ar.json) and standard
// Jordanian commercial UI.
function localeTag(locale: AppLocale): string {
  return locale === "ar" ? "ar-JO-u-nu-latn" : "en";
}

export function formatCurrency(value: number | string, locale: AppLocale): string {
  const amount = typeof value === "string" ? Number(value) : value;
  const formatted = new Intl.NumberFormat(localeTag(locale), {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(amount);
  return `${formatted} ${CURRENCY_UNIT[locale]}`;
}

export function formatDate(
  date: Date | string,
  locale: AppLocale,
  opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(localeTag(locale), opts).format(value);
}
