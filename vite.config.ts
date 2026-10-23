import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Installable on phones ("Add to Home Screen"); caches the app shell so it opens instantly.
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Life Tracker",
        short_name: "Tracker",
        description: "Track your life goals, habits and KPIs.",
        start_url: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#020617",
        background_color: "#020617",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: { navigateFallback: "/index.html" },
    }),
  ],
});
