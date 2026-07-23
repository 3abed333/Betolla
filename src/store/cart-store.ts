import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartLineItem = {
  key: string; // `product:${id}` or `bundle:${id}`
  kind: "product" | "bundle";
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  price: number;
  imageUrl: string;
  quantity: number;
  maxStock?: number;
};

type CartStore = {
  items: CartLineItem[];
  addItem: (item: Omit<CartLineItem, "quantity">, quantity?: number) => void;
  removeItem: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  clear: () => void;
  totalCount: () => number;
  subtotal: () => number;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item, quantity = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.key === item.key);
          if (existing) {
            const nextQty = existing.maxStock
              ? Math.min(existing.quantity + quantity, existing.maxStock)
              : existing.quantity + quantity;
            return {
              items: state.items.map((i) => (i.key === item.key ? { ...i, quantity: nextQty } : i)),
            };
          }
          return { items: [...state.items, { ...item, quantity }] };
        }),
      removeItem: (key) => set((state) => ({ items: state.items.filter((i) => i.key !== key) })),
      setQuantity: (key, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.key !== key)
              : state.items.map((i) => (i.key === key ? { ...i, quantity } : i)),
        })),
      clear: () => set({ items: [] }),
      totalCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    { name: "betolla-cart" },
  ),
);
