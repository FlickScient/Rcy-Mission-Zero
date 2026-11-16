import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { host: "0.0.0.0" },
  // Vercel serves files in public/ from its CDN alongside the Express function.
  publicDir: false,
  build: {
    outDir: "public",
    emptyOutDir: true
  }
});
