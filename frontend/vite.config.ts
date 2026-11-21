import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    {
      name: "groovydudz-admin-entry",
      transformIndexHtml(html) {
        if (mode !== "admin") return html;
        return html
          .replace("GroovyDudz | Birthday & Party Decorations", "GroovyDudz Admin")
          .replace("Birthday, baby shower and theme party decoration kits delivered across India.", "GroovyDudz commerce admin.")
          .replace("/src/main.tsx", "/src/admin/main.tsx");
      },
    },
  ],
  server: {
    port: mode === "admin" ? 5174 : 5173,
  },
}));
