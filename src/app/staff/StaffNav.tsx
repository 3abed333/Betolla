"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { Drawer, DrawerTrigger, DrawerContent } from "@/components/ui";
import { NavBadge } from "@/components/NavBadge";

export function StaffNav({ unreadNotifications = 0 }: { unreadNotifications?: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const t = useTranslations("staff.nav");

  const LINKS = [
    { href: "/staff", label: t("dashboard"), exact: true },
    { href: "/staff/orders", label: t("orders") },
    { href: "/staff/products", label: t("products") },
    { href: "/staff/blogs", label: t("blogs") },
    { href: "/staff/delivery-accounts", label: t("deliveryAccounts") },
    { href: "/staff/support", label: t("support") },
    { href: "/staff/delivery-support", label: t("deliverySupport") },
    { href: "/staff/notifications", label: t("notifications") },
  ];

  function isActive(link: (typeof LINKS)[number]) {
    return link.exact ? pathname === link.href : pathname.startsWith(link.href);
  }

  function linkClassName(active: boolean) {
    return cn(
      "shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
      active ? "bg-cta text-cta-foreground" : "text-ink-muted hover:bg-surface-secondary hover:text-ink",
    );
  }

  return (
    <>
      <div className="flex items-center border-b border-border px-6 py-3 sm:hidden">
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <button
              type="button"
              aria-label={t("openMenuAriaLabel")}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-ink-muted transition-colors hover:text-ink"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </DrawerTrigger>
          <DrawerContent title={t("drawerTitle")}>
            <nav className="flex flex-col gap-1">
              {LINKS.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className={linkClassName(isActive(link))}>
                  {link.label}
                  {link.href === "/staff/notifications" && <NavBadge count={unreadNotifications} />}
                </Link>
              ))}
            </nav>
          </DrawerContent>
        </Drawer>
      </div>
      <nav className="hidden gap-1 border-e border-border px-6 py-6 sm:flex sm:w-56 sm:flex-col">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className={linkClassName(isActive(link))}>
            {link.label}
            {link.href === "/staff/notifications" && <NavBadge count={unreadNotifications} />}
          </Link>
        ))}
      </nav>
    </>
  );
}
