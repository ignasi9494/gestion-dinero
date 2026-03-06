import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkFirst, Serwist, StaleWhileRevalidate } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope & typeof globalThis;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Supabase API calls - StaleWhileRevalidate
    {
      matcher: /^https:\/\/foalfiyrqhmsnzxpwcrs\.supabase\.co\/rest\/v1\/.*/i,
      handler: new StaleWhileRevalidate({
        cacheName: "supabase-api-cache",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 200,
            maxAgeSeconds: 60 * 60,
          }),
        ],
      }),
    },
    // Supabase Auth - NetworkFirst
    {
      matcher: /^https:\/\/foalfiyrqhmsnzxpwcrs\.supabase\.co\/auth\/.*/i,
      handler: new NetworkFirst({
        cacheName: "supabase-auth-cache",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 10,
            maxAgeSeconds: 60 * 5,
          }),
        ],
      }),
    },
    // Google Fonts stylesheets
    {
      matcher: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: new StaleWhileRevalidate({
        cacheName: "google-fonts-stylesheets",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 10,
            maxAgeSeconds: 60 * 60 * 24 * 365,
          }),
        ],
      }),
    },
    // Google Fonts webfont files
    {
      matcher: /^https:\/\/fonts\.gstatic\.com\/.*/i,
      handler: new CacheFirst({
        cacheName: "google-fonts-webfonts",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 30,
            maxAgeSeconds: 60 * 60 * 24 * 365,
          }),
        ],
      }),
    },
    // Static images
    {
      matcher: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
      handler: new CacheFirst({
        cacheName: "static-images",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 30,
          }),
        ],
      }),
    },
    // JS and CSS bundles
    {
      matcher: /\.(?:js|css)$/i,
      handler: new StaleWhileRevalidate({
        cacheName: "static-resources",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 7,
          }),
        ],
      }),
    },
    // Default cache for everything else
    ...defaultCache,
  ],
});

serwist.addEventListeners();

// ─── Push Notification Handlers ───────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(self as any).addEventListener('push', (event: any) => {
  if (!event.data) return;

  let data: { title?: string; body?: string; icon?: string; badge?: string; url?: string; tag?: string };
  try {
    data = event.data.json();
  } catch {
    data = { title: 'GestionDinero', body: event.data.text() };
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/icon-72x72.png',
    tag: data.tag || 'gestion-dinero',
    data: { url: data.url || '/dashboard' },
    vibrate: [100, 50, 100],
  } as NotificationOptions & { vibrate?: number[] };

  event.waitUntil(
    (self as any).registration.showNotification(data.title || 'GestionDinero', options)
  );
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(self as any).addEventListener('notificationclick', (event: any) => {
  event.notification.close();

  const url = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    (self as any).clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList: any[]) => {
      for (const client of clientList) {
        if (client.url.includes((self as any).location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return (self as any).clients.openWindow(url);
    })
  );
});
