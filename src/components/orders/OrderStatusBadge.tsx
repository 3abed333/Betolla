"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui";
import type { BadgeProps } from "@/components/ui/Badge";

const STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  PENDING: "neutral",
  CONFIRMED: "highlight",
  ON_DELIVERY: "accent",
  DELIVERED: "success",
  CANCELLED: "destructive",
};

export function OrderStatusBadge({ status }: { status: string }) {
  const t = useTranslations("common.orderStatus");
  return <Badge variant={STATUS_VARIANT[status] ?? "neutral"}>{t.has(status) ? t(status) : status}</Badge>;
}
