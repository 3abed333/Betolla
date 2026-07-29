import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { RichContent } from "@/components/RichContent";
import { localizedField } from "@/lib/localizedField";
import type { AppLocale } from "@/i18n/config";

export const metadata = { title: "Privacy Policy - Betolla Cosmetics" };

export default async function PrivacyPage() {
  const locale = (await getLocale()) as AppLocale;
  const page = await prisma.staticPage.findUnique({ where: { type: "PRIVACY_POLICY" } });
  const title = page && page.isPublished ? localizedField(locale, page.titleEn, page.titleAr) : locale === "ar" ? "سياسة الخصوصية" : "Privacy Policy";
  const html = page && page.isPublished ? localizedField(locale, page.contentHtmlEn, page.contentHtmlAr) : locale === "ar" ? "<p>سيتم نشر سياسة الخصوصية قريباً.</p>" : "<p>The privacy policy will be published here soon.</p>";
  return <article className="mx-auto max-w-3xl"><h1 className="font-heading text-3xl font-semibold text-ink">{title}</h1><RichContent html={html} className="mt-6" /></article>;
}
