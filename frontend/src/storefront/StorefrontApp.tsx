import { useEffect, useState } from "react";

import { CartProvider } from "../lib/cart";
import { previewParentOrigin } from "../lib/deployment";
import { cachedStorefront, loadStorefront, normalizeTheme, type StorefrontData } from "../lib/repo";
import { useLocation } from "../lib/router";
import { useThemeStyle } from "../lib/themeStyle";
import type { ThemeDocument } from "../types/theme";
import { StoreLayout } from "./Layout";
import { AccountPage, CheckoutPage, CollectionPage, HomePage, NotFound, ProductPage, SearchPage, StaticPage } from "./pages";
import { StoreContext } from "./StoreContext";

// Messages exchanged with the theme editor when rendered inside its preview iframe.
export type PreviewMessage =
  | { type: "gd:theme"; theme: ThemeDocument; selectedId: string | null; reload?: boolean }
  | { type: "gd:select"; id: string }
  | { type: "gd:ready" };

function Routes() {
  const { path, search } = useLocation();
  const parts = path.split("/").filter(Boolean);
  if (!parts.length) return <HomePage />;
  if (parts[0] === "collections") return <CollectionPage slug={parts[1] ?? "all"} />;
  if (parts[0] === "products" && parts[1]) return <ProductPage slug={parts[1]} />;
  if (parts[0] === "search") return <SearchPage query={new URLSearchParams(search).get("q") ?? ""} />;
  if (parts[0] === "checkout") return <CheckoutPage />;
  if (parts[0] === "pages" && parts[1]) return <StaticPage slug={parts[1]} />;
  if (parts[0] === "account") return <AccountPage />;
  return <NotFound />;
}

function Themed({ data, children }: { data: StorefrontData; children: React.ReactNode }) {
  useThemeStyle(data.theme.settings);
  return (
    <StoreContext.Provider value={data}>
      <CartProvider>
        <StoreLayout>{children}</StoreLayout>
      </CartProvider>
    </StoreContext.Provider>
  );
}

function Loading() {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand/20 border-t-brand" aria-label="Loading" />
    </div>
  );
}

function LoadError() {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-4 text-center font-body text-ink">
      <div>
        <h1 className="text-xl font-bold">Store temporarily unavailable</h1>
        <p className="mt-2 text-sm text-ink/70">Please refresh the page in a moment.</p>
      </div>
    </div>
  );
}

export function StorefrontApp() {
  const [data, setData] = useState<StorefrontData | null>(() => cachedStorefront());
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    loadStorefront(Boolean(data)).then(
      (fresh) => {
        if (!active) return;
        setData(fresh);
        setFailed(false);
      },
      () => {
        if (active && !data) setFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, []);
  if (failed) return <LoadError />;
  if (!data) return <Loading />;
  return (
    <Themed data={data}>
      <Routes />
    </Themed>
  );
}

// Rendered at /preview inside the editor's iframe; the draft theme arrives via postMessage.
export function PreviewApp() {
  const [data, setData] = useState<StorefrontData | null>(null);
  const [failed, setFailed] = useState(false);
  const [draft, setDraft] = useState<ThemeDocument | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    loadStorefront().then(setData, () => setFailed(true));
  }, []);

  useEffect(() => {
    const parentOrigin = previewParentOrigin();
    function onMessage(event: MessageEvent<PreviewMessage>) {
      if (event.origin !== parentOrigin || event.data?.type !== "gd:theme") return;
      setDraft(normalizeTheme(event.data.theme));
      setSelectedId(event.data.selectedId);
      if (event.data.reload) loadStorefront(true).then(setData, () => setFailed(true));
    }
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "gd:ready" } satisfies PreviewMessage, parentOrigin);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    document.querySelector(`[data-section-id="${CSS.escape(selectedId)}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedId]);

  if (failed) return <LoadError />;
  if (!data) return <Loading />;
  const select = (id: string) => window.parent.postMessage({ type: "gd:select", id } satisfies PreviewMessage, previewParentOrigin());
  return (
    <div data-gd-preview>
      <Themed data={{ ...data, theme: draft ?? data.theme }}>
        <HomePage selectedId={selectedId} onSelect={select} />
      </Themed>
    </div>
  );
}
