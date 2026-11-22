import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages için: VITE_BASE=/Lisan/ VITE_STATIC=1 npm run build
export default defineConfig({
  base: process.env.VITE_BASE || "/",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:8787" },
  },
});
