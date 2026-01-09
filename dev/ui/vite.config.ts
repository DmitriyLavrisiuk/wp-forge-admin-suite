import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "../../ui/dist",
    manifest: true,
    rollupOptions: {
      input: {
        admin: "src/main.tsx",
        frontend: "src/frontend.ts",
      },
    },
  },
});
