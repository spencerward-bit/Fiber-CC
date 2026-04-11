const CACHE_NAME = "fiber-map-v3";
const STATIC_FILES = [
  "./",
  "./index.html",
  "./terms.html",
  "./privacy.html",
  "./style.css",
  "./script.js",
  "./manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_FILES))
  );

  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isNavigationRequest =
    event.request.mode === "navigate" ||
    event.request.destination === "document";

  if (isNavigationRequest) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (isSameOrigin) {
    event.respondWith(staleWhileRevalidate(event.request));
  }
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request, { cache: "no-store" });
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    return cachedResponse || cache.match("./index.html");
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const networkResponsePromise = fetch(request).then(response => {
    cache.put(request, response.clone());
    return response;
  });

  return cachedResponse || networkResponsePromise;
}
