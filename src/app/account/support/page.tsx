import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { Card, CardContent, EmptyState } from "@/components/ui";
import { FormattedDate } from "@/components/FormattedDate";
import type { AppLocale } from "@/i18n/config";
import { supportCategoryKey } from "@/lib/supportCategories";
import { NewTicketDialog } from "./NewTicketDialog";
import { TicketStatusBadge } from "@/components/support/TicketStatusBadge";

export const metadata: Metadata = { title: "Support - Betolla Cosmetics" };

export default async function SupportPage() {
  const session = await requireRole("CUSTOMER");
  const t = await getTranslations("account.support");
  const tCategories = await getTranslations("account.support.newTicket.categories");
  const locale = (await getLocale()) as AppLocale;
  const tickets = await prisma.supportTicket.findMany({
    where: { userId: session.userId },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-semibold text-ink">{t("heading")}</h2>
        <NewTicketDialog />
      </div>

      {tickets.length === 0 ? (
        <EmptyState title={t("noTicketsTitle")} description={t("noTicketsDescription")} />
      ) : (
        <div className="flex flex-col gap-3">
          {tickets.map((ticket) => {
            const categoryKey = supportCategoryKey(ticket.category);
            return (
              <Link key={ticket.id} href={`/account/support/${ticket.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-ink">{ticket.subject}</p>
                      <p className="text-sm text-ink-muted">
                        {categoryKey ? tCategories(categoryKey) : ticket.category} &middot;{" "}
                        <FormattedDate date={ticket.updatedAt} locale={locale} />
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
