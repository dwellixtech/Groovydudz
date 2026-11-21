import type { User } from "@supabase/supabase-js";
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  Heart,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Minus,
  PackageCheck,
  PackageSearch,
  PartyPopper,
  Plus,
  RotateCcw,
  ShieldCheck,
  Store,
  Truck,
  UserRound,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";

import { api, supabase, supabaseConfigured } from "../lib/api";
import { useCart } from "../lib/cart";
import { money, pricing, sized } from "../lib/format";
import { Link, navigate, useLocation } from "../lib/router";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE, shippingFor } from "../lib/shipping";
import type { CheckoutAddress, CheckoutResponse, InquiryKind, PaymentStatusResponse, Policy, Product } from "../types/api";
import { EnquiryForm, TrackOrderForm } from "./forms";
import { FreeShippingMeter } from "./Layout";
import { ProductCard } from "./ProductCard";
import { SectionRenderer } from "./sections";
import { useStore } from "./StoreContext";

function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-ink/55">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={14} />}
          {item.href ? (
            <Link href={item.href} className="hover:text-brand">
              {item.label}
            </Link>
          ) : (
            <span className="max-w-[16rem] truncate text-ink/80 sm:max-w-md">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function HomePage({ selectedId, onSelect }: { selectedId?: string | null; onSelect?: (id: string) => void }) {
  const { theme } = useStore();
  return (
    <>
      {theme.sections
        .filter((s) => !s.hidden)
        .map((section) => (
          <SectionRenderer key={section.id} section={section} selected={selectedId === section.id} onSelect={onSelect} />
        ))}
    </>
  );
}

const sorts = {
  featured: { label: "Featured", fn: () => 0 },
  "price-asc": { label: "Price, low to high", fn: (a: Product, b: Product) => pricing(a).price - pricing(b).price },
  "price-desc": { label: "Price, high to low", fn: (a: Product, b: Product) => pricing(b).price - pricing(a).price },
  "title-asc": { label: "Alphabetically, A-Z", fn: (a: Product, b: Product) => a.title.localeCompare(b.title) },
};
type SortKey = keyof typeof sorts;

function ProductListing({ title, description, products, crumbs, chips }: { title: string; description?: string | null; products: Product[]; crumbs: { label: string; href?: string }[]; chips?: ReactNode }) {
  const [sort, setSort] = useState<SortKey>("featured");
  const [onlySale, setOnlySale] = useState(false);
  const shown = useMemo(() => {
    const list = onlySale ? products.filter((p) => pricing(p).onSale) : products;
    return sort === "featured" ? list : [...list].sort(sorts[sort].fn);
  }, [products, sort, onlySale]);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6">
      <Breadcrumbs items={crumbs} />
      <div className="mt-6 flex flex-col gap-3 text-center">
        <h1 className="font-display text-4xl font-semibold text-ink sm:text-5xl">{title}</h1>
        {description && <p className="mx-auto max-w-2xl text-ink/65">{description}</p>}
      </div>
      {chips && <div className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0">{chips}</div>}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-y border-ink/10 py-3">
        <span className="text-sm text-ink/60">{shown.length} products</span>
        <div className="flex items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink/80">
            <input type="checkbox" checked={onlySale} onChange={(e) => setOnlySale(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--gd-brand))]" />
            On sale
          </label>
          <label className="flex items-center gap-2 text-sm text-ink/80">
            <span className="hidden sm:inline">Sort by</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="rounded-full border border-ink/15 bg-white px-3 py-2 text-sm">
              {Object.entries(sorts).map(([key, s]) => (
                <option key={key} value={key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {shown.length ? (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
          {shown.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <p className="py-20 text-center text-ink/55">No products here yet.</p>
      )}
    </div>
  );
}

export function CollectionPage({ slug }: { slug: string }) {
  const { collections, collectionBySlug, productsIn } = useStore();
  const collection = collectionBySlug(slug);
  if (slug !== "all" && !collection) return <NotFound />;
  const chips = (
    <>
      {[{ slug: "all", title: "All" }, ...collections.filter((c) => c.product_count > 0)].map((c) => (
        <Link
          key={c.slug}
          href={`/collections/${c.slug}`}
          className={`shrink-0 rounded-full border px-4 py-2 text-sm transition ${c.slug === slug ? "border-brand bg-brand text-white" : "border-ink/15 bg-white text-ink/80 hover:border-brand hover:text-brand"}`}
        >
          {c.title}
        </Link>
      ))}
    </>
  );
  return (
    <ProductListing
      title={collection?.title ?? "All products"}
      description={collection?.description}
      products={productsIn(slug)}
      crumbs={[{ label: "Home", href: "/" }, { label: collection?.title ?? "All products" }]}
      chips={chips}
    />
  );
}

// Every word must match somewhere in the title or description, so "unicorn 1st" narrows results.
export function SearchPage({ query }: { query: string }) {
  const { products, collections } = useStore();
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = words.length
    ? products
        .map((p) => {
          const title = p.title.toLowerCase();
          const body = `${title} ${(p.description ?? "").toLowerCase()}`;
          if (!words.every((w) => body.includes(w))) return null;
          return { p, score: words.filter((w) => title.includes(w)).length };
        })
        .filter((m): m is { p: Product; score: number } => Boolean(m))
        .sort((a, b) => b.score - a.score)
        .map((m) => m.p)
    : [];
  if (words.length && !matches.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-6 text-center sm:px-6">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Search" }]} />
        <h1 className="mt-10 font-display text-4xl font-semibold text-ink">No results for “{query}”</h1>
        <p className="mt-3 text-ink/60">Try a theme (jungle, unicorn, space), an occasion (baby shower, 1st birthday) or browse a collection:</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {collections
            .filter((c) => c.product_count > 0)
            .map((c) => (
              <Link key={c.id} href={`/collections/${c.slug}`} className="rounded-full border border-ink/15 bg-white px-4 py-2 text-sm text-ink/80 transition hover:border-brand hover:text-brand">
                {c.title}
              </Link>
            ))}
        </div>
      </div>
    );
  }
  return <ProductListing title={words.length ? `Results for “${query}”` : "Search"} products={matches} crumbs={[{ label: "Home", href: "/" }, { label: "Search" }]} />;
}

export function ProductPage({ slug }: { slug: string }) {
  const { products, collections } = useStore();
  const cart = useCart();
  const product = products.find((p) => p.slug === slug);
  const [imageIndex, setImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  const addButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setImageIndex(0);
    setQuantity(1);
    setExpanded(false);
  }, [slug]);

  // Show the mobile add-to-cart bar once the main button scrolls out of view.
  useEffect(() => {
    const el = addButton.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setShowSticky(!entry.isIntersecting && entry.boundingClientRect.top < 0));
    observer.observe(el);
    return () => observer.disconnect();
  }, [product?.id]);

  if (!product) return <NotFound />;
  const { price, compare, onSale, discount, variant } = pricing(product);
  const stock = variant?.inventory_quantity ?? 0;
  const soldOut = stock <= 0;
  const buyNow = () => {
    cart.add(product, quantity);
    cart.close();
    navigate("/checkout");
  };
  const collection = collections.find((c) => product.collection_ids.includes(c.id));
  const related = products.filter((p) => p.id !== product.id && p.collection_ids.some((id) => product.collection_ids.includes(id))).slice(0, 8);
  const image = product.media[imageIndex] ?? product.media[0];
  const description = product.description ?? "";
  const longDescription = description.length > 600;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, ...(collection ? [{ label: collection.title, href: `/collections/${collection.slug}` }] : []), { label: product.title }]} />
      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
        <div className="min-w-0 lg:sticky lg:top-32 lg:self-start">
          <div className="aspect-square overflow-hidden rounded-3xl bg-white ring-1 ring-ink/5">
            {image ? <img src={sized(image.url, 1200)} alt={image.alt_text ?? product.title} className="h-full w-full object-contain p-4" /> : <div className="grid h-full place-items-center text-ink/40">No image</div>}
          </div>
          {product.media.length > 1 && (
            <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
              {product.media.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => setImageIndex(i)}
                  aria-label={`Show image ${i + 1}`}
                  className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white ring-2 transition ${i === imageIndex ? "ring-brand" : "ring-transparent hover:ring-ink/20"}`}
                >
                  <img src={sized(m.url, 200)} alt="" className="h-full w-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <h1 className="font-display text-xl font-semibold leading-snug text-ink sm:text-2xl">{product.title}</h1>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-2xl font-semibold text-ink">{money(price)}</span>
            {onSale && (
              <>
                <span className="text-lg text-ink/45 line-through">{money(compare)}</span>
                <span className="rounded-full bg-brand/10 px-3 py-1 text-sm font-semibold text-brand">Save {discount}%</span>
              </>
            )}
          </div>
          <p className="-mt-3 text-sm text-ink/55">Inclusive of all taxes</p>

          {!soldOut && stock <= 10 && <p className="-mt-2 flex items-center gap-2 text-sm font-medium text-[#b45309]"><span className="h-2 w-2 animate-pulse rounded-full bg-[#f59e0b]" /> Only {stock} left in stock</p>}

          <div className="flex gap-3">
            <div className="flex items-center rounded-full border border-ink/20 bg-white">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Decrease quantity" className="grid h-12 w-11 place-items-center">
                <Minus size={16} />
              </button>
              <span className="w-8 text-center font-medium" aria-live="polite">{quantity}</span>
              <button onClick={() => setQuantity((q) => Math.min(Math.max(stock, 1), q + 1))} aria-label="Increase quantity" className="grid h-12 w-11 place-items-center">
                <Plus size={16} />
              </button>
            </div>
            <button
              ref={addButton}
              disabled={soldOut}
              onClick={() => cart.add(product, quantity)}
              className="h-12 flex-1 rounded-full border-2 border-brand bg-white font-semibold text-brand transition hover:bg-brand hover:text-white disabled:border-ink/20 disabled:text-ink/40"
            >
              {soldOut ? "Sold out" : "Add to cart"}
            </button>
          </div>
          {!soldOut && (
            <button onClick={buyNow} className="-mt-2 h-12 rounded-full bg-brand font-semibold text-white transition hover:bg-brand/90">
              Buy it now
            </button>
          )}

          <ul className="grid gap-3 rounded-2xl bg-white p-4 text-sm text-ink/80 ring-1 ring-ink/5 sm:grid-cols-3">
            <li className="flex items-center gap-2">
              <Truck size={18} className="shrink-0 text-brand" /> {price >= FREE_SHIPPING_THRESHOLD ? "Ships free" : `Free shipping over ₹${FREE_SHIPPING_THRESHOLD}`}
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck size={18} className="shrink-0 text-brand" /> Secure PayU payment
            </li>
            <li className="flex items-center gap-2">
              <RotateCcw size={18} className="shrink-0 text-brand" /> Help with damaged items
            </li>
          </ul>

          {description && (
            <div>
              <h2 className="mb-2 font-semibold text-ink">Description</h2>
              <div className={`relative whitespace-pre-line break-words text-[15px] leading-relaxed text-ink/75 ${longDescription && !expanded ? "max-h-64 overflow-hidden" : ""}`}>
                {description}
                {longDescription && !expanded && <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-canvas" />}
              </div>
              {longDescription && (
                <button onClick={() => setExpanded((e) => !e)} className="mt-2 text-sm font-semibold text-brand hover:underline">
                  {expanded ? "Show less" : "Read more"}
                </button>
              )}
            </div>
          )}

          <div className="divide-y divide-ink/10 border-y border-ink/10">
            {[
              { title: "Shipping & delivery", text: `Free shipping on orders above ₹${FREE_SHIPPING_THRESHOLD}; a flat ₹${SHIPPING_FEE} fee applies below that. Delivery time depends on your city and courier serviceability. Ordering for a fixed event date? Message us first.`, link: "/pages/shipping-policy" },
              { title: "Returns & damaged items", text: "Party supplies can't be returned once opened or used. If something arrives damaged or wrong, contact us with photos and your order number and we'll sort it out.", link: "/pages/refund-policy" },
              { title: "Need help choosing?", text: "Tell us the age, theme and date and we'll suggest the right kit and add-ons.", link: "/pages/contact?topic=product" },
            ].map((item) => (
              <details key={item.title} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
                  {item.title}
                  <Plus size={16} className="text-ink/50 transition group-open:rotate-45" />
                </summary>
                <p className="pb-4 text-sm leading-relaxed text-ink/70">
                  {item.text}{" "}
                  <Link href={item.link} className="font-semibold text-brand hover:underline">
                    Learn more
                  </Link>
                </p>
              </details>
            ))}
          </div>

          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${product.title} ${window.location.origin}/products/${product.slug}`)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 self-start text-sm font-medium text-ink/70 hover:text-brand"
          >
            <MessageCircle size={16} /> Share on WhatsApp
          </a>
        </div>
      </div>

      {showSticky && !soldOut && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-ink/10 bg-canvas/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-ink/60">{product.title}</p>
            <p className="font-semibold text-ink">{money(price)}</p>
          </div>
          <button onClick={() => cart.add(product, quantity)} className="h-11 rounded-full bg-brand px-5 text-sm font-semibold text-white">
            Add to cart
          </button>
        </div>
      )}

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-8 text-center font-display text-3xl font-semibold text-ink">You may also like</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

type InfoPage = {
  form?: InquiryKind | "tracking";
  faq?: boolean;
  eyebrow: string;
  title: string;
  intro: string;
  highlights: { label: string; value: string }[];
  sections: { title: string; text: string }[];
  steps?: string[];
  cta?: { label: string; href: string; text: string };
};

const infoPages: Record<string, InfoPage> = {
  "bulk-orders": {
    form: "bulk",
    eyebrow: "Business",
    title: "Bulk Orders",
    intro: "Planning party kits for schools, apartments, communities, gifting programs or repeat celebrations? GroovyDudz can help you put together consistent, ready-to-use decoration sets at volume.",
    highlights: [
      { label: "Best for", value: "Bulk party kits and return-gift bundles" },
      { label: "Support", value: "Theme selection, quantities and packing guidance" },
      { label: "Catalog", value: "Birthday, baby shower, festive and party accessories" },
    ],
    sections: [
      { title: "Curated kit planning", text: "Share the occasion, age group, quantity and budget. We will suggest themes, add-ons and practical combinations that are easy to set up." },
      { title: "Quantity-led pricing", text: "Bulk pricing depends on products, quantities and availability. The team confirms the final quote after checking current stock." },
      { title: "Dispatch coordination", text: "For larger orders, we align packing and dispatch with the event date so the kits arrive with enough setup time." },
    ],
    steps: ["Tell us the event type and required quantity.", "Pick themes or ask us to suggest combinations.", "Confirm stock, quote, payment and dispatch plan."],
    cta: { label: "Request a bulk quote", href: "/pages/contact?topic=bulk", text: "Send your quantity, city and event date." },
  },
  "corporate-orders": {
    form: "corporate",
    eyebrow: "Business",
    title: "Corporate Orders",
    intro: "Make office birthdays, festive desks, family days and employee celebrations easier with ready-to-ship decoration kits from GroovyDudz.",
    highlights: [
      { label: "Use cases", value: "Office parties, HR gifting and festive drops" },
      { label: "Options", value: "Theme kits, accessories and custom assortments" },
      { label: "Coordination", value: "Bulk packing and dispatch planning" },
    ],
    sections: [
      { title: "Employee celebrations", text: "Create simple birthday or milestone kits that teams can use in offices, coworking spaces or at home." },
      { title: "Festive moments", text: "Plan Diwali, Christmas, New Year or seasonal decoration bundles for teams, client gifts or office events." },
      { title: "Procurement-friendly flow", text: "We can share product lists, quantities and quotes in a clear format so your team can approve quickly." },
    ],
    steps: ["Share your occasion, budget range and delivery city.", "Shortlist a product mix from available catalog items.", "Approve quote, payment and shipping plan."],
    cta: { label: "Discuss corporate orders", href: "/pages/contact?topic=corporate", text: "Tell us about the celebration you are planning." },
  },
  "event-planners": {
    form: "planner",
    eyebrow: "Business",
    title: "Event Planners",
    intro: "For decorators and planners handling birthdays, baby showers and home celebrations, GroovyDudz can be a reliable source for themed decoration kits and accessories.",
    highlights: [
      { label: "For", value: "Decorators, party planners and studios" },
      { label: "Range", value: "Theme kits, balloons, curtains and accessories" },
      { label: "Workflow", value: "Repeat orders and event-wise sourcing" },
    ],
    sections: [
      { title: "Theme-ready sourcing", text: "Use our catalog to quickly match popular themes like jungle, butterfly, space, welcome baby and festive setups." },
      { title: "Repeat-friendly catalog", text: "Keep proven products handy for recurring events while exploring new arrivals for fresh themes." },
      { title: "Setup practical", text: "Our kits are selected for home and venue setup, with core items like arch tape, glue dots and backdrop elements." },
    ],
    steps: ["Share your planning calendar or upcoming event needs.", "Shortlist products by theme and quantity.", "Confirm availability and shipping before the event date."],
    cta: { label: "Partner with us", href: "/pages/contact?topic=planner", text: "Send your event requirements and city." },
  },
  dealer: {
    form: "dealer",
    eyebrow: "Business",
    title: "Become a Dealer",
    intro: "If you run a party shop, gifting store, decor studio or local celebration business, reach out to explore GroovyDudz products for resale.",
    highlights: [
      { label: "For", value: "Retailers, resellers and decor studios" },
      { label: "Products", value: "Party kits, balloons and celebration accessories" },
      { label: "Start with", value: "Your city, store type and expected monthly quantity" },
    ],
    sections: [
      { title: "Catalog-led resale", text: "Start with high-demand birthday, baby shower and festive products that customers already understand." },
      { title: "Simple onboarding", text: "Tell us about your store, customer base and order volume. We will respond with available options." },
      { title: "Stock planning", text: "Dealer availability depends on current inventory and product mix, so we confirm every assortment before billing." },
    ],
    steps: ["Introduce your business and city.", "Share expected categories and monthly volume.", "Review available dealer options with the team."],
    cta: { label: "Apply as dealer", href: "/pages/contact?topic=dealer", text: "Send your business details to begin." },
  },
  faqs: {
    faq: true,
    eyebrow: "Customer care",
    title: "FAQs",
    intro: "Quick answers for ordering, setup, shipping and product care.",
    highlights: [
      { label: "Setup", value: "Most kits are DIY-friendly" },
      { label: "Shipping", value: "Delivered across India" },
      { label: "Help", value: "Contact us before ordering if you need guidance" },
    ],
    sections: [
      { title: "What's included in a decoration kit?", text: "Every product page lists the full contents with quantities, for example the number of latex balloons, foil balloons, banners, curtains, arch tape and glue dots. Check the product images for the package-includes card." },
      { title: "Do I need helium?", text: "No. Most balloon garlands and backdrop kits are made to be set up with normal air using a hand or electric pump. Product descriptions mention where helium is useful." },
      { title: "Any setup tips?", text: "Inflate all latex balloons first, thread them onto the arch tape, then fix the arch with glue dots. Add the backdrop curtain, banner and foil balloons last. An extra pair of hands makes it much quicker." },
      { title: "How much is shipping?", text: "Shipping is free on orders above ₹499. Smaller orders have a flat ₹49 shipping fee, shown in your cart before you pay." },
      { title: "How do I pay?", text: "Checkout is handled securely by PayU. You'll be taken to PayU's secure page to pay by UPI, card, net banking or wallet, then brought back here." },
      { title: "How can I track my order?", text: "Use the Track Your Order page with your order number plus checkout email or mobile number. After dispatch, you can also use the courier AWB with your checkout contact detail." },
      { title: "Can I reuse the decorations?", text: "Foil balloons, banners and some accessories can often be reused if handled carefully. Latex balloons are single-use." },
      { title: "Can you help me choose a theme?", text: "Yes. Use the Contact Us page and share the age, occasion, colour preference and budget range." },
      { title: "Are taxes included?", text: "Product prices shown on the storefront are inclusive of all taxes unless stated otherwise." },
      { title: "Do you take bulk or business orders?", text: "Yes. See Bulk Orders, Corporate Orders or Become a Dealer and send your requirements through the form on that page." },
    ],
    cta: { label: "Ask a question", href: "/pages/contact", text: "Send us a note if you are unsure before placing an order." },
  },
  "track-order": {
    form: "tracking",
    eyebrow: "Customer care",
    title: "Track Your Order",
    intro: "Track by checkout email, mobile number or courier AWB. We show payment, packing and shipping status when the details match your order.",
    highlights: [
      { label: "Track with", value: "Email, mobile number or AWB" },
      { label: "You'll see", value: "Payment, packing and courier status" },
      { label: "Still stuck?", value: "Contact us with your order number or AWB" },
    ],
    sections: [
      { title: "Email tracking", text: "Use the order number and the email entered during checkout to view the order status securely." },
      { title: "Mobile tracking", text: "Use the order number and checkout mobile number if you placed the order with a phone contact." },
      { title: "AWB tracking", text: "Once the courier AWB is available, enter it with the checkout email or mobile number to see shipment details." },
    ],
    cta: { label: "Get tracking help", href: "/pages/contact?topic=tracking", text: "Include your order number for faster support." },
  },
};

function InfoPageView({ page }: { page: InfoPage }) {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: page.title }]} />
      <section className="mt-6 overflow-hidden rounded-3xl bg-white ring-1 ring-ink/5">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
          <div className="px-5 py-10 sm:px-10 sm:py-14">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">{page.eyebrow}</p>
            <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">{page.title}</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink/70">{page.intro}</p>
            {page.form && page.form !== "tracking" && (
              <a href="#enquire" className="mt-6 inline-flex h-12 items-center rounded-full bg-brand px-6 text-sm font-semibold text-white transition hover:bg-brand/90">
                {page.cta?.label ?? "Send an enquiry"}
              </a>
            )}
          </div>
          <div className="grid content-center gap-3 bg-brand/[0.07] p-5 sm:p-8">
            {page.highlights.map((item) => (
              <div key={item.label} className="rounded-2xl bg-white p-4 ring-1 ring-ink/5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand">{item.label}</p>
                <p className="mt-1 text-sm font-medium text-ink">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {page.form === "tracking" && (
        <section className="mt-8">
          <TrackOrderForm />
        </section>
      )}

      {page.faq ? (
        <section className="mx-auto mt-8 max-w-3xl divide-y divide-ink/10 rounded-3xl bg-white px-5 ring-1 ring-ink/5 sm:px-8">
          {page.sections.map((section, i) => (
            <details key={section.title} open={i === 0} className="group py-1">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left font-semibold text-ink [&::-webkit-details-marker]:hidden">
                {section.title}
                <Plus size={18} className="shrink-0 text-brand transition group-open:rotate-45" />
              </summary>
              <p className="pb-5 text-[15px] leading-relaxed text-ink/70">{section.text}</p>
            </details>
          ))}
        </section>
      ) : (
        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {page.sections.map((section) => (
            <article key={section.title} className="rounded-3xl bg-white p-5 ring-1 ring-ink/5">
              <CheckCircle2 size={22} className="mb-4 text-brand" />
              <h2 className="font-display text-2xl font-semibold text-ink">{section.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink/65">{section.text}</p>
            </article>
          ))}
        </section>
      )}

      {page.steps && (
        <section className="mt-8 rounded-3xl bg-ink px-5 py-8 text-white sm:px-8">
          <h2 className="font-display text-3xl font-semibold">How it works</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {page.steps.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-sm font-semibold text-ink">{index + 1}</span>
                <span className="pt-1 text-sm leading-relaxed text-white/80">{step}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {page.form && page.form !== "tracking" && (
        <section id="enquire" className="mt-8 grid scroll-mt-32 gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div className="rounded-3xl bg-brand px-5 py-8 text-white sm:px-8">
            <h2 className="font-display text-3xl font-semibold">{page.cta?.label ?? "Send an enquiry"}</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/80">{page.cta?.text} We usually reply within one working day with availability and a quote.</p>
          </div>
          <EnquiryForm kind={page.form} submitLabel="Send enquiry" messagePlaceholder="Occasion, themes you like, delivery timeline or anything else we should know." />
        </section>
      )}

      {page.cta && !page.form && (
        <section className="mt-8 flex flex-col gap-4 rounded-3xl bg-brand px-5 py-8 text-white sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <h2 className="font-display text-3xl font-semibold">{page.cta.label}</h2>
            <p className="mt-2 text-sm text-white/80">{page.cta.text}</p>
          </div>
          <Link href={page.cta.href} className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-brand transition hover:bg-white/90">
            Contact Us
          </Link>
        </section>
      )}
    </div>
  );
}

function PolicyBody({ body }: { body: string }) {
  const blocks = body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  return (
    <div className="space-y-6">
      {blocks.map((block, index) => {
        if (block.startsWith("## ")) {
          const [heading, ...rest] = block.split("\n");
          return (
            <section key={index}>
              <h2 className="font-display text-2xl font-semibold text-ink">{heading.replace(/^##\s*/, "")}</h2>
              {rest.length > 0 && <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink/70">{rest.join("\n")}</p>}
            </section>
          );
        }
        const lines = block.split("\n").map((line) => line.trim());
        if (lines.every((line) => line.startsWith("- "))) {
          return (
            <ul key={index} className="space-y-2">
              {lines.map((line) => (
                <li key={line} className="flex gap-2 text-[15px] leading-relaxed text-ink/70">
                  <CheckCircle2 size={16} className="mt-1 shrink-0 text-brand" />
                  <span>{line.replace(/^- /, "")}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={index} className="whitespace-pre-line text-[15px] leading-relaxed text-ink/70">
            {block}
          </p>
        );
      })}
    </div>
  );
}

function PolicyPageView({ policy }: { policy: Policy }) {
  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Policies" }, { label: policy.title }]} />
      <section className="mt-6 rounded-3xl bg-white px-5 py-10 ring-1 ring-ink/5 sm:px-10 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Policy</p>
        <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">{policy.title}</h1>
        {policy.summary && <p className="mt-4 max-w-3xl text-base leading-relaxed text-ink/70">{policy.summary}</p>}
        {policy.updated_at && <p className="mt-4 text-xs text-ink/45">Last updated {new Date(policy.updated_at).toLocaleDateString()}</p>}
      </section>
      <section className="mt-6 rounded-3xl bg-white px-5 py-8 ring-1 ring-ink/5 sm:px-10">
        <PolicyBody body={policy.body} />
      </section>
      <section className="mt-6 flex flex-col gap-3 rounded-3xl bg-brand/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink/70">Have a question about this policy?</p>
        <Link href="/pages/contact" className="inline-flex h-11 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand/90">
          Contact Us
        </Link>
      </section>
    </div>
  );
}

function ContactPage() {
  const { theme } = useStore();
  const { search } = useLocation();
  const whatsappNumber = theme.settings.footer.whatsapp.replace(/\D/g, "");
  const whatsappUrl = whatsappNumber ? `https://wa.me/${whatsappNumber}` : "";
  const supportEmail = theme.settings.footer.contact_email || "support@groovydudz.com";
  const topicParam = new URLSearchParams(search).get("topic") ?? "";
  const topicDefaults: Record<string, string> = {
    bulk: "Bulk order",
    corporate: "Corporate order",
    planner: "Bulk order",
    dealer: "Dealer enquiry",
    tracking: "Order tracking",
    shipping: "Order tracking",
    return: "Return or refund",
    cancellation: "Return or refund",
    payment: "Payment issue",
  };
  const defaultTopic = topicDefaults[topicParam] ?? "General support";

  const channels = [
    { label: "Email", value: supportEmail, href: `mailto:${supportEmail}`, icon: Mail },
    ...(whatsappUrl ? [{ label: "WhatsApp", value: "Message us", href: whatsappUrl, icon: MessageCircle }] : []),
    { label: "Business orders", value: "Bulk, corporate and dealer enquiries", href: "/pages/bulk-orders", icon: Building2 },
    { label: "Track an order", value: "Check status with your order number", href: "/pages/track-order", icon: PackageSearch },
    { label: "Support hours", value: "Monday to Saturday", href: "/pages/faqs", icon: Clock3 },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Contact Us" }]} />
      <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="rounded-3xl bg-brand px-5 py-10 text-white sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/75">Customer care</p>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-tight sm:text-5xl">Contact Us</h1>
          <p className="mt-4 text-base leading-relaxed text-white/80">Need help choosing a kit, tracking an order or planning a business order? Send the details and the GroovyDudz team will reply, usually within one working day.</p>
          <div className="mt-8 grid gap-3">
            {channels.map(({ label, value, href, icon: Icon }) => (
              <Link key={label} href={href} className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 text-white transition hover:bg-white/15">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-brand">
                  <Icon size={18} />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="block text-sm text-white/75">{value}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>

        <EnquiryForm kind="contact" defaultTopic={defaultTopic} />
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          { icon: PackageCheck, title: "Order help", text: "Share the order number, delivery city and issue details for faster support." },
          { icon: Users, title: "Planning help", text: "Tell us the age, occasion, theme and budget range so we can suggest kits." },
          { icon: Store, title: "Business enquiries", text: "For bulk, corporate or dealer enquiries, include expected quantity and timeline." },
        ].map(({ icon: Icon, title, text }) => (
          <article key={title} className="rounded-3xl bg-white p-5 ring-1 ring-ink/5">
            <Icon size={22} className="mb-4 text-brand" />
            <h2 className="font-display text-2xl font-semibold text-ink">{title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink/65">{text}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

export function StaticPage({ slug }: { slug: string }) {
  const { policies } = useStore();
  if (slug === "contact") return <ContactPage />;
  const policy = policies.find((item) => item.slug === slug && item.is_visible);
  if (policy) return <PolicyPageView policy={policy} />;
  const page = infoPages[slug];
  if (!page) return <NotFound />;
  return <InfoPageView page={page} />;
}

type AccountMode = "sign-in" | "sign-up";

const accountInputClass = "h-12 rounded-full border border-ink/15 bg-white px-4 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-brand focus:ring-2 focus:ring-brand/20";

function AccountAction({ icon: Icon, title, text, href }: { icon: typeof PackageSearch; title: string; text: string; href: string }) {
  return (
    <Link href={href} className="group rounded-3xl bg-white p-5 ring-1 ring-ink/5 transition hover:-translate-y-0.5 hover:ring-brand/30">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-brand/10 text-brand transition group-hover:bg-brand group-hover:text-white">
        <Icon size={20} />
      </span>
      <h2 className="mt-4 font-display text-2xl font-semibold text-ink">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink/65">{text}</p>
    </Link>
  );
}

function AccountForm({ mode, setMode, onSignedIn }: { mode: AccountMode; setMode: (mode: AccountMode) => void; onSignedIn: (user: User | null) => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState("");
  const isSignUp = mode === "sign-up";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const name = String(form.get("name") || "").trim();

    setBusy(true);
    setMessage("");
    setSuccess("");
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
        if (error) throw error;
        onSignedIn(data.user ?? null);
        setSuccess(data.session ? "Account created. You are signed in." : "Account created. Check your email to verify it before signing in.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onSignedIn(data.user ?? null);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not complete the request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-3xl bg-white p-5 ring-1 ring-ink/5 sm:p-8">
      <div className="grid grid-cols-2 gap-2 rounded-full bg-canvas p-1">
        {(["sign-in", "sign-up"] as AccountMode[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setMode(item);
              setMessage("");
              setSuccess("");
            }}
            className={`h-10 rounded-full text-sm font-semibold transition ${mode === item ? "bg-brand text-white shadow-sm" : "text-ink/65 hover:text-ink"}`}
          >
            {item === "sign-in" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4">
        {isSignUp && (
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
            Full name
            <input name="name" required autoComplete="name" className={accountInputClass} />
          </label>
        )}
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Email
          <input name="email" required type="email" autoComplete="email" className={accountInputClass} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Password
          <input name="password" required type="password" minLength={6} autoComplete={isSignUp ? "new-password" : "current-password"} className={accountInputClass} />
        </label>
      </div>

      {message && <p className="mt-4 rounded-2xl border border-[#f3b5aa] bg-[#fff0ed] px-4 py-3 text-sm text-[#8e1f0b]">{message}</p>}
      {success && <p className="mt-4 rounded-2xl border border-brand/20 bg-brand/10 px-4 py-3 text-sm font-medium text-brand">{success}</p>}

      <button type="submit" disabled={busy} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand px-6 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:bg-ink/30">
        {busy ? <Loader2 size={18} className="animate-spin" /> : <UserRound size={18} />}
        {busy ? "Please wait..." : isSignUp ? "Create account" : "Sign in"}
      </button>
    </form>
  );
}

export function AccountPage() {
  const { theme } = useStore();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [mode, setMode] = useState<AccountMode>("sign-in");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user ?? null);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    if (!supabase || signingOut) return;
    setSigningOut(true);
    await supabase.auth.signOut();
    setUser(null);
    setSigningOut(false);
  }

  const displayName = typeof user?.user_metadata?.name === "string" ? user.user_metadata.name : typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : user?.email?.split("@")[0] ?? "Customer";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const accountActions = [
    { icon: PackageSearch, title: "Track orders", text: "Check dispatch or delivery help with your order number.", href: "/pages/track-order" },
    { icon: Heart, title: "Shop collections", text: "Browse party kits, balloons and celebration themes.", href: "/collections/all" },
    { icon: MessageCircle, title: "Contact support", text: "Send product, payment or delivery questions to the team.", href: "/pages/contact" },
  ];

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <Loader2 size={34} className="mx-auto animate-spin text-brand" />
        <p className="mt-4 text-sm text-ink/55">Loading your profile...</p>
      </div>
    );
  }

  if (!supabaseConfigured || !supabase) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Profile" }]} />
        <section className="mt-6 overflow-hidden rounded-3xl bg-white ring-1 ring-ink/5">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
            <div className="px-5 py-10 sm:px-10 sm:py-14">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Profile</p>
              <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">Your GroovyDudz account</h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink/70">Customer sign-in is not connected in this environment. You can still shop, checkout and contact support as a guest.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/collections/all" className="inline-flex h-12 items-center justify-center rounded-full bg-brand px-6 text-sm font-semibold text-white transition hover:bg-brand/90">
                  Continue shopping
                </Link>
                <Link href="/pages/contact" className="inline-flex h-12 items-center justify-center rounded-full border border-ink/15 bg-white px-6 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand">
                  Contact Us
                </Link>
              </div>
            </div>
            <div className="grid content-center gap-3 bg-brand/[0.07] p-5 sm:p-8">
              {[
                { icon: PackageCheck, label: "Checkout", value: "Place orders securely with guest details" },
                { icon: MapPin, label: "Delivery", value: "Track using order or payment reference" },
                { icon: Mail, label: "Support", value: "Reach the team from Contact Us" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-ink/5">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-brand/10 text-brand">
                    <Icon size={18} />
                  </span>
                  <span>
                    <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-brand">{label}</span>
                    <span className="block text-sm font-medium text-ink">{value}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {accountActions.map((item) => (
            <AccountAction key={item.title} {...item} />
          ))}
        </section>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Profile" }]} />
        <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="rounded-3xl bg-brand px-5 py-10 text-white sm:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/75">Profile</p>
            <h1 className="mt-3 font-display text-4xl font-semibold leading-tight sm:text-5xl">Sign in to your account</h1>
            <p className="mt-4 text-base leading-relaxed text-white/80">Keep your GroovyDudz profile ready for checkout, order support and faster repeat shopping.</p>
            <div className="mt-8 grid gap-3">
              {[
                { icon: PackageSearch, label: "Order support", text: "Find the right help path quickly" },
                { icon: CreditCard, label: "Secure checkout", text: "Use the same verified customer email" },
                { icon: Heart, label: "Repeat shopping", text: "Return to party essentials faster" },
              ].map(({ icon: Icon, label, text }) => (
                <div key={label} className="flex items-center gap-3 rounded-2xl bg-white/10 p-4">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-brand">
                    <Icon size={18} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{label}</span>
                    <span className="block text-sm text-white/75">{text}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
          <AccountForm mode={mode} setMode={setMode} onSignedIn={setUser} />
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Profile" }]} />
      <section className="mt-6 overflow-hidden rounded-3xl bg-white ring-1 ring-ink/5">
        <div className="grid gap-0 lg:grid-cols-[1fr_0.85fr]">
          <div className="px-5 py-10 sm:px-10 sm:py-14">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Profile</p>
            <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
              <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-brand text-2xl font-semibold text-white">{initials || <UserRound size={30} />}</span>
              <div className="min-w-0">
                <h1 className="font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">Hello, {displayName}</h1>
                <p className="mt-2 truncate text-ink/60">{user.email}</p>
              </div>
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/collections/all" className="inline-flex h-12 items-center justify-center rounded-full bg-brand px-6 text-sm font-semibold text-white transition hover:bg-brand/90">
                Continue shopping
              </Link>
              <button onClick={signOut} disabled={signingOut} className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-ink/15 bg-white px-6 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand disabled:opacity-60">
                {signingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                Sign out
              </button>
            </div>
          </div>
          <div className="grid content-center gap-3 bg-brand/[0.07] p-5 sm:p-8">
            {[
              { label: "Store", value: theme.settings.store_name },
              { label: "Customer email", value: user.email ?? "Not added" },
              { label: "Account status", value: user.email_confirmed_at ? "Email verified" : "Email pending verification" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-white p-4 ring-1 ring-ink/5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand">{item.label}</p>
                <p className="mt-1 break-words text-sm font-medium text-ink">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {accountActions.map((item) => (
          <AccountAction key={item.title} {...item} />
        ))}
      </section>
    </div>
  );
}

const checkoutInputClass = "h-12 w-full min-w-0 rounded-full border border-ink/15 bg-white px-4 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-brand focus:ring-2 focus:ring-brand/20";

function CheckoutField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-ink">
      {label}
      {children}
    </label>
  );
}

const mobilePattern = "(\\+?91 ?)?[6-9][0-9]{9}";

const indianStates = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

function AddressFields({ prefix, onPostalBlur, postalNote }: { prefix: "shipping" | "billing"; onPostalBlur?: (postalCode: string) => void; postalNote?: string }) {
  const ac = prefix === "shipping" ? "shipping" : "billing";
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className={prefix === "shipping" ? "sm:col-span-2" : ""}>
        <CheckoutField label="Full name">
          <input name={`${prefix}_name`} required maxLength={120} className={checkoutInputClass} autoComplete={`${ac} name`} />
        </CheckoutField>
      </div>
      {prefix === "billing" && (
        <CheckoutField label="Phone">
          <input name="billing_phone" required type="tel" pattern={mobilePattern} title="Enter a 10-digit Indian mobile number" className={checkoutInputClass} autoComplete="billing tel" />
        </CheckoutField>
      )}
      <CheckoutField label="Flat, house no., building, street">
        <input name={`${prefix}_line1`} required maxLength={200} className={checkoutInputClass} autoComplete={`${ac} address-line1`} />
      </CheckoutField>
      <CheckoutField label="Area, landmark (optional)">
        <input name={`${prefix}_line2`} maxLength={200} className={checkoutInputClass} autoComplete={`${ac} address-line2`} />
      </CheckoutField>
      <CheckoutField label="City">
        <input name={`${prefix}_city`} required maxLength={80} className={checkoutInputClass} autoComplete={`${ac} address-level2`} />
      </CheckoutField>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_7.5rem] gap-3">
        <CheckoutField label="State">
          <select name={`${prefix}_state`} required defaultValue="" className={checkoutInputClass} autoComplete={`${ac} address-level1`}>
            <option value="" disabled>
              Select
            </option>
            {indianStates.map((state) => (
              <option key={state}>{state}</option>
            ))}
          </select>
        </CheckoutField>
        <CheckoutField label="PIN code">
          <input name={`${prefix}_postal_code`} required inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} title="Enter a 6-digit PIN code" className={checkoutInputClass} autoComplete={`${ac} postal-code`} onBlur={onPostalBlur ? (e) => onPostalBlur(e.currentTarget.value.trim()) : undefined} />
        </CheckoutField>
      </div>
      {postalNote && <p className="text-sm text-[#8e1f0b] sm:col-span-2">{postalNote}</p>}
    </div>
  );
}

// PayU is a hosted checkout: POST the signed fields to PayU and the browser leaves the site.
// PayU then POSTs the result to our API, which redirects back to /checkout?order=…&payment=….
function redirectToGateway(payment: CheckoutResponse["payment"]) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = payment.action_url;
  Object.entries(payment.params).forEach(([name, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
}

function addressFromForm(form: FormData, prefix: "shipping" | "billing", fallbackName: string, fallbackPhone: string): CheckoutAddress {
  return {
    name: String(form.get(`${prefix}_name`) || fallbackName).trim(),
    line1: String(form.get(`${prefix}_line1`) || "").trim(),
    line2: String(form.get(`${prefix}_line2`) || "").trim() || null,
    city: String(form.get(`${prefix}_city`) || "").trim(),
    state: String(form.get(`${prefix}_state`) || "").trim(),
    postal_code: String(form.get(`${prefix}_postal_code`) || "").trim(),
    country: "IN",
    phone: String(form.get(`${prefix}_phone`) || fallbackPhone).trim(),
  };
}

export function CheckoutPage() {
  const cart = useCart();
  const { theme } = useStore();
  const [sameBilling, setSameBilling] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CheckoutResponse | null>(null);
  const [verified, setVerified] = useState<PaymentStatusResponse | null>(null);
  const [pinNote, setPinNote] = useState("");
  const { search } = useLocation();
  const returnParams = useMemo(() => new URLSearchParams(search), [search]);
  const returnedOrderId = returnParams.get("order");
  const returnedPayment = returnParams.get("payment");
  const [checkingReturn, setCheckingReturn] = useState(Boolean(returnedOrderId || returnedPayment));
  const shipping = shippingFor(cart.subtotal);
  const total = cart.subtotal + shipping;
  const { clear: clearCart } = cart;

  // Back from PayU: the API has already verified the payment; just read the order's state.
  useEffect(() => {
    if (!returnedOrderId && !returnedPayment) return;
    if (!returnedOrderId) {
      setError("We couldn't confirm your payment. If money was debited, contact support and we'll sort it out.");
      setCheckingReturn(false);
      return;
    }
    api.paymentStatus(returnedOrderId).then(
      (status) => {
        if (status.payment_status === "paid") {
          setVerified(status);
          clearCart();
        } else {
          setError(
            returnedPayment === "cancelled" || status.status === "cancelled"
              ? "Payment cancelled. Nothing was charged and your cart is still here whenever you're ready."
              : status.payment_status === "failed"
                ? "Payment failed. Nothing was charged — please try again or use another payment method."
                : "Your payment is still being confirmed by the bank. We'll update your order within a few minutes — please don't pay again.",
          );
          setCreated((prev) => prev ?? ({ order_number: status.order_number } as CheckoutResponse));
        }
        setCheckingReturn(false);
      },
      () => {
        setError("We couldn't load your payment status. Please check your email or contact support.");
        setCheckingReturn(false);
      },
    );
  }, [returnedOrderId, returnedPayment, clearCart]);

  // Back button from PayU restores this page from the browser cache with the button still "Processing…".
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setBusy(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  async function checkPin(postalCode: string) {
    setPinNote("");
    if (!/^[1-9][0-9]{5}$/.test(postalCode)) return;
    try {
      const result = await api.serviceability(postalCode);
      if (!result.serviceable) setPinNote(result.message || `Sorry, we can't deliver to ${postalCode} yet.`);
    } catch {
      // Courier not configured or unreachable: checkout re-checks server-side.
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cart.lines.length || busy) return;
    const form = new FormData(event.currentTarget);
    const customerName = String(form.get("shipping_name") || "").trim();
    const email = String(form.get("email") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const shippingAddress = addressFromForm(form, "shipping", customerName, phone);
    const billingAddress = sameBilling ? shippingAddress : addressFromForm(form, "billing", customerName, phone);

    setBusy(true);
    setError("");
    try {
      const checkout = await api.checkout({
        email,
        phone,
        customer_name: customerName,
        shipping_address: shippingAddress,
        billing_address: billingAddress,
        lines: cart.lines.map((line) => ({ variant_id: line.variantId, quantity: line.quantity })),
      });
      setCreated(checkout);
      if (checkout.payment.provider !== "payu" || !checkout.payment.action_url) throw new Error("Online payment is not configured for this store yet.");
      // Keep busy=true: the page is navigating away to PayU.
      redirectToGateway(checkout.payment);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Could not start checkout. Please try again.");
      setBusy(false);
    }
  }

  if (verified) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <CheckCircle2 size={46} strokeWidth={1.7} className="mx-auto mb-4 text-brand" />
        <h1 className="font-display text-4xl font-semibold text-ink">Payment confirmed</h1>
        <p className="mt-3 text-ink/65">Thank you. Order {verified.order_number} is confirmed and we have received your payment.</p>
        <div className="mx-auto mt-6 max-w-md rounded-3xl bg-white p-5 text-left text-sm ring-1 ring-ink/5">
          <div className="flex justify-between gap-4 py-1">
            <span className="text-ink/55">Order status</span>
            <span className="font-semibold capitalize text-ink">{verified.status}</span>
          </div>
          <div className="flex justify-between gap-4 py-1">
            <span className="text-ink/55">Payment</span>
            <span className="font-semibold capitalize text-ink">{verified.payment_status}</span>
          </div>
          <div className="flex justify-between gap-4 py-1">
            <span className="text-ink/55">Payment ID</span>
            <span className="truncate font-mono text-xs text-ink">{verified.payment_id}</span>
          </div>
        </div>
        <Link href="/collections/all" className="mt-6 inline-block rounded-full bg-brand px-6 py-3 font-semibold text-white">
          Continue shopping
        </Link>
      </div>
    );
  }

  if (checkingReturn) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <Loader2 size={36} className="mx-auto mb-4 animate-spin text-brand" />
        <p className="text-ink/65">Confirming your payment…</p>
      </div>
    );
  }

  if (!cart.lines.length) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        {error && <p className="mb-6 rounded-2xl border border-[#f3b5aa] bg-[#fff0ed] px-4 py-3 text-sm text-[#8e1f0b]">{error}</p>}
        <PartyPopper size={40} strokeWidth={1.5} className="mx-auto mb-4 text-brand" />
        <h1 className="font-display text-4xl font-semibold text-ink">Your cart is empty</h1>
        <p className="mt-3 text-ink/65">Add a party kit before checkout.</p>
        <Link href="/collections/all" className="mt-6 inline-block rounded-full bg-brand px-6 py-3 font-semibold text-white">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Checkout" }]} />
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_420px] lg:items-start">
        <form id="checkout-form" onSubmit={submit} className="flex flex-col gap-5">
          <div>
            <h1 className="font-display text-4xl font-semibold text-ink sm:text-5xl">Checkout</h1>
            <p className="mt-2 text-ink/60">Secure online payment powered by PayU.</p>
          </div>

          <section className="rounded-3xl bg-white p-5 ring-1 ring-ink/5 sm:p-6">
            <h2 className="mb-1 font-display text-2xl font-semibold text-ink">Contact</h2>
            <p className="mb-4 text-sm text-ink/55">We'll send your order confirmation and delivery updates here.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <CheckoutField label="Email">
                <input name="email" required type="email" className={checkoutInputClass} autoComplete="email" />
              </CheckoutField>
              <CheckoutField label="Mobile number">
                <input name="phone" required type="tel" inputMode="tel" pattern={mobilePattern} title="Enter a 10-digit Indian mobile number" placeholder="10-digit mobile" className={checkoutInputClass} autoComplete="tel" />
              </CheckoutField>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-5 ring-1 ring-ink/5 sm:p-6">
            <h2 className="mb-4 font-display text-2xl font-semibold text-ink">Delivery address</h2>
            <AddressFields prefix="shipping" onPostalBlur={checkPin} postalNote={pinNote} />
          </section>

          <section className="rounded-3xl bg-white p-5 ring-1 ring-ink/5 sm:p-6">
            <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-ink">
              <input type="checkbox" checked={sameBilling} onChange={(e) => setSameBilling(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--gd-brand))]" />
              Billing address is the same as shipping
            </label>
            {!sameBilling && (
              <div className="mt-4">
                <AddressFields prefix="billing" />
              </div>
            )}
          </section>

          {error && (
            <div className="rounded-2xl border border-[#f3b5aa] bg-[#fff0ed] px-4 py-3 text-sm text-[#8e1f0b]">
              {error}
              {created?.order_number && <span className="block pt-1 text-xs">Order reference: {created.order_number}</span>}
            </div>
          )}
        </form>

        <aside className="rounded-3xl bg-white p-5 ring-1 ring-ink/5 lg:sticky lg:top-32">
          <h2 className="font-display text-2xl font-semibold text-ink">Order summary</h2>
          <div className="-mx-5 mt-4">
            <FreeShippingMeter subtotal={cart.subtotal} />
          </div>
          <ul className="mt-2 divide-y divide-ink/10">
            {cart.lines.map((line) => (
              <li key={line.variantId} className="flex gap-3 py-4">
                <img src={sized(line.image, 140)} alt="" className="h-16 w-16 shrink-0 rounded-xl bg-canvas object-contain ring-1 ring-ink/5" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium text-ink">{line.title}</p>
                  <p className="mt-1 text-xs text-ink/50">
                    {money(line.price)} × {line.quantity}
                  </p>
                </div>
                <span className="text-sm font-semibold text-ink">{money(line.price * line.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="space-y-2 border-t border-ink/10 pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-ink/60">Subtotal</span>
              <span className="font-medium">{money(cart.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink/60">Shipping</span>
              <span className="font-medium">{shipping ? money(shipping) : "Free"}</span>
            </div>
            <div className="flex justify-between border-t border-ink/10 pt-3 text-base font-semibold text-ink">
              <span>Total</span>
              <span>{money(total)}</span>
            </div>
          </div>
          <button
            type="submit"
            form="checkout-form"
            disabled={busy}
            className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand px-6 font-semibold text-white transition hover:bg-brand/90 disabled:bg-ink/30"
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
            {busy ? "Processing..." : `Pay ${money(total)}`}
          </button>
          <p className="mt-3 flex items-center justify-center gap-2 text-xs text-ink/55">
            <ShieldCheck size={14} /> Pay by UPI, card, net banking or wallet — processed securely by PayU.
          </p>
          <p className="mt-2 text-center text-xs text-ink/45">
            By placing this order you agree to our{" "}
            <Link href="/pages/terms" className="underline hover:text-brand">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/pages/refund-policy" className="underline hover:text-brand">
              Refund Policy
            </Link>
            .
          </p>
        </aside>
      </div>
    </div>
  );
}

export function NotFound({ title = "Page not found", message = "We couldn't find what you were looking for." }: { title?: string; message?: string }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="font-display text-7xl font-semibold text-brand/30">404</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink">{title}</h1>
      <p className="mt-3 text-ink/60">{message}</p>
      <Link href="/" className="mt-6 inline-block rounded-full bg-brand px-6 py-3 font-semibold text-white">
        Back to home
      </Link>
    </div>
  );
}
