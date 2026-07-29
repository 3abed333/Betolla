import { prisma } from "@/lib/db";
import { SiteContentManagementClient } from "@/components/SiteContentManagementClient";

export const metadata = { title: "Site Content - Betolla Admin" };

export default async function AdminContentPage() {
  const [settings, staticPages, faqs] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "default" } }),
    prisma.staticPage.findMany(),
    prisma.faq.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <div><h2 className="font-heading text-2xl font-semibold text-ink">Site Content</h2><p className="text-sm text-ink-muted">Manage contact links, legal/about pages, and FAQs. Popup campaigns have their own Admin section.</p></div>
      <SiteContentManagementClient
        settings={{
          whatsapp: settings?.whatsapp ?? null,
          instagramUrl: settings?.instagramUrl ?? null,
          facebookUrl: settings?.facebookUrl ?? null,
          linkedinUrl: settings?.linkedinUrl ?? null,
        }}
        staticPages={staticPages}
        faqs={faqs}
      />
    </div>
  );
}
