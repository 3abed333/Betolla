import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { RichContent } from "@/components/RichContent";
import { localizedField } from "@/lib/localizedField";
import type { AppLocale } from "@/i18n/config";

export const metadata = { title: "Frequently Asked Questions - Betolla Cosmetics" };

export default async function FaqPage() {
  const locale = (await getLocale()) as AppLocale;
  const faqs = await prisma.faq.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <h1 className="font-heading text-3xl font-semibold text-ink">{locale === "ar" ? "الأسئلة الشائعة" : "Frequently Asked Questions"}</h1>
      {faqs.map((faq) => (
        <details key={faq.id} className="rounded-xl border border-border bg-surface p-5">
          <summary className="cursor-pointer font-medium text-ink">{localizedField(locale, faq.questionEn, faq.questionAr)}</summary>
          <RichContent html={localizedField(locale, faq.answerHtmlEn, faq.answerHtmlAr)} className="mt-4 text-sm" />
        </details>
      ))}
      {faqs.length === 0 && <p className="text-ink-muted">{locale === "ar" ? "لا توجد أسئلة شائعة بعد." : "No FAQs have been published yet."}</p>}
    </div>
  );
}
