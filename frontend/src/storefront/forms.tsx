import { CheckCircle2, ExternalLink, Loader2, Mail, PackageCheck, PackageSearch, Send, Smartphone, Truck } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

import { money } from "../lib/format";
import { notFoundMessage, submitInquiry, subscribe, trackOrder } from "../lib/forms";
import { useLocation } from "../lib/router";
import type { InquiryKind, TrackedOrder } from "../types/api";
import { useStore } from "./StoreContext";

export const fieldClass =
  "h-12 w-full rounded-full border border-ink/15 bg-white px-4 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-brand focus:ring-2 focus:ring-brand/20 aria-[invalid=true]:border-[#c5280c]";

export function FormField({ label, hint, children, wide }: { label: string; hint?: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm font-medium text-ink ${wide ? "sm:col-span-2" : ""}`}>
      <span>
        {label} {hint && <span className="font-normal text-ink/45">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-2xl border border-[#f3b5aa] bg-[#fff0ed] px-4 py-3 text-sm text-[#8e1f0b]">
      {children}
    </p>
  );
}

// Hidden field that people never fill in but naive spam bots do; the API drops those submissions.
function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}

const phonePattern = "[0-9+\\-\\s\\(\\)]{7,20}";

type ExtraField = { name: string; label: string; type?: string; placeholder?: string; required?: boolean; hint?: string };

const extraFields: Partial<Record<InquiryKind, ExtraField[]>> = {
  bulk: [
    { name: "quantity", label: "Quantity needed", type: "number", placeholder: "e.g. 25 kits", required: true },
    { name: "event_date", label: "Event date", type: "date", hint: "(optional)" },
    { name: "city", label: "Delivery city", placeholder: "e.g. Pune", required: true },
    { name: "budget", label: "Budget per kit", placeholder: "e.g. ₹300–500", hint: "(optional)" },
  ],
  corporate: [
    { name: "company", label: "Company", required: true },
    { name: "quantity", label: "Approx. quantity", type: "number", required: true },
    { name: "event_date", label: "Required by", type: "date", hint: "(optional)" },
    { name: "city", label: "Delivery city(s)", required: true },
  ],
  planner: [
    { name: "company", label: "Studio / business name", required: true },
    { name: "city", label: "City", required: true },
    { name: "quantity", label: "Events per month", type: "number", hint: "(optional)" },
    { name: "event_date", label: "Next event date", type: "date", hint: "(optional)" },
  ],
  dealer: [
    { name: "company", label: "Store name", required: true },
    { name: "city", label: "City", required: true },
    { name: "store_type", label: "Store type", placeholder: "e.g. party shop, gift store", required: true },
    { name: "quantity", label: "Expected monthly units", type: "number", hint: "(optional)" },
  ],
};

const contactTopics = ["General support", "Product guidance", "Order tracking", "Payment issue", "Return or refund", "Bulk order", "Corporate order", "Dealer enquiry"];

const topicKind: Record<string, InquiryKind> = {
  "Order tracking": "tracking",
  "Product guidance": "product",
  "Bulk order": "bulk",
  "Corporate order": "corporate",
  "Dealer enquiry": "dealer",
};

export function EnquiryForm({ kind, defaultTopic, messagePlaceholder, submitLabel = "Send message" }: { kind: InquiryKind; defaultTopic?: string; messagePlaceholder?: string; submitLabel?: string }) {
  const { mode } = useStore();
  const { path } = useLocation();
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const extras = extraFields[kind] ?? [];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const get = (key: string) => String(form.get(key) ?? "").trim();
    const topic = kind === "contact" ? get("topic") : undefined;
    const details: Record<string, string> = {};
    extras.forEach((f) => get(f.name) && (details[f.name] = get(f.name)));
    if (get("reference")) details.order_reference = get("reference");

    setState("sending");
    setError("");
    try {
      await submitInquiry(mode, {
        kind: kind === "contact" && topic ? topicKind[topic] ?? "contact" : kind,
        name: get("name"),
        email: get("email"),
        phone: get("phone") || null,
        topic: topic ?? null,
        message: get("message"),
        details,
        source_path: path,
        website: get("website"),
      });
      setState("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setState("idle");
    }
  }

  if (state === "sent") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl bg-white p-8 text-center ring-1 ring-ink/5" role="status">
        <CheckCircle2 size={40} strokeWidth={1.6} className="text-brand" />
        <h3 className="font-display text-2xl font-semibold text-ink">Thanks, we've got your message</h3>
        <p className="max-w-sm text-sm text-ink/65">The GroovyDudz team will reply on the email or phone number you shared, usually within one working day.</p>
        <button onClick={() => setState("idle")} className="mt-2 text-sm font-semibold text-brand hover:underline">
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="relative rounded-3xl bg-white p-5 ring-1 ring-ink/5 sm:p-8">
      <Honeypot />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Name">
          <input name="name" required maxLength={120} autoComplete="name" className={fieldClass} />
        </FormField>
        <FormField label="Email">
          <input name="email" type="email" required autoComplete="email" className={fieldClass} />
        </FormField>
        <FormField label="Phone" hint={kind === "contact" ? "(optional)" : undefined}>
          <input name="phone" type="tel" required={kind !== "contact"} pattern={phonePattern} title="Enter a valid phone number" autoComplete="tel" className={fieldClass} />
        </FormField>
        {kind === "contact" ? (
          <>
            <FormField label="Topic">
              <select name="topic" defaultValue={defaultTopic ?? contactTopics[0]} className={fieldClass}>
                {contactTopics.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Order number" hint="(if you have one)" wide>
              <input name="reference" maxLength={60} placeholder="e.g. GD-24A91F0C" className={fieldClass} />
            </FormField>
          </>
        ) : (
          extras.map((f) => (
            <FormField key={f.name} label={f.label} hint={f.hint}>
              <input name={f.name} type={f.type ?? "text"} min={f.type === "number" ? 1 : undefined} required={f.required} placeholder={f.placeholder} maxLength={f.type ? undefined : 120} className={fieldClass} />
            </FormField>
          ))
        )}
        <FormField label={kind === "contact" ? "Message" : "Tell us more"} wide>
          <textarea
            name="message"
            required
            rows={5}
            maxLength={5000}
            placeholder={messagePlaceholder ?? "Tell us the occasion, date, city, product link or order number."}
            className="rounded-3xl border border-ink/15 px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </FormField>
      </div>
      {error && (
        <div className="mt-4">
          <FormError>{error}</FormError>
        </div>
      )}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-ink/50">We only use these details to reply to you.</p>
        <button type="submit" disabled={state === "sending"} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand px-6 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:opacity-60">
          {state === "sending" ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {state === "sending" ? "Sending…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

export function NewsletterForm({ source, compact = false, buttonLabel = "Subscribe", dark = false }: { source: string; compact?: boolean; buttonLabel?: string; dark?: boolean }) {
  const { mode } = useStore();
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    setState("sending");
    setError("");
    try {
      await subscribe(mode, email, source);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't subscribe right now.");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <p role="status" className={`flex items-center gap-2 text-sm font-semibold ${compact ? "" : "justify-center"} ${dark || compact ? "" : "text-brand"}`}>
        <CheckCircle2 size={18} /> You're on the list. Thank you!
      </p>
    );
  }

  return (
    <form onSubmit={submit} className={compact ? "flex flex-col gap-2" : "mx-auto flex max-w-md flex-col gap-2 sm:flex-row"}>
      <label className="sr-only" htmlFor={`newsletter-${source}`}>
        Email address
      </label>
      <div className={`flex gap-2 ${compact ? "" : "flex-1"}`}>
        <input
          id={`newsletter-${source}`}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Your email address"
          className={`min-w-0 flex-1 rounded-full border bg-white px-4 text-sm text-ink outline-none focus:ring-2 focus:ring-brand/20 ${compact ? "h-10 border-transparent" : "h-12 border-ink/15 px-5 focus:border-brand"}`}
        />
        {compact && (
          <button disabled={state === "sending"} aria-label="Subscribe" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/90 text-ink transition hover:bg-white disabled:opacity-60">
            {state === "sending" ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
          </button>
        )}
      </div>
      {!compact && (
        <button disabled={state === "sending"} className="h-12 rounded-full bg-brand px-6 font-semibold text-white transition hover:bg-brand/90 disabled:opacity-60">
          {state === "sending" ? "Subscribing…" : buttonLabel}
        </button>
      )}
      {error && <p className="text-xs text-[#c5280c] sm:basis-full">{error}</p>}
    </form>
  );
}

const statusCopy: Record<string, { label: string; text: string }> = {
  pending: { label: "Awaiting payment", text: "We haven't received payment for this order yet." },
  confirmed: { label: "Confirmed", text: "Payment received. Your order is being packed." },
  cancelled: { label: "Cancelled", text: "This order was cancelled." },
  closed: { label: "Completed", text: "This order is complete." },
};

function TrackingTimeline({ order }: { order: TrackedOrder }) {
  const paid = order.payment_status === "paid";
  const shipped = order.fulfillment_status === "fulfilled" || order.fulfillment_status === "partial" || order.shipments.length > 0;
  const delivered = order.shipments.some((s) => s.status.toLowerCase() === "delivered");
  const steps = [
    { label: "Order placed", done: true, icon: PackageCheck },
    { label: "Payment received", done: paid, icon: CheckCircle2 },
    { label: "Shipped", done: shipped, icon: Truck },
    { label: "Delivered", done: delivered, icon: PackageSearch },
  ];
  return (
    <ol className="grid grid-cols-4 gap-2">
      {steps.map(({ label, done, icon: Icon }, i) => (
        <li key={label} className="relative flex flex-col items-center gap-2 text-center">
          {i > 0 && <span className={`absolute right-1/2 top-5 h-0.5 w-full ${done ? "bg-brand" : "bg-ink/10"}`} aria-hidden="true" />}
          <span className={`relative grid h-10 w-10 place-items-center rounded-full ${done ? "bg-brand text-white" : "bg-ink/5 text-ink/35"}`}>
            <Icon size={18} />
          </span>
          <span className={`text-xs ${done ? "font-semibold text-ink" : "text-ink/45"}`}>{label}</span>
        </li>
      ))}
    </ol>
  );
}

export function TrackOrderForm() {
  const { mode } = useStore();
  const { search } = useLocation();
  const [method, setMethod] = useState<"email" | "mobile" | "awb">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const initialOrder = new URLSearchParams(search).get("order") ?? "";
  const methods = [
    { key: "email" as const, label: "Email", icon: Mail },
    { key: "mobile" as const, label: "Mobile", icon: Smartphone },
    { key: "awb" as const, label: "AWB", icon: PackageSearch },
  ];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const contact = String(form.get("contact") ?? "").trim();
    const payload =
      method === "email"
        ? { method, order_number: String(form.get("order_number") ?? ""), email: String(form.get("email") ?? "") }
        : method === "mobile"
          ? { method, order_number: String(form.get("order_number") ?? ""), phone: String(form.get("phone") ?? "") }
          : {
              method,
              tracking_number: String(form.get("tracking_number") ?? ""),
              email: contact.includes("@") ? contact : null,
              phone: contact.includes("@") ? null : contact,
            };
    setBusy(true);
    setError("");
    setOrder(null);
    try {
      setOrder(await trackOrder(mode, payload));
    } catch (err) {
      setError(err instanceof Error ? err.message : notFoundMessage);
    } finally {
      setBusy(false);
    }
  }

  const status = order ? statusCopy[order.status] ?? { label: order.status, text: "" } : null;

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={submit} className="rounded-3xl bg-white p-5 ring-1 ring-ink/5 sm:p-8">
        <div className="mb-5 grid grid-cols-3 gap-1 rounded-full bg-canvas p-1">
          {methods.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setMethod(key);
                setError("");
                setOrder(null);
              }}
              className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition ${method === key ? "bg-brand text-white shadow-sm" : "text-ink/60 hover:text-ink"}`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <FormField label={method === "awb" ? "AWB / tracking number" : "Order number"}>
            <input
              key={method === "awb" ? "tracking" : "order"}
              name={method === "awb" ? "tracking_number" : "order_number"}
              required
              defaultValue={method === "awb" ? "" : initialOrder}
              placeholder={method === "awb" ? "e.g. GDDEMO12345" : "e.g. GD-24A91F0C"}
              autoCapitalize="characters"
              className={fieldClass}
            />
          </FormField>
          <FormField label={method === "email" ? "Email used at checkout" : method === "mobile" ? "Mobile number used at checkout" : "Email or mobile used at checkout"}>
            <input
              key={method}
              name={method === "email" ? "email" : method === "mobile" ? "phone" : "contact"}
              type={method === "email" ? "email" : "text"}
              required
              autoComplete={method === "email" ? "email" : "tel"}
              placeholder={method === "mobile" ? "+91 98765 43210" : method === "awb" ? "Email or mobile number" : undefined}
              className={fieldClass}
            />
          </FormField>
          <button disabled={busy} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand px-6 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:opacity-60">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <PackageSearch size={16} />}
            Track order
          </button>
        </div>
        <p className="mt-3 text-xs text-ink/50">
          {method === "awb"
            ? "For privacy, AWB lookup also needs the checkout email or mobile number."
            : "Your order number is in the confirmation email and on the payment confirmation screen."}
          {mode === "demo" && " Demo: GD-24A91F0C, customer@example.com, +91 98765 43210, AWB GDDEMO12345."}
        </p>
        {error && (
          <div className="mt-4">
            <FormError>{error}</FormError>
          </div>
        )}
      </form>

      {order && status && (
        <section className="rounded-3xl bg-white p-5 ring-1 ring-ink/5 sm:p-8" aria-live="polite">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Order {order.order_number}</p>
              <h2 className="mt-1 font-display text-3xl font-semibold text-ink">{status.label}</h2>
              {status.text && <p className="mt-1 text-sm text-ink/60">{status.text}</p>}
            </div>
            <p className="text-sm text-ink/55">Placed {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
          </div>
          <div className="mt-6">
            <TrackingTimeline order={order} />
          </div>
          {order.shipments.map((s, i) => (
            <div key={i} className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-brand/[0.06] p-4 text-sm">
              <span>
                <strong className="text-ink">{s.provider}</strong> · {s.status}
                {s.tracking_number && <span className="ml-1 font-mono text-xs text-ink/60">({s.tracking_number})</span>}
              </span>
              {s.tracking_url && (
                <a href={s.tracking_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand hover:underline">
                  Courier tracking <ExternalLink size={14} />
                </a>
              )}
            </div>
          ))}
          <ul className="mt-6 divide-y divide-ink/10 border-t border-ink/10 text-sm">
            {order.lines.map((l, i) => (
              <li key={i} className="flex justify-between gap-4 py-3">
                <span className="text-ink/80">
                  {l.title} <span className="text-ink/45">× {l.quantity}</span>
                </span>
                <span className="font-medium text-ink">{money(l.line_total)}</span>
              </li>
            ))}
            <li className="flex justify-between gap-4 py-3 font-semibold text-ink">
              <span>Total paid</span>
              <span>{money(order.grand_total)}</span>
            </li>
          </ul>
        </section>
      )}
    </div>
  );
}
