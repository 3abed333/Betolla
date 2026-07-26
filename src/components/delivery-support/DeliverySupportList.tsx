import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { Card, CardContent, EmptyState, Badge } from "@/components/ui";
import { TicketStatusBadge } from "@/components/support/TicketStatusBadge";
import { FormattedDate } from "@/components/FormattedDate";
import type { AppLocale } from "@/i18n/config";
import type { PROBLEM_TYPE_OPTIONS } from "@/lib/deliverySupport";

type ReportRow = {
  id: string;
  problemType: (typeof PROBLEM_TYPE_OPTIONS)[number];
  urgency: string;
  status: string;
  createdAt: Date;
  driver: { firstName: string; lastName: string };
  deliveryAssignment: { order: { orderNumber: string } } | null;
};

export async function DeliverySupportList({ reports, basePath }: { reports: ReportRow[]; basePath: string }) {
  const t = await getTranslations("admin.deliverySupport.list");
  const tProblemType = await getTranslations("common.deliveryProblemType");
  const locale = (await getLocale()) as AppLocale;

  if (reports.length === 0) {
    return <EmptyState title={t("noReportsTitle")} description={t("noReportsDescription")} />;
  }

  return (
    <div className="flex flex-col gap-3">
      {reports.map((report) => (
        <Link key={report.id} href={`${basePath}/${report.id}`}>
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-ink">{tProblemType(report.problemType)}</p>
                <p className="text-sm text-ink-muted">
                  {report.driver.firstName} {report.driver.lastName} &middot;{" "}
                  {report.deliveryAssignment?.order.orderNumber ?? t("notTiedToDelivery")}
                </p>
                <p className="text-xs text-ink-muted">
                  {t("filedPrefix")} <FormattedDate date={report.createdAt} locale={locale} />
                </p>
              </div>
              <div className="flex items-center gap-2">
                {report.urgency === "URGENT" && <Badge variant="critical">{t("urgent")}</Badge>}
                <TicketStatusBadge status={report.status} />
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
