import type { Inquiry, InquiryInput, InquiryStatus, Subscriber, TrackOrderRequest, TrackedOrder } from "../types/api";
import { api } from "./api";
import type { Mode } from "./repo";
import { sampleOrders } from "./sampleData";

// Storefront form submissions. Live mode posts to the API; demo mode keeps an inbox in
// localStorage so the admin Inbox works end to end before the backend is connected.

const INBOX_KEY = "groovydudz-demo-inbox";

type DemoInbox = { inquiries: Inquiry[]; subscribers: Subscriber[] };

function readInbox(): DemoInbox {
  try {
    const raw = localStorage.getItem(INBOX_KEY);
    if (raw) return JSON.parse(raw) as DemoInbox;
  } catch {
    // Fall through to an empty inbox.
  }
  return { inquiries: [], subscribers: [] };
}

function writeInbox(inbox: DemoInbox) {
  try {
    localStorage.setItem(INBOX_KEY, JSON.stringify(inbox));
  } catch {
    throw new Error("Couldn't save your message in this browser. Please email us instead.");
  }
}

export async function submitInquiry(mode: Mode, input: InquiryInput) {
  if (mode === "live") return api.submitInquiry(input);
  if (input.website) return { id: null, created_at: new Date().toISOString() };
  const { website: _honeypot, ...rest } = input;
  const inquiry: Inquiry = { ...rest, id: crypto.randomUUID(), status: "new", created_at: new Date().toISOString(), updated_at: null };
  const inbox = readInbox();
  writeInbox({ ...inbox, inquiries: [inquiry, ...inbox.inquiries] });
  return { id: inquiry.id, created_at: inquiry.created_at };
}

export async function subscribe(mode: Mode, email: string, source: string) {
  if (mode === "live") return api.subscribe(email, source);
  const inbox = readInbox();
  if (!inbox.subscribers.some((s) => s.email.toLowerCase() === email.toLowerCase())) {
    writeInbox({ ...inbox, subscribers: [{ id: crypto.randomUUID(), email, source, created_at: new Date().toISOString() }, ...inbox.subscribers] });
  }
  return { subscribed: true };
}

export const notFoundMessage = "We couldn't find an order with those tracking details.";

const digits = (value = "") => value.replace(/\D/g, "");

export async function trackOrder(mode: Mode, input: TrackOrderRequest): Promise<TrackedOrder> {
  if (mode === "live") return api.trackOrder(input);
  const orderNumber = (input.order_number ?? "").replace(/\s+/g, "").toUpperCase();
  const trackingNumber = (input.tracking_number ?? "").replace(/\s+/g, "").toUpperCase();
  const email = (input.email ?? "").trim().toLowerCase();
  const phone = digits(input.phone ?? "").slice(-10);
  const order = sampleOrders.find((o) => {
    const orderMatch = input.method === "awb" ? trackingNumber === "GDDEMO12345" : o.order_number.toUpperCase() === orderNumber;
    const emailMatch = email ? o.email.toLowerCase() === email : true;
    const phoneMatch = phone ? digits(o.phone ?? "").slice(-10) === phone : true;
    return orderMatch && emailMatch && phoneMatch;
  });
  if (!order) throw new Error(notFoundMessage);
  return {
    order_number: order.order_number,
    created_at: new Date().toISOString(),
    status: order.status,
    payment_status: order.payment_status,
    fulfillment_status: order.fulfillment_status,
    subtotal: order.grand_total,
    shipping_total: "0.00",
    grand_total: order.grand_total,
    currency: order.currency,
    lines: order.lines.map((l) => ({ title: l.title, quantity: l.quantity, line_total: l.line_total })),
    shipments: [
      {
        provider: "Demo Courier",
        status: input.method === "awb" ? "in_transit" : "packed",
        tracking_number: "GDDEMO12345",
        tracking_url: null,
        updated_at: new Date().toISOString(),
      },
    ],
  };
}

export const demoInbox = {
  inquiries: async () => readInbox().inquiries,
  subscribers: async () => readInbox().subscribers,
  async updateInquiry(id: string, status: InquiryStatus) {
    const inbox = readInbox();
    const inquiries = inbox.inquiries.map((i) => (i.id === id ? { ...i, status, updated_at: new Date().toISOString() } : i));
    writeInbox({ ...inbox, inquiries });
    const updated = inquiries.find((i) => i.id === id);
    if (!updated) throw new Error("Message not found");
    return updated;
  },
};
