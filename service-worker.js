const CACHE_NAME = "color-optics-v5";
const STATIC_FILES = [
  "./",
  "./index.html",
  "./fiber-color-code.html",
  "./twisted-pair-color-code.html",
  "./ethernet-reference.html",
  "./coax-reference.html",
  "./terms.html",
  "./privacy.html",
  "./delete-account.html",
  "./style.css",
  "./script.js",
  "./shared/billing-policy.mjs",
  "./shared/native-auth.mjs",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-192.png",
  "./icon-maskable-512.png"
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
  const isAppShellAsset = isSameOrigin && (
    event.request.destination === "script" ||
    event.request.destination === "style" ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".mjs") ||
    url.pathname.endsWith(".css")
  );

  if (isNavigationRequest) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (isAppShellAsset) {
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
