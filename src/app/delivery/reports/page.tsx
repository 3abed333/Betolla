import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { Card, CardContent, EmptyState, Badge } from "@/components/ui";
import { TicketStatusBadge } from "@/components/support/TicketStatusBadge";
import { ReportProblemDialog } from "@/components/ReportProblemDialog";
import { FormattedDate } from "@/components/FormattedDate";
import type { AppLocale } from "@/i18n/config";

export const metadata: Metadata = { title: "My Reports - Betolla Delivery" };

export default async function MyReportsPage() {
  const session = await requireRole("DELIVERY");
  const t = await getTranslations("delivery.reports");
  const tProblemType = await getTranslations("common.deliveryProblemType");
  const locale = (await getLocale()) as AppLocale;

  const reports = await prisma.deliverySupportTicket.findMany({
    where: { driverId: session.userId },
    orderBy: { createdAt: "desc" },
    include: { deliveryAssignment: { select: { order: { select: { orderNumber: true } } } } },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-semibold text-ink">{t("heading")}</h2>
        <ReportProblemDialog />
      </div>

      {reports.length === 0 ? (
        <EmptyState title={t("noReportsTitle")} description={t("noReportsDescription")} />
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map((report) => (
            <Link key={report.id} href={`/delivery/reports/${report.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-ink">{tProblemType(report.problemType)}</p>
                    <p className="text-sm text-ink-muted">
                      {report.deliveryAssignment?.order.orderNumber ?? t("notTiedToDelivery")} &middot;{" "}
                      <FormattedDate date={report.createdAt} locale={locale} />
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {report.urgency === "URGENT" && <Badge variant="destructive">{t("urgent")}</Badge>}
                    <TicketStatusBadge status={report.status} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
