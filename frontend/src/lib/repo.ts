import type { Collection, CollectionInput, Policy, PolicyInput, Product, ProductInput } from "../types/api";
import type { FieldValue, Section, ThemeDocument } from "../types/theme";
import { api, supabase } from "./api";
import { defaultPolicies } from "./defaultPolicies";
import { defaultTheme } from "./defaultTheme";
import { FREE_SHIPPING_THRESHOLD, freeShippingLabel } from "./shipping";

// One interface for catalog + theme data. Admin and storefront use the live FastAPI
// backend only; missing auth/config should surface as errors.

export type Mode = "live";

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


const uid = () => crypto.randomUUID();

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

export async function loadStorefront(_fresh = false): Promise<StorefrontData> {
  const [products, collections, policies] = await Promise.all([
    api.publicProducts(),
    api.publicCollections(),
    api.publicPolicies().catch(() => structuredClone(defaultPolicies)),
  ]);
  const theme = await api.publicTheme().then(normalizeTheme, () => structuredClone(defaultTheme));
  return { mode: "live", products, collections, policies, theme };
}

// Uploads go to the Supabase "media" bucket.
export async function uploadImage(file: File, _mode: Mode): Promise<string> {
  if (!supabase) throw new Error("Supabase Storage is not configured for this admin deployment.");
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `uploads/${new Date().toISOString().slice(0, 10)}/${uid()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { cacheControl: "31536000", contentType: file.type });
  if (error) throw new Error(error.message);
  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
}
