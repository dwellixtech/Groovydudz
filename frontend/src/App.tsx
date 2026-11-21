import { isLocalPreviewPath } from "./lib/deployment";
import { useLocation } from "./lib/router";
import { PreviewApp, StorefrontApp } from "./storefront/StorefrontApp";

// Storefront only. The admin is a separate site built from src/admin/main.tsx (npm run build:admin).
export default function App() {
  const { path } = useLocation();
  if (isLocalPreviewPath(path)) return <PreviewApp />;
  return <StorefrontApp />;
}
