import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button } from "@/components/ui";
import { Money } from "@/components/Money";
import type { AppLocale } from "@/i18n/config";
import { UserFilters } from "./UserFilters";
import type { Prisma } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Customers - Betolla Admin" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const { q, sort } = await searchParams;
  const t = await getTranslations("admin.users");
  const tCommon = await getTranslations("common");
  const locale = (await getLocale()) as AppLocale;

  const where: Prisma.UserWhereInput = { role: "CUSTOMER" };
  if (q) {
    where.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { username: { contains: q, mode: "insensitive" } },
    ];
  }

  const customers = await prisma.user.findMany({
    where,
    include: { customerStats: true },
    take: 200,
  });

  const sorted = [...customers].sort((a, b) => {
    if (sort === "spend") return Number(b.customerStats?.totalSpent ?? 0) - Number(a.customerStats?.totalSpent ?? 0);
    if (sort === "orders") return (b.customerStats?.orderCount ?? 0) - (a.customerStats?.orderCount ?? 0);
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const exportParams = new URLSearchParams();
  if (q) exportParams.set("q", q);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-semibold text-ink">{t("heading")}</h2>
        <Button size="sm" variant="outline" asChild>
          <a href={`/api/admin/users/export?${exportParams.toString()}`}>{tCommon("exportCsv")}</a>
        </Button>
      </div>
      <UserFilters />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("headers.customer")}</TableHead>
            <TableHead>{t("headers.orders")}</TableHead>
            <TableHead>{t("headers.totalSpent")}</TableHead>
            <TableHead>{t("headers.storeCredit")}</TableHead>
            <TableHead>{t("headers.status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((customer) => (
            <TableRow key={customer.id} className="cursor-pointer">
              <TableCell>
                <Link href={`/admin/users/${customer.id}`} className="block">
                  <p className="font-medium text-ink hover:underline">
                    {customer.firstName} {customer.lastName}
                  </p>
                  <p className="text-xs text-ink-muted">{customer.email}</p>
                </Link>
              </TableCell>
              <TableCell>{customer.customerStats?.orderCount ?? 0}</TableCell>
              <TableCell>
                <Money value={Number(customer.customerStats?.totalSpent ?? 0)} locale={locale} />
              </TableCell>
              <TableCell>
                <Money value={Number(customer.storeCreditBalance)} locale={locale} />
              </TableCell>
              <TableCell>
                <Badge variant={customer.isActive ? "success" : "neutral"}>
                  {customer.isActive ? tCommon("active") : tCommon("inactive")}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
