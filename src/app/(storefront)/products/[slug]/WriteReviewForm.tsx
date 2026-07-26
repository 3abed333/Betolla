"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Textarea, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui";
import { StarRatingInput } from "@/components/ui/StarRating";
import { ReviewPhotoUploader } from "@/components/ImageUploader";
import { toast } from "@/lib/toast";

export function WriteReviewForm({
  reviewableOrderItems,
}: {
  reviewableOrderItems: { id: string; order: { orderNumber: string } }[];
}) {
  const t = useTranslations("storefront.reviews");
  const tToast = useTranslations("toast");
  const router = useRouter();
  const [orderItemId, setOrderItemId] = useState(reviewableOrderItems[0]?.id ?? "");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!orderItemId) return;
    setSubmitting(true);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderItemId, rating, comment, photoUrl: photoUrl ?? undefined }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      toast.error(tToast("couldntSubmitReviewTitle"), data.error);
      return;
    }
    toast.success(tToast("reviewSubmittedTitle"), tToast("reviewSubmittedBody"));
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
      <h3 className="font-medium text-ink">{t("writeReview")}</h3>
      {reviewableOrderItems.length > 1 && (
        <Select value={orderItemId} onValueChange={setOrderItemId}>
          <SelectTrigger>
            <SelectValue placeholder={t("whichOrderPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {reviewableOrderItems.map((oi) => (
              <SelectItem key={oi.id} value={oi.id}>
                {t("orderPrefix", { orderNumber: oi.order.orderNumber })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <StarRatingInput value={rating} onChange={setRating} />
      <Textarea
        placeholder={t("reviewPlaceholder")}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <div>
        <label className="text-sm font-medium text-ink">{t("photoLabel")}</label>
        <div className="mt-1.5">
          <ReviewPhotoUploader value={photoUrl} onChange={setPhotoUrl} />
        </div>
      </div>
      <Button onClick={submit} disabled={submitting} className="self-start">
        {submitting ? t("submitting") : t("submitReview")}
      </Button>
    </div>
  );
}
