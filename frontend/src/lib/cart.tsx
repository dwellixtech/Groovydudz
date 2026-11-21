import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { Product } from "../types/api";

export type CartLine = { productId: string; variantId: string; slug: string; title: string; image: string; price: number; quantity: number };

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  open(): void;
  close(): void;
  add(product: Product, quantity?: number): void;
  setQuantity(variantId: string, quantity: number): void;
  clear(): void;
};

const CartContext = createContext<CartContextValue | null>(null);
const CART_KEY = "groovydudz-cart";

function loadCart(): CartLine[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(loadCart);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(lines));
    } catch {
      // The cart still works for this visit.
    }
  }, [lines]);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      isOpen,
      count: lines.reduce((sum, l) => sum + l.quantity, 0),
      subtotal: lines.reduce((sum, l) => sum + l.price * l.quantity, 0),
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      clear: () => setLines([]),
      add(product, quantity = 1) {
        const variant = product.variants[0];
        if (!variant) return;
        setLines((current) => {
          const existing = current.find((l) => l.variantId === variant.id);
          if (existing) return current.map((l) => (l === existing ? { ...l, quantity: l.quantity + quantity } : l));
          return [
            ...current,
            { productId: product.id, variantId: variant.id, slug: product.slug, title: product.title, image: product.media[0]?.url ?? "", price: Number(variant.price), quantity },
          ];
        });
        setIsOpen(true);
      },
      setQuantity(variantId, quantity) {
        setLines((current) => (quantity <= 0 ? current.filter((l) => l.variantId !== variantId) : current.map((l) => (l.variantId === variantId ? { ...l, quantity } : l))));
      },
    }),
    [lines, isOpen],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
