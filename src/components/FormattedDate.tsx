import type { AppLocale } from "@/i18n/config";
import { formatDate } from "@/lib/format";

// Same dir="ltr" bidi isolation as Money - dates are LTR content in both locales.
export function FormattedDate({
  date,
  locale,
  opts,
}: {
  date: Date | string;
  locale: AppLocale;
  opts?: Intl.DateTimeFormatOptions;
}) {
  return (
    <span dir="ltr" className="inline-block">
      {formatDate(date, locale, opts)}
    </span>
  );
}
