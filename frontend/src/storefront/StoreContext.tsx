import { createContext, useContext } from "react";

import type { Collection, Policy, Product } from "../types/api";
import type { ThemeDocument } from "../types/theme";
import type { Mode } from "../lib/repo";

export type StoreData = {
  mode: Mode;
  products: Product[];
  collections: Collection[];
  policies: Policy[];
  theme: ThemeDocument;
};

export const StoreContext = createContext<StoreData | null>(null);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreContext");
  const { products, collections } = ctx;
  return {
    ...ctx,
    collectionBySlug: (slug: string) => collections.find((c) => c.slug === slug),
    productsIn(slug: string) {
      if (slug === "all") return products;
      const collection = collections.find((c) => c.slug === slug);
      return collection ? products.filter((p) => p.collection_ids.includes(collection.id)) : [];
    },
  };
}
