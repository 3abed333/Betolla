import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Card, CardContent, EmptyState } from "@/components/ui";
import { TicketStatusBadge } from "@/components/support/TicketStatusBadge";
import { FormattedDate } from "@/components/FormattedDate";
import type { AppLocale } from "@/i18n/config";
import { supportCategoryKey } from "@/lib/supportCategories";
import { SupportFilters } from "./SupportFilters";
import type { Prisma, TicketStatus } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Support Inbox - Betolla Admin" };

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const t = await getTranslations("admin.support");
  const tCategories = await getTranslations("account.support.newTicket.categories");
  const locale = (await getLocale()) as AppLocale;

  const where: Prisma.SupportTicketWhereInput = {};
  if (status) where.status = status as TicketStatus;

  const tickets = await prisma.supportTicket.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: { user: { select: { firstName: true, lastName: true, email: true } }, assignedTo: { select: { firstName: true, lastName: true } } },
  });

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-heading text-2xl font-semibold text-ink">{t("heading")}</h2>
      <SupportFilters />

      {tickets.length === 0 ? (
        <EmptyState title={t("noTicketsTitle")} description={t("noTicketsDescription")} />
      ) : (
        <div className="flex flex-col gap-3">
          {tickets.map((ticket) => {
            const categoryKey = supportCategoryKey(ticket.category);
            return (
              <Link key={ticket.id} href={`/admin/support/${ticket.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-ink">{ticket.subject}</p>
                      <p className="text-sm text-ink-muted">
                        {ticket.user.firstName} {ticket.user.lastName} ({ticket.user.email}) &middot;{" "}
                        {categoryKey ? tCategories(categoryKey) : ticket.category}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {ticket.assignedTo
                          ? `${t("assignedToPrefix")} ${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`
                          : t("unassigned")}
                        {" · "}
                        {t("updatedPrefix")} <FormattedDate date={ticket.updatedAt} locale={locale} />
                      </p>
                    </div>
                    <TicketStatusBadge status={ticket.status} />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
