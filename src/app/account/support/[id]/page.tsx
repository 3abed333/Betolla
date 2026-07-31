import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { requireRole, assertOwnership } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui";
import { TicketStatusBadge } from "@/components/support/TicketStatusBadge";
import { FormattedDate } from "@/components/FormattedDate";
import type { AppLocale } from "@/i18n/config";
import { supportCategoryKey } from "@/lib/supportCategories";
import { ReplyForm } from "./ReplyForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.support.detail");
  const tCommon = await getTranslations("common");
  return { title: t("metaTitle", { brand: tCommon("brand") }) };
}

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole("CUSTOMER");
  const t = await getTranslations("account.support.detail");
  const tCategories = await getTranslations("account.support.newTicket.categories");
  const locale = (await getLocale()) as AppLocale;

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      // Staff-only internal notes must never reach the customer view.
      messages: {
        where: { isInternalNote: false },
        orderBy: { createdAt: "asc" },
        include: { sender: { select: { firstName: true, lastName: true, role: true } } },
      },
    },
  });
  if (!ticket) notFound();
  assertOwnership(session, ticket.userId);

  const categoryKey = supportCategoryKey(ticket.category);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-xl font-semibold text-ink">{ticket.subject}</h2>
          <p className="text-sm text-ink-muted">{categoryKey ? tCategories(categoryKey) : ticket.category}</p>
        </div>
        <TicketStatusBadge status={ticket.status} />
      </div>

      <div className="flex flex-col gap-3">
        {ticket.messages.map((message) => {
          const isStaff = message.sender.role !== "CUSTOMER";
          return (
            <Card key={message.id} className={isStaff ? "ms-8 border-cta/40" : "me-8"}>
              <CardContent>
                <p className="text-sm font-medium text-ink">
                  {isStaff ? `${message.sender.firstName} ${t("betollaSupportSuffix")}` : t("you")}
                </p>
                <p className="mt-1 text-sm text-ink-muted">{message.message}</p>
                <p className="mt-2 text-xs text-ink-muted">
                  <FormattedDate date={message.createdAt} locale={locale} opts={{ dateStyle: "medium", timeStyle: "short" }} />
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {ticket.status !== "CLOSED" ? (
        <ReplyForm ticketId={ticket.id} />
      ) : (
        <p className="text-sm text-ink-muted">{t("closedMessage")}</p>
      )}
    </div>
  );
}
