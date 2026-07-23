"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui";
import { LoyaltyConfigForm } from "./LoyaltyConfigForm";
import { LoyaltyTiersManager, type LoyaltyTierRow } from "./LoyaltyTiersManager";
import { ShippingZonesManager, type ShippingZoneRow } from "./ShippingZonesManager";

export function SettingsTabs({
  loyaltyConfig,
  loyaltyTiers,
  shippingZones,
}: {
  loyaltyConfig: { pointsPerJdSpent: string; redemptionValuePerPoint: string };
  loyaltyTiers: LoyaltyTierRow[];
  shippingZones: ShippingZoneRow[];
}) {
  const t = useTranslations("admin.settings.tabs");
  return (
    <Tabs defaultValue="loyalty">
      <TabsList>
        <TabsTrigger value="loyalty">{t("loyalty")}</TabsTrigger>
        <TabsTrigger value="tiers">{t("tiers")}</TabsTrigger>
        <TabsTrigger value="shipping">{t("shipping")}</TabsTrigger>
      </TabsList>
      <TabsContent value="loyalty">
        <LoyaltyConfigForm initialValues={loyaltyConfig} />
      </TabsContent>
      <TabsContent value="tiers">
        <LoyaltyTiersManager initialTiers={loyaltyTiers} />
      </TabsContent>
      <TabsContent value="shipping">
        <ShippingZonesManager initialZones={shippingZones} />
      </TabsContent>
    </Tabs>
  );
}
