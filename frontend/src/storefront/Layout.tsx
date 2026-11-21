import { Facebook, Instagram, Mail, Menu, MessageCircle, Minus, Plus, Search, ShoppingBag, Truck, UserRound, X, Youtube } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

import { useCart } from "../lib/cart";
import { money, sized } from "../lib/format";
import { FREE_SHIPPING_THRESHOLD, amountToFreeShipping, shippingFor } from "../lib/shipping";
import { NewsletterForm } from "./forms";
import { Link, navigate, useLocation } from "../lib/router";
import { useStore } from "./StoreContext";

function lines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function parseLinks(value: string) {
  return lines(value).map((line) => {
    const [label, href] = line.split("|").map((part) => part.trim());
    return { label, href: href || "/" };
  });
}

function Announcement() {
  const { announcement } = useStore().theme.settings;
  const messages = lines(announcement.messages);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (messages.length < 2) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % messages.length), 4500);
    return () => window.clearInterval(timer);
  }, [messages.length]);
  if (!announcement.enabled || !messages.length) return null;
  const message = messages[index % messages.length];
  return (
    <div style={{ backgroundColor: announcement.background, color: announcement.text_color }} className="px-4 py-2 text-center text-[13px] font-medium tracking-wide">
      {announcement.link ? (
        <Link href={announcement.link} className="hover:underline">
          {message}
        </Link>
      ) : (
        message
      )}
    </div>
  );
}

function Drawer({ side, open, onClose, label, children }: { side: "left" | "right"; open: boolean; onClose(): void; label: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={label}>
      <button className="absolute inset-0 animate-fade-in bg-black/40" onClick={onClose} aria-label="Close" />
      <div className={`absolute inset-y-0 flex w-full max-w-md flex-col bg-canvas shadow-2xl ${side === "right" ? "right-0 animate-slide-in" : "left-0 animate-slide-in-left"}`}>{children}</div>
    </div>
  );
}

export function FreeShippingMeter({ subtotal }: { subtotal: number }) {
  const remaining = amountToFreeShipping(subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
  return (
    <div className="bg-brand/[0.07] px-5 py-3 text-sm text-ink/80">
      <p className="flex items-center gap-2">
        <Truck size={16} className="shrink-0 text-brand" />
        {remaining > 0 ? (
          <span>
            Add <strong className="text-ink">{money(remaining)}</strong> more for free shipping
          </span>
        ) : (
          <span className="font-medium text-ink">You've unlocked free shipping 🎉</span>
        )}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-label="Progress to free shipping">
        <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

// Suggests setup essentials (from the party accessories collection) that aren't in the cart yet.
function CartUpsell() {
  const { productsIn } = useStore();
  const cart = useCart();
  const inCart = new Set(cart.lines.map((l) => l.productId));
  const picks = productsIn("party-accessories")
    .filter((p) => !inCart.has(p.id) && (p.variants[0]?.inventory_quantity ?? 0) > 0)
    .slice(0, 3);
  if (!picks.length) return null;
  return (
    <li className="py-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink/50">Complete your setup</p>
      <div className="flex flex-col gap-2">
        {picks.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-xl bg-white p-2 ring-1 ring-ink/5">
            <img src={sized(p.media[0]?.url, 120)} alt="" className="h-12 w-12 shrink-0 rounded-lg object-contain" />
            <span className="line-clamp-2 flex-1 text-xs text-ink/80">{p.title}</span>
            <button onClick={() => cart.add(p)} className="shrink-0 rounded-full border border-ink/15 px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-brand hover:bg-brand hover:text-white">
              + {money(p.variants[0]?.price)}
            </button>
          </div>
        ))}
      </div>
    </li>
  );
}

function CartDrawer() {
  const cart = useCart();
  return (
    <Drawer side="right" open={cart.isOpen} onClose={cart.close} label="Cart">
      <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
        <h2 className="font-display text-2xl font-semibold text-ink">Your cart</h2>
        <button onClick={cart.close} aria-label="Close cart" className="grid h-10 w-10 place-items-center rounded-full hover:bg-ink/5">
          <X size={20} />
        </button>
      </div>
      {!cart.lines.length ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <ShoppingBag size={40} strokeWidth={1.4} className="text-ink/30" />
          <p className="text-ink/60">Your cart is empty.</p>
          <Link href="/collections/all" onClick={cart.close} className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white">
            Start shopping
          </Link>
        </div>
      ) : (
        <>
          <FreeShippingMeter subtotal={cart.subtotal} />
          <ul className="flex-1 divide-y divide-ink/10 overflow-y-auto px-5">
            {cart.lines.map((line) => (
              <li key={line.variantId} className="flex gap-4 py-4">
                <Link href={`/products/${line.slug}`} onClick={cart.close} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-ink/5">
                  {line.image && <img src={sized(line.image, 200)} alt="" className="h-full w-full object-contain" />}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Link href={`/products/${line.slug}`} onClick={cart.close} className="line-clamp-2 text-sm text-ink hover:text-brand">
                    {line.title}
                  </Link>
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center rounded-full border border-ink/15">
                      <button onClick={() => cart.setQuantity(line.variantId, line.quantity - 1)} aria-label="Decrease quantity" className="grid h-8 w-8 place-items-center">
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center text-sm">{line.quantity}</span>
                      <button onClick={() => cart.setQuantity(line.variantId, line.quantity + 1)} aria-label="Increase quantity" className="grid h-8 w-8 place-items-center">
                        <Plus size={14} />
                      </button>
                    </div>
                    <span className="font-semibold text-ink">{money(line.price * line.quantity)}</span>
                  </div>
                </div>
              </li>
            ))}
            <CartUpsell />
          </ul>
          <div className="border-t border-ink/10 px-5 py-5">
            <div className="mb-1 flex justify-between text-sm text-ink/70">
              <span>Shipping</span>
              <span>{shippingFor(cart.subtotal) ? money(shippingFor(cart.subtotal)) : "Free"}</span>
            </div>
            <div className="mb-1 flex justify-between text-lg font-semibold text-ink">
              <span>Total</span>
              <span>{money(cart.subtotal + shippingFor(cart.subtotal))}</span>
            </div>
            <p className="mb-4 text-sm text-ink/55">Taxes included.</p>
            <Link href="/checkout" onClick={cart.close} className="block rounded-full bg-brand py-3.5 text-center font-semibold text-white transition hover:bg-brand/90">
              Checkout
            </Link>
          </div>
        </>
      )}
    </Drawer>
  );
}

function SearchPanel({ onClose }: { onClose(): void }) {
  const { products } = useStore();
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return products.filter((p) => p.title.toLowerCase().includes(q)).slice(0, 6);
  }, [products, query]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    onClose();
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Search">
      <button className="absolute inset-0 animate-fade-in bg-black/40" onClick={onClose} aria-label="Close search" />
      <div className="relative animate-fade-in bg-canvas shadow-xl">
        <form onSubmit={submit} className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-5">
          <Search size={20} className="text-ink/50" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && onClose()}
            placeholder="Search for unicorn, jungle, baby shower…"
            className="h-12 flex-1 bg-transparent text-lg text-ink outline-none placeholder:text-ink/40"
          />
          <button type="button" onClick={onClose} aria-label="Close search" className="grid h-10 w-10 place-items-center rounded-full hover:bg-ink/5">
            <X size={20} />
          </button>
        </form>
        {results.length > 0 && (
          <ul className="mx-auto max-w-3xl border-t border-ink/10 px-4 pb-4">
            {results.map((p) => (
              <li key={p.id}>
                <Link href={`/products/${p.slug}`} onClick={onClose} className="flex items-center gap-4 rounded-xl px-2 py-2 hover:bg-ink/5">
                  <img src={sized(p.media[0]?.url, 120)} alt="" className="h-12 w-12 rounded-lg bg-white object-contain" />
                  <span className="line-clamp-1 flex-1 text-sm text-ink">{p.title}</span>
                  <span className="text-sm font-semibold text-ink">{money(p.variants[0]?.price)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Header() {
  const { theme } = useStore();
  const { settings } = theme;
  const cart = useCart();
  const { path } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const logo = settings.logo_url ? (
    <img src={sized(settings.logo_url, 400)} alt={settings.store_name} style={{ height: settings.logo_height }} className="w-auto max-w-[180px] object-contain sm:max-w-none" />
  ) : (
    <span className="font-display text-2xl font-semibold text-brand sm:text-3xl">{settings.store_name}</span>
  );

  const iconButton = "relative grid h-10 w-10 place-items-center rounded-full text-ink transition hover:bg-ink/5";

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-ink/10 bg-canvas/95 backdrop-blur supports-[backdrop-filter]:bg-canvas/85">
        <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-2 sm:px-6 lg:grid-cols-[auto_1fr_auto] lg:py-3">
          <div className="flex items-center lg:hidden">
            <button onClick={() => setMenuOpen(true)} aria-label="Open menu" className={iconButton}>
              <Menu size={22} />
            </button>
          </div>
          <Link href="/" className="justify-self-center lg:justify-self-start" aria-label={`${settings.store_name} home`}>
            {logo}
          </Link>
          <button
            onClick={() => setSearchOpen(true)}
            className="mx-auto hidden h-11 w-full max-w-md items-center gap-3 rounded-full border border-ink/15 bg-white px-4 text-left text-sm text-ink/45 transition hover:border-ink/30 lg:flex"
          >
            <Search size={18} /> Search party kits, balloons, themes…
          </button>
          <div className="flex items-center justify-self-end gap-1">
            <button onClick={() => setSearchOpen(true)} aria-label="Search" className={`${iconButton} lg:hidden`}>
              <Search size={21} />
            </button>
            <Link href="/account" aria-label="Account" className={`${iconButton} hidden sm:grid`}>
              <UserRound size={21} />
            </Link>
            <button onClick={cart.open} aria-label={`Cart, ${cart.count} items`} className={iconButton}>
              <ShoppingBag size={21} />
              {cart.count > 0 && <span className="absolute right-0.5 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[11px] font-semibold text-white">{cart.count}</span>}
            </button>
          </div>
        </div>
        <nav className="hidden border-t border-ink/5 lg:block" aria-label="Main">
          <ul className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-7 px-6">
            {settings.navigation.map((item) => {
              const active = item.href !== "/" && path.startsWith(item.href);
              return (
                <li key={item.label + item.href}>
                  <Link href={item.href} className={`relative block py-3 text-[14px] font-medium transition hover:text-brand ${active ? "text-brand" : "text-ink/80"}`}>
                    {item.label}
                    {active && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-brand" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      <Drawer side="left" open={menuOpen} onClose={() => setMenuOpen(false)} label="Menu">
        <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
          {logo}
          <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="grid h-10 w-10 place-items-center rounded-full hover:bg-ink/5">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-2">
          {settings.navigation.map((item) => (
            <Link key={item.label + item.href} href={item.href} onClick={() => setMenuOpen(false)} className="block rounded-xl px-4 py-3.5 text-lg text-ink hover:bg-ink/5">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-ink/10 px-5 py-4">
          <Link href="/account" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 text-ink/80">
            <UserRound size={18} /> Account
          </Link>
        </div>
      </Drawer>

      {searchOpen && <SearchPanel onClose={() => setSearchOpen(false)} />}
      <CartDrawer />
    </>
  );
}

function Footer() {
  const { settings } = useStore().theme;
  const { footer, colors } = settings;
  const whatsappNumber = footer.whatsapp.replace(/\D/g, "");
  const whatsappUrl = whatsappNumber ? `https://wa.me/${whatsappNumber}` : "";
  const socials = (
    footer.show_socials
      ? [
          { href: footer.instagram, icon: Instagram, label: "Instagram" },
          { href: footer.facebook, icon: Facebook, label: "Facebook" },
          { href: footer.youtube, icon: Youtube, label: "YouTube" },
        ]
      : []
  ).filter((s) => s.href);
  const contactItems = [
    footer.show_email && footer.contact_email ? { href: `mailto:${footer.contact_email}`, icon: Mail, label: "Email", value: footer.contact_email } : null,
    footer.show_whatsapp && whatsappUrl ? { href: whatsappUrl, icon: MessageCircle, label: "WhatsApp", value: footer.whatsapp } : null,
  ].filter(Boolean) as { href: string; icon: typeof Mail; label: string; value: string }[];
  const showContact = footer.show_contact && contactItems.length > 0;

  return (
    <footer style={{ backgroundColor: colors.footer_background, color: colors.footer_text }} className="mt-8">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.2fr_repeat(3,minmax(0,1fr))] xl:grid-cols-[1.25fr_repeat(5,minmax(0,1fr))]">
        <div className="max-w-xs">
          <p className="font-display text-2xl font-semibold">{settings.store_name}</p>
          {footer.about && <p className="mt-3 text-sm leading-relaxed opacity-80">{footer.about}</p>}
          {footer.show_newsletter && (
            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold">Get new themes and offers</p>
              <NewsletterForm source="footer" compact />
            </div>
          )}
          {socials.length > 0 && (
            <div className="mt-5 flex gap-2">
              {socials.map(({ href, icon: Icon, label }) => (
                <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} className="grid h-10 w-10 place-items-center rounded-full border border-current/20 opacity-85 transition hover:opacity-100" style={{ borderColor: "currentColor" }}>
                  <Icon size={18} />
                </a>
              ))}
            </div>
          )}
        </div>
        {footer.columns.map((column) => (
          <div key={column.title}>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] opacity-70">{column.title}</h3>
            <ul className="space-y-2.5">
              {parseLinks(column.links).map((link) => (
                <li key={link.label + link.href}>
                  <Link href={link.href} className="text-[15px] opacity-90 transition hover:underline hover:opacity-100">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {showContact && (
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] opacity-70">{footer.contact_heading || "Get in touch"}</h3>
            <ul className="space-y-3">
              {contactItems.map(({ href, icon: Icon, label, value }) => (
                <li key={label}>
                  <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined} className="flex items-start gap-2 text-[15px] opacity-90 transition hover:underline hover:opacity-100">
                    <Icon size={17} className="mt-0.5 shrink-0" />
                    <span className="break-words">{value}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="border-t" style={{ borderColor: "rgb(255 255 255 / 0.15)" }}>
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs opacity-70 sm:flex-row sm:px-6">
          <span>{footer.copyright}</span>
          <span>Secure payments by PayU</span>
        </div>
      </div>
    </footer>
  );
}

export function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas font-body text-ink">
      <Announcement />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
