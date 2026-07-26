import { formatBadgeCount } from "@/lib/format";

// Small inline count pill for nav links (e.g. unread notifications) - same bg-accent/rounded-full
// treatment as the storefront cart icon's badge, but flows inline next to a text label instead of
// overlaying an icon.
export function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ms-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold text-cta-foreground">
      {formatBadgeCount(count)}
    </span>
  );
}
