import "dotenv/config";
import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db";

// Exercises the same aggregate-recompute logic deleteReview() runs, and the admin filter query
// shape, directly against the local dev database - reviews.ts itself imports "server-only", which
// throws outside the Next runtime, so these tests hit Prisma directly instead of the service.

async function createFixture() {
  const suffix = randomUUID().slice(0, 8);
  const user = await prisma.user.create({
    data: {
      email: `review-test-${suffix}@betolla.test`,
      username: `review_test_${suffix}`,
      passwordHash: "not-a-real-hash",
      role: "CUSTOMER",
      firstName: "Review",
      lastName: "Test",
    },
  });
  const category = await prisma.category.create({
    data: { nameEn: "Review Test", nameAr: "اختبار", slug: `review-test-${suffix}` },
  });
  const product = await prisma.product.create({
    data: {
      sku: `REVIEW-TEST-${suffix}`,
      slug: `review-test-product-${suffix}`,
      nameEn: "Review Test Product",
      nameAr: "منتج اختبار",
      descriptionEn: "d",
      descriptionAr: "د",
      price: 10,
      categoryId: category.id,
      mainImageUrl: "/seed-images/placeholder.jpg",
    },
  });
  return { user, category, product };
}

async function cleanup(fixture: Awaited<ReturnType<typeof createFixture>>) {
  await prisma.product.delete({ where: { id: fixture.product.id } }).catch(() => undefined);
  await prisma.category.delete({ where: { id: fixture.category.id } }).catch(() => undefined);
  await prisma.user.delete({ where: { id: fixture.user.id } }).catch(() => undefined);
}

async function recomputeAggregate(productId: string) {
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

test("deleting a published review recomputes the product's aggregate rating and count", async () => {
  const fixture = await createFixture();
  try {
    const reviewA = await prisma.review.create({
      data: { productId: fixture.product.id, userId: fixture.user.id, rating: 5, isPublished: true },
    });
    await prisma.review.create({
      data: { productId: fixture.product.id, userId: fixture.user.id, rating: 3, isPublished: true },
    });
    await recomputeAggregate(fixture.product.id);
    let product = await prisma.product.findUniqueOrThrow({ where: { id: fixture.product.id } });
    assert.equal(Number(product.avgRating), 4);
    assert.equal(product.reviewCount, 2);

    // Simulate deleteReview()'s delete-then-recompute step for the 5-star review.
    await prisma.review.delete({ where: { id: reviewA.id } });
    await recomputeAggregate(fixture.product.id);
    product = await prisma.product.findUniqueOrThrow({ where: { id: fixture.product.id } });
    assert.equal(Number(product.avgRating), 3, "average recalculates from the remaining published review");
    assert.equal(product.reviewCount, 1);
  } finally {
    await cleanup(fixture);
  }
});

test("rejecting/deleting a pending (unpublished) review does not affect the published aggregate", async () => {
  const fixture = await createFixture();
  try {
    await prisma.review.create({
      data: { productId: fixture.product.id, userId: fixture.user.id, rating: 4, isPublished: true },
    });
    const pending = await prisma.review.create({
      data: { productId: fixture.product.id, userId: fixture.user.id, rating: 1, isPublished: false },
    });
    await recomputeAggregate(fixture.product.id);
    let product = await prisma.product.findUniqueOrThrow({ where: { id: fixture.product.id } });
    assert.equal(Number(product.avgRating), 4, "pending review is excluded from the aggregate");
    assert.equal(product.reviewCount, 1);

    await prisma.review.delete({ where: { id: pending.id } });
    await recomputeAggregate(fixture.product.id);
    product = await prisma.product.findUniqueOrThrow({ where: { id: fixture.product.id } });
    assert.equal(Number(product.avgRating), 4, "deleting the pending review leaves the published aggregate unchanged");
    assert.equal(product.reviewCount, 1);
  } finally {
    await cleanup(fixture);
  }
});

test("admin star/status filters select the correct reviews", async () => {
  const fixture = await createFixture();
  try {
    await prisma.review.create({
      data: { productId: fixture.product.id, userId: fixture.user.id, rating: 5, isPublished: true },
    });
    await prisma.review.create({
      data: { productId: fixture.product.id, userId: fixture.user.id, rating: 4, isPublished: false },
    });
    await prisma.review.create({
      data: { productId: fixture.product.id, userId: fixture.user.id, rating: 4, isPublished: true },
    });

    const fiveStar = await prisma.review.findMany({
      where: { productId: fixture.product.id, rating: 5 },
    });
    assert.equal(fiveStar.length, 1);

    const fourStar = await prisma.review.findMany({
      where: { productId: fixture.product.id, rating: 4 },
    });
    assert.equal(fourStar.length, 2);

    const pendingOnly = await prisma.review.findMany({
      where: { productId: fixture.product.id, isPublished: false },
    });
    assert.equal(pendingOnly.length, 1);

    const publishedOnly = await prisma.review.findMany({
      where: { productId: fixture.product.id, isPublished: true },
    });
    assert.equal(publishedOnly.length, 2);
  } finally {
    await cleanup(fixture);
  }
});
