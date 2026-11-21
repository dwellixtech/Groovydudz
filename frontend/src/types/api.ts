export type ProductVariant = {
  id: string;
  title: string;
  sku: string | null;
  price: string;
  compare_at_price: string | null;
  inventory_quantity: number;
  weight_grams: number | null;
  options: Record<string, string>;
};

export type ProductMedia = {
  id: string;
  url: string;
  alt_text: string | null;
  position: number;
};

export type Product = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: "draft" | "active" | "archived";
  vendor: string | null;
  product_type: string | null;
  seo: Record<string, string>;
  collection_ids: string[];
  media: ProductMedia[];
  variants: ProductVariant[];
};

export type Collection = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  position: number;
  is_visible: boolean;
  product_count: number;
};

export type ProductInput = Omit<Product, "id" | "media" | "variants"> & {
  media: Omit<ProductMedia, "id">[];
  variants: Omit<ProductVariant, "id">[];
};

export type CollectionInput = Omit<Collection, "id" | "product_count">;

export type Policy = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  body: string;
  position: number;
  is_visible: boolean;
  updated_at: string | null;
};

export type PolicyInput = Omit<Policy, "id" | "updated_at">;

export type OrderLine = {
  id: string;
  title: string;
  sku: string | null;
  quantity: number;
  unit_price: string;
  line_total: string;
};

export type Order = {
  id: string;
  order_number: string;
  email: string;
  phone?: string | null;
  customer_name: string;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  grand_total: string;
  currency: string;
  lines: OrderLine[];
  fulfillments?: Fulfillment[];
};

export type CheckoutAddress = {
  name: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
};

export type CheckoutRequest = {
  email: string;
  phone?: string | null;
  customer_name: string;
  shipping_address: CheckoutAddress;
  billing_address?: CheckoutAddress | null;
  lines: { variant_id: string; quantity: number }[];
};

export type CheckoutResponse = {
  order_id: string;
  order_number: string;
  amount: string;
  currency: string;
  // Form the browser POSTs to the gateway's hosted payment page (PayU).
  payment: { provider: string; action_url: string; params: Record<string, string> };
};

export type PaymentStatusResponse = {
  order_id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_id: string | null;
};

export type Serviceability = {
  postal_code: string;
  serviceable: boolean;
  message: string | null;
};

export type Fulfillment = {
  id: string;
  provider: string;
  status: string;
  tracking_number: string | null;
  tracking_url: string | null;
  created_at: string;
  updated_at: string;
};

export type InquiryKind = "contact" | "bulk" | "corporate" | "planner" | "dealer" | "tracking" | "product";
export type InquiryStatus = "new" | "in_progress" | "resolved";

export type InquiryInput = {
  kind: InquiryKind;
  name: string;
  email: string;
  phone?: string | null;
  topic?: string | null;
  message: string;
  details: Record<string, string>;
  source_path?: string | null;
  website?: string;
};

export type Inquiry = Omit<InquiryInput, "website"> & {
  id: string;
  status: InquiryStatus;
  created_at: string;
  updated_at: string | null;
};

export type Subscriber = { id: string; email: string; source: string | null; created_at: string };

export type TrackedOrder = {
  order_number: string;
  created_at: string;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  subtotal: string;
  shipping_total: string;
  grand_total: string;
  currency: string;
  lines: { title: string; quantity: number; line_total: string }[];
  shipments: { provider: string; status: string; tracking_number: string | null; tracking_url: string | null; updated_at: string | null }[];
};

export type TrackOrderRequest = {
  method: "email" | "mobile" | "awb";
  order_number?: string | null;
  email?: string | null;
  phone?: string | null;
  tracking_number?: string | null;
};

export type IntegrationProvider = {
  key: string;
  kind: "email" | "payment" | "shipping" | "media" | "analytics";
  display_name: string;
  configured: boolean;
};

export type StoreIntegration = {
  id: string;
  provider_key: string;
  kind: string;
  status: string;
  config: Record<string, unknown>;
  secret_ref: string | null;
};
