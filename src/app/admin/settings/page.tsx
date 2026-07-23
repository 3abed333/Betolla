import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { SettingsTabs } from "./SettingsTabs";

export const metadata: Metadata = { title: "Settings - Betolla Admin" };

export default async function AdminSettingsPage() {
  const t = await getTranslations("admin.settings");
  const [loyaltyConfig, loyaltyTiers, shippingZones] = await Promise.all([
    prisma.loyaltyConfig.findFirst(),
    prisma.loyaltyTier.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.shippingZone.findMany({ orderBy: { cityEn: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-heading text-2xl font-semibold text-ink">{t("heading")}</h2>
      <SettingsTabs
        loyaltyConfig={
          loyaltyConfig
            ? { pointsPerJdSpent: loyaltyConfig.pointsPerJdSpent.toString(), redemptionValuePerPoint: loyaltyConfig.redemptionValuePerPoint.toString() }
            : { pointsPerJdSpent: "1", redemptionValuePerPoint: "0.01" }
        }
        loyaltyTiers={loyaltyTiers.map((t) => ({ id: t.id, nameEn: t.nameEn, nameAr: t.nameAr, minPoints: t.minPoints, sortOrder: t.sortOrder }))}
        shippingZones={shippingZones.map((z) => ({
          id: z.id,
          cityEn: z.cityEn,
          cityAr: z.cityAr,
          fee: z.fee.toString(),
          estimatedDaysMin: z.estimatedDaysMin,
          estimatedDaysMax: z.estimatedDaysMax,
          isActive: z.isActive,
        }))}
      />
    </div>
  );
}
