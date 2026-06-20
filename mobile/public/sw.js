/*
 * GymApp service worker.
 *
 * Intentionally minimal and safe:
 *  - Only handles same-origin GET requests (the built web assets).
 *  - Never touches Supabase or the backend API (those are cross-origin),
 *    so auth and data requests always go straight to the network.
 *  - Navigations are network-first (so new deploys show up), falling back
 *    to the cached app shell when offline.
 *  - Static assets are cache-first with background refresh.
 */
const CACHE_VERSION = 'gymapp-v1';
const APP_SHELL = '/index.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll([APP_SHELL, '/'])),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only ever handle same-origin GET. Everything else (Supabase, backend API,
  // POST/PUT/etc.) bypasses the service worker entirely.
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // App navigations: network-first, fall back to the cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(APP_SHELL, copy));
          return response;
        })
        .catch(() => caches.match(APP_SHELL)),
    );
    return;
  }

  // Static assets: cache-first with background revalidation.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
