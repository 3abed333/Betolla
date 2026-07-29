import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Badge, Card, CardContent, EmptyState } from "@/components/ui";
import type { Prisma } from "@/generated/prisma/client";
import { ReviewModerationActions } from "./ReviewModerationActions";
import { ReviewFilters } from "./ReviewFilters";

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ rating?: string; status?: string }>;
}) {
  const t = await getTranslations("admin.reviews");
  const { rating, status } = await searchParams;

  const where: Prisma.ReviewWhereInput = {};
  const ratingNumber = Number(rating);
  if (rating && Number.isInteger(ratingNumber) && ratingNumber >= 1 && ratingNumber <= 5) {
    where.rating = ratingNumber;
  }
  if (status === "pending") where.isPublished = false;
  else if (status === "published") where.isPublished = true;

  const reviews = await prisma.review.findMany({
    where,
    include: {
      product: { select: { nameEn: true, nameAr: true } },
      user: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: [{ isPublished: "asc" }, { createdAt: "desc" }],
  });
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-heading text-2xl font-semibold text-ink">{t("title")}</h2>
        <p className="text-sm text-ink-muted">{t("description")}</p>
      </div>
      <ReviewFilters />
      {reviews.length === 0 ? <EmptyState title={t("empty")} /> : reviews.map((review) => (
        <Card key={review.id}>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              {review.photoUrl && (
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
                  <Image src={review.photoUrl} alt="" fill sizes="80px" className="object-cover" />
                </div>
              )}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-ink">{review.product.nameEn}</p>
                  <Badge variant={review.isPublished ? "success" : "neutral"}>
                    {review.isPublished ? t("published") : t("pending")}
                  </Badge>
                </div>
                <p className="text-sm text-ink">{review.rating}/5 · {review.user.firstName} {review.user.lastName}</p>
                <p className="text-xs text-ink-muted">{review.user.email}</p>
                {review.comment && <p className="mt-2 text-sm text-ink-muted">{review.comment}</p>}
              </div>
            </div>
            <ReviewModerationActions id={review.id} isPublished={review.isPublished} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
