/* ==========================================================================
   Price Check - sw.js (service worker)

   Its only job is to keep a copy of the app on the phone so it opens with
   no internet connection. It serves the saved copy first, then quietly
   refreshes that copy in the background, so a newer version shows up the
   next time the app is opened. Nothing here needs editing when the app
   changes.
   ========================================================================== */

var CACHE_NAME = "price-check";

var FILES = [
  "./",
  "index.html",
  "style.css",
  "script.js",
  "manifest.webmanifest"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(FILES);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      var fromNetwork = fetch(event.request)
        .then(function (response) {
          if (response && response.ok) {
            var copy = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(event.request, copy);
            });
          }
          return response;
        })
        .catch(function () {
          return cached;
        });

      return cached || fromNetwork;
    })
  );
});
