/* Roam v42 — optional offline cache.
   Only needed when Roam is served over http(s), e.g. GitHub Pages.
   Put this file in the same folder as the Roam HTML file. Nothing else to do.

   Strategy: serve from cache immediately, refresh in the background.
   Same-origin GETs only — your research endpoint is never cached. */
const CACHE = "roam-v42";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;   // leave the research endpoint alone

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);

    const network = fetch(req).then(res => {
      if (res && res.ok && res.type !== "opaque") cache.put(req, res.clone()).catch(() => {});
      return res;
    }).catch(() => null);

    if (cached) { event.waitUntil(network); return cached; }

    const fresh = await network;
    if (fresh) return fresh;

    return new Response(
      "<!DOCTYPE html><meta charset=utf-8><title>Roam is offline</title>" +
      "<body style='font:16px system-ui;padding:2rem;max-width:34rem'>" +
      "<h1>Offline</h1><p>This page has not been cached yet. Open Roam once with a connection " +
      "and it will work offline afterwards.</p>",
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  })());
});
