/**
 * Kenning service worker.
 *
 * Hand-written plain JS on purpose: it must sit at the site root to claim
 * the whole scope, and `tsc` emits into `dist/`, which would scope it to
 * `/dist/`. It is not application source — `src/pwa.ts` is the only part of
 * the app that talks to it.
 *
 * Strategies, and why:
 *
 *   navigation      network-first, falling back to the cached shell. A deploy
 *                   is picked up on the next online load; offline still opens.
 *   same-origin GET  stale-while-revalidate. There is no bundler and no content
 *                   hashing in file names, so a cache-first policy would pin
 *                   users to old code until the cache name changed by hand.
 *                   Revalidating in the background means a deploy lands on the
 *                   load after next at the latest, with no version bump needed.
 *   fonts           stale-while-revalidate against an unversioned cache of its
 *                   own, so bumping VERSION does not re-download the webfonts.
 *                   That matters: the stylesheet is render-blocking, so a cold
 *                   font cache on a slow network delays first paint.
 *
 * Because file names carry no hashes, one load can in principle mix files from
 * two deploys. The next load reconciles. Bump VERSION to force a clean purge.
 */
const VERSION = "v1";
const SHELL = `kenning-shell-${VERSION}`;
const RUNTIME = `kenning-runtime-${VERSION}`;
/** Deliberately unversioned: a version bump must not re-download the webfonts. */
const FONTS = "kenning-fonts";
const KEEP = [SHELL, RUNTIME, FONTS];

/** Stable paths only. Everything else arrives through the runtime cache. */
const SHELL_URLS = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.webmanifest",
  "./dist/main.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon.svg",
];

const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    // Individually, so one 404 cannot fail the whole install.
    await Promise.all(SHELL_URLS.map((u) =>
      cache.add(new Request(u, { cache: "reload" })).catch(() => {})));
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map((n) =>
      n.startsWith("kenning-") && !KEEP.includes(n) ? caches.delete(n) : null));
    if (self.registration.navigationPreload) {
      await self.registration.navigationPreload.enable().catch(() => {});
    }
    await self.clients.claim();
  })());
});

/** The page asks for this when the user accepts an update. */
self.addEventListener("message", (e) => {
  if (e.data === "skip-waiting") self.skipWaiting();
});

/** Put in cache, ignoring quota failures and partial responses. */
async function put(cacheName, req, res) {
  if (!res || !res.ok || res.status === 206) return res;
  const cache = await caches.open(cacheName);
  cache.put(req, res.clone()).catch(() => {});
  return res;
}

/** Serve from cache immediately, refresh in the background. */
async function staleWhileRevalidate(cacheName, req) {
  const cached = await caches.match(req);
  const fetching = fetch(req)
    .then((res) => put(cacheName, req, res))
    .catch(() => null);
  if (cached) return cached;
  const fresh = await fetching;
  if (fresh) return fresh;
  return new Response("", { status: 504, statusText: "Offline" });
}

async function handleNavigation(e) {
  try {
    const preload = e.preloadResponse ? await e.preloadResponse : null;
    const res = preload || await fetch(e.request);
    await put(SHELL, "./index.html", res);
    return res;
  } catch {
    return (await caches.match("./index.html"))
      || (await caches.match("./"))
      || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
  }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  if (req.mode === "navigate") { e.respondWith(handleNavigation(e)); return; }
  if (FONT_HOSTS.includes(url.hostname)) { e.respondWith(staleWhileRevalidate(FONTS, req)); return; }
  if (url.origin === self.location.origin) { e.respondWith(staleWhileRevalidate(RUNTIME, req)); return; }
  // Anything else cross-origin goes straight to the network.
});
