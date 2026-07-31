import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Card, CardContent, Badge } from "@/components/ui";
import { FormattedDate } from "@/components/FormattedDate";
import type { AppLocale } from "@/i18n/config";
import { supportCategoryKey } from "@/lib/supportCategories";
import { TicketControls } from "@/components/support/TicketControls";
import { AdminReplyForm } from "@/components/support/AdminReplyForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.support.detail");
  const tCommon = await getTranslations("common");
  return { title: t("metaTitle", { brand: tCommon("brand") }) };
}

export default async function AdminTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("admin.support.detail");
  const tCategories = await getTranslations("account.support.newTicket.categories");
  const locale = (await getLocale()) as AppLocale;

  const [ticket, assignableUsers] = await Promise.all([
    prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        order: { select: { id: true, orderNumber: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          include: { sender: { select: { firstName: true, lastName: true, role: true } } },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: { in: ["ADMIN", "STAFF"] }, isActive: true },
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);
  if (!ticket) notFound();

  const categoryKey = supportCategoryKey(ticket.category);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-semibold text-ink">{ticket.subject}</h2>
          <p className="text-sm text-ink-muted">
            {ticket.user.firstName} {ticket.user.lastName} ({ticket.user.email}) &middot;{" "}
            {categoryKey ? tCategories(categoryKey) : ticket.category}
            {ticket.order && (
              <>
                {" "}
                &middot; <Link href={`/admin/orders/${ticket.order.id}`} className="text-cta hover:underline">
                  {ticket.order.orderNumber}
                </Link>
              </>
            )}
          </p>
        </div>
        <TicketControls
          ticketId={ticket.id}
          status={ticket.status}
          assignedToId={ticket.assignedToId}
          assignableUsers={assignableUsers.map((u) => ({ id: u.id, name: `${u.firstName} ${u.lastName}` }))}
        />
      </div>

      <div className="flex flex-col gap-3">
        {ticket.messages.map((message) => {
          const isCustomer = message.sender.role === "CUSTOMER";
          return (
            <Card
              key={message.id}
              className={
                message.isInternalNote
                  ? "border-accent/50 bg-highlight/40"
                  : isCustomer
                    ? "me-8"
                    : "ms-8 border-cta/40"
              }
            >
              <CardContent>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-ink">
                    {isCustomer
                      ? `${message.sender.firstName} ${message.sender.lastName} ${t("customerSuffix")}`
                      : `${message.sender.firstName} ${t("supportSuffix")}`}
                  </p>
                  {message.isInternalNote && <Badge variant="highlight">{t("internalNote")}</Badge>}
                </div>
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
        <AdminReplyForm ticketId={ticket.id} />
      ) : (
        <p className="text-sm text-ink-muted">{t("closedMessage")}</p>
      )}
    </div>
  );
}
