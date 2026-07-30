import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { SiteSettings } from "@/generated/prisma/client";
import { BrandLogo } from "@/components/BrandLogo";

function SocialIcon({ name }: { name: "whatsapp" | "instagram" | "facebook" | "linkedin" }) {
  const paths = {
    whatsapp: <path d="M12 2a9.5 9.5 0 0 0-8.2 14.3L2.5 21.5l5.3-1.4A9.5 9.5 0 1 0 12 2Zm0 17.2a7.7 7.7 0 0 1-3.9-1.1l-.4-.2-3.1.8.8-3-.2-.4A7.7 7.7 0 1 1 12 19.2Zm4.2-5.8c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1-1.4-.7-2.3-1.3-3.2-2.8-.2-.3.2-.3.6-1.1.1-.2 0-.4 0-.5l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.1s.9 2.5 1 2.6c.1.2 1.8 2.8 4.5 3.9 1.7.7 2.4.8 3.3.7 1-.2 1.4-1.2 1.6-1.7.2-.5.2-1 .1-1.1-.1-.2-.3-.2-.5-.3Z" />,
    instagram: <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm5.3-3.2a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Z" />,
    facebook: <path d="M14 22v-9h3l.5-3H14V8.2c0-.9.3-1.5 1.6-1.5h2V4a26 26 0 0 0-2.6-.2c-2.6 0-4.3 1.6-4.3 4.5V10H8v3h2.7v9H14Z" />,
    linkedin: <path d="M5.3 7.4H2.2V22h3.1V7.4ZM3.8 2A1.8 1.8 0 1 0 3.8 5.6 1.8 1.8 0 0 0 3.8 2ZM22 13.6c0-4.4-2.4-6.5-5.5-6.5-2.5 0-3.7 1.4-4.3 2.4V7.4H9.1V22h3.1v-7.2c0-1.9.4-3.8 2.8-3.8s2.4 2.2 2.4 3.9V22H22v-8.4Z" />,
  };
  return <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">{paths[name]}</svg>;
}

export async function StorefrontFooter({ settings }: { settings: SiteSettings | null }) {
  const t = await getTranslations("storefront");
  const tCommon = await getTranslations("common");

  return (
    <footer className="border-t border-border bg-surface-secondary">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 text-sm text-ink-faint sm:grid-cols-[1fr_2fr] sm:px-6 sm:py-10 lg:grid-cols-[1fr_2fr_auto]">
        <div>
          <BrandLogo className="h-20 w-60" />
          <div className="mt-4 flex gap-2">
            {settings?.whatsapp && <a aria-label="WhatsApp" href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="rounded-full border border-border p-2 hover:text-ink"><SocialIcon name="whatsapp" /></a>}
            {settings?.instagramUrl && <a aria-label="Instagram" href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="rounded-full border border-border p-2 hover:text-ink"><SocialIcon name="instagram" /></a>}
            {settings?.facebookUrl && <a aria-label="Facebook" href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" className="rounded-full border border-border p-2 hover:text-ink"><SocialIcon name="facebook" /></a>}
            {settings?.linkedinUrl && <a aria-label="LinkedIn" href={settings.linkedinUrl} target="_blank" rel="noopener noreferrer" className="rounded-full border border-border p-2 hover:text-ink"><SocialIcon name="linkedin" /></a>}
          </div>
        </div>
        <nav className="flex flex-wrap content-start gap-x-5 gap-y-3">
          <Link href="/products" className="hover:text-ink">
            {t("header.products")}
          </Link>
          <Link href="/bundles" className="hover:text-ink">
            {t("header.bundles")}
          </Link>
          <Link href="/account/support" className="hover:text-ink">
            {t("footer.support")}
          </Link>
          <Link href="/blog" className="hover:text-ink">{t("footer.blog")}</Link>
          <Link href="/faq" className="hover:text-ink">{t("footer.faq")}</Link>
          <Link href="/about" className="hover:text-ink">{t("footer.aboutUs")}</Link>
          <Link href="/privacy" className="hover:text-ink">{t("footer.privacyPolicy")}</Link>
        </nav>
        <p className="sm:col-span-2 lg:col-span-1">&copy; {new Date().getFullYear()} {t("footer.rightsReserved", { brand: tCommon("brand") })}</p>
      </div>
    </footer>
  );
}
