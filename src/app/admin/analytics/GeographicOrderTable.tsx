import { getTranslations, getLocale } from "next-intl/server";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from "@/components/ui";
import { Money } from "@/components/Money";
import type { AppLocale } from "@/i18n/config";
import { localizedCity } from "@/lib/cityAr";

type GeoRow = { city: string; count: number; revenue: number };

export async function GeographicOrderTable({ rows }: { rows: GeoRow[] }) {
  const t = await getTranslations("admin.analytics.geographic");
  const locale = (await getLocale()) as AppLocale;

  if (rows.length === 0) {
    return <EmptyState title={t("noOrdersTitle")} />;
  }

  const maxRevenue = Math.max(1, ...rows.map((r) => r.revenue));

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("headers.city")}</TableHead>
          <TableHead>{t("headers.orders")}</TableHead>
          <TableHead>{t("headers.revenue")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const intensity = row.revenue / maxRevenue;
          return (
            <TableRow key={row.city}>
              <TableCell>{localizedCity(row.city, locale)}</TableCell>
              <TableCell>{row.count}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${Math.max(4, intensity * 80)}px`,
                      backgroundColor: "var(--cta)",
                      opacity: intensity === 0 ? 0.2 : 0.4 + intensity * 0.6,
                    }}
                  />
                  <span>
                    <Money value={row.revenue} locale={locale} />
                  </span>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
