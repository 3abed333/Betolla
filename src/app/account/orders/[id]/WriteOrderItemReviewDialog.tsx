"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  Button,
  Textarea,
} from "@/components/ui";
import { StarRatingInput } from "@/components/ui/StarRating";
import { ReviewPhotoUploader } from "@/components/ImageUploader";
import { toast } from "@/lib/toast";

export function WriteOrderItemReviewDialog({ orderItemId, itemName }: { orderItemId: string; itemName: string }) {
  const router = useRouter();
  const t = useTranslations("account.orders.reviewDialog");
  const tCommon = useTranslations("common");
  const tToast = useTranslations("toast");
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderItemId, rating, comment: comment.trim() || undefined, photoUrl: photoUrl ?? undefined }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      toast.error(tToast("couldntSubmitReviewTitle"), data.error);
      return;
    }
    toast.success(tToast("reviewSubmittedTitle"), tToast("reviewSubmittedBody"));
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-sm">
          {t("trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("dialogTitle", { itemName })}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <StarRatingInput value={rating} onChange={setRating} />
          <Textarea
            placeholder={t("commentPlaceholder")}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div>
            <label className="text-sm font-medium text-ink">{t("photoLabel")}</label>
            <div className="mt-1.5">
              <ReviewPhotoUploader value={photoUrl} onChange={setPhotoUrl} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={submitting}>
              {tCommon("cancel")}
            </Button>
          </DialogClose>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? t("submitting") : t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
