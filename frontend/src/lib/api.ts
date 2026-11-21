import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type {
  CheckoutRequest,
  CheckoutResponse,
  Collection,
  CollectionInput,
  IntegrationProvider,
  Inquiry,
  InquiryInput,
  InquiryStatus,
  Fulfillment,
  Order,
  PaymentStatusResponse,
  Policy,
  PolicyInput,
  Product,
  ProductInput,
  Serviceability,
  StoreIntegration,
  Subscriber,
  TrackOrderRequest,
  TrackedOrder,
} from "../types/api";
import type { ThemeDocument } from "../types/theme";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

// The placeholder URL from .env.example counts as "not configured" so local previews run in demo mode.
export const supabaseConfigured = Boolean(supabaseUrl && supabaseKey && !supabaseUrl.includes("your-project"));

export const supabase: SupabaseClient | null = supabaseConfigured ? createClient(supabaseUrl, supabaseKey) : null;

export type AdminTheme = {
  draft: ThemeDocument | Record<string, never>;
  published: ThemeDocument | null;
  published_at: string | null;
  updated_at: string | null;
};

async function authHeaders(): Promise<HeadersInit> {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Thrown for HTTP error responses, so callers can tell "server said no" apart from "server unreachable".
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// FastAPI returns {"detail": "..."} or a list of validation errors; turn either into one readable sentence.
async function errorMessage(response: Response) {
  const text = await response.text();
  try {
    const detail = (JSON.parse(text) as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail[0] && typeof detail[0].msg === "string") {
      const field = Array.isArray(detail[0].loc) ? String(detail[0].loc[detail[0].loc.length - 1]) : "";
      return field ? `${field.replace(/_/g, " ")}: ${detail[0].msg}` : detail[0].msg;
    }
  } catch {
    // Not JSON; fall through to the raw text.
  }
  return text || `Request failed (${response.status})`;
}

async function request<T>(path: string, init: RequestInit = {}, admin = false): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (admin) {
    const auth = await authHeaders();
    Object.entries(auth).forEach(([key, value]) => headers.set(key, value));
  }
  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers, signal: init.signal ?? AbortSignal.timeout(8000) });
  if (!response.ok) {
    throw new ApiError(response.status, await errorMessage(response));
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export const api = {
  publicProducts: () => request<Product[]>("/public/products"),
  publicCollections: () => request<Collection[]>("/public/collections"),
  publicPolicies: () => request<Policy[]>("/public/policies"),
  publicTheme: () => request<ThemeDocument>("/public/theme"),
  submitInquiry: (payload: InquiryInput) => request<{ id: string | null; created_at: string }>("/public/inquiries", json("POST", payload)),
  subscribe: (email: string, source: string) => request<{ subscribed: boolean }>("/public/newsletter", json("POST", { email, source })),
  trackOrder: (payload: TrackOrderRequest) => request<TrackedOrder>("/public/orders/track", json("POST", payload)),
  checkout: (payload: CheckoutRequest) => request<CheckoutResponse>("/checkout", json("POST", payload)),
  paymentStatus: (orderId: string) => request<PaymentStatusResponse>(`/checkout/orders/${encodeURIComponent(orderId)}/status`),
  serviceability: (postalCode: string) => request<Serviceability>(`/public/serviceability/${encodeURIComponent(postalCode)}`),
  adminProducts: () => request<Product[]>("/admin/products", {}, true),
  createProduct: (payload: ProductInput) => request<Product>("/admin/products", json("POST", payload), true),
  updateProduct: (productId: string, payload: ProductInput) => request<Product>(`/admin/products/${productId}`, json("PUT", payload), true),
  deleteProduct: (productId: string) => request<void>(`/admin/products/${productId}`, { method: "DELETE" }, true),
  adminCollections: () => request<Collection[]>("/admin/collections", {}, true),
  createCollection: (payload: CollectionInput) => request<Collection>("/admin/collections", json("POST", payload), true),
  updateCollection: (id: string, payload: CollectionInput) => request<Collection>(`/admin/collections/${id}`, json("PUT", payload), true),
  deleteCollection: (id: string) => request<void>(`/admin/collections/${id}`, { method: "DELETE" }, true),
  adminTheme: () => request<AdminTheme>("/admin/theme", {}, true),
  saveTheme: (draft: ThemeDocument) => request<AdminTheme>("/admin/theme", json("PUT", { draft }), true),
  publishTheme: () => request<AdminTheme>("/admin/theme/publish", { method: "POST" }, true),
  adminPolicies: () => request<Policy[]>("/admin/policies", {}, true),
  createPolicy: (payload: PolicyInput) => request<Policy>("/admin/policies", json("POST", payload), true),
  updatePolicy: (id: string, payload: PolicyInput) => request<Policy>(`/admin/policies/${id}`, json("PUT", payload), true),
  deletePolicy: (id: string) => request<void>(`/admin/policies/${id}`, { method: "DELETE" }, true),
  orders: () => request<Order[]>("/admin/orders", {}, true),
  // Delhivery manifest + pickup booking can be slow, so these get a longer timeout than the default 8s.
  delhiverySettings: () => request<{ pickup_location?: string }>("/admin/integrations/delhivery/settings", {}, true),
  saveDelhiverySettings: (pickup_location: string) =>
    request<{ pickup_location?: string }>("/admin/integrations/delhivery/settings", json("PUT", { pickup_location }), true),
  shipOrder: (orderId: string) => request<Order>(`/admin/orders/${orderId}/shipments`, { method: "POST", signal: AbortSignal.timeout(45000) }, true),
  refreshShipment: (id: string) => request<Fulfillment>(`/admin/shipments/${id}/refresh`, { method: "POST", signal: AbortSignal.timeout(30000) }, true),
  cancelShipment: (id: string) => request<Fulfillment>(`/admin/shipments/${id}/cancel`, { method: "POST", signal: AbortSignal.timeout(30000) }, true),
  shipmentLabel: async (id: string) => {
    const response = await fetch(`${apiBaseUrl}/admin/shipments/${id}/label`, { headers: await authHeaders() });
    if (!response.ok) throw new ApiError(response.status, await errorMessage(response));
    return response.blob();
  },
  inquiries: () => request<Inquiry[]>("/admin/inquiries", {}, true),
  updateInquiry: (id: string, status: InquiryStatus) => request<Inquiry>(`/admin/inquiries/${id}`, json("PATCH", { status }), true),
  subscribers: () => request<Subscriber[]>("/admin/newsletter", {}, true),
  providers: () => request<IntegrationProvider[]>("/admin/integrations/providers", {}, true),
  integrations: () => request<StoreIntegration[]>("/admin/integrations", {}, true),
  installIntegration: (payload: { provider_key: string; kind: string; config?: object; secret_ref?: string }) =>
    request<StoreIntegration>("/admin/integrations", json("POST", payload), true),
};
