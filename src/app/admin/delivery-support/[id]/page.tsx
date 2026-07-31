import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Card, CardContent, Badge } from "@/components/ui";
import { DeliverySupportControls } from "@/components/delivery-support/DeliverySupportControls";
import { FormattedDate } from "@/components/FormattedDate";
import type { AppLocale } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.deliverySupport.detail");
  const tCommon = await getTranslations("common");
  return { title: t("metaTitle", { brand: tCommon("brand") }) };
}

export default async function AdminDeliverySupportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("admin.deliverySupport.detail");
  const tProblemType = await getTranslations("common.deliveryProblemType");
  const tUrgency = await getTranslations("common.deliveryUrgency");
  const locale = (await getLocale()) as AppLocale;

  const [report, assignableUsers] = await Promise.all([
    prisma.deliverySupportTicket.findUnique({
      where: { id },
      include: {
        driver: { select: { firstName: true, lastName: true, phone: true } },
        deliveryAssignment: {
          select: {
            order: { select: { id: true, orderNumber: true, user: { select: { firstName: true, lastName: true } } } },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: { in: ["ADMIN", "STAFF"] }, isActive: true },
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);
  if (!report) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-semibold text-ink">{tProblemType(report.problemType)}</h2>
          <p className="text-sm text-ink-muted">
            {report.driver.firstName} {report.driver.lastName} &middot;{" "}
            <span dir="ltr" className="inline-block">
              {report.driver.phone ?? t("noPhoneOnFile")}
            </span>
            {report.deliveryAssignment && (
              <>
                {" "}
                &middot;{" "}
                <Link href={`/admin/orders/${report.deliveryAssignment.order.id}`} className="text-cta hover:underline">
                  {report.deliveryAssignment.order.orderNumber}
                </Link>
                {" ("}
                {report.deliveryAssignment.order.user.firstName} {report.deliveryAssignment.order.user.lastName}
                {")"}
              </>
            )}
          </p>
        </div>
        {report.urgency === "URGENT" && <Badge variant="critical">{tUrgency("URGENT")}</Badge>}
      </div>

      {report.description && (
        <Card>
          <CardContent>
            <p className="text-sm font-medium text-ink">{t("description")}</p>
            <p className="mt-1 text-sm text-ink-muted">{report.description}</p>
          </CardContent>
        </Card>
      )}

      {report.photoUrl && (
        <Card>
          <CardContent>
            <p className="mb-2 text-sm font-medium text-ink">{t("photo")}</p>
            <div className="relative h-48 w-48 overflow-hidden rounded-xl bg-surface-secondary">
              {/* unoptimized: this photo is served through an authenticated route (see
                  src/app/api/uploads/delivery-reports/[filename]/route.ts), not a public static
                  file - Next's image optimizer would fetch it server-side without the viewer's
                  session cookie and get a 401, so optimization is skipped and the browser fetches
                  it directly with its own cookies instead. */}
              <Image src={report.photoUrl} alt={t("photoAlt")} fill sizes="192px" className="object-cover" unoptimized />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <DeliverySupportControls
            reportId={report.id}
            status={report.status}
            assignedToId={report.assignedToId}
            staffNote={report.staffNote}
            assignableUsers={assignableUsers.map((u) => ({ id: u.id, name: `${u.firstName} ${u.lastName}` }))}
          />
        </CardContent>
      </Card>

      <p className="text-xs text-ink-muted">
        {t("filedPrefix")} <FormattedDate date={report.createdAt} locale={locale} opts={{ dateStyle: "medium", timeStyle: "short" }} />
      </p>
    </div>
  );
}
