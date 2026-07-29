import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BannerForm } from "@/components/BannerForm";

export const metadata: Metadata = { title: "Add Homepage Banner - Betolla Admin" };

export default async function NewBannerPage() {
  const t = await getTranslations("admin.banners");
  return <div className="flex flex-col gap-4"><h2 className="font-heading text-2xl font-semibold text-ink">{t("add")}</h2><BannerForm /></div>;
}
