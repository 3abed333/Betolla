"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations, useLocale } from "next-intl";
import { Button, Card, CardContent, Badge, Input, EmptyState, ConfirmDialog } from "@/components/ui";
import { Money } from "@/components/Money";
import { toast } from "@/lib/toast";
import type { AppLocale } from "@/i18n/config";

type WishlistItem = {
  id: string;
  priceAtAdd: string;
  notifyOnPriceDrop: boolean;
  notifyOnRestock: boolean;
  product: { id: string; slug: string; nameEn: string; mainImageUrl: string; price: string; stock: number };
};
type Wishlist = { id: string; name: string; items: WishlistItem[] };

export function WishlistsClient({ initialWishlists }: { initialWishlists: Wishlist[] }) {
  const queryClient = useQueryClient();
  const [newListName, setNewListName] = useState("");
  const t = useTranslations("account.wishlists");
  const locale = useLocale() as AppLocale;
  const { data: wishlists } = useQuery({
    queryKey: ["wishlists"],
    queryFn: async (): Promise<Wishlist[]> => {
      const res = await fetch("/api/wishlists");
      const data = await res.json();
      return data.wishlists;
    },
    initialData: initialWishlists,
  });

  async function createList() {
    if (!newListName.trim()) return;
    const res = await fetch("/api/wishlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newListName }),
    });
    if (res.ok) {
      setNewListName("");
      queryClient.invalidateQueries({ queryKey: ["wishlists"] });
    }
  }

  async function removeItem(productId: string) {
    await fetch("/api/wishlist-items", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    queryClient.invalidateQueries({ queryKey: ["wishlists"] });
    queryClient.invalidateQueries({ queryKey: ["wishlistedProductIds"] });
  }

  async function deleteList(id: string) {
    const res = await fetch(`/api/wishlists/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      toast.error(t("couldntDeleteListTitle"), data.error);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["wishlists"] });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-semibold text-ink">{t("heading")}</h2>
        <div className="flex gap-2">
          <Input
            placeholder={t("newListPlaceholder")}
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            className="h-10 w-40"
          />
          <Button size="sm" onClick={createList}>
            {t("createList")}
          </Button>
        </div>
      </div>

      {(wishlists ?? []).length === 0 && <EmptyState title={t("noWishlistsTitle")} />}

      {(wishlists ?? []).map((wishlist) => (
        <div key={wishlist.id} className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-ink">{wishlist.name}</h3>
            {wishlists!.length > 1 && (
              <ConfirmDialog
                trigger={
                  <button className="text-sm text-ink-muted hover:text-red-600">{t("deleteList")}</button>
                }
                title={t("deleteConfirmTitle", { name: wishlist.name })}
                description={t("deleteConfirmDescription")}
                confirmLabel={t("delete")}
                onConfirm={() => deleteList(wishlist.id)}
              />
            )}
          </div>
          {wishlist.items.length === 0 ? (
            <p className="text-sm text-ink-muted">{t("noItemsInList")}</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {wishlist.items.map((item) => {
                const priceDropped = Number(item.product.price) < Number(item.priceAtAdd);
                return (
                  <Card key={item.id}>
                    <CardContent className="flex gap-3">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-secondary">
                        <Image src={item.product.mainImageUrl} alt={item.product.nameEn} fill sizes="64px" className="object-cover" />
                      </div>
                      <div className="flex-1">
                        <Link href={`/products/${item.product.slug}`} className="text-sm font-medium text-ink hover:underline">
                          {item.product.nameEn}
                        </Link>
                        <p className="text-sm text-ink-muted">
                          <Money value={Number(item.product.price)} locale={locale} />
                        </p>
                        {priceDropped && <Badge variant="success">{t("priceDropped")}</Badge>}
                        {item.product.stock === 0 && <Badge variant="neutral">{t("outOfStock")}</Badge>}
                        <button
                          onClick={() => removeItem(item.product.id)}
                          className="mt-1 block text-xs text-ink-muted hover:text-red-600"
                        >
                          {t("remove")}
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
