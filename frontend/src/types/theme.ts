// A storefront theme is plain JSON so it can be stored as a draft, published,
// and edited generically. Each section type declares its editable fields in
// `sectionSchemas` (similar to Shopify's section schema).

export type LinkItem = { label: string; href: string };

export type FooterColumn = { title: string; links: string };

export type ThemeSettings = {
  store_name: string;
  logo_url: string;
  logo_height: number;
  colors: {
    brand: string;
    accent: string;
    background: string;
    text: string;
    footer_background: string;
    footer_text: string;
  };
  heading_font: HeadingFont;
  announcement: {
    enabled: boolean;
    messages: string;
    link: string;
    background: string;
    text_color: string;
  };
  navigation: LinkItem[];
  footer: {
    about: string;
    columns: FooterColumn[];
    show_newsletter: boolean;
    show_contact: boolean;
    contact_heading: string;
    contact_email: string;
    show_email: boolean;
    show_whatsapp: boolean;
    show_socials: boolean;
    instagram: string;
    facebook: string;
    youtube: string;
    whatsapp: string;
    copyright: string;
  };
};

export type HeadingFont = "fraunces" | "playfair" | "fredoka" | "baloo" | "oswald";

export const headingFonts: Record<HeadingFont, { label: string; family: string; google: string }> = {
  fraunces: { label: "Fraunces (soft serif)", family: "'Fraunces', Georgia, serif", google: "Fraunces:opsz,wght@9..144,500;9..144,700" },
  playfair: { label: "Playfair Display (elegant)", family: "'Playfair Display', Georgia, serif", google: "Playfair+Display:wght@500;700" },
  fredoka: { label: "Fredoka (rounded, playful)", family: "'Fredoka', ui-rounded, sans-serif", google: "Fredoka:wght@500;600" },
  baloo: { label: "Baloo 2 (bubbly)", family: "'Baloo 2', ui-rounded, sans-serif", google: "Baloo+2:wght@600;700" },
  oswald: { label: "Oswald (condensed)", family: "'Oswald', Impact, sans-serif", google: "Oswald:wght@500;600" },
};

export type SectionType =
  | "hero_slideshow"
  | "image_banner"
  | "feature_row"
  | "marquee"
  | "divider"
  | "collection_list"
  | "product_carousel"
  | "image_with_text"
  | "rich_text"
  | "testimonials"
  | "newsletter";

export type FieldValue = string | number | boolean | string[] | Record<string, FieldValue>[];

export type Section = {
  id: string;
  type: SectionType;
  hidden?: boolean;
  settings: Record<string, FieldValue>;
};

export type ThemeDocument = {
  version: 1;
  settings: ThemeSettings;
  sections: Section[];
};

export type Field =
  | { key: string; label: string; type: "text" | "textarea" | "link" | "image" | "color"; help?: string; placeholder?: string }
  | { key: string; label: string; type: "toggle" }
  | { key: string; label: string; type: "number"; min?: number; max?: number; step?: number }
  | { key: string; label: string; type: "select"; options: { value: string; label: string }[] }
  | { key: string; label: string; type: "collection" }
  | { key: string; label: string; type: "collections" }
  | { key: string; label: string; type: "blocks"; itemLabel: string; titleKey: string; fields: Field[]; defaults: Record<string, FieldValue> };

export type SectionSchema = {
  label: string;
  description: string;
  fields: Field[];
  defaults: Record<string, FieldValue>;
};

export const iconOptions = [
  { value: "sparkles", label: "Sparkles" },
  { value: "heart", label: "Heart" },
  { value: "users", label: "People" },
  { value: "eye", label: "Eye" },
  { value: "truck", label: "Delivery truck" },
  { value: "gift", label: "Gift" },
  { value: "party", label: "Party popper" },
  { value: "shield", label: "Shield" },
  { value: "star", label: "Star" },
  { value: "badge", label: "Badge" },
  { value: "rupee", label: "Rupee" },
  { value: "rotate", label: "Returns" },
];

const backgroundField: Field = { key: "background", label: "Background color", type: "color", help: "Leave empty to use the page background." };

const heightOptions = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "adapt", label: "Adapt to image" },
];

export const sectionSchemas: Record<SectionType, SectionSchema> = {
  hero_slideshow: {
    label: "Slideshow",
    description: "Full-width rotating banners",
    fields: [
      { key: "height", label: "Height", type: "select", options: heightOptions },
      { key: "autoplay", label: "Auto-rotate slides", type: "toggle" },
      { key: "interval", label: "Seconds per slide", type: "number", min: 2, max: 15 },
      {
        key: "slides",
        label: "Slides",
        type: "blocks",
        itemLabel: "Slide",
        titleKey: "heading",
        defaults: { image: "", mobile_image: "", heading: "", subheading: "", button_label: "", link: "", text_position: "left", overlay: false },
        fields: [
          { key: "image", label: "Image", type: "image", help: "Recommended 1920 × 750 px" },
          { key: "mobile_image", label: "Mobile image (optional)", type: "image", help: "Recommended 800 × 1000 px" },
          { key: "heading", label: "Heading", type: "text" },
          { key: "subheading", label: "Subheading", type: "textarea" },
          { key: "button_label", label: "Button label", type: "text" },
          { key: "link", label: "Link", type: "link" },
          {
            key: "text_position",
            label: "Text position",
            type: "select",
            options: [
              { value: "left", label: "Left" },
              { value: "center", label: "Center" },
              { value: "right", label: "Right" },
            ],
          },
          { key: "overlay", label: "Darken image for readable text", type: "toggle" },
        ],
      },
    ],
    defaults: { height: "adapt", autoplay: true, interval: 5, slides: [] },
  },
  image_banner: {
    label: "Image banner",
    description: "A single promotional banner",
    fields: [
      { key: "image", label: "Image", type: "image" },
      { key: "mobile_image", label: "Mobile image (optional)", type: "image" },
      { key: "heading", label: "Heading", type: "text" },
      { key: "text", label: "Text", type: "textarea" },
      { key: "button_label", label: "Button label", type: "text" },
      { key: "link", label: "Link", type: "link" },
      { key: "height", label: "Height", type: "select", options: heightOptions },
      { key: "rounded", label: "Rounded card style", type: "toggle" },
    ],
    defaults: { image: "", mobile_image: "", heading: "", text: "", button_label: "", link: "", height: "adapt", rounded: true },
  },
  feature_row: {
    label: "Icons with text",
    description: "Highlight what makes the store special",
    fields: [
      { key: "heading", label: "Heading (optional)", type: "text" },
      backgroundField,
      {
        key: "items",
        label: "Items",
        type: "blocks",
        itemLabel: "Item",
        titleKey: "title",
        defaults: { icon: "sparkles", title: "New feature", text: "" },
        fields: [
          { key: "icon", label: "Icon", type: "select", options: iconOptions },
          { key: "title", label: "Title", type: "text" },
          { key: "text", label: "Text", type: "textarea" },
        ],
      },
    ],
    defaults: { heading: "", background: "", items: [] },
  },
  marquee: {
    label: "Scrolling text",
    description: "A moving ribbon of short messages",
    fields: [
      { key: "messages", label: "Messages", type: "textarea", help: "One message per line." },
      { key: "background", label: "Ribbon color", type: "color" },
      { key: "text_color", label: "Text color", type: "color" },
      {
        key: "speed",
        label: "Speed",
        type: "select",
        options: [
          { value: "slow", label: "Slow" },
          { value: "normal", label: "Normal" },
          { value: "fast", label: "Fast" },
        ],
      },
      { key: "wavy", label: "Wavy ribbon edges", type: "toggle" },
    ],
    defaults: { messages: "Free shipping on all orders\nNew arrivals weekly", background: "", text_color: "#ffffff", speed: "normal", wavy: true },
  },
  divider: {
    label: "Party divider",
    description: "Decorative bunting or confetti between sections",
    fields: [
      {
        key: "style",
        label: "Style",
        type: "select",
        options: [
          { value: "bunting", label: "Bunting flags" },
          { value: "bunting_pastel", label: "Pastel bunting" },
          { value: "confetti", label: "Confetti" },
          { value: "wave", label: "Wave" },
          { value: "image", label: "Custom image" },
        ],
      },
      { key: "image", label: "Custom image", type: "image", help: "Used when style is “Custom image”." },
      {
        key: "size",
        label: "Size",
        type: "select",
        options: [
          { value: "small", label: "Small" },
          { value: "medium", label: "Medium" },
          { value: "large", label: "Large" },
        ],
      },
      backgroundField,
    ],
    defaults: { style: "bunting", image: "", size: "small", background: "" },
  },
  collection_list: {
    label: "Collection list",
    description: "Grid of collection cards",
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "subheading", label: "Subheading", type: "text" },
      { key: "collections", label: "Collections", type: "collections" },
      {
        key: "columns",
        label: "Cards per row (desktop)",
        type: "select",
        options: ["3", "4", "5", "6"].map((value) => ({ value, label: value })),
      },
      {
        key: "shape",
        label: "Card shape",
        type: "select",
        options: [
          { value: "portrait", label: "Portrait" },
          { value: "square", label: "Square" },
          { value: "circle", label: "Circle" },
        ],
      },
      backgroundField,
      { key: "text_color", label: "Heading color", type: "color" },
    ],
    defaults: { heading: "Shop by collection", subheading: "", collections: [], columns: "4", shape: "portrait", background: "", text_color: "" },
  },
  product_carousel: {
    label: "Featured collection",
    description: "Products from one collection",
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "subheading", label: "Subheading", type: "text" },
      { key: "collection", label: "Collection", type: "collection" },
      { key: "limit", label: "Products to show", type: "number", min: 2, max: 24 },
      {
        key: "layout",
        label: "Layout",
        type: "select",
        options: [
          { value: "carousel", label: "Carousel (swipe)" },
          { value: "grid", label: "Grid" },
        ],
      },
      { key: "show_view_all", label: "Show “View all” link", type: "toggle" },
      backgroundField,
    ],
    defaults: { heading: "Featured collection", subheading: "", collection: "", limit: 8, layout: "carousel", show_view_all: true, background: "" },
  },
  image_with_text: {
    label: "Image with text",
    description: "Tell a story next to a picture",
    fields: [
      { key: "image", label: "Image", type: "image" },
      { key: "eyebrow", label: "Small label", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
      { key: "text", label: "Text", type: "textarea" },
      { key: "button_label", label: "Button label", type: "text" },
      { key: "link", label: "Link", type: "link" },
      {
        key: "image_position",
        label: "Image position",
        type: "select",
        options: [
          { value: "left", label: "Image first" },
          { value: "right", label: "Image second" },
        ],
      },
      backgroundField,
    ],
    defaults: { image: "", eyebrow: "", heading: "Image with text", text: "", button_label: "Shop now", link: "", image_position: "left", background: "" },
  },
  rich_text: {
    label: "Rich text",
    description: "Heading, paragraph and button",
    fields: [
      { key: "eyebrow", label: "Small label", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
      { key: "text", label: "Text", type: "textarea" },
      { key: "button_label", label: "Button label", type: "text" },
      { key: "link", label: "Link", type: "link" },
      {
        key: "align",
        label: "Alignment",
        type: "select",
        options: [
          { value: "center", label: "Center" },
          { value: "left", label: "Left" },
        ],
      },
      backgroundField,
    ],
    defaults: { eyebrow: "", heading: "Talk about your brand", text: "", button_label: "", link: "", align: "center", background: "" },
  },
  testimonials: {
    label: "Testimonials",
    description: "Customer reviews",
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      backgroundField,
      {
        key: "reviews",
        label: "Reviews",
        type: "blocks",
        itemLabel: "Review",
        titleKey: "author",
        defaults: { quote: "", author: "Happy customer", detail: "", rating: 5 },
        fields: [
          { key: "quote", label: "Quote", type: "textarea" },
          { key: "author", label: "Name", type: "text" },
          { key: "detail", label: "Detail", type: "text", placeholder: "e.g. Bengaluru · Jungle theme kit" },
          { key: "rating", label: "Stars", type: "number", min: 1, max: 5 },
        ],
      },
    ],
    defaults: { heading: "Loved by party people", background: "", reviews: [] },
  },
  newsletter: {
    label: "Email signup",
    description: "Collect emails for offers",
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "text", label: "Text", type: "textarea" },
      { key: "button_label", label: "Button label", type: "text" },
      backgroundField,
    ],
    defaults: { heading: "Join the party list", text: "", button_label: "Subscribe", background: "" },
  },
};

export function newSection(type: SectionType): Section {
  return { id: `${type}-${Math.random().toString(36).slice(2, 8)}`, type, settings: structuredClone(sectionSchemas[type].defaults) };
}

// Typed readers keep section components tidy when settings are loosely typed JSON.
export const read = {
  str: (s: Section["settings"], key: string) => (typeof s[key] === "string" ? (s[key] as string) : ""),
  num: (s: Section["settings"], key: string, fallback: number) => (typeof s[key] === "number" ? (s[key] as number) : fallback),
  bool: (s: Section["settings"], key: string) => s[key] === true,
  list: (s: Section["settings"], key: string) => (Array.isArray(s[key]) ? (s[key] as Record<string, FieldValue>[]) : []),
  ids: (s: Section["settings"], key: string) => (Array.isArray(s[key]) ? (s[key] as string[]).filter((v) => typeof v === "string") : []),
};
