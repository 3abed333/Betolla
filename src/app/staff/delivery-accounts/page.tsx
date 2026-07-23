import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from "@/components/ui";
import { CreateManagedAccountDialog } from "@/components/CreateManagedAccountDialog";
import { FormattedDate } from "@/components/FormattedDate";
import type { AppLocale } from "@/i18n/config";
import { DeliveryAccountRowActions } from "./DeliveryAccountRowActions";

export const metadata: Metadata = { title: "Delivery Accounts - Betolla Staff" };

export default async function DeliveryAccountsPage() {
  const t = await getTranslations("staff.deliveryAccounts");
  const tCommon = await getTranslations("common");
  const tHeaders = await getTranslations("admin.managedAccountsShared.headers");
  const tRoleLabel = await getTranslations("common.roleLabel");
  const locale = (await getLocale()) as AppLocale;
  const drivers = await prisma.user.findMany({
    where: { role: "DELIVERY" },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, firstName: true, lastName: true, isActive: true, createdAt: true },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-semibold text-ink">{t("heading")}</h2>
        <CreateManagedAccountDialog
          apiPath="/api/staff/delivery-accounts"
          roleLabel={tRoleLabel("DELIVERY")}
          trigger={<Button size="sm">{t("addDriver")}</Button>}
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{tHeaders("name")}</TableHead>
            <TableHead>{tHeaders("email")}</TableHead>
            <TableHead>{tHeaders("status")}</TableHead>
            <TableHead>{tHeaders("joined")}</TableHead>
            <TableHead>{tHeaders("actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {drivers.map((driver) => (
            <TableRow key={driver.id}>
              <TableCell>
                <Link href={`/staff/delivery-accounts/${driver.id}`} className="font-medium text-ink hover:underline">
                  {driver.firstName} {driver.lastName}
                </Link>
              </TableCell>
              <TableCell>{driver.email}</TableCell>
              <TableCell>
                <Badge variant={driver.isActive ? "success" : "neutral"}>
                  {driver.isActive ? tCommon("active") : tCommon("inactive")}
                </Badge>
              </TableCell>
              <TableCell>
                <FormattedDate date={driver.createdAt} locale={locale} />
              </TableCell>
              <TableCell>
                <DeliveryAccountRowActions driverId={driver.id} isActive={driver.isActive} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
