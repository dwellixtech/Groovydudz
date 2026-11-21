import { useEffect } from "react";

import { headingFonts, type ThemeSettings } from "../types/theme";

const channels = (hex: string, fallback: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

// Applies theme colors and the heading font to the document.
export function useThemeStyle(settings: ThemeSettings) {
  const { colors, heading_font } = settings;
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--gd-brand", channels(colors.brand, "181 51 107"));
    root.setProperty("--gd-accent", channels(colors.accent, "224 121 63"));
    root.setProperty("--gd-background", channels(colors.background, "251 248 244"));
    root.setProperty("--gd-text", channels(colors.text, "42 31 36"));
    const font = headingFonts[heading_font] ?? headingFonts.fraunces;
    root.setProperty("--gd-heading-font", font.family);
    const id = "gd-heading-font";
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`;
  }, [colors.brand, colors.accent, colors.background, colors.text, heading_font]);
}
