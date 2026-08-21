/* Guli Shop — service worker
   Caches the app shell so it opens instantly (even offline) once installed.
   NOTE: This does NOT cache Firestore/cloud data — cloud sync still needs internet.

   Auto-update: jab GitHub pe naya index.html / sw.js aaye, ~3 seconds mein
   naya version activate + page reload ho jata hai. */
const CACHE_NAME = 'guli-shop-v2';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
    ))
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.url.includes('firestore.googleapis.com') ||
      req.url.includes('googleapis.com') ||
      req.url.includes('gstatic.com/firebasejs')) {
    return;
  }

  // HTML / navigation: network-first so updates appear quickly
  const isNav = req.mode === 'navigate' ||
    (req.method === 'GET' && req.headers.get('accept') && req.headers.get('accept').includes('text/html')) ||
    req.url.endsWith('/index.html') ||
    req.url.endsWith('/');

  if (isNav) {
    event.respondWith(
      fetch(req).then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(()=>{});
        }
        return res;
      }).catch(() => caches.match(req).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (req.method === 'GET' && res && res.status === 200 && res.type === 'basic') {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone)).catch(()=>{});
        }
        return res;
      }).catch(() => cached);
    })
  );
});
