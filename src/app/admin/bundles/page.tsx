import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from "@/components/ui";
import { Money } from "@/components/Money";
import { localizedField } from "@/lib/localizedField";
import type { AppLocale } from "@/i18n/config";
import { BundleRowActions } from "./BundleRowActions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.bundles");
  const tCommon = await getTranslations("common");
  return { title: t("metaTitle", { brand: tCommon("brand") }) };
}

export default async function AdminBundlesPage() {
  const t = await getTranslations("admin.bundles");
  const tCommon = await getTranslations("common");
  const locale = (await getLocale()) as AppLocale;
  const bundles = await prisma.productBundle.findMany({ orderBy: { createdAt: "desc" }, include: { items: true } });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-semibold text-ink">{t("heading")}</h2>
        <Button size="sm" asChild>
          <Link href="/admin/bundles/new">{t("addBundle")}</Link>
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("headers.bundle")}</TableHead>
            <TableHead>{t("headers.items")}</TableHead>
            <TableHead>{t("headers.price")}</TableHead>
            <TableHead>{t("headers.status")}</TableHead>
            <TableHead>{t("headers.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bundles.map((bundle) => {
            const bundleName = localizedField(locale, bundle.nameEn, bundle.nameAr);
            return (
            <TableRow key={bundle.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface-secondary">
                    <Image src={bundle.mainImageUrl} alt={bundleName} fill sizes="40px" className="object-cover" />
                  </div>
                  <p className="font-medium text-ink">{bundleName}</p>
                </div>
              </TableCell>
              <TableCell>{bundle.items.length}</TableCell>
              <TableCell>
                <Money value={Number(bundle.bundlePrice)} locale={locale} />
              </TableCell>
              <TableCell>
                <Badge variant={bundle.isActive ? "success" : "neutral"}>
                  {bundle.isActive ? tCommon("active") : tCommon("inactive")}
                </Badge>
              </TableCell>
              <TableCell>
                <BundleRowActions bundleId={bundle.id} editHref={`/admin/bundles/${bundle.id}/edit`} />
              </TableCell>
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
