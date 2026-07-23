"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui";
import type { BadgeProps } from "@/components/ui/Badge";

const STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  ASSIGNED: "neutral",
  PICKED_UP: "highlight",
  EN_ROUTE: "accent",
  DELIVERED: "success",
  FAILED: "destructive",
};

export function DeliveryStatusBadge({ status }: { status: string }) {
  const t = useTranslations("common.deliveryStatus");
  return <Badge variant={STATUS_VARIANT[status] ?? "neutral"}>{t.has(status) ? t(status) : status}</Badge>;
}
