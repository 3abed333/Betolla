import Image from "next/image";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { getReviewableOrderItems } from "@/lib/server/services/reviews";
import { StarRatingDisplay } from "@/components/ui/StarRating";
import { FormattedDate } from "@/components/FormattedDate";
import type { AppLocale } from "@/i18n/config";
import { WriteReviewForm } from "./WriteReviewForm";

export async function ReviewsSection({ productId }: { productId: string }) {
  const t = await getTranslations("storefront.reviews");
  const locale = (await getLocale()) as AppLocale;
  const [reviews, session] = await Promise.all([
    prisma.review.findMany({
      where: { productId, isPublished: true },
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getCurrentSession(),
  ]);

  const reviewableOrderItems =
    session?.role === "CUSTOMER" ? await getReviewableOrderItems(session.userId, productId) : [];

  return (
    <section className="flex flex-col gap-6">
      <h2 className="font-heading text-2xl font-semibold text-ink">
        {t("title")} {reviews.length > 0 && `(${reviews.length})`}
      </h2>

      {reviewableOrderItems.length > 0 && <WriteReviewForm reviewableOrderItems={reviewableOrderItems} />}

      {reviews.length === 0 ? (
        <p className="text-sm text-ink-muted">{t("noReviews")}</p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {reviews.map((review) => (
            <div key={review.id} className="flex flex-col gap-2 py-4">
              <div className="flex items-center justify-between">
                <p className="font-medium text-ink">
                  {review.user.firstName} {review.user.lastName.charAt(0)}.
                </p>
                <p className="text-xs text-ink-muted">
                  <FormattedDate date={review.createdAt} locale={locale} />
                </p>
              </div>
              <StarRatingDisplay rating={review.rating} />
              {review.isVerifiedPurchase && (
                <span className="w-fit rounded-full bg-highlight px-2 py-0.5 text-xs text-ink">
                  {t("verifiedPurchase")}
                </span>
              )}
              {review.comment && <p className="text-sm text-ink-muted">{review.comment}</p>}
              {review.photoUrl && (
                <div className="relative h-24 w-24 overflow-hidden rounded-lg border border-border">
                  <Image src={review.photoUrl} alt={t("reviewPhotoAlt")} fill sizes="96px" className="object-cover" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
