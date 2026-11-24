import { CheckCircle2, CreditCard, Inbox as InboxIcon, ExternalLink, FileText, FolderOpen, Home, LogOut, Mail, Menu, Package, PackageCheck, Paintbrush, Plug, RotateCcw, Store, Truck, X, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import { api, ApiError, supabase, supabaseConfigured } from "../lib/api";
import { adminPath, adminRouteParts, storefrontPath } from "../lib/deployment";
import { money, sized } from "../lib/format";
import { liveBackend, type Backend } from "../lib/repo";
import { Link, navigate, useLocation } from "../lib/router";
import type { Collection, IntegrationProvider, Order, Policy, Product, StoreIntegration } from "../types/api";
import { AdminContext, useAdmin } from "./AdminContext";
import { CollectionEditor, CollectionList } from "./CollectionsAdmin";
import { PolicyEditor, PolicyList } from "./PoliciesAdmin";
import { ProductEditor, ProductList } from "./ProductsAdmin";
import { InboxPage } from "./InboxAdmin";
import { ThemeEditor } from "./ThemeEditor";
import { Badge, Button, Card, EmptyState, Input } from "./ui";

const nav = [
  { path: "", label: "Home", icon: Home, exact: true },
  { path: "products", label: "Products", icon: Package },
  { path: "collections", label: "Collections", icon: FolderOpen },
  { path: "orders", label: "Orders", icon: PackageCheck },
  { path: "inbox", label: "Inbox", icon: InboxIcon },
  { path: "policies", label: "Policies", icon: FileText },
  { path: "online-store", label: "Online Store", icon: Store },
  { path: "integrations", label: "Integrations", icon: Plug },
];

type Toast = { id: number; message: string; tone: "success" | "error" };
type AdminStatus = "checking" | "signed_out" | "ready" | "config_error" | "error";
type ConnectOptions = { force?: boolean; showChecking?: boolean };

function adminErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return "You are signed in, but the API rejected the Supabase session. Check the API Supabase JWT settings.";
    if (error.status === 403) return "You are signed in, but this account is not an active staff member for GroovyDudz.";
    return error.message;
  }
  return error instanceof Error ? error.message : "Could not connect to the live admin API.";
}

export function AdminApp() {
  const { path } = useLocation();
  const [backend, setBackend] = useState<Backend | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [status, setStatus] = useState<AdminStatus>("checking");
  const [connectionError, setConnectionError] = useState("");
  const connectedToken = useRef<string | null>(null);
  const connectionRun = useRef(0);
  const connectionPromise = useRef<Promise<void> | null>(null);

  const toast = useCallback((message: string, tone: "success" | "error" = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const clearAdminData = useCallback(() => {
    setBackend(null);
    setProducts([]);
    setCollections([]);
    setPolicies([]);
  }, []);

  const connect = useCallback(async (options: ConnectOptions = {}) => {
    const { force = false, showChecking = true } = options;
    if (connectionPromise.current) {
      await connectionPromise.current;
      if (!force) return;
    }

    const run = ++connectionRun.current;
    const task = (async () => {
      if (showChecking) setStatus((current) => (current === "ready" ? current : "checking"));
      setConnectionError("");
      if (!supabase || !supabaseConfigured) {
        connectedToken.current = null;
        clearAdminData();
        setStatus("config_error");
        return;
      }
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? null;
      if (!token) {
        connectedToken.current = null;
        clearAdminData();
        setStatus("signed_out");
        return;
      }
      if (!force && token === connectedToken.current) return;
      try {
        const [p, c, pl] = await Promise.all([liveBackend.products(), liveBackend.collections(), liveBackend.policies()]);
        if (run !== connectionRun.current) return;
        setProducts(p);
        setCollections(c);
        setPolicies(pl);
        setBackend(liveBackend);
        connectedToken.current = token;
        setStatus("ready");
      } catch (error) {
        if (run !== connectionRun.current) return;
        connectedToken.current = null;
        clearAdminData();
        setConnectionError(adminErrorMessage(error));
        setStatus("error");
      }
    })();

    connectionPromise.current = task;
    try {
      await task;
    } finally {
      if (connectionPromise.current === task) connectionPromise.current = null;
    }
  }, [clearAdminData]);

  useEffect(() => {
    connect({ force: true });
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "INITIAL_SESSION") return;
      if (event === "SIGNED_OUT") {
        connectedToken.current = null;
        clearAdminData();
        setConnectionError("");
        setStatus("signed_out");
        return;
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") void connect({ showChecking: false });
    });
    return () => data.subscription.unsubscribe();
  }, [clearAdminData, connect]);

  useEffect(() => setMenuOpen(false), [path]);

  const reload = useCallback(async () => {
    const [p, c, pl] = await Promise.all([liveBackend.products(), liveBackend.collections(), liveBackend.policies()]);
    setProducts(p);
    setCollections(c);
    setPolicies(pl);
  }, []);

  const toastStack = (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div key={t.id} role="status" className={`flex animate-fade-in items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-medium text-white shadow-lg ${t.tone === "error" ? "bg-[#c5280c]" : "bg-[#1a1a1a]"}`}>
          {t.tone === "error" ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
          {t.message}
        </div>
      ))}
    </div>
  );

  if (!backend || status !== "ready") {
    return (
      <>
        <AdminAuthScreen status={status} error={connectionError} onRetry={() => connect({ force: true })} />
        {toastStack}
      </>
    );
  }

  const context = { backend, products, collections, policies, reload, toast };
  const parts = adminRouteParts(path);

  // The theme editor takes over the full screen, like Shopify's.
  if (parts[0] === "themes") {
    return (
      <AdminContext.Provider value={context}>
        <ThemeEditor />
        {toastStack}
      </AdminContext.Provider>
    );
  }

  let page;
  if (parts[0] === "products") page = parts[1] ? <ProductEditor key={parts[1]} id={parts[1] === "new" ? null : parts[1]} /> : <ProductList />;
  else if (parts[0] === "collections") page = parts[1] ? <CollectionEditor key={parts[1]} id={parts[1] === "new" ? null : parts[1]} /> : <CollectionList />;
  else if (parts[0] === "orders") page = <OrdersPage />;
  else if (parts[0] === "inbox") page = <InboxPage />;
  else if (parts[0] === "policies") page = parts[1] ? <PolicyEditor key={parts[1]} id={parts[1] === "new" ? null : parts[1]} /> : <PolicyList />;
  else if (parts[0] === "online-store") page = <OnlineStorePage />;
  else if (parts[0] === "integrations") page = <IntegrationsPage />;
  else page = <Dashboard />;

  const sidebar = (
    <nav className="flex flex-col gap-0.5 p-2">
      {nav.map((item) => {
        const Icon = item.icon;
        const href = adminPath(item.path);
        const active = item.exact ? parts.length === 0 : parts[0] === item.path;
        return (
          <Link key={item.path || "home"} href={href} className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium ${active ? "bg-white text-admin-text shadow-sm" : "text-[#303030] hover:bg-black/[0.04]"}`}>
            <Icon size={16} className={active ? "text-admin-text" : "text-[#4a4a4a]"} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <AdminContext.Provider value={context}>
      <div className="min-h-screen bg-admin-bg font-body text-admin-text">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 bg-[#1a1a1a] px-3 text-white">
          <button onClick={() => setMenuOpen(true)} aria-label="Open navigation" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/10 lg:hidden">
            <Menu size={18} />
          </button>
          <Link href={adminPath()} className="flex items-center gap-2 text-sm font-semibold">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-admin-accent text-xs font-bold">G</span>
            GroovyDudz
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-1.5 text-xs text-white/70 sm:flex">
              <span className="h-2 w-2 rounded-full bg-[#4ade80]" /> Live
            </span>
            <a href={storefrontPath()} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium hover:bg-white/10">
              <ExternalLink size={14} /> <span className="hidden sm:inline">View store</span>
            </a>
            <button onClick={() => supabase?.auth.signOut().then(() => connect())} aria-label="Sign out" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/10">
              <LogOut size={15} />
            </button>
          </div>
        </header>

        <aside className="fixed bottom-0 left-0 top-14 hidden w-56 overflow-y-auto bg-[#ebebeb] lg:block">{sidebar}</aside>
        {menuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
            <button className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} aria-label="Close navigation" />
            <div className="absolute inset-y-0 left-0 w-64 animate-slide-in-left bg-[#ebebeb]">
              <div className="flex justify-end p-2">
                <button onClick={() => setMenuOpen(false)} aria-label="Close navigation" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-black/5">
                  <X size={18} />
                </button>
              </div>
              {sidebar}
            </div>
          </div>
        )}

        <main className="px-4 py-6 lg:pl-[calc(14rem+2rem)] lg:pr-8">
          <div className="mx-auto max-w-[1100px]">{page}</div>
        </main>
      </div>
      {toastStack}
    </AdminContext.Provider>
  );
}

function AdminAuthScreen({ status, error, onRetry }: { status: AdminStatus; error: string; onRetry(): Promise<void> }) {
  return (
    <div className="grid min-h-screen place-items-center bg-admin-bg px-4 font-body text-admin-text">
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-admin-accent text-xs font-bold text-white">G</span>
          <div>
            <h1 className="text-sm font-semibold">GroovyDudz Admin</h1>
            <p className="text-xs text-admin-muted">Live store access only</p>
          </div>
        </div>
        {status === "checking" ? (
          <p className="text-[13px] text-admin-muted">Checking session…</p>
        ) : status === "config_error" ? (
          <div className="space-y-3 text-[13px] text-admin-muted">
            <p>Supabase is not configured for this admin deployment.</p>
            <Button onClick={onRetry}>Retry</Button>
          </div>
        ) : (
          <>
            {error && <p className="mb-3 rounded-lg bg-[#fedad9] px-3 py-2 text-[13px] text-[#8e1f0b]">{error}</p>}
            <SignInForm onSuccess={onRetry} />
            {status === "error" && (
              <div className="mt-3 flex gap-2">
                <Button onClick={onRetry}>Retry</Button>
                <Button onClick={() => supabase?.auth.signOut().then(() => onRetry())}>Sign out</Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SignInForm({ onSuccess }: { onSuccess(): Promise<void> }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    // The staff PIN is the Supabase account password.
    const { error } = await supabase.auth.signInWithPassword({ email: String(form.get("email")).trim(), password: String(form.get("pin")) });
    setBusy(false);
    if (error) setMessage(error.message === "Invalid login credentials" ? "Incorrect email or PIN" : error.message);
    else await onSuccess();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Input name="email" type="email" required placeholder="Staff email" aria-label="Email" />
      <Input name="pin" type="password" required inputMode="numeric" autoComplete="current-password" pattern="[0-9]{6}" maxLength={6} title="Enter your 6-digit PIN" placeholder="6-digit PIN" aria-label="PIN" />
      {message && <p className="text-[13px] text-[#c5280c]">{message}</p>}
      <Button variant="primary" type="submit" loading={busy}>
        Sign in
      </Button>
    </form>
  );
}

function Dashboard() {
  const { products, collections } = useAdmin();
  const active = products.filter((p) => p.status === "active").length;
  const lowStock = products.filter((p) => (p.variants[0]?.inventory_quantity ?? 0) < 10);
  const noImages = products.filter((p) => !p.media.length);
  const noPrice = products.filter((p) => p.status === "active" && Number(p.variants[0]?.price ?? 0) <= 0);
  const [newMessages, setNewMessages] = useState<number | null>(null);
  useEffect(() => {
    api.inquiries().then(
      (list) => setNewMessages(list.filter((i) => i.status === "new").length),
      () => setNewMessages(null),
    );
  }, []);
  const stats = [
    { label: "New messages", value: newMessages ?? "—", href: adminPath("inbox") },
    { label: "Active products", value: active, href: adminPath("products") },
    { label: "Low stock", value: lowStock.length, href: adminPath("products") },
    { label: "Missing images", value: noImages.length, href: adminPath("products") },
  ];
  return (
    <>
      <h1 className="mb-4 text-xl font-bold">Welcome back</h1>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rounded-xl bg-white p-4 shadow-card hover:bg-[#fafafa]">
            <p className="text-xs text-admin-muted">{s.label}</p>
            <p className="mt-1 text-2xl font-bold">{s.value}</p>
          </Link>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Customize your storefront">
          <p className="mb-3 text-[13px] text-admin-muted">Add, reorder and edit homepage sections, banners, menus and colors with a live preview.</p>
          <Button variant="primary" onClick={() => navigate(adminPath("themes/editor"))}>
            <Paintbrush size={14} /> Open theme editor
          </Button>
        </Card>
        <Card title="Needs attention">
          {noPrice.length > 0 && (
            <p className="mb-3 rounded-lg bg-[#fedad9] px-3 py-2 text-[13px] text-[#8e1f0b]">
              {noPrice.length} active product{noPrice.length > 1 ? "s are" : " is"} priced at ₹0:{" "}
              {noPrice.slice(0, 2).map((p, i) => (
                <span key={p.id}>
                  {i > 0 && ", "}
                  <Link href={adminPath(`products/${p.id}`)} className="font-semibold underline">
                    {p.title.slice(0, 48)}…
                  </Link>
                </span>
              ))}
            </p>
          )}
          {lowStock.length === 0 && noImages.length === 0 ? (
            <p className="text-[13px] text-admin-muted">All products have images and healthy stock.</p>
          ) : (
            <ul className="divide-y divide-admin-line">
              {[...noImages.slice(0, 3), ...lowStock.slice(0, 3)].map((p, i) => (
                <li key={p.id + i}>
                  <Link href={adminPath(`products/${p.id}`)} className="flex items-center gap-3 py-2 text-[13px] hover:underline">
                    <span className="h-8 w-8 shrink-0 overflow-hidden rounded border border-admin-line bg-white">{p.media[0] && <img src={sized(p.media[0].url, 80)} alt="" className="h-full w-full object-contain" />}</span>
                    <span className="line-clamp-1 flex-1">{p.title}</span>
                    <Badge tone={p.media.length ? "warning" : "critical"}>{p.media.length ? `${p.variants[0]?.inventory_quantity ?? 0} left` : "No image"}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function OnlineStorePage() {
  const { backend } = useAdmin();
  const [published, setPublished] = useState<string | null>(null);
  useEffect(() => {
    backend.theme().then((t) => setPublished(t.published_at));
  }, [backend]);
  return (
    <>
      <h1 className="mb-4 text-xl font-bold">Online Store</h1>
      <Card padded={false}>
        <div className="grid gap-0 md:grid-cols-[1.2fr_1fr]">
          <div className="relative h-56 overflow-hidden rounded-t-xl bg-[#f1f1f1] md:h-auto md:rounded-l-xl md:rounded-tr-none">
            <iframe title="Storefront thumbnail" src={storefrontPath()} tabIndex={-1} className="pointer-events-none absolute left-0 top-0 h-[300%] w-[300%] origin-top-left scale-[0.3334] border-0" />
          </div>
          <div className="flex flex-col gap-3 p-5">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">GroovyDudz theme</h2>
              <Badge tone="success">Live</Badge>
            </div>
            <p className="text-[13px] text-admin-muted">{published ? `Last published ${new Date(published).toLocaleString()}` : "Using the default GroovyDudz layout."}</p>
            <div className="mt-auto flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => navigate(adminPath("themes/editor"))}>
                <Paintbrush size={14} /> Customize
              </Button>
              <Button onClick={() => window.open(storefrontPath(), "_blank")}>
                <ExternalLink size={14} /> View store
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}

function ShipmentCell({ order, live, onChange }: { order: Order; live: boolean; onChange(order: Order): void }) {
  const { toast } = useAdmin();
  const [busy, setBusy] = useState("");
  const shipment = [...(order.fulfillments ?? [])].reverse().find((f) => f.provider === "delhivery" && f.status !== "cancelled");

  async function run(label: string, action: () => Promise<void>) {
    setBusy(label);
    try {
      await action();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Delhivery request failed", "error");
    } finally {
      setBusy("");
    }
  }

  const replaceShipment = (updated: NonNullable<Order["fulfillments"]>[number]) =>
    onChange({
      ...order,
      fulfillment_status: updated.status === "cancelled" ? "unfulfilled" : order.fulfillment_status,
      fulfillments: (order.fulfillments ?? []).map((f) => (f.id === updated.id ? updated : f)),
    });

  if (!shipment) {
    if (order.payment_status !== "paid") return <span className="text-xs text-admin-muted">Awaiting payment</span>;
    return (
      <Button
        disabled={!live}
        loading={busy === "ship"}
        onClick={() =>
          run("ship", async () => {
            onChange(await api.shipOrder(order.id));
            toast("Delhivery AWB created and pickup requested");
          })
        }
      >
        <Truck size={14} /> Ship via Delhivery
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-2">
        <a href={shipment.tracking_url ?? "#"} target="_blank" rel="noreferrer" className="font-mono text-xs font-semibold text-[#005bd3] hover:underline">
          {shipment.tracking_number}
        </a>
        <Badge tone={shipment.status === "delivered" ? "success" : "neutral"}>{shipment.status.replace(/_/g, " ")}</Badge>
      </span>
      <span className="flex flex-wrap gap-1">
        <Button
          disabled={!live}
          loading={busy === "label"}
          onClick={() =>
            run("label", async () => {
              const url = URL.createObjectURL(await api.shipmentLabel(shipment.id));
              const link = document.createElement("a");
              link.href = url;
              link.download = `delhivery-${shipment.tracking_number}.pdf`;
              link.click();
              setTimeout(() => URL.revokeObjectURL(url), 10_000);
            })
          }
        >
          <FileText size={14} /> Label
        </Button>
        <Button disabled={!live} loading={busy === "refresh"} onClick={() => run("refresh", async () => replaceShipment(await api.refreshShipment(shipment.id)))}>
          <RotateCcw size={14} /> Track
        </Button>
        {shipment.status === "manifested" && (
          <Button
            disabled={!live}
            loading={busy === "cancel"}
            onClick={() =>
              run("cancel", async () => {
                if (!window.confirm(`Cancel Delhivery AWB ${shipment.tracking_number}?`)) return;
                replaceShipment(await api.cancelShipment(shipment.id));
                toast("Shipment cancelled");
              })
            }
          >
            <XCircle size={14} /> Cancel
          </Button>
        )}
      </span>
    </div>
  );
}

function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  useEffect(() => {
    api.orders().then(setOrders, () => setOrders([]));
  }, []);
  const updateOrder = (updated: Order) => setOrders((list) => list?.map((o) => (o.id === updated.id ? updated : o)) ?? null);
  const tone = (s: string) => (s === "paid" || s === "fulfilled" ? "success" : s === "failed" ? "critical" : s === "pending" || s === "unfulfilled" ? "warning" : "neutral");
  return (
    <>
      <h1 className="mb-4 text-xl font-bold">Orders</h1>
      <Card padded={false}>
        {!orders ? (
          <p className="p-4 text-[13px] text-admin-muted">Loading…</p>
        ) : orders.length === 0 ? (
          <EmptyState icon={<PackageCheck size={36} />} title="No orders yet" text="When customers check out, their orders will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-[13px]">
              <thead className="bg-[#f7f7f7] text-xs text-admin-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Order</th>
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="px-3 py-2 font-medium">Payment</th>
                  <th className="px-3 py-2 font-medium">Fulfillment</th>
                  <th className="px-3 py-2 font-medium">Delhivery</th>
                  <th className="px-4 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-line">
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="px-4 py-2.5 font-semibold">{o.order_number}</td>
                    <td className="px-3 py-2.5">
                      {o.customer_name}
                      <span className="block text-xs text-admin-muted">{o.email}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={tone(o.payment_status)}>{o.payment_status}</Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={tone(o.fulfillment_status)}>{o.fulfillment_status}</Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <ShipmentCell order={o} live onChange={updateOrder} />
                    </td>
                    <td className="px-4 py-2.5 text-right">{money(o.grand_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

const providerCopy: Record<string, string> = {
  resend: "Transactional order emails and staff alerts.",
  payu: "UPI, cards, net banking and wallets via PayU hosted checkout, with webhook confirmation.",
  delhivery: "PIN code serviceability, shipment manifest, pickups, labels and tracking.",
};

function DelhiveryPickupSetting() {
  const { toast } = useAdmin();
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.delhiverySettings().then((config) => {
      setValue(config.pickup_location ?? "");
      setSaved(config.pickup_location ?? "");
    }, () => undefined);
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const config = await api.saveDelhiverySettings(value.trim());
      setSaved(config.pickup_location ?? "");
      toast("Pickup location saved");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not save pickup location", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="mb-3 flex flex-col gap-1.5">
      <label htmlFor="delhivery-pickup" className="text-xs font-medium">
        Pickup location
      </label>
      <div className="flex gap-2">
        <Input id="delhivery-pickup" value={value} onChange={(e) => setValue(e.target.value)} required maxLength={120} placeholder="Warehouse name in Delhivery One" />
        <Button type="submit" loading={busy} disabled={!value.trim() || value.trim() === saved}>
          Save
        </Button>
      </div>
      <p className="text-xs text-admin-muted">{saved ? "Orders ship from this warehouse." : "Required before you can ship orders. Must match the name in Delhivery One exactly."}</p>
    </form>
  );
}

function IntegrationsPage() {
  const { toast } = useAdmin();
  const [providers, setProviders] = useState<IntegrationProvider[]>([]);
  const [integrations, setIntegrations] = useState<StoreIntegration[]>([]);

  useEffect(() => {
    Promise.all([api.providers(), api.integrations()]).then(([p, i]) => {
      setProviders(p);
      setIntegrations(i);
    }, () => toast("Could not load integrations", "error"));
  }, [toast]);

  async function install(provider: IntegrationProvider) {
    const payload = { provider_key: provider.key, kind: provider.kind, config: {}, secret_ref: `aws/secrets/groovydudz/${provider.key}` };
    try {
      setIntegrations([await api.installIntegration(payload), ...integrations]);
      toast(`${provider.display_name} installed`);
    } catch {
      toast(`Could not install ${provider.display_name}`, "error");
    }
  }

  const iconFor = (kind: string) => (kind === "email" ? Mail : kind === "payment" ? CreditCard : Truck);

  return (
    <>
      <h1 className="mb-4 text-xl font-bold">Integrations</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {providers.map((provider) => {
          const Icon = iconFor(provider.kind);
          const installed = integrations.some((i) => i.provider_key === provider.key);
          return (
            <Card key={provider.key}>
              <div className="mb-3 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#f1f1f1]">
                  <Icon size={18} />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{provider.display_name}</p>
                  <p className="text-xs capitalize text-admin-muted">{provider.kind}</p>
                </div>
                <Badge tone={provider.configured ? "success" : "warning"}>{provider.configured ? "Configured" : "Needs keys"}</Badge>
              </div>
              <p className="mb-4 min-h-[40px] text-[13px] text-admin-muted">{providerCopy[provider.key] ?? ""}</p>
              {provider.key === "delhivery" && <DelhiveryPickupSetting />}
              <Button variant={installed ? "secondary" : "primary"} disabled={installed} onClick={() => install(provider)} className="w-full">
                {installed ? "Installed" : "Install"}
              </Button>
            </Card>
          );
        })}
      </div>
    </>
  );
}
