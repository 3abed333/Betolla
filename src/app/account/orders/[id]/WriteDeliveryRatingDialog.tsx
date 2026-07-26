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
import { toast } from "@/lib/toast";

export function WriteDeliveryRatingDialog({ deliveryAssignmentId }: { deliveryAssignmentId: string }) {
  const router = useRouter();
  const t = useTranslations("account.orders.deliveryRatingDialog");
  const tCommon = useTranslations("common");
  const tToast = useTranslations("toast");
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    const res = await fetch(`/api/delivery/assignments/${deliveryAssignmentId}/rating`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
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
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <StarRatingInput value={rating} onChange={setRating} />
          <Textarea
            placeholder={t("commentPlaceholder")}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
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
