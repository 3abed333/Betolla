"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export function AddToWishlistButton({ productId }: { productId: string }) {
  const t = useTranslations("storefront.productDetail");
  const { data: user } = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["wishlistedProductIds"],
    queryFn: async (): Promise<string[]> => {
      const res = await fetch("/api/wishlist-items/mine");
      const json = await res.json();
      return json.productIds;
    },
    enabled: !!user,
  });

  const isWishlisted = !!data?.includes(productId);

  async function toggle() {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (isWishlisted) {
      await fetch("/api/wishlist-items", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
    } else {
      await fetch("/api/wishlist-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
    }
    queryClient.invalidateQueries({ queryKey: ["wishlistedProductIds"] });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isWishlisted ? t("removeFromWishlist") : t("addToWishlist")}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-border transition-colors hover:border-accent"
    >
      <svg
        viewBox="0 0 24 24"
        className={cn("h-5 w-5", isWishlisted ? "fill-accent text-accent" : "fill-none text-ink-muted")}
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 20.7l-1.4-1.3C5.6 15 2 11.7 2 7.9 2 4.9 4.4 2.5 7.4 2.5c1.7 0 3.3.8 4.6 2.1 1.3-1.3 2.9-2.1 4.6-2.1 3 0 5.4 2.4 5.4 5.4 0 3.8-3.6 7.1-8.6 11.5l-1.4 1.3z"
        />
      </svg>
    </button>
  );
}
