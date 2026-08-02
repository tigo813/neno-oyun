// Neno — service worker: caches the app shell so it works fully offline
// (everything — words, art, sounds — is already embedded inside index.html).
const CACHE_NAME = "neno-cache-v2";
const ASSETS = [
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for the HTML itself, so new content (new levels, fixes,
// features) shows up immediately instead of being stuck on an old cached
// copy. Falls back to cache only when there's no network (offline play).
// Icons/manifest rarely change, so those stay cache-first for speed.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const isHTML = event.request.mode === "navigate" || event.request.url.endsWith("index.html") || event.request.url.endsWith("/");

  if(isHTML){
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then((c) => c || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
