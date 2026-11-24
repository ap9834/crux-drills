// Crux Drills offline support (written by publish_site.py). Version: 79a27908e256
const CACHE = "crux-drills-79a27908e256";
const FILES = ["./", "index.html", "deck.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];
self.addEventListener("install", ev => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", ev => {
  ev.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("crux-drills-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", ev => {
  const req = ev.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  const scope = new URL(self.registration.scope);
  const rel = url.pathname.startsWith(scope.pathname) ? url.pathname.slice(scope.pathname.length) : null;
  if (rel === null || !(rel === "" || FILES.includes(rel))) return;
  ev.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await Promise.race([
        fetch(req, { cache: "no-cache" }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("slow")), 4000))]);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch (e) {
      const hit = await cache.match(req, { ignoreSearch: true }) || (rel === "" ? await cache.match("index.html") : null);
      if (hit) return hit;
      throw e;
    }
  })());
});
