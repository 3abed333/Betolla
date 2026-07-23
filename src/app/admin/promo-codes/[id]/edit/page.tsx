import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { PromoCodeForm } from "@/components/PromoCodeForm";

export const metadata: Metadata = { title: "Edit Promo Code - Betolla Admin" };

export default async function EditPromoCodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("admin.promoCodes");
  const promo = await prisma.promoCode.findUnique({ where: { id } });
  if (!promo) notFound();

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-heading text-2xl font-semibold text-ink">{t("editPromoCode")}</h2>
      <PromoCodeForm
        promoCodeId={promo.id}
        initialValues={{
          code: promo.code,
          discountType: promo.discountType,
          discountValue: promo.discountValue.toString(),
          minOrderTotal: promo.minOrderTotal.toString(),
          targetSegment: promo.targetSegment,
          startsAt: promo.startsAt ? promo.startsAt.toISOString() : "",
          expiresAt: promo.expiresAt ? promo.expiresAt.toISOString() : "",
          usageLimitTotal: promo.usageLimitTotal?.toString() ?? "",
          usageLimitPerUser: promo.usageLimitPerUser?.toString() ?? "",
          isActive: promo.isActive,
        }}
      />
    </div>
  );
}
