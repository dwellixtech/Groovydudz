import React from "react";
import ReactDOM from "react-dom/client";

import { isLocalPreviewPath } from "../lib/deployment";
import { useLocation } from "../lib/router";
import { PreviewApp } from "../storefront/StorefrontApp";
import { AdminApp } from "./AdminApp";
import "../styles.css";

function AdminEntrypoint() {
  const { path } = useLocation();
  if (isLocalPreviewPath(path)) return <PreviewApp />;
  return <AdminApp />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AdminEntrypoint />
  </React.StrictMode>,
);
