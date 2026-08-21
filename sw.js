/* Guli Shop SW — auto-update ~3s */
const CACHE_NAME = 'guli-shop-v4';
const APP_SHELL = ['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(APP_SHELL)).catch(()=>{}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ns => Promise.all(ns.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))));
  self.clients.claim();
});
self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.url.includes('firestore.googleapis.com') || req.url.includes('googleapis.com') || req.url.includes('gstatic.com/firebasejs')) return;
  const isNav = req.mode === 'navigate' || (req.method==='GET' && req.headers.get('accept') && req.headers.get('accept').includes('text/html')) || req.url.endsWith('/index.html') || req.url.endsWith('/');
  if (isNav) {
    event.respondWith(fetch(req).then(res => {
      if (res && res.status===200) { const c=res.clone(); caches.open(CACHE_NAME).then(cache=>cache.put(req,c)).catch(()=>{}); }
      return res;
    }).catch(() => caches.match(req).then(c => c || caches.match('./index.html'))));
    return;
  }
  event.respondWith(caches.match(req).then(cached => {
    if (cached) return cached;
    return fetch(req).then(res => {
      if (req.method==='GET' && res && res.status===200 && res.type==='basic') {
        const rc=res.clone(); caches.open(CACHE_NAME).then(cache=>cache.put(req,rc)).catch(()=>{});
      }
      return res;
    }).catch(() => cached);
  }));
});
