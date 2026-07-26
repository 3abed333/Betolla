import { getTranslations } from "next-intl/server";

// High-visibility red banner for a CONFIRMED/ON_DELIVERY order with no active delivery driver -
// same bg-red-600/text-white treatment as the existing delivery-support "URGENT" badge
// (Badge variant="critical"), scaled up to a full-width banner since this needs to be plainly
// visible, not just a muted note under a disabled button.
export async function NoDriverAlert() {
  const t = await getTranslations("admin.orders.detail");
  return (
    <div className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 shrink-0">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v4m0 4h.01M10.29 3.86L1.82 18.04A2 2 0 003.6 21h16.8a2 2 0 001.78-2.96L13.71 3.86a2 2 0 00-3.42 0z"
        />
      </svg>
      <span>{t("noDriverAlert")}</span>
    </div>
  );
}
