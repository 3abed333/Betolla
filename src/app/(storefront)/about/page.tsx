import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { RichContent } from "@/components/RichContent";
import { localizedField } from "@/lib/localizedField";
import type { AppLocale } from "@/i18n/config";

export const metadata = { title: "About Us - Betolla Cosmetics" };

export default async function AboutPage() {
  const locale = (await getLocale()) as AppLocale;
  const page = await prisma.staticPage.findUnique({ where: { type: "ABOUT_US" } });
  const title = page && page.isPublished ? localizedField(locale, page.titleEn, page.titleAr) : locale === "ar" ? "من نحن" : "About Us";
  const html = page && page.isPublished ? localizedField(locale, page.contentHtmlEn, page.contentHtmlAr) : locale === "ar" ? "<p>تعرفوا على بيتولا قريباً.</p>" : "<p>More about Betolla is coming soon.</p>";
  return <article id="contact" className="mx-auto max-w-3xl"><h1 className="font-heading text-3xl font-semibold text-ink">{title}</h1><RichContent html={html} className="mt-6" /></article>;
}
