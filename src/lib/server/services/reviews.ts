import "server-only";
import { prisma } from "@/lib/db";

export class ReviewError extends Error {}

export async function createReview(params: {
  userId: string;
  orderItemId: string;
  rating: number;
  comment?: string;
}) {
  const orderItem = await prisma.orderItem.findUnique({
    where: { id: params.orderItemId },
    include: { order: true, reviews: true },
  });

  if (!orderItem || !orderItem.productId) throw new ReviewError("Order item not found");
  if (orderItem.order.userId !== params.userId) throw new ReviewError("Not your order");
  if (orderItem.order.status !== "DELIVERED") {
    throw new ReviewError("You can only review products from delivered orders");
  }
  if (orderItem.reviews.length > 0) throw new ReviewError("You already reviewed this item");

  const review = await prisma.review.create({
    data: {
      productId: orderItem.productId,
      userId: params.userId,
      orderItemId: orderItem.id,
      rating: params.rating,
      comment: params.comment,
      isVerifiedPurchase: true,
    },
  });

  const agg = await prisma.review.aggregate({
    where: { productId: orderItem.productId },
    _avg: { rating: true },
    _count: true,
  });
  await prisma.product.update({
    where: { id: orderItem.productId },
    data: { avgRating: Number((agg._avg.rating ?? 0).toFixed(1)), reviewCount: agg._count },
  });

  return review;
}

/** Order items the user purchased for this product, delivered, not yet reviewed. */
export async function getReviewableOrderItems(userId: string, productId: string) {
  return prisma.orderItem.findMany({
    where: {
      productId,
      order: { userId, status: "DELIVERED" },
      reviews: { none: {} },
    },
    include: { order: { select: { orderNumber: true, createdAt: true } } },
    orderBy: { id: "desc" },
  });
}
