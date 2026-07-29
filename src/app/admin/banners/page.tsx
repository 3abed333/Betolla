import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Badge, Button, EmptyState } from "@/components/ui";
import { BannerActions } from "./BannerActions";
import { getYouTubeEmbedUrl } from "@/lib/youtube";

export const metadata: Metadata = { title: "Homepage Banners - Betolla Admin" };

export default async function AdminBannersPage() {
  const t = await getTranslations("admin.banners");
  const banners = await prisma.banner.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  const ids = banners.map((banner) => banner.id);
  const now = new Date();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-heading text-2xl font-semibold text-ink">{t("heading")}</h2><p className="text-sm text-ink-muted">{t("description")}</p></div>
        <Button asChild><Link href="/admin/banners/new">{t("add")}</Link></Button>
      </div>
      {banners.length === 0 ? <EmptyState title={t("empty")} /> : (
        <div className="grid gap-4">
          {banners.map((banner, index) => {
            const scheduled = (!banner.startsAt || banner.startsAt <= now) && (!banner.endsAt || banner.endsAt > now);
            return (
              <article key={banner.id} className="grid gap-4 rounded-2xl border border-border bg-surface-secondary p-4 sm:grid-cols-[180px_1fr_auto] sm:items-center">
                <div className="relative aspect-[3/1] overflow-hidden rounded-xl bg-surface">
                  {banner.mediaType === "YOUTUBE"
                    ? <iframe src={getYouTubeEmbedUrl(banner.desktopMediaUrl, false) ?? undefined} title={banner.titleEn} tabIndex={-1} aria-hidden loading="lazy" allow="encrypted-media" className="pointer-events-none h-full w-full" />
                    : banner.mediaType === "VIDEO"
                      ? <video src={banner.desktopMediaUrl} poster={banner.posterUrl ?? undefined} muted className="h-full w-full object-cover" />
                      : <Image src={banner.desktopMediaUrl} alt="" fill sizes="180px" className="object-cover" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{banner.titleEn}</p>
                  <p dir="rtl" className="truncate text-sm text-ink-muted">{banner.titleAr}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant={banner.isActive && scheduled ? "success" : "neutral"}>{banner.isActive && scheduled ? t("live") : t("notLive")}</Badge>
                    <Badge variant="neutral">{t(banner.mediaType === "YOUTUBE" ? "youtube" : banner.mediaType === "VIDEO" ? "video" : "image")}</Badge>
                    <span className="text-xs text-ink-muted">{t("position", { position: index + 1 })}</span>
                  </div>
                </div>
                <BannerActions id={banner.id} ids={ids} index={index} />
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
