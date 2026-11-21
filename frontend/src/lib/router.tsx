import { useEffect, useState, type AnchorHTMLAttributes, type MouseEvent } from "react";

// Minimal client-side router: path state + intercepted internal links.

const listeners = new Set<() => void>();

export function navigate(to: string) {
  if (to === window.location.pathname + window.location.search) return;
  window.history.pushState({}, "", to);
  window.scrollTo({ top: 0 });
  listeners.forEach((fn) => fn());
}

export function useLocation() {
  const [location, setLocation] = useState(() => ({ path: window.location.pathname, search: window.location.search }));
  useEffect(() => {
    const update = () => setLocation({ path: window.location.pathname, search: window.location.search });
    listeners.add(update);
    window.addEventListener("popstate", update);
    return () => {
      listeners.delete(update);
      window.removeEventListener("popstate", update);
    };
  }, []);
  return location;
}

export const isExternal = (href: string) => /^(https?:|mailto:|tel:|\/\/)/.test(href);

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export function Link({ href, onClick, ...rest }: LinkProps) {
  function handle(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented || isExternal(href) || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    navigate(href || "/");
  }
  return <a href={href || "/"} onClick={handle} target={isExternal(href) ? "_blank" : undefined} rel={isExternal(href) ? "noreferrer" : undefined} {...rest} />;
}
