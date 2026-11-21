import type { Product } from "../types/api";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export const money = (value: string | number | null | undefined) => inr.format(Number(value ?? 0));

export function pricing(product: Product) {
  const variant = product.variants[0];
  const price = Number(variant?.price ?? 0);
  const compare = Number(variant?.compare_at_price ?? 0);
  const onSale = compare > price && price > 0;
  return { variant, price, compare, onSale, discount: onSale ? Math.round((1 - price / compare) * 100) : 0 };
}

// Shopify's CDN resizes on the fly; other hosts get the original image.
export function sized(url: string | null | undefined, width: number) {
  if (!url) return "";
  if (/cdn\.shopify\.com|\/cdn\/shop\//.test(url)) return `${url}${url.includes("?") ? "&" : "?"}width=${width}`;
  return url;
}

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
