import {
  ArrowRight,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Eye,
  Gift,
  Heart,
  IndianRupee,
  PartyPopper,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { sized } from "../lib/format";
import { Link } from "../lib/router";
import { read, type FieldValue, type Section } from "../types/theme";
import { Bunting, Confetti, Wave, type DividerSize } from "./Decor";
import { NewsletterForm } from "./forms";
import { ProductCard } from "./ProductCard";
import { useStore } from "./StoreContext";

type Settings = Section["settings"];
type SectionProps = { settings: Settings };

const icons: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  heart: Heart,
  users: Users,
  eye: Eye,
  truck: Truck,
  gift: Gift,
  party: PartyPopper,
  shield: ShieldCheck,
  star: Star,
  badge: BadgeCheck,
  rupee: IndianRupee,
  rotate: RotateCcw,
};

export function isDark(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b < 150;
}

function surface(background: string): { style?: CSSProperties; dark: boolean } {
  if (!background) return { dark: false };
  return { style: { backgroundColor: background }, dark: isDark(background) };
}

function SectionHeading({ heading, subheading, link, linkLabel = "View all", dark, color }: { heading: string; subheading?: string; link?: string; linkLabel?: string; dark?: boolean; color?: string }) {
  if (!heading && !subheading) return null;
  return (
    <div className="mb-8 flex flex-col items-center gap-2 text-center sm:mb-10">
      {heading && (
        <h2 className={`font-display text-3xl font-semibold tracking-tight sm:text-[2.6rem] sm:leading-tight ${dark ? "text-white" : "text-ink"}`} style={color ? { color } : undefined}>
          {heading}
        </h2>
      )}
      {subheading && <p className={`max-w-xl text-[15px] ${dark ? "text-white/80" : "text-ink/60"}`}>{subheading}</p>}
      {link && (
        <Link href={link} className={`mt-1 inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline ${dark ? "text-white" : "text-brand"}`}>
          {linkLabel} <ArrowRight size={15} />
        </Link>
      )}
    </div>
  );
}

function Button({ href, label, variant = "solid" }: { href: string; label: string; variant?: "solid" | "light" }) {
  if (!label) return null;
  return (
    <Link
      href={href || "/collections/all"}
      className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition ${
        variant === "solid" ? "bg-brand text-white hover:bg-brand/90" : "bg-white text-ink hover:bg-white/90"
      }`}
    >
      {label} <ArrowRight size={16} />
    </Link>
  );
}

const fixedHeights: Record<string, string> = { small: "h-[300px] sm:h-[380px]", medium: "h-[420px] sm:h-[520px]", large: "h-[520px] sm:h-[680px]" };

function BannerImage({ image, mobile, alt, height, eager, fill }: { image: string; mobile: string; alt: string; height: string; eager?: boolean; fill?: boolean }) {
  const fixed = fixedHeights[height];
  const fit = fill ? "absolute inset-0 h-full w-full object-cover" : fixed ? `${fixed} w-full object-cover` : "block h-auto w-full";
  if (!image) return <div className={`${fill ? "absolute inset-0" : fixed ?? "aspect-[16/6]"} w-full bg-gradient-to-br from-brand/20 via-canvas to-accent/20`} />;
  return (
    <picture>
      {mobile && <source media="(max-width: 640px)" srcSet={sized(mobile, 900)} />}
      <img
        src={sized(image, 2000)}
        srcSet={`${sized(image, 900)} 900w, ${sized(image, 1600)} 1600w, ${sized(image, 2400)} 2400w`}
        sizes="100vw"
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        className={fit}
      />
    </picture>
  );
}

// "Adapt" slideshows take the first slide's proportions so slides of different sizes don't leave gaps.
function useImageRatio(url: string) {
  const [ratio, setRatio] = useState<number | null>(null);
  useEffect(() => {
    if (!url) return setRatio(null);
    const img = new Image();
    img.onload = () => setRatio(img.naturalWidth / img.naturalHeight);
    img.src = sized(url, 900);
  }, [url]);
  return ratio;
}

function BannerText({ heading, text, buttonLabel, link, position, overlay }: { heading: string; text: string; buttonLabel: string; link: string; position: string; overlay: boolean }) {
  if (!heading && !text && !buttonLabel) return null;
  const align = position === "center" ? "items-center text-center" : position === "right" ? "items-end text-right" : "items-start text-left";
  return (
    <div className={`absolute inset-0 flex ${overlay ? "bg-gradient-to-r from-black/45 via-black/15 to-transparent" : ""}`}>
      <div className={`mx-auto flex w-full max-w-7xl flex-col justify-center gap-4 px-6 sm:px-10 ${align}`}>
        {heading && <h2 className={`max-w-xl font-display text-3xl font-semibold leading-tight sm:text-5xl ${overlay ? "text-white" : "text-ink"}`}>{heading}</h2>}
        {text && <p className={`max-w-md text-base sm:text-lg ${overlay ? "text-white/90" : "text-ink/75"}`}>{text}</p>}
        <Button href={link} label={buttonLabel} variant={overlay ? "light" : "solid"} />
      </div>
    </div>
  );
}

function HeroSlideshow({ settings }: SectionProps) {
  const slides = read.list(settings, "slides");
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(read.bool(settings, "autoplay"));
  const touchX = useRef<number | null>(null);
  const interval = Math.max(2, read.num(settings, "interval", 5)) * 1000;
  const height = read.str(settings, "height");
  const count = slides.length;
  const firstImage = typeof slides[0]?.image === "string" ? (slides[0].image as string) : "";
  const ratio = useImageRatio(height in fixedHeights ? "" : firstImage);
  const frameClass = height in fixedHeights ? fixedHeights[height] : "";
  const frameStyle = height in fixedHeights ? undefined : { aspectRatio: String(ratio ?? 16 / 6) };

  useEffect(() => setPlaying(read.bool(settings, "autoplay")), [settings]);
  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);
  useEffect(() => {
    if (!playing || count < 2) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % count), interval);
    return () => window.clearInterval(timer);
  }, [playing, count, interval]);

  if (!count) return <BannerImage image="" mobile="" alt="" height={height} />;
  const go = (delta: number) => setIndex((i) => (i + delta + count) % count);

  return (
    <div
      className="group relative overflow-hidden"
      aria-roledescription="carousel"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <div className={`relative w-full ${frameClass}`} style={frameStyle}>
        {slides.map((slide, i) => {
          const s = slide as Record<string, FieldValue>;
          const str = (k: string) => (typeof s[k] === "string" ? (s[k] as string) : "");
          const active = i === index;
          const content = (
            <>
              <BannerImage image={str("image")} mobile={str("mobile_image")} alt={str("heading") || `Slide ${i + 1}`} height={height} eager={i === 0} fill />
              <BannerText heading={str("heading")} text={str("subheading")} buttonLabel={str("button_label")} link={str("link")} position={str("text_position")} overlay={s.overlay === true} />
            </>
          );
          return (
            <div
              key={i}
              className={`absolute inset-0 transition-opacity duration-700 ${active ? "opacity-100" : "pointer-events-none opacity-0"}`}
              aria-hidden={!active}
            >
              {str("link") && !str("button_label") ? (
                <Link href={str("link")} tabIndex={active ? 0 : -1} className="absolute inset-0 block">
                  {content}
                </Link>
              ) : (
                content
              )}
            </div>
          );
        })}
      </div>
      {count > 1 && (
        <>
          <button onClick={() => go(-1)} aria-label="Previous slide" className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-ink shadow-soft transition hover:bg-white group-hover:grid sm:left-6">
            <ChevronLeft size={22} />
          </button>
          <button onClick={() => go(1)} aria-label="Next slide" className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-ink shadow-soft transition hover:bg-white group-hover:grid sm:right-6">
            <ChevronRight size={22} />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/75 px-3 py-1.5 backdrop-blur sm:bottom-5">
            <button onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause slideshow" : "Play slideshow"} className="text-ink/70 hover:text-ink">
              {playing ? <Pause size={12} /> : <Play size={12} />}
            </button>
            {slides.map((_, i) => (
              <button key={i} onClick={() => setIndex(i)} aria-label={`Go to slide ${i + 1}`} className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-brand" : "w-2 bg-ink/30 hover:bg-ink/50"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ImageBanner({ settings }: SectionProps) {
  const rounded = read.bool(settings, "rounded");
  const link = read.str(settings, "link");
  const buttonLabel = read.str(settings, "button_label");
  const body = (
    <div className={`relative overflow-hidden ${rounded ? "rounded-3xl" : ""}`}>
      <BannerImage image={read.str(settings, "image")} mobile={read.str(settings, "mobile_image")} alt={read.str(settings, "heading") || "Promotional banner"} height={read.str(settings, "height")} />
      <BannerText heading={read.str(settings, "heading")} text={read.str(settings, "text")} buttonLabel={buttonLabel} link={link} position="left" overlay={Boolean(read.str(settings, "heading"))} />
    </div>
  );
  return (
    <div className={rounded ? "mx-auto max-w-7xl px-4 py-8 sm:px-6" : ""}>
      {link && !buttonLabel ? (
        <Link href={link} className="block transition hover:opacity-95">
          {body}
        </Link>
      ) : (
        body
      )}
    </div>
  );
}

function FeatureRow({ settings }: SectionProps) {
  const items = read.list(settings, "items");
  const { style, dark } = surface(read.str(settings, "background"));
  return (
    <div style={style}>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <SectionHeading heading={read.str(settings, "heading")} dark={dark} />
        <div className={`grid grid-cols-2 gap-x-4 gap-y-8 ${items.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
          {items.map((item, i) => {
            const Icon = icons[String(item.icon)] ?? Sparkles;
            return (
              <div key={i} className="flex flex-col items-center gap-2 text-center">
                <span className={`mb-1 grid h-14 w-14 place-items-center rounded-full ${dark ? "bg-white/15 text-white" : "bg-brand/10 text-brand"}`}>
                  <Icon size={26} strokeWidth={1.6} />
                </span>
                <h3 className={`font-display text-lg font-semibold sm:text-xl ${dark ? "text-white" : "text-ink"}`}>{String(item.title ?? "")}</h3>
                {item.text ? <p className={`max-w-[16rem] text-sm ${dark ? "text-white/75" : "text-ink/60"}`}>{String(item.text)}</p> : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Marquee({ settings }: SectionProps) {
  const messages = read.str(settings, "messages").split("\n").map((m) => m.trim()).filter(Boolean);
  const background = read.str(settings, "background") || "rgb(var(--gd-accent))";
  const color = read.str(settings, "text_color") || "#ffffff";
  const duration = { slow: 45, normal: 30, fast: 18 }[read.str(settings, "speed")] ?? 30;
  const wavy = read.bool(settings, "wavy");
  if (!messages.length) return null;
  const run = Array.from({ length: 4 }, () => messages).flat();
  return (
    <div className="marquee overflow-hidden py-2" aria-label={messages.join(". ")}>
      {wavy && <Wave color={background} height={12} />}
      <div style={{ backgroundColor: background, color }} className="overflow-hidden py-3">
        <div className="marquee-track flex w-max" style={{ "--marquee-duration": `${duration}s` } as CSSProperties} aria-hidden="true">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center">
              {run.map((m, i) => (
                <span key={i} className="flex items-center whitespace-nowrap px-5 text-base font-semibold tracking-wide sm:text-lg">
                  {m}
                  <Sparkles size={16} className="ml-10 opacity-80" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      {wavy && <Wave color={background} height={12} flip />}
    </div>
  );
}

function Divider({ settings }: SectionProps) {
  const style = read.str(settings, "style");
  const size = (read.str(settings, "size") || "small") as DividerSize;
  const image = read.str(settings, "image");
  const background = read.str(settings, "background");
  return (
    <div style={background ? { backgroundColor: background } : undefined} className="py-4">
      {style === "image" && image ? (
        <img src={sized(image, 1600)} alt="" className="mx-auto block max-h-40 w-full object-contain" />
      ) : style === "confetti" ? (
        <Confetti size={size} />
      ) : style === "wave" ? (
        <Wave height={size === "large" ? 40 : size === "medium" ? 28 : 18} />
      ) : (
        <Bunting pastel={style === "bunting_pastel"} size={size} />
      )}
    </div>
  );
}

function CollectionList({ settings }: SectionProps) {
  const { collectionBySlug, collections } = useStore();
  const slugs = read.ids(settings, "collections");
  const chosen = (slugs.length ? slugs.map(collectionBySlug) : collections.slice(0, 4)).filter((c): c is NonNullable<typeof c> => Boolean(c));
  const { style, dark } = surface(read.str(settings, "background"));
  const shape = read.str(settings, "shape");
  const columns = { "3": "lg:grid-cols-3", "4": "lg:grid-cols-4", "5": "lg:grid-cols-5", "6": "lg:grid-cols-6" }[read.str(settings, "columns")] ?? "lg:grid-cols-4";
  const aspect = shape === "square" ? "aspect-square rounded-2xl" : shape === "circle" ? "aspect-square rounded-full" : "aspect-[4/5] rounded-2xl";

  return (
    <div style={style}>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <SectionHeading heading={read.str(settings, "heading")} subheading={read.str(settings, "subheading")} dark={dark} color={read.str(settings, "text_color") || undefined} />
        <div className={`grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 ${columns}`}>
          {chosen.map((c) => (
            <Link key={c.id} href={`/collections/${c.slug}`} className={`group block ${shape === "circle" ? "text-center" : ""}`}>
              <div className={`overflow-hidden bg-white ring-4 ring-white/70 ${aspect}`}>
                {c.image_url ? (
                  <img src={sized(c.image_url, 700)} alt={c.title} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                ) : (
                  <div className="grid h-full place-items-center bg-brand/10 font-display text-xl text-brand">{c.title}</div>
                )}
              </div>
              <div className={`mt-3 flex items-center gap-1 ${shape === "circle" ? "justify-center" : "justify-between"}`}>
                <span className={`font-display text-lg font-semibold sm:text-xl ${dark ? "text-white" : "text-ink"}`}>{c.title}</span>
                <ArrowRight size={18} className={`shrink-0 transition group-hover:translate-x-1 ${dark ? "text-white" : "text-brand"} ${shape === "circle" ? "hidden" : ""}`} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductCarousel({ settings }: SectionProps) {
  const { productsIn } = useStore();
  const slug = read.str(settings, "collection") || "all";
  const products = productsIn(slug).slice(0, read.num(settings, "limit", 8));
  const { style, dark } = surface(read.str(settings, "background"));
  const track = useRef<HTMLDivElement>(null);
  const layout = read.str(settings, "layout");
  const scroll = (dir: number) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <div style={style}>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14">
        <SectionHeading
          heading={read.str(settings, "heading")}
          subheading={read.str(settings, "subheading")}
          link={read.bool(settings, "show_view_all") ? `/collections/${slug}` : undefined}
          dark={dark}
        />
        {!products.length ? (
          <p className={`text-center text-sm ${dark ? "text-white/70" : "text-ink/50"}`}>Products added to this collection will appear here.</p>
        ) : layout === "grid" ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="relative">
            <div ref={track} className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2 sm:mx-0 sm:gap-6 sm:px-0">
              {products.map((p) => (
                <div key={p.id} className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-[calc(25%-18px)]">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
            {products.length > 4 && (
              <>
                <button onClick={() => scroll(-1)} aria-label="Scroll left" className="absolute -left-5 top-[38%] hidden h-11 w-11 place-items-center rounded-full bg-white text-ink shadow-soft ring-1 ring-ink/5 hover:text-brand lg:grid">
                  <ChevronLeft size={20} />
                </button>
                <button onClick={() => scroll(1)} aria-label="Scroll right" className="absolute -right-5 top-[38%] hidden h-11 w-11 place-items-center rounded-full bg-white text-ink shadow-soft ring-1 ring-ink/5 hover:text-brand lg:grid">
                  <ChevronRight size={20} />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ImageWithText({ settings }: SectionProps) {
  const { style, dark } = surface(read.str(settings, "background"));
  const image = read.str(settings, "image");
  const imageSecond = read.str(settings, "image_position") === "right";
  return (
    <div style={style}>
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 sm:px-6 md:grid-cols-2 md:gap-14 md:py-16">
        <div className={`overflow-hidden rounded-3xl bg-white ${imageSecond ? "md:order-2" : ""}`}>
          {image ? <img src={sized(image, 1200)} alt={read.str(settings, "heading")} loading="lazy" className="aspect-[4/3] h-full w-full object-cover" /> : <div className="aspect-[4/3] bg-brand/10" />}
        </div>
        <div className="flex flex-col items-start gap-4">
          {read.str(settings, "eyebrow") && <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${dark ? "bg-white/15 text-white" : "bg-brand/10 text-brand"}`}>{read.str(settings, "eyebrow")}</span>}
          <h2 className={`font-display text-3xl font-semibold leading-tight sm:text-4xl ${dark ? "text-white" : "text-ink"}`}>{read.str(settings, "heading")}</h2>
          {read.str(settings, "text") && <p className={`max-w-lg whitespace-pre-line text-base leading-relaxed ${dark ? "text-white/80" : "text-ink/70"}`}>{read.str(settings, "text")}</p>}
          <div className="pt-2">
            <Button href={read.str(settings, "link")} label={read.str(settings, "button_label")} variant={dark ? "light" : "solid"} />
          </div>
        </div>
      </div>
    </div>
  );
}

function RichText({ settings }: SectionProps) {
  const { style, dark } = surface(read.str(settings, "background"));
  const left = read.str(settings, "align") === "left";
  return (
    <div style={style}>
      <div className={`mx-auto flex max-w-3xl flex-col gap-4 px-4 py-14 sm:px-6 ${left ? "items-start text-left" : "items-center text-center"}`}>
        {read.str(settings, "eyebrow") && <span className={`text-xs font-semibold uppercase tracking-[0.16em] ${dark ? "text-white/80" : "text-brand"}`}>{read.str(settings, "eyebrow")}</span>}
        {read.str(settings, "heading") && <h2 className={`font-display text-3xl font-semibold sm:text-4xl ${dark ? "text-white" : "text-ink"}`}>{read.str(settings, "heading")}</h2>}
        {read.str(settings, "text") && <p className={`whitespace-pre-line text-base leading-relaxed ${dark ? "text-white/80" : "text-ink/70"}`}>{read.str(settings, "text")}</p>}
        <Button href={read.str(settings, "link")} label={read.str(settings, "button_label")} variant={dark ? "light" : "solid"} />
      </div>
    </div>
  );
}

function Testimonials({ settings }: SectionProps) {
  const reviews = read.list(settings, "reviews");
  const { style, dark } = surface(read.str(settings, "background"));
  return (
    <div style={style}>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <SectionHeading heading={read.str(settings, "heading")} dark={dark} />
        {!reviews.length ? (
          <p className={`text-center text-sm ${dark ? "text-white/70" : "text-ink/50"}`}>Add customer reviews in the theme editor.</p>
        ) : (
          <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-3">
            {reviews.map((r, i) => (
              <figure key={i} className="flex w-[85%] shrink-0 snap-start flex-col gap-4 rounded-3xl bg-white p-6 shadow-card sm:w-auto">
                <div className="flex gap-0.5 text-[#f2b33d]">
                  {Array.from({ length: Math.min(5, Math.max(1, Number(r.rating) || 5)) }, (_, s) => (
                    <Star key={s} size={16} fill="currentColor" />
                  ))}
                </div>
                <blockquote className="flex-1 text-[15px] leading-relaxed text-ink/80">“{String(r.quote ?? "")}”</blockquote>
                <figcaption>
                  <p className="font-semibold text-ink">{String(r.author ?? "")}</p>
                  {r.detail ? <p className="text-sm text-ink/50">{String(r.detail)}</p> : null}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Newsletter({ settings }: SectionProps) {
  const { style, dark } = surface(read.str(settings, "background"));
  return (
    <div style={style}>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className={`relative overflow-hidden rounded-3xl px-6 py-12 text-center sm:px-12 ${style ? "" : "bg-brand/[0.07]"}`}>
          <PartyPopper className={`mx-auto mb-4 ${dark ? "text-white" : "text-brand"}`} size={32} strokeWidth={1.6} />
          <h2 className={`font-display text-3xl font-semibold ${dark ? "text-white" : "text-ink"}`}>{read.str(settings, "heading")}</h2>
          {read.str(settings, "text") && <p className={`mx-auto mt-3 max-w-lg ${dark ? "text-white/80" : "text-ink/65"}`}>{read.str(settings, "text")}</p>}
          <div className={`mt-6 ${dark ? "text-white" : ""}`}>
            <NewsletterForm source="homepage" buttonLabel={read.str(settings, "button_label") || "Subscribe"} dark={dark} />
          </div>
        </div>
      </div>
    </div>
  );
}

const registry: Record<Section["type"], (props: SectionProps) => ReactNode> = {
  hero_slideshow: HeroSlideshow,
  image_banner: ImageBanner,
  feature_row: FeatureRow,
  marquee: Marquee,
  divider: Divider,
  collection_list: CollectionList,
  product_carousel: ProductCarousel,
  image_with_text: ImageWithText,
  rich_text: RichText,
  testimonials: Testimonials,
  newsletter: Newsletter,
};

export function SectionRenderer({ section, selected, onSelect }: { section: Section; selected?: boolean; onSelect?: (id: string) => void }) {
  const Component = registry[section.type];
  if (!Component) return null;
  return (
    <section
      className="scroll-mt-32"
      data-section-id={section.id}
      data-gd-selected={selected ? "true" : undefined}
      onClickCapture={
        onSelect
          ? (event) => {
              // In the editor preview, links select the section instead of navigating away.
              if ((event.target as HTMLElement).closest("a")) event.preventDefault();
              onSelect(section.id);
            }
          : undefined
      }
    >
      <Component settings={section.settings} />
    </section>
  );
}
