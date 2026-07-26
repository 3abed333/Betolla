import "server-only";
import { prisma } from "@/lib/db";
import { validatePromoCode, PromoCodeError } from "./promoCodes";
import { recomputeCustomerStatsForUser } from "./customerStats";
import { notify, notifyRoles } from "./notifications";
import { isLowStock } from "./inventory";
import type { CheckoutInput } from "@/lib/validation/checkout";

export class CheckoutError extends Error {}

function generateOrderNumber() {
  return `BT-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")}`;
}

// MOCK PAYMENT ONLY. A real gateway (e.g. HyperPay/PayTabs for Jordan, or Stripe) would be
// invoked here: create a payment intent/charge with the provider, and only mark the order
// PAID once the provider confirms success (webhooks for async methods). COD needs no gateway
// call at all - it settles on delivery, which is why it's the only *reliably* correct
// unauthenticated default when a gateway isn't wired up yet.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature mirrors what a real gateway call would take
async function chargeMockPayment(amount: number): Promise<{ success: true }> {
  return { success: true };
}

export async function placeOrder(userId: string, input: CheckoutInput) {
  const address = await prisma.address.findUnique({ where: { id: input.shippingAddressId } });
  if (!address || address.userId !== userId) throw new CheckoutError("Invalid shipping address");

  const zone = await prisma.shippingZone.findFirst({ where: { cityEn: address.city, isActive: true } });
  const shippingFee = zone ? Number(zone.fee) : 3;

  // Re-price everything server-side - never trust client-supplied prices.
  let subtotal = 0;
  const orderItemsData: {
    productId: string | null;
    bundleId: string | null;
    nameSnapshot: string;
    imageSnapshot: string;
    priceSnapshot: number;
    quantity: number;
  }[] = [];
  const stockDecrements: { productId: string; quantity: number }[] = [];

  for (const item of input.items) {
    if (item.kind === "product") {
      const product = await prisma.product.findUnique({ where: { id: item.id } });
      if (!product || !product.isActive) throw new CheckoutError("A product in your cart is no longer available");
      if (product.stock < item.quantity) throw new CheckoutError(`Not enough stock for ${product.nameEn}`);
      subtotal += Number(product.price) * item.quantity;
      orderItemsData.push({
        productId: product.id,
        bundleId: null,
        nameSnapshot: product.nameEn,
        imageSnapshot: product.mainImageUrl,
        priceSnapshot: Number(product.price),
        quantity: item.quantity,
      });
      stockDecrements.push({ productId: product.id, quantity: item.quantity });
    } else {
      const bundle = await prisma.productBundle.findUnique({ where: { id: item.id }, include: { items: true } });
      if (!bundle || !bundle.isActive) throw new CheckoutError("A bundle in your cart is no longer available");
      subtotal += Number(bundle.bundlePrice) * item.quantity;
      orderItemsData.push({
        productId: null,
        bundleId: bundle.id,
        nameSnapshot: bundle.nameEn,
        imageSnapshot: bundle.mainImageUrl,
        priceSnapshot: Number(bundle.bundlePrice),
        quantity: item.quantity,
      });
      for (const bi of bundle.items) {
        stockDecrements.push({ productId: bi.productId, quantity: bi.quantity * item.quantity });
      }
    }
  }
  subtotal = Number(subtotal.toFixed(2));

  let discountAmount = 0;
  let promoCodeId: string | null = null;
  if (input.promoCode) {
    try {
      const result = await validatePromoCode(input.promoCode, userId, subtotal);
      discountAmount = result.discountAmount;
      promoCodeId = result.promo.id;
    } catch (err) {
      if (err instanceof PromoCodeError) throw new CheckoutError(err.message);
      throw err;
    }
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  let remaining = Number((subtotal - discountAmount).toFixed(2));

  let storeCreditUsed = 0;
  if (input.useStoreCredit && Number(user.storeCreditBalance) > 0) {
    storeCreditUsed = Math.min(Number(user.storeCreditBalance), remaining);
    remaining = Number((remaining - storeCreditUsed).toFixed(2));
  }

  let loyaltyPointsUsed = 0;
  let loyaltyRedemptionValue = 0;
  if (input.loyaltyPointsToRedeem > 0) {
    const loyaltyConfig = await prisma.loyaltyConfig.findFirst();
    const redemptionRate = loyaltyConfig ? Number(loyaltyConfig.redemptionValuePerPoint) : 0.01;
    const affordablePoints = Math.min(input.loyaltyPointsToRedeem, user.loyaltyPointsBalance);
    const maxPointsForRemaining = Math.floor(remaining / redemptionRate);
    loyaltyPointsUsed = Math.min(affordablePoints, maxPointsForRemaining);
    loyaltyRedemptionValue = Number((loyaltyPointsUsed * redemptionRate).toFixed(2));
    remaining = Number((remaining - loyaltyRedemptionValue).toFixed(2));
  }

  const total = Number((remaining + shippingFee).toFixed(2));

  const paymentMethod = await prisma.paymentMethod.findFirst({
    where: { userId, type: input.paymentMethodType },
  });
  const paymentMethodLabel = input.paymentMethodType === "CASH_ON_DELIVERY" ? "Cash on Delivery" : "Card on file";

  let paymentStatus: "PAID" | "UNPAID" = "UNPAID";
  if (input.paymentMethodType === "MOCK_CARD") {
    const charge = await chargeMockPayment(total);
    if (charge.success) paymentStatus = "PAID";
  }

  const loyaltyConfig = await prisma.loyaltyConfig.findFirst();
  const pointsPerJd = loyaltyConfig ? Number(loyaltyConfig.pointsPerJdSpent) : 1;
  const loyaltyPointsEarned = paymentStatus === "PAID" ? Math.floor(total * pointsPerJd) : 0;

  // The same productId can appear twice in stockDecrements (once as a direct line item, once
  // inside a bundle) - aggregate per product first so the low-stock crossing check below reads a
  // single, consistent before/after pair per product rather than checking mid-decrement.
  const decrementByProduct = new Map<string, number>();
  for (const dec of stockDecrements) {
    decrementByProduct.set(dec.productId, (decrementByProduct.get(dec.productId) ?? 0) + dec.quantity);
  }
  const lowStockCrossings: { nameEn: string }[] = [];

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId,
        status: "PENDING",
        paymentStatus,
        subtotal,
        discountTotal: discountAmount,
        shippingFee,
        total,
        storeCreditUsed,
        loyaltyPointsUsed,
        loyaltyRedemptionValue,
        loyaltyPointsEarned,
        promoCodeId,
        shippingAddressId: address.id,
        shippingAddressSnapshot: `${address.recipientName}, ${address.street}, ${address.area}, ${address.city}, Jordan`,
        shippingCity: address.city,
        paymentMethodId: paymentMethod?.id,
        paymentMethodLabel,
        items: { create: orderItemsData },
      },
    });

    await tx.orderStatusHistory.create({
      data: { orderId: created.id, status: "PENDING" },
    });

    for (const [productId, quantity] of decrementByProduct) {
      const before = await tx.product.findUnique({
        where: { id: productId },
        select: { stock: true, lowStockThreshold: true, nameEn: true },
      });
      if (!before) continue;
      const after = await tx.product.update({
        where: { id: productId },
        data: { stock: { decrement: quantity } },
        select: { stock: true, lowStockThreshold: true, nameEn: true },
      });
      if (!isLowStock(before) && isLowStock(after)) {
        lowStockCrossings.push({ nameEn: after.nameEn });
      }
    }

    if (promoCodeId) {
      await tx.promoCodeUsage.create({
        data: { promoCodeId, userId, orderId: created.id, discountAmount },
      });
    }

    if (storeCreditUsed > 0) {
      await tx.storeCreditTransaction.create({
        data: { userId, amount: -storeCreditUsed, reason: "Applied at checkout", orderId: created.id },
      });
      await tx.user.update({ where: { id: userId }, data: { storeCreditBalance: { decrement: storeCreditUsed } } });
    }

    if (loyaltyPointsUsed > 0) {
      await tx.loyaltyTransaction.create({
        data: { userId, type: "REDEEM", points: -loyaltyPointsUsed, orderId: created.id, note: "Redeemed at checkout" },
      });
      await tx.user.update({ where: { id: userId }, data: { loyaltyPointsBalance: { decrement: loyaltyPointsUsed } } });
    }

    if (loyaltyPointsEarned > 0) {
      await tx.loyaltyTransaction.create({
        data: { userId, type: "EARN", points: loyaltyPointsEarned, orderId: created.id },
      });
      await tx.user.update({ where: { id: userId }, data: { loyaltyPointsBalance: { increment: loyaltyPointsEarned } } });
    }

    const cart = await tx.cart.findUnique({ where: { userId } });
    if (cart) {
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({ where: { id: cart.id }, data: { status: "CONVERTED" } });
    }

    return created;
  });

  if (paymentStatus === "PAID") {
    await recomputeCustomerStatsForUser(userId);
  }

  await notify({
    userId,
    category: "ORDER_UPDATES",
    title: "Order placed",
    body: `We've received your order ${order.orderNumber}.`,
    relatedOrderId: order.id,
  });
  if (loyaltyPointsEarned > 0) {
    await notify({
      userId,
      category: "LOYALTY_AND_WALLET",
      title: "Loyalty points earned",
      body: `You earned ${loyaltyPointsEarned} points on order ${order.orderNumber}.`,
      relatedOrderId: order.id,
    });
  }
  for (const crossing of lowStockCrossings) {
    await notifyRoles(["STAFF", "ADMIN"], {
      category: "OPERATIONS",
      title: "Low stock alert",
      body: `${crossing.nameEn} has dropped to or below its low-stock threshold.`,
    });
  }

  return order;
}
