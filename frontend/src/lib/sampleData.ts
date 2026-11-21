import type { IntegrationProvider, Order, StoreIntegration } from "../types/api";

export const sampleOrders: Order[] = [
  {
    id: "o1",
    order_number: "GD-24A91F0C",
    email: "customer@example.com",
    phone: "+91 98765 43210",
    customer_name: "Aarav Sharma",
    status: "confirmed",
    payment_status: "paid",
    fulfillment_status: "unfulfilled",
    grand_total: "499.00",
    currency: "INR",
    lines: [{ id: "l1", title: "Astronaut Space Theme Decoration Combo - 50 Pcs", sku: "SPACE50", quantity: 1, unit_price: "499.00", line_total: "499.00" }],
  },
];

export const sampleProviders: IntegrationProvider[] = [
  { key: "resend", kind: "email", display_name: "Resend", configured: false },
  { key: "payu", kind: "payment", display_name: "PayU", configured: false },
  { key: "delhivery", kind: "shipping", display_name: "Delhivery", configured: false },
];

export const sampleIntegrations: StoreIntegration[] = [
  { id: "i1", provider_key: "resend", kind: "email", status: "active", config: { from_email: "orders@groovydudz.com" }, secret_ref: "aws/secrets/groovydudz/resend" },
];
