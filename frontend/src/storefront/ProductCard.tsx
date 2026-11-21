import { Plus } from "lucide-react";

import { useCart } from "../lib/cart";
import { money, pricing, sized } from "../lib/format";
import { Link } from "../lib/router";
import type { Product } from "../types/api";

export function ProductCard({ product }: { product: Product }) {
  const cart = useCart();
  const { price, compare, onSale, discount } = pricing(product);
  const [first, second] = product.media;
  const soldOut = (product.variants[0]?.inventory_quantity ?? 0) <= 0;

  return (
    <article className="group relative flex h-full flex-col">
      <Link href={`/products/${product.slug}`} className="relative block aspect-square overflow-hidden rounded-2xl bg-white ring-1 ring-ink/5">
        {first ? (
          <>
            <img
              src={sized(first.url, 600)}
              alt={first.alt_text ?? product.title}
              loading="lazy"
              className={`h-full w-full object-contain p-2 transition duration-500 ${second ? "group-hover:opacity-0" : "group-hover:scale-[1.04]"}`}
            />
            {second && (
              <img src={sized(second.url, 600)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-contain p-2 opacity-0 transition duration-500 group-hover:opacity-100" />
            )}
          </>
        ) : (
          <div className="grid h-full place-items-center bg-brand/5 text-sm text-ink/40">No image</div>
        )}
        {onSale && !soldOut && <span className="absolute left-3 top-3 rounded-full bg-brand px-2.5 py-1 text-xs font-semibold text-white">-{discount}%</span>}
        {soldOut && <span className="absolute left-3 top-3 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-semibold text-white">Sold out</span>}
      </Link>
      <div className="flex flex-1 flex-col pt-3">
        <Link href={`/products/${product.slug}`} className="line-clamp-2 text-sm leading-snug text-ink/85 hover:text-brand">
          {product.title}
        </Link>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-semibold text-ink">{money(price)}</span>
            {onSale && <span className="text-xs text-ink/45 line-through">{money(compare)}</span>}
          </p>
          <button
            type="button"
            disabled={soldOut}
            onClick={() => cart.add(product)}
            aria-label={`Add ${product.title} to cart`}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-ink/15 bg-white text-ink transition hover:border-brand hover:bg-brand hover:text-white disabled:opacity-40"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}
