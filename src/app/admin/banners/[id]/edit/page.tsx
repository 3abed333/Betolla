import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { BannerForm } from "@/components/BannerForm";

export const metadata: Metadata = { title: "Edit Homepage Banner - Betolla Admin" };

export default async function EditBannerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [t, banner] = await Promise.all([getTranslations("admin.banners"), prisma.banner.findUnique({ where: { id } })]);
  if (!banner) notFound();
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-heading text-2xl font-semibold text-ink">{t("editHeading")}</h2>
      <BannerForm bannerId={id} initialValues={{
        mediaType: banner.mediaType,
        desktopMediaUrl: banner.desktopMediaUrl,
        mobileMediaUrl: banner.mobileMediaUrl ?? "",
        posterUrl: banner.posterUrl ?? "",
        titleEn: banner.titleEn,
        titleAr: banner.titleAr,
        subtitleEn: banner.subtitleEn ?? "",
        subtitleAr: banner.subtitleAr ?? "",
        ctaLabelEn: banner.ctaLabelEn ?? "",
        ctaLabelAr: banner.ctaLabelAr ?? "",
        linkUrl: banner.linkUrl ?? "",
        focalPointX: String(banner.focalPointX),
        focalPointY: String(banner.focalPointY),
        sortOrder: String(banner.sortOrder),
        autoAdvanceSeconds: String(banner.autoAdvanceSeconds),
        startsAt: banner.startsAt?.toISOString() ?? "",
        endsAt: banner.endsAt?.toISOString() ?? "",
        isActive: banner.isActive,
      }} />
    </div>
  );
}
