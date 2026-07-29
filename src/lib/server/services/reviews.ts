import "server-only";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/client";
import { deleteUploadedImage } from "@/lib/server/storage";
import { logActivity } from "./activityLog";

export class ReviewError extends Error {}

export async function createReview(params: {
  userId: string;
  orderItemId: string;
  rating: number;
  comment?: string;
  photoUrl?: string;
}) {
  try {
    return await prisma.$transaction(async (tx) => {
      const orderItem = await tx.orderItem.findFirst({
        where: { id: params.orderItemId, order: { userId: params.userId } },
        include: { order: true },
      });
      if (!orderItem?.productId) throw new ReviewError("Order item not found");
      if (orderItem.order.status !== "DELIVERED") {
        throw new ReviewError("You can only review products from delivered orders");
      }
      return tx.review.create({
        data: {
          productId: orderItem.productId,
          userId: params.userId,
          orderItemId: orderItem.id,
          rating: params.rating,
          comment: params.comment,
          photoUrl: params.photoUrl,
          isVerifiedPurchase: true,
          isPublished: false,
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ReviewError("You already reviewed this item");
    }
    throw error;
  }
}

/**
 * Permanently deletes a review - used for both "reject" (a still-pending review) and
 * "delete permanently" (a published review). Recomputes the product aggregate inside the same
 * transaction and removes any uploaded review photo, then records the moderation action.
 */
export async function deleteReview(id: string, actor: { actorId: string; actorRole: Role }) {
  const review = await prisma.review.findUnique({
    where: { id },
    select: { productId: true, photoUrl: true, isPublished: true, rating: true, comment: true },
  });
  if (!review) return null;

  await prisma.$transaction(async (tx) => {
    await tx.review.delete({ where: { id } });
    const agg = await tx.review.aggregate({
      where: { productId: review.productId, isPublished: true },
      _avg: { rating: true },
      _count: true,
    });
    await tx.product.update({
      where: { id: review.productId },
      data: { avgRating: Number((agg._avg.rating ?? 0).toFixed(1)), reviewCount: agg._count },
    });
  });

  if (review.photoUrl) await deleteUploadedImage(review.photoUrl);

  await logActivity({
    actorId: actor.actorId,
    actorRole: actor.actorRole,
    action: review.isPublished ? "REVIEW_DELETE" : "REVIEW_REJECT",
    entityType: "Review",
    entityId: id,
    beforeData: { rating: review.rating, comment: review.comment, isPublished: review.isPublished },
  });

  return review;
}

export async function recomputeProductReviewAggregate(productId: string) {
  const agg = await prisma.review.aggregate({
    where: { productId, isPublished: true },
    _avg: { rating: true },
    _count: true,
  });
  await prisma.product.update({
    where: { id: productId },
    data: { avgRating: Number((agg._avg.rating ?? 0).toFixed(1)), reviewCount: agg._count },
  });
}

/** Order items the user purchased for this product, delivered, not yet reviewed. */
export async function getReviewableOrderItems(userId: string, productId: string) {
  return prisma.orderItem.findMany({
    where: {
      productId,
      order: { userId, status: "DELIVERED" },
      reviews: { none: {} },
    },
    select: { id: true, order: { select: { orderNumber: true } } },
    orderBy: { id: "desc" },
  });
}
