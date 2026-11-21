const normalizeBasePath = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") return "/";
  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, "");
};

// The admin is its own site, served from "/" unless VITE_ADMIN_BASE_PATH says otherwise.
export const adminBasePath = normalizeBasePath(import.meta.env.VITE_ADMIN_BASE_PATH ?? "/");
export const storefrontUrl = import.meta.env.VITE_STOREFRONT_URL || "/";
export const previewUrl = import.meta.env.VITE_PREVIEW_URL || "/preview";

export function adminPath(path = "") {
  const suffix = path.replace(/^\/+/, "");
  if (adminBasePath === "/") return suffix ? `/${suffix}` : "/";
  return suffix ? `${adminBasePath}/${suffix}` : adminBasePath;
}

export function adminRouteParts(pathname: string) {
  if (adminBasePath === "/") return pathname.split("/").filter(Boolean);
  if (pathname === adminBasePath || pathname === `${adminBasePath}/`) return [];
  if (!pathname.startsWith(`${adminBasePath}/`)) return [];
  return pathname.slice(adminBasePath.length + 1).split("/").filter(Boolean);
}

export function storefrontPath(path = "") {
  const suffix = path ? (path.startsWith("/") ? path : `/${path}`) : "";
  if (!suffix) return storefrontUrl;
  if (storefrontUrl === "/") return suffix;
  return `${storefrontUrl.replace(/\/+$/, "")}${suffix}`;
}

export function originForUrl(url: string) {
  try {
    return new URL(url, window.location.href).origin;
  } catch {
    return window.location.origin;
  }
}

export function isLocalPreviewPath(pathname: string) {
  try {
    const url = new URL(previewUrl, window.location.href);
    return url.origin === window.location.origin && pathname === url.pathname;
  } catch {
    return pathname === "/preview";
  }
}

export function previewParentOrigin() {
  const configured = import.meta.env.VITE_ADMIN_ORIGIN;
  if (configured) return originForUrl(configured);
  try {
    return document.referrer ? new URL(document.referrer).origin : window.location.origin;
  } catch {
    return window.location.origin;
  }
}
