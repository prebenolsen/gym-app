# Deploying GymApp as a Web PWA on Cloudflare Pages

This document covers **everything you need to do manually** to ship the existing
Expo app as an installable web PWA on Cloudflare Pages. The mobile app
(Expo Go / native) is untouched — all web changes are additive.

---

## 0. What changed in the repo (already done for you)

| File | Change |
|------|--------|
| `mobile/app.json` | Added a `web` block: `bundler: metro`, `output: single` (SPA), favicon. |
| `mobile/package.json` | Added web deps (`react-dom`, `react-native-web`, `@expo/metro-runtime`) and scripts: `web`, `build:web`, `serve:web`. |
| `package.json` (root) | Added `build:web` that builds the `shared` workspace, then exports the web app. |
| `mobile/public/manifest.json` | PWA manifest (name, icons, theme color, standalone display). |
| `mobile/public/sw.js` | Minimal, safe service worker (same-origin GETs only; never touches Supabase/API). |
| `mobile/public/_redirects` | SPA fallback so deep links / refreshes don't 404. |
| `mobile/public/icons/*` | PWA icons (192 / 512 / maskable). |
| `mobile/scripts/pwa-inject.mjs` | Injects manifest link, PWA meta tags, and SW registration into the exported `index.html`. |
| `.env.example` | Documented that `EXPO_PUBLIC_*` are shared by web, and the API URL must be public in production. |

Everything Expo puts in `mobile/public/` is copied verbatim to the build output
root (`mobile/dist/`), so `manifest.json`, `sw.js`, `_redirects` and `icons/`
all end up at the site root.

> **Nothing in your Supabase setup, database logic, or auth flow was changed.**
> The app still reads `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`
> and keeps using the **anon key** pattern.

---

## 1. ⚠️ Read this first: the backend API

The app has **two** backends:

1. **Supabase** — used directly from the browser for auth. Works on web as-is.
2. **Your own Node backend** (`backend/`) — the app talks to it via
   `EXPO_PUBLIC_API_BASE_URL` (defaults to `http://localhost:3000`).

On a phone over USB this is `localhost` via `adb reverse`. **In a browser
`localhost` will not work** — the deployed web app must point at a *publicly
reachable* backend URL. So before/when you deploy:

- Deploy your `backend/` somewhere public (Render, Fly.io, Railway, a VPS, a
  Cloudflare Worker/Tunnel, etc.) over **HTTPS**.
- Set `EXPO_PUBLIC_API_BASE_URL` to that URL in Cloudflare (see step 3).
- **Enable CORS on the backend** for your Pages origin
  (e.g. `https://gym-app.pages.dev` and any custom domain). Browsers enforce
  CORS; phones don't, so this is a web-only requirement. If you see requests
  failing with CORS errors in the browser console, this is why.

If the backend is not yet public, the site will still build and load, login via
Supabase may work, but any screen that calls your API will error.

---

## 2. Cloudflare Pages — create the project

In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**,
pick this repo, then set:

### Build settings

| Setting | Value |
|--------|-------|
| **Framework preset** | `None` |
| **Root directory** | `/` (repository root — leave default) |
| **Build command** | `npm run build:web` |
| **Build output directory** | `mobile/dist` |

> The build runs from the repo root so npm installs the workspaces, builds the
> `shared` package, then runs `expo export`. Output lands in `mobile/dist`.

### Environment variables

Add these under **Settings → Environment variables** for **both** Production and
Preview environments:

| Variable | Value | Notes |
|----------|-------|-------|
| `EXPO_PUBLIC_SUPABASE_URL` | `https://<your-project>.supabase.co` | Same as your `.env`. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | your Supabase **anon** key | Public by design; **never** the service key. |
| `EXPO_PUBLIC_API_BASE_URL` | `https://api.yourdomain.com` | Your public backend (see step 1). |
| `NODE_VERSION` | `20` | Expo SDK 54 requires Node 20+. |

> `EXPO_PUBLIC_*` values are compiled into the client bundle and are publicly
> visible — that is expected and fine for the Supabase **anon** key and the API
> URL. Do **not** put `SUPABASE_SERVICE_KEY` or any backend secret here.

Click **Save and Deploy**.

---

## 3. Supabase configuration (web)

Supabase auth needs to recognize the new web origin:

1. **Supabase Dashboard → Authentication → URL Configuration**
   - Add your Pages URL(s) to **Site URL** / **Redirect URLs**:
     `https://gym-app.pages.dev` and any custom domain.
2. If you use **email/password** auth only, nothing else is needed — it already
   works in the browser.
3. **Only if** you use OAuth or magic-link (email link) sign-in: those redirect
   back to your site, so in addition to the redirect URLs above you'll want the
   web client to read the auth token from the URL. The current code uses
   `detectSessionInUrl: false` (correct for mobile). If — and only if — you add
   redirect-based login on web, change `mobile/src/lib/supabase.ts` to:
   ```ts
   import { Platform } from 'react-native';
   // ...
   detectSessionInUrl: Platform.OS === 'web',
   ```
   This is platform-guarded, so mobile stays exactly as it is. Left as-is for
   now because it isn't required for email/password.

---

## 4. Local verification (do this before pushing)

From the **repo root**:

```bash
# 1. Install everything (first time only / after dependency changes)
npm install

# 2. Provide env vars for the build. Create mobile/.env:
#      EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
#      EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
#      EXPO_PUBLIC_API_BASE_URL=https://api.yourdomain.com
#    (expo reads mobile/.env automatically during the build)

# 3. Production build exactly like Cloudflare will run it
npm run build:web

# 4. Serve the built output as an SPA and open http://localhost:3000
npm run serve:web --workspace=mobile
#    (uses `npx serve mobile/dist --single`, which mimics the _redirects fallback)
```

You can also run a live dev server for the web target:

```bash
npm run web --workspace=mobile     # expo start --web
```

### What to check in the browser

- App loads and you can log in (Supabase).
- DevTools → **Application → Manifest**: name/icons/theme present, no errors.
- DevTools → **Application → Service Workers**: `sw.js` is *activated*.
- An **install** icon appears in the address bar (Chrome/Edge) → installs as a
  standalone app.
- Refresh on any in-app screen does not 404 (SPA fallback works).
- Optional: run **Lighthouse → PWA** for a full audit.

---

## 5. After deployment

- Visit the `*.pages.dev` URL, confirm login and that API-backed screens work
  (if not, re-check step 1 — backend public URL + CORS).
- Install the PWA on a phone: open the site in mobile Chrome/Safari →
  "Add to Home Screen".
- **Custom domain** (optional): Pages project → **Custom domains** → add your
  domain; Cloudflare handles HTTPS. Remember to add it to Supabase redirect URLs
  (step 3) and your backend CORS allowlist.

---

## 6. Optional polish

- **Icons:** `mobile/public/icons/*` are currently copies of your 1024×1024
  `assets/icon.png`. Browsers downscale them, so installation works, but for a
  perfect Lighthouse score replace them with exact-size PNGs
  (192×192, 512×512, and a 512×512 *maskable* icon with safe-zone padding).
  No code change needed — just overwrite the files.
- **App name / colors:** edit `mobile/public/manifest.json` (`name`,
  `short_name`, `theme_color`, `background_color`) and the `THEME_COLOR` in
  `mobile/scripts/pwa-inject.mjs` if you change the theme.
- **Service worker updates:** bump `CACHE_VERSION` in `mobile/public/sw.js` when
  you want clients to drop old cached assets immediately.

---

## Quick reference — Cloudflare Pages settings

```
Framework preset:        None
Root directory:          /
Build command:           npm run build:web
Build output directory:  mobile/dist

Environment variables (Production + Preview):
  EXPO_PUBLIC_SUPABASE_URL       = https://<project>.supabase.co
  EXPO_PUBLIC_SUPABASE_ANON_KEY  = <anon key>
  EXPO_PUBLIC_API_BASE_URL       = https://<your public backend>
  NODE_VERSION                   = 20
```
