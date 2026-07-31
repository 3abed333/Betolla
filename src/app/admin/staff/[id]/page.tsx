import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Card, CardContent, Badge } from "@/components/ui";
import { FormattedDate } from "@/components/FormattedDate";
import type { AppLocale } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.staff.detail");
  const tCommon = await getTranslations("common");
  return { title: t("metaTitle", { brand: tCommon("brand") }) };
}

export default async function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staffMember = await prisma.user.findUnique({ where: { id } });
  if (!staffMember || staffMember.role !== "STAFF") notFound();

  const t = await getTranslations("admin.staff.detail");
  const tCommon = await getTranslations("common");
  const locale = (await getLocale()) as AppLocale;

  const activity = await prisma.activityLog.findMany({
    where: { actorId: id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <h2 className="font-heading text-2xl font-semibold text-ink">
          {staffMember.firstName} {staffMember.lastName}
        </h2>
        <Badge variant={staffMember.isActive ? "success" : "neutral"}>
          {staffMember.isActive ? tCommon("active") : tCommon("inactive")}
        </Badge>
      </div>
      <p className="text-sm text-ink-muted">
        {staffMember.email} &middot; {t("joinedPrefix")} <FormattedDate date={staffMember.createdAt} locale={locale} opts={{ dateStyle: "long" }} />
      </p>

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
                  <p className="text-xs text-ink-muted">
                    {entry.entityType}
                    {entry.entityId && ` #${entry.entityId.slice(-8)}`}
                  </p>
                  {(entry.beforeData || entry.afterData) && (
                    <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-ink-muted">
                      {entry.beforeData ? <pre className="overflow-x-auto">before: {JSON.stringify(entry.beforeData)}</pre> : <span />}
                      {entry.afterData ? <pre className="overflow-x-auto">after: {JSON.stringify(entry.afterData)}</pre> : <span />}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
