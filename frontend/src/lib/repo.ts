import type { Collection, CollectionInput, Policy, PolicyInput, Product, ProductInput } from "../types/api";
import type { FieldValue, Section, ThemeDocument } from "../types/theme";
import { api, supabase } from "./api";
import { defaultPolicies } from "./defaultPolicies";
import { defaultTheme } from "./defaultTheme";
import { FREE_SHIPPING_THRESHOLD, freeShippingLabel } from "./shipping";

// One interface for catalog + theme data. "live" talks to FastAPI; "demo" keeps
// everything in this browser's localStorage (seeded from the real catalog) so the
// storefront and the editor work end to end before Supabase is configured.

export type Mode = "live" | "demo";

export type ThemeState = {
  draft: ThemeDocument;
  published: ThemeDocument | null;
  published_at: string | null;
  updated_at: string | null;
};

export type Backend = {
  mode: Mode;
  products(): Promise<Product[]>;
  collections(): Promise<Collection[]>;
  saveProduct(id: string | null, input: ProductInput): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  saveCollection(id: string | null, input: CollectionInput): Promise<Collection>;
  deleteCollection(id: string): Promise<void>;
  policies(): Promise<Policy[]>;
  savePolicy(id: string | null, input: PolicyInput): Promise<Policy>;
  deletePolicy(id: string): Promise<void>;
  theme(): Promise<ThemeState>;
  saveTheme(draft: ThemeDocument): Promise<ThemeState>;
  publishTheme(): Promise<ThemeState>;
};

export type StorefrontData = { mode: Mode; products: Product[]; collections: Collection[]; policies: Policy[]; theme: ThemeDocument };

const DEMO_KEY = "groovydudz-demo-v1";

type DemoState = { products: Product[]; collections: Collection[]; policies: Policy[]; theme: ThemeState };

function isTheme(value: unknown): value is ThemeDocument {
  return Boolean(value && typeof value === "object" && Array.isArray((value as ThemeDocument).sections) && (value as ThemeDocument).settings);
}

// Older or partial saved themes get any newly-added settings filled from the defaults.
export function normalizeTheme(value: unknown): ThemeDocument {
  if (!isTheme(value)) return structuredClone(defaultTheme);
  const base = defaultTheme.settings;
  const s = value.settings;
  const footer = normalizeFooter({ ...base.footer, ...s.footer });
  return {
    version: 1,
    sections: value.sections.map(migrateSectionCopy),
    settings: {
      ...base,
      ...s,
      colors: { ...base.colors, ...s.colors },
      announcement: { ...base.announcement, ...s.announcement, messages: fixShippingCopy(s.announcement?.messages ?? base.announcement.messages) },
      footer,
      navigation: Array.isArray(s.navigation) ? s.navigation : base.navigation,
    },
  };
}

// Early themes promised free shipping on every order, but checkout charges a fee below the
// threshold (see lib/shipping.ts). Rewrite that copy in saved themes so the promise stays true.
const fixShippingCopy = (text: string) => text.replace(/free shipping on (all|every) orders?/gi, freeShippingLabel);

function migrateSectionCopy(section: Section): Section {
  if (section.type === "marquee" && typeof section.settings.messages === "string") {
    return { ...section, settings: { ...section.settings, messages: fixShippingCopy(section.settings.messages) } };
  }
  if (section.type === "feature_row" && Array.isArray(section.settings.items)) {
    const items = (section.settings.items as Record<string, FieldValue>[]).map((item) =>
      item.text === "On every order, across India" ? { ...item, text: `On orders above ₹${FREE_SHIPPING_THRESHOLD}, across India` } : item,
    );
    return { ...section, settings: { ...section.settings, items } };
  }
  return section;
}

function footerLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeFooter(footer: ThemeDocument["settings"]["footer"]): ThemeDocument["settings"]["footer"] {
  const policyLinks = ["Shipping Policy | /pages/shipping-policy", "Return & Refund Policy | /pages/refund-policy"];
  const columns = footer.columns.map((column) => {
    if (column.title !== "Customer care") return column;
    return {
      ...column,
      links: footerLines(column.links)
        .filter((line) => !line.includes("/pages/shipping-policy") && !line.includes("/pages/refund-policy"))
        .join("\n"),
    };
  });
  const policyColumn = columns.find((column) => column.title === "Policies");
  if (!policyColumn) return { ...footer, columns };
  const existing = footerLines(policyColumn.links);
  const merged = [
    ...policyLinks.filter((link) => !existing.some((line) => line.includes(link.split("|")[1].trim()))),
    ...existing,
  ];
  return {
    ...footer,
    columns: columns.map((column) => (column.title === "Policies" ? { ...column, links: merged.join("\n") } : column)),
  };
}

let demoCache: DemoState | null = null;

async function demoState(): Promise<DemoState> {
  if (demoCache) return demoCache;
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DemoState>;
      demoCache = {
        products: parsed.products ?? [],
        collections: parsed.collections ?? [],
        policies: parsed.policies ?? structuredClone(defaultPolicies),
        theme: parsed.theme ?? { draft: structuredClone(defaultTheme), published: structuredClone(defaultTheme), published_at: null, updated_at: null },
      };
      return demoCache;
    }
  } catch {
    // Corrupt or blocked storage falls through to a fresh seed.
  }
  const seed = (await import("../data/catalog.json")).default as unknown as { products: Product[]; collections: Collection[] };
  demoCache = {
    products: seed.products,
    collections: seed.collections,
    policies: structuredClone(defaultPolicies),
    theme: { draft: structuredClone(defaultTheme), published: structuredClone(defaultTheme), published_at: null, updated_at: null },
  };
  return demoCache;
}

function persist(state: DemoState) {
  demoCache = state;
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(state));
  } catch {
    throw new Error("This browser's storage is full. Use image links instead of uploads in demo mode, or connect Supabase.");
  }
}

export function resetDemo() {
  demoCache = null;
  try {
    localStorage.removeItem(DEMO_KEY);
  } catch {
    // Nothing to clear.
  }
}

function withCounts(collections: Collection[], products: Product[], onlyActive: boolean): Collection[] {
  return collections
    .map((c) => ({
      ...c,
      product_count: products.filter((p) => p.collection_ids.includes(c.id) && (!onlyActive || p.status === "active")).length,
    }))
    .sort((a, b) => a.position - b.position);
}

const uid = () => crypto.randomUUID();

export const demoBackend: Backend = {
  mode: "demo",
  async products() {
    return (await demoState()).products;
  },
  async collections() {
    const s = await demoState();
    return withCounts(s.collections, s.products, false);
  },
  async saveProduct(id, input) {
    const s = await demoState();
    const product: Product = {
      ...input,
      id: id ?? uid(),
      media: input.media.map((m) => ({ ...m, id: uid() })),
      variants: input.variants.map((v) => ({ ...v, id: uid() })),
    };
    const products = id ? s.products.map((p) => (p.id === id ? product : p)) : [product, ...s.products];
    persist({ ...s, products });
    return product;
  },
  async deleteProduct(id) {
    const s = await demoState();
    persist({ ...s, products: s.products.filter((p) => p.id !== id) });
  },
  async saveCollection(id, input) {
    const s = await demoState();
    if (s.collections.some((c) => c.slug === input.slug && c.id !== id)) throw new Error("Another collection already uses this URL handle.");
    const collection: Collection = { ...input, id: id ?? uid(), product_count: 0 };
    const collections = id ? s.collections.map((c) => (c.id === id ? collection : c)) : [...s.collections, collection];
    persist({ ...s, collections });
    return withCounts([collection], s.products, false)[0];
  },
  async deleteCollection(id) {
    const s = await demoState();
    persist({
      ...s,
      collections: s.collections.filter((c) => c.id !== id),
      products: s.products.map((p) => ({ ...p, collection_ids: p.collection_ids.filter((c) => c !== id) })),
    });
  },
  async policies() {
    return [...(await demoState()).policies].sort((a, b) => a.position - b.position);
  },
  async savePolicy(id, input) {
    const s = await demoState();
    if (s.policies.some((p) => p.slug === input.slug && p.id !== id)) throw new Error("Another policy already uses this URL handle.");
    const policy: Policy = { ...input, id: id ?? uid(), updated_at: new Date().toISOString() };
    const policies = id ? s.policies.map((p) => (p.id === id ? policy : p)) : [...s.policies, policy];
    persist({ ...s, policies });
    return policy;
  },
  async deletePolicy(id) {
    const s = await demoState();
    persist({ ...s, policies: s.policies.filter((p) => p.id !== id) });
  },
  async theme() {
    const theme = (await demoState()).theme;
    return {
      ...theme,
      draft: normalizeTheme(theme.draft),
      published: theme.published ? normalizeTheme(theme.published) : null,
    };
  },
  async saveTheme(draft) {
    const s = await demoState();
    const theme = { ...s.theme, draft, updated_at: new Date().toISOString() };
    persist({ ...s, theme });
    return theme;
  },
  async publishTheme() {
    const s = await demoState();
    const theme = { ...s.theme, published: structuredClone(s.theme.draft), published_at: new Date().toISOString() };
    persist({ ...s, theme });
    return theme;
  },
};

export const liveBackend: Backend = {
  mode: "live",
  products: api.adminProducts,
  collections: api.adminCollections,
  saveProduct: (id, input) => (id ? api.updateProduct(id, input) : api.createProduct(input)),
  deleteProduct: api.deleteProduct,
  saveCollection: (id, input) => (id ? api.updateCollection(id, input) : api.createCollection(input)),
  deleteCollection: api.deleteCollection,
  policies: api.adminPolicies,
  savePolicy: (id, input) => (id ? api.updatePolicy(id, input) : api.createPolicy(input)),
  deletePolicy: api.deletePolicy,
  async theme() {
    const t = await api.adminTheme();
    const published = t.published ? normalizeTheme(t.published) : null;
    return { ...t, published, draft: isTheme(t.draft) ? normalizeTheme(t.draft) : published ?? structuredClone(defaultTheme) };
  },
  async saveTheme(draft) {
    const t = await api.saveTheme(draft);
    return { ...t, draft: normalizeTheme(t.draft), published: t.published ? normalizeTheme(t.published) : null };
  },
  async publishTheme() {
    const t = await api.publishTheme();
    return { ...t, draft: normalizeTheme(t.draft), published: t.published ? normalizeTheme(t.published) : null };
  },
};

// Admin uses the live API only when signed in and the API accepts the session.
export async function resolveAdminBackend(): Promise<Backend> {
  if (!supabase) return demoBackend;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return demoBackend;
  try {
    await api.adminCollections();
    return liveBackend;
  } catch {
    return demoBackend;
  }
}

export async function loadStorefront(fresh = false): Promise<StorefrontData> {
  if (fresh) demoCache = null;
  try {
    const [products, collections, policies] = await Promise.all([
      api.publicProducts(),
      api.publicCollections(),
      api.publicPolicies().catch(() => structuredClone(defaultPolicies)),
    ]);
    const theme = await api.publicTheme().then(normalizeTheme, () => structuredClone(defaultTheme));
    return { mode: "live", products, collections, policies, theme };
  } catch {
    const s = await demoState();
    return {
      mode: "demo",
      products: s.products.filter((p) => p.status === "active"),
      collections: withCounts(s.collections.filter((c) => c.is_visible), s.products, true),
      policies: s.policies.filter((p) => p.is_visible).sort((a, b) => a.position - b.position),
      theme: normalizeTheme(s.theme.published ?? s.theme.draft),
    };
  }
}

// Uploads go to the Supabase "media" bucket when connected; in demo mode images are
// downscaled and stored inline so they survive a reload.
export async function uploadImage(file: File, mode: Mode): Promise<string> {
  if (mode === "live" && supabase) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `uploads/${new Date().toISOString().slice(0, 10)}/${uid()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, file, { cacheControl: "31536000", contentType: file.type });
    if (error) throw new Error(error.message);
    return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
  }
  return downscale(file, 1600);
}

function downscale(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.82));
    };
    img.onerror = () => reject(new Error("That file isn't an image we can read."));
    img.src = url;
  });
}
