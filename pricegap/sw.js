// Price Gap service worker: keeps the whole app usable offline.
const VERSION="pg-2026.11.03";
const CORE=["./", "index.html", "app.js", "manifest.webmanifest", "data/items.json", "data/barcodes.json", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png", "img/100027907.jpg", "img/100029191.jpg", "img/100033673.jpg", "img/100045155.jpg", "img/100058112.jpg", "img/100058800.jpg", "img/100097593.jpg", "img/100098227.jpg", "img/1594.jpg", "img/398954.jpg", "img/400178.jpg", "img/400179.jpg", "img/411539.jpg", "img/444545.jpg", "img/447532.jpg", "img/448160.jpg", "img/462646.jpg", "img/539338.jpg", "img/616515.jpg", "img/625555.jpg", "img/628600.jpg", "img/652142.jpg", "img/652172.jpg", "img/652399.jpg", "img/88973.jpg", "img/bayport.jpg", "img/gorham-v.jpg", "img/stripe.jpg"];
const EXTRA=["https://unpkg.com/@zxing/browser@0.1.5/umd/zxing-browser.min.js","https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500&display=swap"];
self.addEventListener("install",e=>{e.waitUntil((async()=>{const c=await caches.open(VERSION);await c.addAll(CORE);for(const u of EXTRA){try{await c.add(new Request(u,{mode:"cors"}))}catch(err){}}self.skipWaiting()})())});
self.addEventListener("activate",e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==VERSION)await caches.delete(k);await self.clients.claim()})())});
const isFX=u=>/frankfurter|er-api\.com/.test(u);
self.addEventListener("fetch",e=>{
 const req=e.request;if(req.method!=="GET")return;
 const url=req.url;
 if(isFX(url))return; // exchange rates always go to the network; the app keeps the last good copy itself
 const isData=/\/data\/[^/]+\.json(\?|$)/.test(url);
 e.respondWith((async()=>{
  const c=await caches.open(VERSION);
  const hit=await c.match(req,{ignoreSearch:isData});
  const net=fetch(req).then(r=>{if(r&&(r.ok||r.type==="opaque"))c.put(req,r.clone());return r}).catch(()=>null);
  if(isData){return (await net)||hit||new Response("{}",{headers:{"content-type":"application/json"}})}  // product data: newest when online
  if(hit){e.waitUntil(net);return hit}                       // everything else: cached first, refreshed in background
  return (await net)||(req.mode==="navigate"?c.match("index.html"):Response.error());
 })());
});
