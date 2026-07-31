import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Card, CardContent, EmptyState, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from "@/components/ui";
import { Money } from "@/components/Money";
import { localizedField } from "@/lib/localizedField";
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
  getTotalRevenue,
  getNetRevenueOverTime,
  getBannerPerformance,
  getBusinessOverview,
  getProductPerformance,
  type DateRange,
} from "@/lib/server/services/analytics";
import { KpiStrip } from "./KpiStrip";
import { RfmStatTiles } from "./RfmStatTiles";
import { RfmSegmentChart } from "./RfmSegmentChart";
import { RecalculateRfmButton } from "./RecalculateRfmButton";
import { SalesHeatmap } from "./SalesHeatmap";
import { AnalyticsDateRangeFilter } from "./AnalyticsDateRangeFilter";
import { NetRevenueChart } from "./NetRevenueChart";
import { StaffPerformanceChart } from "./StaffPerformanceChart";
import { DeliveryPerformanceSection } from "./DeliveryPerformanceSection";
import { CohortRetentionHeatmap } from "./CohortRetentionHeatmap";
import { CartFunnelChart } from "./CartFunnelChart";
import { GeographicOrderTable } from "./GeographicOrderTable";
import { BannerPerformanceChart } from "./BannerPerformanceChart";
import { BusinessOverview } from "./BusinessOverview";
import { ProductPerformanceChart } from "./ProductPerformanceChart";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.analytics");
  const tCommon = await getTranslations("common");
  return { title: t("metaTitle", { brand: tCommon("brand") }) };
}

const CARD_CLASS = "rounded-lg";
const CONTENT_CLASS = "p-3.5";

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
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const parsedFrom = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? new Date(`${from}T00:00:00+03:00`) : null;
  const parsedTo = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? new Date(`${to}T23:59:59.999+03:00`) : null;
  const currentRange: DateRange = {
    from: parsedFrom && !Number.isNaN(parsedFrom.getTime()) ? parsedFrom : defaultFrom,
    to: parsedTo && !Number.isNaN(parsedTo.getTime()) ? parsedTo : now,
  };
  const previousRange = getPreviousRange(currentRange);

  // RFM segment counts are deliberately NOT date-filtered: a segment is a whole-customer-lifetime
  // label recomputed all-at-once by the Recalculate button (recency/frequency/monetary against a
  // customer's entire order history), not a per-event fact with its own date - "Champions between
  // March 1-31" isn't a coherent question the way "top spenders in March" is. Flagged to the user
  // rather than forcing a fake window onto it.
  const [segmentGroups, unsegmentedCount, topCustomers, frequentPairs, heatmap, totalRevenue, openDeliveryTickets] =
    await Promise.all([
      prisma.customerStats.groupBy({ by: ["segment"], _count: { _all: true }, where: { segment: { not: null } } }),
      prisma.customerStats.count({ where: { segment: null } }),
      getTopCustomersByLifetimeValue(10, currentRange),
      getFrequentlyBoughtTogether(10, currentRange),
      getSalesHeatmap(currentRange),
      getTotalRevenue(currentRange),
      prisma.deliverySupportTicket.count({ where: { status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] } } }),
    ]);

  const [
    staffCurrent,
    staffPrevious,
    deliveryCurrent,
    deliveryPrevious,
    cohorts,
    funnelCurrent,
    funnelPrevious,
    geoRows,
    previousHeatmap,
    previousRevenue,
    netRevenueCurrent,
    netRevenuePrevious,
    bannerPerformance,
    businessCurrent,
    businessPrevious,
    productPerformance,
  ] = await Promise.all([
    getStaffPerformance(currentRange),
    previousRange ? getStaffPerformance(previousRange) : Promise.resolve(undefined),
    getDeliveryPerformance(currentRange),
    previousRange ? getDeliveryPerformance(previousRange) : Promise.resolve(undefined),
    getCohortRetention(),
    getCartAbandonmentFunnel(currentRange),
    previousRange ? getCartAbandonmentFunnel(previousRange) : Promise.resolve(undefined),
    getGeographicOrderDistribution(currentRange),
    previousRange ? getSalesHeatmap(previousRange) : Promise.resolve(undefined),
    previousRange ? getTotalRevenue(previousRange) : Promise.resolve(undefined),
    getNetRevenueOverTime(currentRange),
    previousRange ? getNetRevenueOverTime(previousRange) : Promise.resolve(undefined),
    getBannerPerformance(currentRange),
    getBusinessOverview(currentRange),
    getBusinessOverview(previousRange!),
    getProductPerformance(currentRange),
  ]);

  const segmentCounts: Record<string, number> = {};
  for (const g of segmentGroups) {
    if (g.segment) segmentCounts[g.segment] = g._count._all;
  }
  const atRiskLostCount = (segmentCounts.AT_RISK ?? 0) + (segmentCounts.LOST ?? 0);

  return (
    <div className="analytics-theme -m-6 min-h-[calc(100%+3rem)] bg-[var(--analytics-bg)] p-6 text-analytics">
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-2xl font-semibold text-analytics">{t("heading")}</h2>
        <AnalyticsDateRangeFilter />
      </div>

      <KpiStrip
        values={[
          { labelKey: "totalRevenue", current: totalRevenue, previous: previousRevenue, isCurrency: true, goodDirection: "up" },
          { labelKey: "atRiskLostCustomers", current: atRiskLostCount, isCurrency: false, goodDirection: null },
          { labelKey: "openDeliveryTickets", current: openDeliveryTickets, isCurrency: false, goodDirection: null },
          {
            labelKey: "recoverableCartRevenue",
            current: funnelCurrent.recoverableRevenue,
            previous: funnelPrevious?.recoverableRevenue,
            isCurrency: true,
            goodDirection: "down",
          },
        ]}
      />

      <Card className={CARD_CLASS}>
        <CardContent className={CONTENT_CLASS}>
          <p className="mb-1 font-medium text-analytics">{t("business.title")}</p>
          <p className="mb-4 text-sm text-analytics-muted">{t("business.description")}</p>
          <BusinessOverview current={businessCurrent} previous={businessPrevious} />
        </CardContent>
      </Card>

      <Card className={CARD_CLASS}>
        <CardContent className={`flex flex-col gap-3 ${CONTENT_CLASS}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-analytics">{t("rfm.title")}</p>
              <p className="text-sm text-analytics-muted">
                {t("rfm.description")}
                {unsegmentedCount > 0 && ` ${t("rfm.unsegmentedNote", { count: unsegmentedCount })}`}
              </p>
            </div>
            <RecalculateRfmButton />
          </div>
          {Object.keys(segmentCounts).length === 0 ? (
            <EmptyState title={t("rfm.noSegmentsTitle")} description={t("rfm.noSegmentsDescription")} />
          ) : (
            <>
              <RfmStatTiles counts={segmentCounts} />
              <RfmSegmentChart counts={segmentCounts} />
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className={CARD_CLASS}>
          <CardContent className={CONTENT_CLASS}>
            <p className="mb-1 font-medium text-analytics">{t("topCustomers.title")}</p>
            <p className="mb-3 text-sm text-analytics-muted">{t("topCustomers.description")}</p>
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
                        <Link href={`/admin/users/${c.userId}`} className="text-neutral hover:underline">
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

        <Card className={CARD_CLASS}>
          <CardContent className={CONTENT_CLASS}>
            <p className="mb-1 font-medium text-analytics">{t("frequentlyBought.title")}</p>
            <p className="mb-3 text-sm text-analytics-muted">{t("frequentlyBought.description")}</p>
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
                        {localizedField(locale, p.aNameEn, p.aNameAr)} + {localizedField(locale, p.bNameEn, p.bNameAr)}
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

      <Card className={CARD_CLASS}>
        <CardContent className={CONTENT_CLASS}>
          <p className="mb-1 font-medium text-analytics">{t("salesHeatmap.title")}</p>
          <p className="mb-3 text-sm text-analytics-muted">{t("salesHeatmap.description")}</p>
          <SalesHeatmap grid={heatmap} previousGrid={previousHeatmap} />
        </CardContent>
      </Card>

      <div className="border-t border-analytics pt-4">
        <h3 className="mb-3 font-heading text-lg font-semibold text-analytics">{t("extendedHeading")}</h3>

        <div className="flex flex-col gap-4">
          <Card className={CARD_CLASS}>
            <CardContent className={CONTENT_CLASS}>
              <p className="mb-1 font-medium text-analytics">{t("productPerformance.title")}</p>
              <p className="mb-3 text-sm text-analytics-muted">{t("productPerformance.description")}</p>
              <ProductPerformanceChart rows={productPerformance} />
            </CardContent>
          </Card>

          <Card className={CARD_CLASS}>
            <CardContent className={CONTENT_CLASS}>
              <p className="mb-1 font-medium text-analytics">{t("bannerPerformance.title")}</p>
              <p className="mb-3 text-sm text-analytics-muted">{t("bannerPerformance.description")}</p>
              <BannerPerformanceChart rows={bannerPerformance} />
            </CardContent>
          </Card>

          <Card className={CARD_CLASS}>
            <CardContent className={CONTENT_CLASS}>
              <p className="mb-1 font-medium text-analytics">{t("netRevenue.title")}</p>
              <p className="mb-3 text-sm text-analytics-muted">{t("netRevenue.description")}</p>
              <NetRevenueChart current={netRevenueCurrent} previous={netRevenuePrevious} />
            </CardContent>
          </Card>

          <Card className={CARD_CLASS}>
            <CardContent className={CONTENT_CLASS}>
              <p className="mb-1 font-medium text-analytics">{t("staffPerformance.title")}</p>
              <p className="mb-3 text-sm text-analytics-muted">{t("staffPerformance.description")}</p>
              <StaffPerformanceChart current={staffCurrent} previous={staffPrevious} />
            </CardContent>
          </Card>

          <Card className={CARD_CLASS}>
            <CardContent className={CONTENT_CLASS}>
              <p className="mb-1 font-medium text-analytics">{t("deliveryPerformance.title")}</p>
              <p className="mb-3 text-sm text-analytics-muted">{t("deliveryPerformance.description")}</p>
              <DeliveryPerformanceSection current={deliveryCurrent} previous={deliveryPrevious} />
            </CardContent>
          </Card>

          <Card className={CARD_CLASS}>
            <CardContent className={CONTENT_CLASS}>
              <p className="mb-1 font-medium text-analytics">{t("cohortRetention.title")}</p>
              <p className="mb-3 text-sm text-analytics-muted">{t("cohortRetention.description")}</p>
              <CohortRetentionHeatmap cohorts={cohorts} />
            </CardContent>
          </Card>

          <Card className={CARD_CLASS}>
            <CardContent className={CONTENT_CLASS}>
              <p className="mb-1 font-medium text-analytics">{t("cartFunnel.title")}</p>
              <p className="mb-3 text-sm text-analytics-muted">{t("cartFunnel.description")}</p>
              <CartFunnelChart current={funnelCurrent} previous={funnelPrevious} />
            </CardContent>
          </Card>

          <Card className={CARD_CLASS}>
            <CardContent className={CONTENT_CLASS}>
              <p className="mb-1 font-medium text-analytics">{t("geographic.title")}</p>
              <p className="mb-3 text-sm text-analytics-muted">{t("geographic.description")}</p>
              <GeographicOrderTable rows={geoRows} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </div>
  );
}
