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

/* Saving a copy of the app to open with no connection.

   Each file is asked for through fetchFresh, so what gets saved is what the
   server has now and not whatever the browser happened to be holding. One
   file failing does not stop the worker installing: a worker that refuses to
   install leaves the previous one in charge for good, which is the one thing
   that must not happen to an app that updates by being opened. */
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      var saves = FILES.map(function (file) {
        var request = new Request(file);
        return fetchFresh(request)
          .then(function (response) {
            if (response && response.ok) {
              return cache.put(request, response);
            }
          })
          .catch(function () {
            /* Keep whatever copy of this one is already saved. */
          });
      });
      return Promise.all(saves);
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

/* Asks the network itself, not the browser's own store of recent replies.

   Without this, "ask the network first" is not what happens: the browser is
   told by the server that these files may be reused for ten minutes, so a
   plain fetch can hand back a copy from minutes ago without any request
   leaving the phone. Each file expires on its own clock, so after an update
   the app can end up running a new script against an old page - which is
   worse than simply being out of date.

   This is done by asking for a slightly different address each time rather
   than with fetch's `cache` option. The option is the obvious way and it is
   what this used to do, but a rejected promise from it is indistinguishable
   here from having no signal, so the worker would answer from the saved copy
   and the app would never update again - with no error anywhere to show for
   it. An address no cache has seen before cannot be answered from a cache,
   needs no support from the browser, and cannot fail quietly. The reply is
   still saved under the real address, so nothing downstream changes. */
function fetchFresh(request) {
  var separator = request.url.indexOf("?") === -1 ? "?" : "&";
  var freshUrl = request.url + separator + "fresh=" + Date.now();

  return fetch(freshUrl).catch(function () {
    /* Should anything object to the altered address, try the plain one
       before falling back to the saved copy. */
    return fetch(request);
  });
}

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

    fetchFresh(request)
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
