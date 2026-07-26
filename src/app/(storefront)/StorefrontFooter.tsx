import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function StorefrontFooter() {
  const t = await getTranslations("storefront");
  const tCommon = await getTranslations("common");

  return (
    <footer className="border-t border-border bg-surface-secondary">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-10 text-sm text-ink-faint sm:flex-row sm:items-center sm:justify-between">
        <p className="font-heading text-lg text-ink">{tCommon("brand")}</p>
        <nav className="flex flex-wrap gap-5">
          <Link href="/products" className="hover:text-ink">
            {t("header.products")}
          </Link>
          <Link href="/bundles" className="hover:text-ink">
            {t("header.bundles")}
          </Link>
          <Link href="/account/support" className="hover:text-ink">
            {t("footer.support")}
          </Link>
        </nav>
        <p>&copy; {new Date().getFullYear()} {t("footer.rightsReserved", { brand: tCommon("brand") })}</p>
      </div>
    </footer>
  );
}
