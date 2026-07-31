import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Card, CardContent, Badge } from "@/components/ui";
import { Money } from "@/components/Money";
import { FormattedDate } from "@/components/FormattedDate";
import type { AppLocale } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("staff.deliveryAccounts.detail");
  const tCommon = await getTranslations("common");
  return { title: t("metaTitle", { brand: tCommon("brand") }) };
}

export default async function DeliveryAccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const driver = await prisma.user.findUnique({
    where: { id },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, isActive: true, createdAt: true, role: true },
  });
  if (!driver || driver.role !== "DELIVERY") notFound();

  const t = await getTranslations("staff.deliveryAccounts.detail");
  const tCommon = await getTranslations("common");
  const tDeliveryStatus = await getTranslations("common.deliveryStatus");
  const locale = (await getLocale()) as AppLocale;

  const [assignments, activity] = await Promise.all([
    prisma.deliveryAssignment.findMany({
      where: { driverId: id },
      orderBy: { assignedAt: "desc" },
      take: 20,
      include: { order: { select: { orderNumber: true } } },
    }),
    prisma.activityLog.findMany({ where: { actorId: id }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  const deliveredCount = assignments.filter((a) => a.status === "DELIVERED").length;
  const failedCount = assignments.filter((a) => a.status === "FAILED").length;
  const totalEarnings = assignments.reduce((sum, a) => sum + Number(a.earningsAmount), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <h2 className="font-heading text-2xl font-semibold text-ink">
          {driver.firstName} {driver.lastName}
        </h2>
        <Badge variant={driver.isActive ? "success" : "neutral"}>
          {driver.isActive ? tCommon("active") : tCommon("inactive")}
        </Badge>
      </div>
      <p className="text-sm text-ink-muted">
        {driver.email} &middot;{" "}
        <span dir="ltr" className="inline-block">
          {driver.phone ?? t("noPhoneOnFile")}
        </span>{" "}
        &middot; {t("joinedPrefix")} <FormattedDate date={driver.createdAt} locale={locale} opts={{ dateStyle: "long" }} />
      </p>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-ink-muted">{t("delivered")}</p>
          <p className="font-heading text-xl font-semibold text-ink">{deliveredCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-ink-muted">{t("failedAttempts")}</p>
          <p className="font-heading text-xl font-semibold text-ink">{failedCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-ink-muted">{t("totalEarningsJD")}</p>
          <p className="font-heading text-xl font-semibold text-ink">
            <Money value={totalEarnings} locale={locale} />
          </p>
        </Card>
      </div>

      <Card>
        <CardContent>
          <p className="mb-3 font-medium text-ink">{t("recentDeliveries", { count: assignments.length })}</p>
          {assignments.length === 0 ? (
            <p className="text-sm text-ink-muted">{t("noAssignmentsYet")}</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-ink">
                    {a.order.orderNumber} &middot; {t("attemptPrefix")} {a.attemptNumber}
                  </span>
                  <span className="text-ink-muted">{tDeliveryStatus(a.status)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <p className="mb-3 font-medium text-ink">{t("activityLog", { count: activity.length })}</p>
          {activity.length === 0 ? (
            <p className="text-sm text-ink-muted">{t("noActionsYet")}</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {activity.map((entry) => (
                <div key={entry.id} className="py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-ink">{entry.action.replace(/_/g, " ")}</span>
                    <span className="text-xs text-ink-muted">
                      <FormattedDate date={entry.createdAt} locale={locale} opts={{ dateStyle: "medium", timeStyle: "short" }} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
