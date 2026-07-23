"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useCartStore } from "@/store/cart-store";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCartSync } from "@/hooks/useCartSync";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Input } from "@/components/ui";
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
    <Link href="/cart" className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border text-ink-muted hover:text-ink">
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

export function StorefrontHeader() {
  useCartSync();
  const hidden = useScrollDirection();
  const t = useTranslations("storefront.header");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const count = useCartStore((s) => s.totalCount());
  const { data: user } = useCurrentUser();
  const [query, setQuery] = useState("");

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(query.trim() ? `/products?q=${encodeURIComponent(query.trim())}` : "/products");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur",
        "transition-transform duration-300 sm:translate-y-0",
        hidden ? "-translate-y-full" : "translate-y-0",
      )}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-6 py-4">
        <Link href="/" className="font-heading text-xl font-semibold text-ink">
          Betolla
        </Link>
        <nav className="flex items-center gap-5 text-sm text-ink-muted">
          <Link href="/products" className="hover:text-ink">
            {t("products")}
          </Link>
          <Link href="/bundles" className="hover:text-ink">
            {t("bundles")}
          </Link>
        </nav>
        <form onSubmit={submitSearch} className="min-w-[10rem] flex-1">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
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
                <DropdownMenuItem asChild>
                  <Link href="/account">{t("myAccount")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/account/orders">{t("myOrders")}</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={logout}>{tCommon("signOut")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login" className="rounded-full bg-cta px-4 py-2 text-sm font-medium text-cta-foreground">
              {tCommon("signIn")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
