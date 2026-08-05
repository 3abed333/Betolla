import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { validatePromoCode, PromoCodeError } from "./promoCodes";
import { recomputeCustomerStatsForUser } from "./customerStats";
import { notify, notifyRoles } from "./notifications";
import { isLowStock } from "./inventory";
import type { CheckoutInput } from "@/lib/validation/checkout";
import { aggregateInventoryDemand } from "@/lib/commerceRules";

export class CheckoutError extends Error {}

function generateOrderNumber() {
  return `BT-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

function buildAddressSnapshot(address: { recipientName: string; city: string }) {
  return `${address.recipientName}, ${address.city}, Jordan`;
}

type OrderItemData = {
  productId: string | null;
  bundleId: string | null;
  nameSnapshot: string;
  imageSnapshot: string;
  priceSnapshot: number;
  quantity: number;
};

async function runSerializableCheckout(userId: string, input: CheckoutInput) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({ where: { checkoutKey: input.idempotencyKey } });
    if (existing) {
      if (existing.userId !== userId) throw new CheckoutError("Invalid checkout request");
      return {
        order: existing,
        wasExisting: true,
        loyaltyPointsEarned: 0,
        lowStockCrossings: [] as { nameEn: string; nameAr: string }[],
      };
    }

    const [address, user, loyaltyConfig] = await Promise.all([
      tx.address.findFirst({ where: { id: input.shippingAddressId, userId } }),
      tx.user.findFirst({ where: { id: userId, isActive: true } }),
      tx.loyaltyConfig.findFirst(),
    ]);
    if (!address) throw new CheckoutError("Invalid shipping address");
    if (!user) throw new CheckoutError("This account is no longer active");

    const zone = await tx.shippingZone.findFirst({
      where: { cityEn: address.city, isActive: true },
    });
    if (!zone) {
      throw new CheckoutError("That shipping city is not currently supported");
    }
    const shippingFee = Number(zone.fee);

    const productIds = [...new Set(input.items.filter((item) => item.kind === "product").map((item) => item.id))];
    const bundleIds = [...new Set(input.items.filter((item) => item.kind === "bundle").map((item) => item.id))];
    const [products, bundles] = await Promise.all([
      tx.product.findMany({ where: { id: { in: productIds } } }),
      tx.productBundle.findMany({
        where: { id: { in: bundleIds } },
        include: { items: { include: { product: true } } },
      }),
    ]);
    const productById = new Map(products.map((product) => [product.id, product]));
    const bundleById = new Map(bundles.map((bundle) => [bundle.id, bundle]));

    let subtotal = 0;
    const orderItemsData: OrderItemData[] = [];
    const rawDemand: { productId: string; quantity: number }[] = [];
    const addDemand = (productId: string, quantity: number) => {
      rawDemand.push({ productId, quantity });
    };

    for (const item of input.items) {
      if (item.kind === "product") {
        const product = productById.get(item.id);
        if (!product || !product.isActive) {
          throw new CheckoutError("A product in your cart is no longer available");
        }
        subtotal += Number(product.price) * item.quantity;
        orderItemsData.push({
          productId: product.id,
          bundleId: null,
          nameSnapshot: product.nameEn,
          imageSnapshot: product.mainImageUrl,
          priceSnapshot: Number(product.price),
          quantity: item.quantity,
        });
        addDemand(product.id, item.quantity);
        continue;
      }

      const bundle = bundleById.get(item.id);
      if (!bundle || !bundle.isActive || bundle.items.length === 0) {
        throw new CheckoutError("A bundle in your cart is no longer available");
      }
      if (bundle.items.some((bundleItem) => !bundleItem.product.isActive)) {
        throw new CheckoutError(`A product in ${bundle.nameEn} is no longer available`);
      }
      subtotal += Number(bundle.bundlePrice) * item.quantity;
      orderItemsData.push({
        productId: null,
        bundleId: bundle.id,
        nameSnapshot: bundle.nameEn,
        imageSnapshot: bundle.mainImageUrl,
        priceSnapshot: Number(bundle.bundlePrice),
        quantity: item.quantity,
      });
      for (const bundleItem of bundle.items) {
        addDemand(bundleItem.productId, bundleItem.quantity * item.quantity);
      }
    }
    subtotal = Number(subtotal.toFixed(3));
    const demand = aggregateInventoryDemand(rawDemand);

    let discountAmount = 0;
    let promoCodeId: string | null = null;
    if (input.promoCode) {
      try {
        const result = await validatePromoCode(input.promoCode, userId, subtotal, tx);
        discountAmount = result.discountAmount;
        promoCodeId = result.promo.id;
      } catch (error) {
        if (error instanceof PromoCodeError) throw new CheckoutError(error.message);
        throw error;
      }
    }

    let remaining = Number((subtotal - discountAmount).toFixed(3));
    const storeCreditUsed =
      input.useStoreCredit && Number(user.storeCreditBalance) > 0
        ? Math.min(Number(user.storeCreditBalance), remaining)
        : 0;
    remaining = Number((remaining - storeCreditUsed).toFixed(3));

    const redemptionRate = loyaltyConfig ? Number(loyaltyConfig.redemptionValuePerPoint) : 0.01;
    let loyaltyPointsUsed = 0;
    if (input.loyaltyPointsToRedeem > 0 && redemptionRate > 0) {
      loyaltyPointsUsed = Math.min(
        input.loyaltyPointsToRedeem,
        user.loyaltyPointsBalance,
        Math.floor(remaining / redemptionRate),
      );
    }
    const loyaltyRedemptionValue = Number((loyaltyPointsUsed * redemptionRate).toFixed(3));
    remaining = Number((remaining - loyaltyRedemptionValue).toFixed(3));
    const total = Number((remaining + shippingFee).toFixed(3));

    const paymentMethod = await tx.paymentMethod.findFirst({
      where: { userId, type: "CASH_ON_DELIVERY" },
    });
    const paymentMethodLabel = "Cash on Delivery";
    const paymentStatus = "UNPAID" as const;
    // COD loyalty is credited only after the courier confirms cash collection on delivery.
    const loyaltyPointsEarned = 0;

    // Every inventory mutation is a conditional decrement. The full aggregate demand includes
    // direct lines plus every bundle component, so stock can never become negative under races.
    const lowStockCrossings: { nameEn: string; nameAr: string }[] = [];
    for (const [productId, quantity] of demand) {
      const before = await tx.product.findUnique({
        where: { id: productId },
        select: { stock: true, lowStockThreshold: true, nameEn: true, nameAr: true, isActive: true },
      });
      if (!before?.isActive) throw new CheckoutError("A product in your cart is no longer available");
      const changed = await tx.product.updateMany({
        where: { id: productId, isActive: true, stock: { gte: quantity } },
        data: { stock: { decrement: quantity } },
      });
      if (changed.count !== 1) throw new CheckoutError(`Not enough stock for ${before.nameEn}`);
      const after = { ...before, stock: before.stock - quantity };
      if (!isLowStock(before) && isLowStock(after)) lowStockCrossings.push({ nameEn: before.nameEn, nameAr: before.nameAr });
    }

    const created = await tx.order.create({
      data: {
        checkoutKey: input.idempotencyKey,
        orderNumber: generateOrderNumber(),
        userId,
        status: "PENDING",
        paymentStatus,
        isGift: input.isGift,
        giftOccasion: input.isGift ? input.giftOccasion : null,
        giftRecipientName: input.isGift ? input.giftRecipientName || null : null,
        giftMessage: input.isGift ? input.giftMessage || null : null,
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
        shippingAddressSnapshot: buildAddressSnapshot(address),
        shippingRecipientPhone: address.phone,
        shippingDeliveryNotes: address.deliveryNotes,
        shippingCity: address.city,
        paymentMethodId: paymentMethod?.id,
        paymentMethodLabel,
        items: { create: orderItemsData },
        inventoryReservations: {
          create: [...demand].map(([productId, quantity]) => ({ productId, quantity })),
        },
        statusHistory: { create: { status: "PENDING" } },
      },
    });

    if (promoCodeId) {
      await tx.promoCodeUsage.create({
        data: { promoCodeId, userId, orderId: created.id, discountAmount },
      });
    }
    if (storeCreditUsed > 0) {
      const changed = await tx.user.updateMany({
        where: { id: userId, storeCreditBalance: { gte: storeCreditUsed } },
        data: { storeCreditBalance: { decrement: storeCreditUsed } },
      });
      if (changed.count !== 1) throw new CheckoutError("Store credit changed. Please review and try again.");
      await tx.storeCreditTransaction.create({
        data: { userId, amount: -storeCreditUsed, reason: "Applied at checkout", orderId: created.id },
      });
    }
    if (loyaltyPointsUsed > 0) {
      const changed = await tx.user.updateMany({
        where: { id: userId, loyaltyPointsBalance: { gte: loyaltyPointsUsed } },
        data: { loyaltyPointsBalance: { decrement: loyaltyPointsUsed } },
      });
      if (changed.count !== 1) throw new CheckoutError("Loyalty balance changed. Please review and try again.");
      await tx.loyaltyTransaction.create({
        data: { userId, type: "REDEEM", points: -loyaltyPointsUsed, orderId: created.id, note: "Redeemed at checkout" },
      });
    }
    if (loyaltyPointsEarned > 0) {
      await tx.loyaltyTransaction.create({
        data: { userId, type: "EARN", points: loyaltyPointsEarned, orderId: created.id },
      });
      await tx.user.update({
        where: { id: userId },
        data: { loyaltyPointsBalance: { increment: loyaltyPointsEarned } },
      });
    }

    const cart = await tx.cart.findUnique({ where: { userId } });
    if (cart) {
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({ where: { id: cart.id }, data: { status: "CONVERTED" } });
    }
    return { order: created, wasExisting: false, loyaltyPointsEarned, lowStockCrossings };
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    maxWait: 5_000,
    timeout: 20_000,
  });
}

export async function placeOrder(userId: string, input: CheckoutInput) {
  let result: Awaited<ReturnType<typeof runSerializableCheckout>> | undefined;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      result = await runSerializableCheckout(userId, input);
      break;
    } catch (error) {
      if (error instanceof CheckoutError) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await prisma.order.findUnique({ where: { checkoutKey: input.idempotencyKey } });
        if (existing?.userId === userId) return existing;
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < 2
      ) {
        continue;
      }
      throw error;
    }
  }
  if (!result) throw new CheckoutError("Checkout is busy. Please try again.");
  if (result.wasExisting) return result.order;

  if (result.order.paymentStatus === "PAID") await recomputeCustomerStatsForUser(userId);
  await notify({
    userId,
    category: "ORDER_UPDATES",
    title: "Order placed",
    body: `We've received your order ${result.order.orderNumber}.`,
    titleKey: "orderPlacedTitle",
    bodyKey: "orderPlacedBody",
    templateParams: { orderNumber: result.order.orderNumber },
    relatedOrderId: result.order.id,
    eventKey: `order:${result.order.id}:placed`,
  });
  if (result.loyaltyPointsEarned > 0) {
    await notify({
      userId,
      category: "LOYALTY_AND_WALLET",
      title: "Loyalty points earned",
      body: `You earned ${result.loyaltyPointsEarned} points on order ${result.order.orderNumber}.`,
      titleKey: "loyaltyPointsEarnedTitle",
      bodyKey: "loyaltyPointsEarnedBody",
      templateParams: { points: result.loyaltyPointsEarned, orderNumber: result.order.orderNumber },
      relatedOrderId: result.order.id,
      ctaPath: "/account/wallet",
      ctaLabelKey: "viewWallet",
    });
  }
  for (const crossing of result.lowStockCrossings) {
    await notifyRoles(["STAFF", "ADMIN"], {
      category: "OPERATIONS",
      title: "Low stock alert",
      body: `${crossing.nameEn} has dropped to or below its low-stock threshold.`,
      titleKey: "lowStockAlertTitle",
      bodyKey: "lowStockAlertBody",
      templateParams: { productNameEn: crossing.nameEn, productNameAr: crossing.nameAr },
    });
  }
  return result.order;
}
