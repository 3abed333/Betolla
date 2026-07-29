"use client";

import { useLocale, useTranslations } from "next-intl";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/format";
import type { AppLocale } from "@/i18n/config";

type Overview = {
  signedInCustomers: number; orderingCustomers: number; paidBuyers: number; signInToOrderRate: number;
  orderToPaidRate: number; registeredCustomers: number; orders: number; paidOrders: number;
  cancelledOrders: number; cancellationRate: number; returnRequestRate: number; grossMerchandiseValue: number;
  discounts: number; refunds: number; netCollectedRevenue: number; averageOrderValue: number;
  newBuyers: number; repeatBuyers: number; repeatBuyerRate: number;
  daily: { date: string; revenue: number; orders: number }[];
};

function percentDelta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function BusinessOverview({ current, previous }: { current: Overview; previous: Overview }) {
  const t = useTranslations("admin.analytics.business");
  const locale = useLocale() as AppLocale;
  const money = (value: number) => formatCurrency(value, locale);
  const number = (value: number) => value.toLocaleString(locale === "ar" ? "ar-JO-u-nu-latn" : "en");
  const metrics = [
    { key: "netRevenue", value: money(current.netCollectedRevenue), delta: percentDelta(current.netCollectedRevenue, previous.netCollectedRevenue), goodUp: true },
    { key: "grossSales", value: money(current.grossMerchandiseValue), delta: percentDelta(current.grossMerchandiseValue, previous.grossMerchandiseValue), goodUp: true },
    { key: "averageOrder", value: money(current.averageOrderValue), delta: percentDelta(current.averageOrderValue, previous.averageOrderValue), goodUp: true },
    { key: "paidOrders", value: number(current.paidOrders), delta: percentDelta(current.paidOrders, previous.paidOrders), goodUp: true },
    { key: "signInConversion", value: `${current.signInToOrderRate.toFixed(1)}%`, delta: current.signInToOrderRate - previous.signInToOrderRate, goodUp: true },
    { key: "paymentConversion", value: `${current.orderToPaidRate.toFixed(1)}%`, delta: current.orderToPaidRate - previous.orderToPaidRate, goodUp: true },
    { key: "repeatBuyerRate", value: `${current.repeatBuyerRate.toFixed(1)}%`, delta: current.repeatBuyerRate - previous.repeatBuyerRate, goodUp: true },
    { key: "cancellationRate", value: `${current.cancellationRate.toFixed(1)}%`, delta: current.cancellationRate - previous.cancellationRate, goodUp: false },
  ] as const;
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((metric) => {
          const good = metric.goodUp ? metric.delta >= 0 : metric.delta <= 0;
          return <div key={metric.key} className="rounded-lg border border-analytics bg-analytics-surface p-3">
            <p className="text-xs text-analytics-muted">{t(`metrics.${metric.key}`)}</p>
            <p className="mt-1 text-xl font-semibold text-analytics">{metric.value}</p>
            <p className={`mt-1 text-xs ${Math.abs(metric.delta) < 0.05 ? "text-analytics-muted" : good ? "text-good" : "text-bad"}`}>
              {metric.delta > 0 ? "+" : ""}{metric.delta.toFixed(1)}% {t("vsPrior")}
            </p>
          </div>;
        })}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <p className="rounded-lg bg-analytics-surface p-3 text-sm text-analytics">{t("signedIn", { count: current.signedInCustomers })}<br/><span className="text-analytics-muted">{t("ordered", { count: current.orderingCustomers })}</span></p>
        <p className="rounded-lg bg-analytics-surface p-3 text-sm text-analytics">{t("newBuyers", { count: current.newBuyers })}<br/><span className="text-analytics-muted">{t("repeatBuyers", { count: current.repeatBuyers })}</span></p>
        <p className="rounded-lg bg-analytics-surface p-3 text-sm text-analytics">{t("discounts", { amount: money(current.discounts) })}<br/><span className="text-analytics-muted">{t("refunds", { amount: money(current.refunds) })}</span></p>
        <p className="rounded-lg bg-analytics-surface p-3 text-sm text-analytics">{t("registrations", { count: current.registeredCustomers })}<br/><span className="text-analytics-muted">{t("returns", { rate: current.returnRequestRate.toFixed(1) })}</span></p>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={current.daily} margin={{ top: 8, right: 18, left: 0, bottom: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--analytics-border)" />
          <XAxis dataKey="date" tick={{ fill: "var(--analytics-text-muted)", fontSize: 11 }} />
          <YAxis yAxisId="money" tick={{ fill: "var(--analytics-text-muted)", fontSize: 11 }} />
          <YAxis yAxisId="orders" orientation="right" allowDecimals={false} tick={{ fill: "var(--analytics-text-muted)", fontSize: 11 }} />
          <Tooltip contentStyle={{ background: "var(--analytics-bg)", border: "1px solid var(--analytics-border)", borderRadius: 8 }} />
          <Legend />
          <Line yAxisId="money" name={t("revenueLine")} type="monotone" dataKey="revenue" stroke="var(--analytics-good)" strokeWidth={3} />
          <Line yAxisId="orders" name={t("ordersLine")} type="monotone" dataKey="orders" stroke="var(--analytics-neutral)" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-analytics-muted">{t("financialNote")}</p>
    </div>
  );
}
