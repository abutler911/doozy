import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Doozy",
        short_name: "Doozy",
        description: "Prioritize your day, keep your daily rituals, never miss a thing.",
        theme_color: "#0e0b1e",
        background_color: "#0e0b1e",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Cache the app shell for offline launch. API calls are
        // network-first so data stays fresh when online.
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api"),
            handler: "NetworkFirst",
            options: {
              cacheName: "doozy-api",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
      devOptions: {
        // Lets you test the PWA in `npm run dev`.
        enabled: true,
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
});
