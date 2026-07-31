import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Button, Card, CardContent } from "@/components/ui";
import { Money } from "@/components/Money";
import { GiftOrderCard } from "@/components/orders/GiftOrderCard";
import { resolveOrderItemName } from "@/lib/orderItemName";
import type { AppLocale } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("storefront.confirmation");
  const tCommon = await getTranslations("common");
  return { title: t("metaTitle", { brand: tCommon("brand") }) };
}

export default async function OrderConfirmationPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const t = await getTranslations("storefront.confirmation");
  const locale = (await getLocale()) as AppLocale;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: { select: { nameEn: true, nameAr: true } },
          bundle: { select: { nameEn: true, nameAr: true } },
        },
      },
    },
  });
  if (!order || order.userId !== session.userId) notFound();

  const discountTotal = Number(order.discountTotal);
  const storeCreditUsed = Number(order.storeCreditUsed);
  const loyaltyRedemptionValue = Number(order.loyaltyRedemptionValue);

  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success">
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="h-8 w-8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="font-heading text-2xl font-semibold text-ink">{t("orderPlaced")}</h1>
      <p className="mt-2 text-ink-muted">
        {t("thanksPrefix")} <strong>{order.orderNumber}</strong> {t("thanksSuffix")}
      </p>
      {order.isGift && (
        <div className="mt-6 text-start">
          <GiftOrderCard
            occasion={order.giftOccasion}
            recipientName={order.giftRecipientName}
            message={order.giftMessage}
          />
        </div>
      )}
      <Card className="mt-6 text-start">
        <CardContent className="flex flex-col gap-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-ink">
                {resolveOrderItemName(item, locale)} x{item.quantity}
              </span>
              <span className="text-ink-muted">
                <Money value={Number(item.priceSnapshot) * item.quantity} locale={locale} />
              </span>
            </div>
          ))}
          <div className="flex flex-col gap-2 border-t border-border pt-2">
            <div className="flex justify-between text-sm text-ink-muted">
              <span>{t("subtotal")}</span>
              <span>
                <Money value={Number(order.subtotal)} locale={locale} />
              </span>
            </div>
            {discountTotal > 0 && (
              <div className="flex justify-between text-sm text-ink-muted">
                <span>{t("discount")}</span>
                <span>
                  -<Money value={discountTotal} locale={locale} />
                </span>
              </div>
            )}
            {storeCreditUsed > 0 && (
              <div className="flex justify-between text-sm text-ink-muted">
                <span>{t("storeCreditApplied")}</span>
                <span>
                  -<Money value={storeCreditUsed} locale={locale} />
                </span>
              </div>
            )}
            {loyaltyRedemptionValue > 0 && (
              <div className="flex justify-between text-sm text-ink-muted">
                <span>{t("loyaltyPointsRedeemed")}</span>
                <span>
                  -<Money value={loyaltyRedemptionValue} locale={locale} />
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm text-ink-muted">
              <span>{t("shipping")}</span>
              <span>
                <Money value={Number(order.shippingFee)} locale={locale} />
              </span>
            </div>
            <div className="flex justify-between font-semibold text-ink">
              <span>{t("total")}</span>
              <span>
                <Money value={Number(order.total)} locale={locale} />
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="mt-6 flex justify-center gap-3">
        <Button asChild variant="outline">
          <Link href="/account/orders">{t("trackOrder")}</Link>
        </Button>
        <Button asChild>
          <Link href="/products">{t("continueShopping")}</Link>
        </Button>
      </div>
    </div>
  );
}
