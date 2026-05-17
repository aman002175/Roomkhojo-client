const CACHE_NAME = 'roomkhojo-cache-v1';

// App Install hote hi background me ready ho jana
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Dummy Fetch Listener (PWA pass karne ke liye zaroori hai)
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request).catch(() => new Response('Internet Connection Needed!')));
});
