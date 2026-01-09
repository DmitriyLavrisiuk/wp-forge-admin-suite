import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    outDir: "../../ui/dist",
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: {
        admin: "src/main.tsx",
        frontend: "src/frontend.ts",
      },
    },
  },
});
