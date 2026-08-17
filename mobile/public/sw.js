/*
 * Service worker for the Weak PWA.
 *
 * Scope of what this caches: the app shell and the immutable, content-hashed
 * bundles and assets Expo emits. It deliberately never caches API traffic --
 * workouts, sets and weight entries live on a different origin (the Express
 * backend / Supabase), and cross-origin requests fall straight through to the
 * network, so the app can never show stale training data.
 *
 * Every path here is derived from BASE rather than hard-coded to '/', because
 * GitHub Pages serves project sites from a repo subpath
 * (https://<user>.github.io/<repo>/). BASE resolves to the directory this script
 * was served from, so one file works at a domain root and under a subpath with no
 * build-time substitution.
 *
 * Bump CACHE_VERSION when the precached shell list below changes.
 */
const CACHE_VERSION = 'v1';
const CACHE = `weak-${CACHE_VERSION}`;

// e.g. https://host/  or  https://host/gym-app/
const BASE = new URL('./', self.location.href);
const at = (path) => new URL(path, BASE).href;

const SHELL = [
  './',
  'offline.html',
  'manifest.json',
  'icons/logo.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
].map(at);

const SHELL_ROOT = at('./');
const OFFLINE = at('offline.html');

// Immutable output: Expo emits content-hashed filenames under these prefixes.
const STATIC_PREFIXES = ['_expo/', 'assets/', 'icons/'].map((prefix) => new URL(prefix, BASE).pathname);

// Metro dev-server endpoints. The worker is not registered in development, but
// stay defensive in case an old worker is still alive on a dev origin.
const DEV_PATTERNS = ['dev=true', 'hot=true', '/_expo/ws', '/symbolicate', '/hot', '/message', '/inspector'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // Individual failures must not fail the whole install.
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(new Request(url, { cache: 'reload' })))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

const isCacheable = (response) =>
  response && response.status === 200 && (response.type === 'basic' || response.type === 'default');

// Content-hashed asset: serve from cache, fall back to network and store it.
const cacheFirst = async (request) => {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (isCacheable(response)) {
    const cache = await caches.open(CACHE);
    cache.put(request, response.clone());
  }
  return response;
};

// App shell: always try the network so a deploy is picked up on the next launch,
// and fall back to the cached shell (then the offline page) when there is no network.
const navigationHandler = async (request) => {
  try {
    const response = await fetch(request);
    if (isCacheable(response)) {
      const cache = await caches.open(CACHE);
      cache.put(SHELL_ROOT, response.clone());
    }
    return response;
  } catch (error) {
    return (await caches.match(SHELL_ROOT)) || (await caches.match(OFFLINE)) || Response.error();
  }
};

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Anything not served by this origin (backend API, Supabase) is never touched.
  if (url.origin !== self.location.origin) return;

  if (DEV_PATTERNS.some((pattern) => request.url.includes(pattern))) return;

  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request));
    return;
  }

  if (STATIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    event.respondWith(cacheFirst(request));
  }
});
