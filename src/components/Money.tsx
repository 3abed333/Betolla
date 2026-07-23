import type { AppLocale } from "@/i18n/config";
import { formatCurrency } from "@/lib/format";

// Wraps formatCurrency's output in the same dir="ltr" bidi isolation already used for phone
// numbers (Phase 12) - prices are LTR content and shouldn't inherit ambient RTL flow.
export function Money({ value, locale }: { value: number | string; locale: AppLocale }) {
  return (
    <span dir="ltr" className="inline-block">
      {formatCurrency(value, locale)}
    </span>
  );
}
