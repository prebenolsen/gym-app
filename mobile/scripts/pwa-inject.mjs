/*
 * Post-processes the Expo web export (dist/index.html) to make it a PWA.
 *
 * Expo's metro web export generates index.html but does not emit a web app
 * manifest link, PWA meta tags, or a service-worker registration. This app
 * does not use Expo Router, so there is no `+html` hook to customize the head.
 * Instead we inject the required tags here after `expo export` runs.
 *
 * The manifest, service worker and icons themselves live in mobile/public/ and
 * are copied verbatim to the export root by Expo, so this script only wires
 * them into the HTML. It is idempotent.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexPath = resolve(__dirname, '..', 'dist', 'index.html');
const MARKER = '<!--pwa-injected-->';

const THEME_COLOR = '#09090b';

const headTags = `${MARKER}
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="${THEME_COLOR}" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="GymApp" />
    <link rel="apple-touch-icon" href="/icons/icon-192.png" />`;

const swScript = `<script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('/sw.js').catch(function (err) {
            console.warn('Service worker registration failed:', err);
          });
        });
      }
    </script>`;

async function main() {
  let html;
  try {
    html = await readFile(indexPath, 'utf8');
  } catch {
    console.error(`[pwa-inject] Could not read ${indexPath}. Did "expo export" run first?`);
    process.exit(1);
  }

  if (html.includes(MARKER)) {
    console.log('[pwa-inject] Tags already present, skipping.');
    return;
  }

  if (!html.includes('</head>') || !html.includes('</body>')) {
    console.error('[pwa-inject] Unexpected index.html shape (missing </head> or </body>).');
    process.exit(1);
  }

  html = html
    .replace('</head>', `    ${headTags}\n  </head>`)
    .replace('</body>', `    ${swScript}\n  </body>`);

  await writeFile(indexPath, html, 'utf8');
  console.log('[pwa-inject] Injected manifest link, PWA meta tags and service-worker registration.');
}

main();
