import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PromoCodeForm } from "@/components/PromoCodeForm";

export const metadata: Metadata = { title: "Add Promo Code - Betolla Admin" };

export default async function NewPromoCodePage() {
  const t = await getTranslations("admin.promoCodes");
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-heading text-2xl font-semibold text-ink">{t("addPromoCode")}</h2>
      <PromoCodeForm />
    </div>
  );
}
