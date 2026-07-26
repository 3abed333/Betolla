import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { requireRole, assertOwnership } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { Card, CardContent, Badge } from "@/components/ui";
import { TicketStatusBadge } from "@/components/support/TicketStatusBadge";
import { FormattedDate } from "@/components/FormattedDate";
import type { AppLocale } from "@/i18n/config";
import Image from "next/image";

export const metadata: Metadata = { title: "Report Detail - Betolla Delivery" };

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole("DELIVERY");
  const t = await getTranslations("delivery.reports");
  const tDetail = await getTranslations("admin.deliverySupport.detail");
  const tProblemType = await getTranslations("common.deliveryProblemType");
  const tUrgency = await getTranslations("common.deliveryUrgency");
  const locale = (await getLocale()) as AppLocale;

  const report = await prisma.deliverySupportTicket.findUnique({
    where: { id },
    include: { deliveryAssignment: { select: { order: { select: { orderNumber: true } } } } },
  });
  if (!report) notFound();
  assertOwnership(session, report.driverId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-xl font-semibold text-ink">{tProblemType(report.problemType)}</h2>
          <p className="text-sm text-ink-muted">
            {report.deliveryAssignment?.order.orderNumber ?? t("notTiedToSpecificDelivery")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {report.urgency === "URGENT" && <Badge variant="critical">{tUrgency("URGENT")}</Badge>}
          <TicketStatusBadge status={report.status} />
        </div>
      </div>

      {report.description && (
        <Card>
          <CardContent>
            <p className="text-sm font-medium text-ink">{tDetail("description")}</p>
            <p className="mt-1 text-sm text-ink-muted">{report.description}</p>
          </CardContent>
        </Card>
      )}

      {report.photoUrl && (
        <Card>
          <CardContent>
            <p className="mb-2 text-sm font-medium text-ink">{tDetail("photo")}</p>
            <div className="relative h-48 w-48 overflow-hidden rounded-xl bg-surface-secondary">
              {/* unoptimized: served through an authenticated route, see the admin equivalent page. */}
              <Image src={report.photoUrl} alt={tDetail("photoAlt")} fill sizes="192px" className="object-cover" unoptimized />
            </div>
          </CardContent>
        </Card>
      )}

      {report.staffNote && (
        <Card>
          <CardContent>
            <p className="text-sm font-medium text-ink">{t("noteFromSupport")}</p>
            <p className="mt-1 text-sm text-ink-muted">{report.staffNote}</p>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-ink-muted">
        {tDetail("filedPrefix")} <FormattedDate date={report.createdAt} locale={locale} opts={{ dateStyle: "medium", timeStyle: "short" }} />
      </p>
    </div>
  );
}
