"use client";

import { useEffect, useRef } from "react";
import { useCartStore, type CartLineItem } from "@/store/cart-store";
import { useCurrentUser } from "./useCurrentUser";

/** Mounted once near the app root. Merges the server cart in on login, then mirrors every
 * local cart change to the server (debounced) so logged-in carts are visible server-side
 * for abandoned-cart tracking, without guests ever touching the database. */
export function useCartSync() {
  const { data: user } = useCurrentUser();
  const mergedForUser = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user || mergedForUser.current === user.id) return;
    mergedForUser.current = user.id;

    fetch("/api/cart")
      .then((r) => r.json())
      .then((data: { items: CartLineItem[] }) => {
        if (!data.items?.length) return;
        const store = useCartStore.getState();
        for (const item of data.items) {
          store.addItem(item, item.quantity);
        }
      })
      .catch(() => undefined);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = useCartStore.subscribe((state) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: state.items.map((i) => ({ kind: i.kind, id: i.id, price: i.price, quantity: i.quantity })),
          }),
        }).catch(() => undefined);
      }, 800);
    });

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      unsubscribe();
    };
  }, [user]);
}
