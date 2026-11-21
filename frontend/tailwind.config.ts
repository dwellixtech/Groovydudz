import type { Config } from "tailwindcss";

// Storefront colors come from the published theme via CSS variables (see lib/themeStyle.ts).
const themed = (name: string) => `rgb(var(--gd-${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: themed("brand"),
        accent: themed("accent"),
        canvas: themed("background"),
        ink: themed("text"),
        admin: {
          bg: "#f1f2f4",
          line: "#e3e5e8",
          text: "#1a1c1e",
          muted: "#616a75",
          accent: "#b5336b",
        },
      },
      fontFamily: {
        display: ["var(--gd-heading-font)"],
        body: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 30px -12px rgb(42 31 36 / 0.25)",
        card: "0 1px 0 rgb(0 0 0 / 0.05), 0 1px 3px rgb(0 0 0 / 0.08)",
      },
      keyframes: {
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-in": { from: { transform: "translateX(100%)" }, to: { transform: "translateX(0)" } },
        "slide-in-left": { from: { transform: "translateX(-100%)" }, to: { transform: "translateX(0)" } },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
        "slide-in": "slide-in 260ms cubic-bezier(0.22, 1, 0.36, 1)",
        "slide-in-left": "slide-in-left 260ms cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
} satisfies Config;
