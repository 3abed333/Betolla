"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { useCartStore } from "@/store/cart-store";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCartSync } from "@/hooks/useCartSync";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Drawer, DrawerClose, DrawerContent, DrawerTrigger, Input } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/DropdownMenu";

function CartIcon({ count }: { count: number }) {
  return (
    <Link href="/cart" aria-label="Cart" className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border text-ink-muted hover:text-ink">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l2.4 12.2a2 2 0 002 1.8h8.2a2 2 0 002-1.6L21 8H6" />
        <circle cx="9" cy="20" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="17" cy="20" r="1.4" fill="currentColor" stroke="none" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-1 -end-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold text-cta-foreground">
          {count}
        </span>
      )}
    </Link>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden>
      <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function StorefrontHeader({ whatsapp }: { whatsapp: string | null }) {
  useCartSync();
  const hidden = useScrollDirection();
  const t = useTranslations("storefront.header");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const persistedCount = useCartStore((s) => s.totalCount());
  const cartHydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const { data: user } = useCurrentUser();
  const [query, setQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const whatsappHref = whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, "")}` : "/about#contact";

  // Zustand's persisted localStorage state is unavailable during SSR. Keep the server/client
  // hydration snapshot identical, then reveal the real badge immediately after hydration.
  const count = cartHydrated ? persistedCount : 0;

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(query.trim() ? `/products?q=${encodeURIComponent(query.trim())}` : "/products");
  }

  async function logout() {
    setMobileMenuOpen(false);
    await fetch("/api/auth/logout", { method: "POST" });
    useCartStore.getState().clear();
    router.push("/login");
    router.refresh();
  }

  const navigation = (
    <>
      <Link href="/products" className="hover:text-ink">{t("products")}</Link>
      <Link href="/bundles" className="hover:text-ink">{t("bundles")}</Link>
      <Link href="/blog" className="hover:text-ink">{t("blog")}</Link>
      {whatsapp ? (
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="hover:text-ink">{t("contactUs")}</a>
      ) : (
        <Link href={whatsappHref} className="hover:text-ink">{t("contactUs")}</Link>
      )}
    </>
  );

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur",
        "transition-transform duration-300 sm:translate-y-0",
        hidden ? "-translate-y-full" : "translate-y-0",
      )}
    >
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between gap-3 sm:hidden">
          <Link href="/" className="font-heading text-xl font-semibold text-ink">Betolla</Link>
          <div className="flex items-center gap-2">
            <CartIcon count={count} />
            <Drawer open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <DrawerTrigger asChild>
                <button
                  type="button"
                  aria-label={t("openMenu")}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-ink-muted hover:text-ink"
                >
                  <MenuIcon />
                </button>
              </DrawerTrigger>
              <DrawerContent title={t("menuTitle")}>
                <Link href="/" onClick={() => setMobileMenuOpen(false)} className="font-heading text-2xl font-semibold text-ink">
                  Betolla
                </Link>
                <nav className="mt-8 flex flex-col gap-1 text-base text-ink">
                  {[
                    { href: "/products", label: t("products") },
                    { href: "/bundles", label: t("bundles") },
                    { href: "/blog", label: t("blog") },
                  ].map((item) => (
                    <DrawerClose asChild key={item.href}>
                      <Link href={item.href} className="rounded-lg px-3 py-3 hover:bg-surface-secondary">{item.label}</Link>
                    </DrawerClose>
                  ))}
                  <DrawerClose asChild>
                    {whatsapp ? (
                      <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="rounded-lg px-3 py-3 hover:bg-surface-secondary">{t("contactUs")}</a>
                    ) : (
                      <Link href={whatsappHref} className="rounded-lg px-3 py-3 hover:bg-surface-secondary">{t("contactUs")}</Link>
                    )}
                  </DrawerClose>
                </nav>
                <div className="my-5 h-px bg-border" />
                <div className="flex flex-wrap items-center gap-3">
                  <ThemeToggle />
                  <LanguageSwitcher />
                </div>
                <div className="mt-5 flex flex-col gap-1">
                  {user ? (
                    <>
                      <DrawerClose asChild><Link href="/account" className="rounded-lg px-3 py-3 text-ink hover:bg-surface-secondary">{t("myAccount")}</Link></DrawerClose>
                      <DrawerClose asChild><Link href="/account/orders" className="rounded-lg px-3 py-3 text-ink hover:bg-surface-secondary">{t("myOrders")}</Link></DrawerClose>
                      <button type="button" onClick={logout} className="rounded-lg px-3 py-3 text-start text-ink hover:bg-surface-secondary">{tCommon("signOut")}</button>
                    </>
                  ) : (
                    <DrawerClose asChild>
                      <Link href="/login" className="mt-2 rounded-full bg-cta px-4 py-3 text-center text-sm font-medium text-cta-foreground">{tCommon("signIn")}</Link>
                    </DrawerClose>
                  )}
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        </div>
        <form onSubmit={submitSearch} className="mt-3 w-full sm:hidden">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-10"
          />
        </form>

        <div className="hidden items-center gap-4 sm:flex">
          <Link href="/" className="font-heading text-xl font-semibold text-ink">Betolla</Link>
          <nav className="flex items-center gap-5 whitespace-nowrap text-sm text-ink-muted">{navigation}</nav>
          <form onSubmit={submitSearch} className="min-w-[10rem] flex-1">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-10"
            />
          </form>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LanguageSwitcher />
            <CartIcon count={count} />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="rounded-full border border-border px-4 py-2 text-sm text-ink">
                  {user.firstName}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild><Link href="/account">{t("myAccount")}</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/account/orders">{t("myOrders")}</Link></DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={logout}>{tCommon("signOut")}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login" className="whitespace-nowrap rounded-full bg-cta px-4 py-2 text-sm font-medium text-cta-foreground">
                {tCommon("signIn")}
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
