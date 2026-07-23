import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from "@/components/ui";
import { CreateManagedAccountDialog } from "@/components/CreateManagedAccountDialog";
import { FormattedDate } from "@/components/FormattedDate";
import type { AppLocale } from "@/i18n/config";
import { StaffRowActions } from "./StaffRowActions";

export const metadata: Metadata = { title: "Staff - Betolla Admin" };

export default async function AdminStaffPage() {
  const t = await getTranslations("admin.staff");
  const tCommon = await getTranslations("common");
  const tHeaders = await getTranslations("admin.managedAccountsShared.headers");
  const tRoleLabel = await getTranslations("common.roleLabel");
  const locale = (await getLocale()) as AppLocale;
  const staff = await prisma.user.findMany({ where: { role: "STAFF" }, orderBy: { createdAt: "desc" } });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-semibold text-ink">{t("heading")}</h2>
        <CreateManagedAccountDialog
          apiPath="/api/admin/staff"
          roleLabel={tRoleLabel("STAFF")}
          trigger={<Button size="sm">{t("addStaff")}</Button>}
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
          {staff.map((member) => (
            <TableRow key={member.id}>
              <TableCell>
                <Link href={`/admin/staff/${member.id}`} className="font-medium text-ink hover:underline">
                  {member.firstName} {member.lastName}
                </Link>
              </TableCell>
              <TableCell>{member.email}</TableCell>
              <TableCell>
                <Badge variant={member.isActive ? "success" : "neutral"}>
                  {member.isActive ? tCommon("active") : tCommon("inactive")}
                </Badge>
              </TableCell>
              <TableCell>
                <FormattedDate date={member.createdAt} locale={locale} />
              </TableCell>
              <TableCell>
                <StaffRowActions staffId={member.id} isActive={member.isActive} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
