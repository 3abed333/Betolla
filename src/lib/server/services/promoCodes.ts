import "server-only";
import { prisma } from "@/lib/db";

export class PromoCodeError extends Error {}

async function isUserInSegment(userId: string, segment: "ALL" | "TOP_30" | "BOTTOM_30") {
  if (segment === "ALL") return true;

  const all = await prisma.customerStats.findMany({
    select: { userId: true, totalSpent: true },
    orderBy: { totalSpent: "asc" },
  });
  const index = all.findIndex((c) => c.userId === userId);
  if (index === -1) return false;

  const percentile = index / Math.max(1, all.length - 1); // 0 = lowest spender, 1 = highest
  if (segment === "TOP_30") return percentile >= 0.7;
  if (segment === "BOTTOM_30") return percentile <= 0.3;
  return false;
}

export async function validatePromoCode(code: string, userId: string, subtotal: number) {
  const promo = await prisma.promoCode.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!promo || !promo.isActive) throw new PromoCodeError("Invalid promo code");
  if (promo.expiresAt && promo.expiresAt < new Date()) throw new PromoCodeError("This promo code has expired");
  if (promo.startsAt && promo.startsAt > new Date()) throw new PromoCodeError("This promo code isn't active yet");
  if (subtotal < Number(promo.minOrderTotal)) {
    throw new PromoCodeError(`Minimum order of ${Number(promo.minOrderTotal).toFixed(3)} JD required`);
  }

  if (promo.usageLimitTotal !== null) {
    const totalUses = await prisma.promoCodeUsage.count({ where: { promoCodeId: promo.id } });
    if (totalUses >= promo.usageLimitTotal) throw new PromoCodeError("This promo code has reached its usage limit");
  }
  if (promo.usageLimitPerUser !== null) {
    const userUses = await prisma.promoCodeUsage.count({ where: { promoCodeId: promo.id, userId } });
    if (userUses >= promo.usageLimitPerUser) {
      throw new PromoCodeError("You've already used this promo code the maximum number of times");
    }
  }

  const eligible = await isUserInSegment(userId, promo.targetSegment);
  if (!eligible) throw new PromoCodeError("This promo code isn't available for your account");

  const discountAmount =
    promo.discountType === "PERCENTAGE"
      ? Number(((subtotal * Number(promo.discountValue)) / 100).toFixed(2))
      : Math.min(Number(promo.discountValue), subtotal);

  return { promo, discountAmount };
}
