import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "logo.png",
        "android-launchericon-*.png",
      ],
      manifest: {
        name: "HRMS - Human Resource Management",
        short_name: "HRMS",
        description: "Human Resource Management System - Manage employees, leaves, attendance, and more",
        theme_color: "#0f172a",
        background_color: "#f8fafc",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        categories: ["business", "productivity"],
        icons: [
          {
            src: "/android-launchericon-48-48.png",
            sizes: "48x48",
            type: "image/png",
          },
          {
            src: "/android-launchericon-72-72.png",
            sizes: "72x72",
            type: "image/png",
          },
          {
            src: "/android-launchericon-96-96.png",
            sizes: "96x96",
            type: "image/png",
          },
          {
            src: "/android-launchericon-144-144.png",
            sizes: "144x144",
            type: "image/png",
          },
          {
            src: "/android-launchericon-192-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/android-launchericon-512-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/android-launchericon-512-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        shortcuts: [
          {
            name: "Dashboard",
            short_name: "Dashboard",
            description: "Go to Dashboard",
            url: "/",
            icons: [{ src: "/android-launchericon-96-96.png", sizes: "96x96" }],
          },
          {
            name: "My Leaves",
            short_name: "Leaves",
            description: "View my leaves",
            url: "/leaves",
            icons: [{ src: "/android-launchericon-96-96.png", sizes: "96x96" }],
          },
          {
            name: "Profile",
            short_name: "Profile",
            description: "View my profile",
            url: "/profile",
            icons: [{ src: "/android-launchericon-96-96.png", sizes: "96x96" }],
          },
        ],
      },
      workbox: {
        // Cache strategies
        runtimeCaching: [
          {
            // Cache API responses with network-first strategy
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache images with cache-first strategy
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            // Cache fonts with cache-first strategy
            urlPattern: /\.(?:woff|woff2|ttf|eot)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "font-cache",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          {
            // Cache CSS/JS with stale-while-revalidate
            urlPattern: /\.(?:js|css)$/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "static-resources",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
            },
          },
          {
            // Cache Google Fonts
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
        // Pre-cache important pages
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        // Skip waiting and claim clients immediately
        skipWaiting: true,
        clientsClaim: true,
        // Clean old caches
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false, // Set to true to test PWA in development
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
