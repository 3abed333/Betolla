import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Card, CardContent, EmptyState, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from "@/components/ui";
import { Money } from "@/components/Money";
import type { AppLocale } from "@/i18n/config";
import {
  getFrequentlyBoughtTogether,
  getTopCustomersByLifetimeValue,
  getSalesHeatmap,
  getStaffPerformance,
  getDeliveryPerformance,
  getCohortRetention,
  getCartAbandonmentFunnel,
  getGeographicOrderDistribution,
  type DateRange,
} from "@/lib/server/services/analytics";
import { RfmSegmentChart } from "./RfmSegmentChart";
import { RecalculateRfmButton } from "./RecalculateRfmButton";
import { SalesHeatmap } from "./SalesHeatmap";
import { AnalyticsDateRangeFilter } from "./AnalyticsDateRangeFilter";
import { StaffPerformanceChart } from "./StaffPerformanceChart";
import { DeliveryPerformanceSection } from "./DeliveryPerformanceSection";
import { CohortRetentionHeatmap } from "./CohortRetentionHeatmap";
import { CartFunnelChart } from "./CartFunnelChart";
import { GeographicOrderTable } from "./GeographicOrderTable";

export const metadata: Metadata = { title: "Analytics - Betolla Admin" };

// Same-length window immediately preceding the current range, for period-over-period deltas.
// Needs both ends of the current range to know how long it is - falls back to no comparison
// otherwise, rather than guessing a default window length.
function getPreviousRange(range: DateRange): DateRange | undefined {
  if (!range.from || !range.to) return undefined;
  const lengthMs = range.to.getTime() - range.from.getTime();
  const previousTo = new Date(range.from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - lengthMs);
  return { from: previousFrom, to: previousTo };
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const t = await getTranslations("admin.analytics");
  const tSegment = await getTranslations("common.rfmSegment");
  const locale = (await getLocale()) as AppLocale;
  const currentRange: DateRange = {
    from: from ? new Date(from) : undefined,
    to: to ? new Date(`${to}T23:59:59.999`) : undefined,
  };
  const previousRange = getPreviousRange(currentRange);

  const [segmentGroups, unsegmentedCount, topCustomers, frequentPairs, heatmap] = await Promise.all([
    prisma.customerStats.groupBy({ by: ["segment"], _count: { _all: true }, where: { segment: { not: null } } }),
    prisma.customerStats.count({ where: { segment: null } }),
    getTopCustomersByLifetimeValue(10),
    getFrequentlyBoughtTogether(10),
    getSalesHeatmap(),
  ]);

  const [staffCurrent, staffPrevious, deliveryCurrent, deliveryPrevious, cohorts, funnelCurrent, funnelPrevious, geoRows] =
    await Promise.all([
      getStaffPerformance(currentRange),
      previousRange ? getStaffPerformance(previousRange) : Promise.resolve(undefined),
      getDeliveryPerformance(currentRange),
      previousRange ? getDeliveryPerformance(previousRange) : Promise.resolve(undefined),
      getCohortRetention(),
      getCartAbandonmentFunnel(currentRange),
      previousRange ? getCartAbandonmentFunnel(previousRange) : Promise.resolve(undefined),
      getGeographicOrderDistribution(currentRange),
    ]);

  const segmentCounts: Record<string, number> = {};
  for (const g of segmentGroups) {
    if (g.segment) segmentCounts[g.segment] = g._count._all;
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-heading text-2xl font-semibold text-ink">{t("heading")}</h2>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-ink">{t("rfm.title")}</p>
              <p className="text-sm text-ink-muted">
                {t("rfm.description")}
                {unsegmentedCount > 0 && ` ${t("rfm.unsegmentedNote", { count: unsegmentedCount })}`}
              </p>
            </div>
            <RecalculateRfmButton />
          </div>
          {Object.keys(segmentCounts).length === 0 ? (
            <EmptyState title={t("rfm.noSegmentsTitle")} description={t("rfm.noSegmentsDescription")} />
          ) : (
            <RfmSegmentChart counts={segmentCounts} />
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardContent>
            <p className="mb-1 font-medium text-ink">{t("topCustomers.title")}</p>
            <p className="mb-3 text-sm text-ink-muted">{t("topCustomers.description")}</p>
            {topCustomers.length === 0 ? (
              <EmptyState title={t("topCustomers.noOrdersTitle")} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("topCustomers.headers.customer")}</TableHead>
                    <TableHead>{t("topCustomers.headers.orders")}</TableHead>
                    <TableHead>{t("topCustomers.headers.lifetimeValue")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topCustomers.map((c) => (
                    <TableRow key={c.userId}>
                      <TableCell>
                        <Link href={`/admin/users/${c.userId}`} className="text-cta hover:underline">
                          {c.name}
                        </Link>
                        {c.segment && (
                          <Badge variant="highlight" className="ms-2">
                            {tSegment(c.segment)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{c.orderCount}</TableCell>
                      <TableCell>
                        <Money value={c.totalSpent} locale={locale} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="mb-1 font-medium text-ink">{t("frequentlyBought.title")}</p>
            <p className="mb-3 text-sm text-ink-muted">{t("frequentlyBought.description")}</p>
            {frequentPairs.length === 0 ? (
              <EmptyState title={t("frequentlyBought.noHistoryTitle")} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("frequentlyBought.headers.pair")}</TableHead>
                    <TableHead>{t("frequentlyBought.headers.ordersTogether")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {frequentPairs.map((p) => (
                    <TableRow key={`${p.aId}-${p.bId}`}>
                      <TableCell>
                        {p.aName} + {p.bName}
                      </TableCell>
                      <TableCell>{p.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent>
          <p className="mb-1 font-medium text-ink">{t("salesHeatmap.title")}</p>
          <p className="mb-3 text-sm text-ink-muted">{t("salesHeatmap.description")}</p>
          <SalesHeatmap grid={heatmap} />
        </CardContent>
      </Card>

      <div className="border-t border-border pt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-heading text-lg font-semibold text-ink">{t("extendedHeading")}</h3>
          <AnalyticsDateRangeFilter />
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardContent>
              <p className="mb-1 font-medium text-ink">{t("staffPerformance.title")}</p>
              <p className="mb-3 text-sm text-ink-muted">{t("staffPerformance.description")}</p>
              <StaffPerformanceChart current={staffCurrent} previous={staffPrevious} />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <p className="mb-1 font-medium text-ink">{t("deliveryPerformance.title")}</p>
              <p className="mb-3 text-sm text-ink-muted">{t("deliveryPerformance.description")}</p>
              <DeliveryPerformanceSection current={deliveryCurrent} previous={deliveryPrevious} />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <p className="mb-1 font-medium text-ink">{t("cohortRetention.title")}</p>
              <p className="mb-3 text-sm text-ink-muted">{t("cohortRetention.description")}</p>
              <CohortRetentionHeatmap cohorts={cohorts} />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <p className="mb-1 font-medium text-ink">{t("cartFunnel.title")}</p>
              <p className="mb-3 text-sm text-ink-muted">{t("cartFunnel.description")}</p>
              <CartFunnelChart current={funnelCurrent} previous={funnelPrevious} />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <p className="mb-1 font-medium text-ink">{t("geographic.title")}</p>
              <p className="mb-3 text-sm text-ink-muted">{t("geographic.description")}</p>
              <GeographicOrderTable rows={geoRows} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
