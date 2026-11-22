import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages için: VITE_BASE=/Lisan/ VITE_STATIC=1 npm run build
export default defineConfig({
  base: process.env.VITE_BASE || "/",
  plugins: [react()],
  // Ses işçileri (nöral ses, ffmpeg) modül olarak derlenir: içlerinde dinamik import var
  worker: { format: "es" },
  optimizeDeps: { exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"] },
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:8787" },
  },
});
