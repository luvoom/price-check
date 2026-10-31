/* ==========================================================================
   Price Check - sw.js (service worker)

   Its job is to keep a copy of the app on the phone so it opens with no
   internet connection, while still showing the newest version whenever
   there is a signal.

   How it decides: ask the network first, and fall back to the saved copy
   if the network fails or takes longer than NETWORK_TIMEOUT_MS. So with a
   signal the app is always up to date, and with no signal it still opens
   straight away. Nothing here needs editing when the app changes.
   ========================================================================== */

var CACHE_NAME = "price-check";

/* How long to wait for the network before falling back to the saved copy.
   The whole app is a few tens of kilobytes, so this only ever matters on a
   bad connection. */
var NETWORK_TIMEOUT_MS = 3000;

var FILES = [
  "./",
  "index.html",
  "style.css",
  "i18n.js",
  "script.js",
  "currency.js",
  "manifest.webmanifest",
  "apple-touch-icon.png",
  "icon-192.png",
  "icon-512.png"
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

  /* Only the app's own files are handled here. Anything on another site -
     the exchange-rate request, for instance - is left completely alone: it
     is never cached, never delayed, and its failure cannot affect whether
     the app opens. */
  if (new URL(event.request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(networkFirst(event.request));
});

function networkFirst(request) {
  return new Promise(function (resolve) {
    var answered = false;

    function answer(response) {
      if (!answered && response) {
        answered = true;
        resolve(response);
      }
    }

    /* If the network is slow, stop waiting and use the saved copy. The
       request carries on in the background and still refreshes the cache. */
    var timer = setTimeout(function () {
      caches.match(request).then(answer);
    }, NETWORK_TIMEOUT_MS);

    fetch(request)
      .then(function (response) {
        if (response && response.ok) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, copy);
          });
        }
        clearTimeout(timer);
        answer(response);
      })
      .catch(function () {
        /* No connection: fall back to whatever was saved. */
        clearTimeout(timer);
        caches.match(request).then(function (cached) {
          answer(cached || Response.error());
        });
      });
  });
}
