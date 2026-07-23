"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui";
import type { BadgeProps } from "@/components/ui/Badge";

const VARIANT: Record<string, BadgeProps["variant"]> = {
  OPEN: "accent",
  ASSIGNED: "highlight",
  IN_PROGRESS: "highlight",
  RESOLVED: "success",
  CLOSED: "neutral",
};

export function TicketStatusBadge({ status }: { status: string }) {
  const t = useTranslations("common.ticketStatus");
  return <Badge variant={VARIANT[status] ?? "neutral"}>{t.has(status) ? t(status) : status.replace("_", " ")}</Badge>;
}
