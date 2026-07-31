import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { CheckoutForm } from "./CheckoutForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("storefront.checkout");
  const tCommon = await getTranslations("common");
  return { title: t("metaTitle", { brand: tCommon("brand") }) };
}

export default async function CheckoutPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login?next=/checkout");

  const [user, addresses, loyaltyConfig, shippingZones] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: session.userId },
      select: { storeCreditBalance: true, loyaltyPointsBalance: true },
    }),
    prisma.address.findMany({ where: { userId: session.userId }, orderBy: { isDefaultShipping: "desc" } }),
    prisma.loyaltyConfig.findFirst(),
    prisma.shippingZone.findMany({
      where: { isActive: true },
      select: { cityEn: true, fee: true },
      orderBy: { cityEn: "asc" },
    }),
  ]);
  // Same fallback the server-side placeOrder() uses when no LoyaltyConfig row exists yet, so the
  // checkout preview and the actual charge can never disagree.
  const loyaltyRedemptionRate = loyaltyConfig ? Number(loyaltyConfig.redemptionValuePerPoint) : 0.01;

  return (
    <CheckoutForm
      addresses={addresses.map((a) => ({
        id: a.id,
        label: a.label,
        recipientName: a.recipientName,
        city: a.city,
        isDefaultShipping: a.isDefaultShipping,
      }))}
      storeCreditBalance={Number(user.storeCreditBalance)}
      loyaltyPointsBalance={user.loyaltyPointsBalance}
      loyaltyRedemptionRate={loyaltyRedemptionRate}
      shippingZones={shippingZones.map((zone) => ({ city: zone.cityEn, fee: Number(zone.fee) }))}
    />
  );
}
