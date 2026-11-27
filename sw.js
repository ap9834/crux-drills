// Crux Drills offline support (written by publish_site.py). Version: efdb9f1f6fd5
const SHELL = "crux-shell-efdb9f1f6fd5";            // this version's page and index
const DECK = "crux-deck";                           // puzzle chunks: never change, shared by versions
const ENGINE_CACHE = "crux-engine-19.0.1";      // Stockfish
const SHELL_FILES = ["index.html", "deck/index.json", "manifest.webmanifest", "favicon.ico", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"];
const CHUNKS = ["deck/c000-ef260f49bf.json", "deck/c001-b5bfd551e7.json", "deck/c002-4f94ba9b25.json", "deck/c003-ffb9dbbb26.json", "deck/c004-b832ebdbde.json", "deck/c005-c3bf6d4707.json", "deck/c006-dac88e15f3.json", "deck/c007-752ad0738e.json", "deck/c008-9b72424380.json", "deck/c009-73f405d8c7.json", "deck/c010-03640c32bf.json", "deck/c011-03487fcd6d.json", "deck/c012-7371df3106.json", "deck/c013-9725e9e0f3.json", "deck/c014-ff727b0a2e.json", "deck/c015-d4a51ada50.json", "deck/c016-44c4b20684.json", "deck/c017-663fd2323b.json", "deck/c018-daac2e2a82.json", "deck/c019-4d3ee9bfe6.json", "deck/c020-875ce70320.json", "deck/c021-7ea96e46f4.json", "deck/c022-1b01e87256.json", "deck/c023-1b40b574b0.json", "deck/c024-293d1d9c9c.json", "deck/c025-ce71ade9f7.json", "deck/c026-c735b7924b.json", "deck/c027-943d1ac01c.json", "deck/c028-2639a3d651.json", "deck/c029-43cb6a912e.json"];
const ENGINE_FILES = ["engine/stockfish-19-lite-single.js", "engine/stockfish-19-lite-single.wasm"];
const scope = () => new URL(self.registration.scope);
const abs = f => new URL(f, scope()).href;

async function fill(cacheName, files, fresh) {
  const cache = await caches.open(cacheName);
  for (const f of files) {
    const url = abs(f);
    if (!fresh && await cache.match(url)) continue;     // already on the device
    const res = await fetch(new Request(url, { cache: fresh ? "no-cache" : "default" }));
    if (!res.ok) throw new Error(url + " " + res.status);
    await cache.put(url, res);
  }
}
self.addEventListener("install", ev => {
  ev.waitUntil((async () => {
    await fill(SHELL, SHELL_FILES, true);
    await fill(DECK, CHUNKS, false);
    // Stockfish too, so analysis works offline; not fatal if it can't be fetched now.
    try { await fill(ENGINE_CACHE, ENGINE_FILES, false); } catch (e) { /* fetched on first use instead */ }
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", ev => {
  ev.waitUntil((async () => {
    for (const k of await caches.keys()) {
      if ((k.startsWith("crux-shell-") && k !== SHELL) || k.startsWith("crux-drills-")
          || (k.startsWith("crux-engine-") && k !== ENGINE_CACHE)) await caches.delete(k);
    }
    const deck = await caches.open(DECK), keep = new Set(CHUNKS.map(abs));
    for (const req of await deck.keys()) if (!keep.has(req.url)) await deck.delete(req);
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", ev => {
  const req = ev.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  const root = scope().pathname;
  if (!url.pathname.startsWith(root)) return;
  let rel = url.pathname.slice(root.length);
  const cacheName = rel.startsWith("engine/") ? ENGINE_CACHE : rel.startsWith("deck/c") ? DECK
                  : (rel === "" || req.mode === "navigate") ? SHELL : SHELL_FILES.includes(rel) ? SHELL : null;
  if (!cacheName) return;
  if (cacheName === SHELL && (rel === "" || req.mode === "navigate")) rel = "index.html";
  ev.respondWith((async () => {
    const cache = await caches.open(cacheName);
    const key = cacheName === SHELL ? abs(rel) : url.origin + url.pathname;
    const hit = await cache.match(key, { ignoreSearch: true });
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok && cacheName !== SHELL) cache.put(key, res.clone());
    return res;
  })());
});
