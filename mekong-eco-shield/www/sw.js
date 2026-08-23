const CACHE_NAME = 'mekong-eco-shield-v84';
const ASSETS = [
  '/',
  '/index.html',
  '/engine-ui.js',
  '/mirofish-ui.js',
  '/leaflet.css',
  '/leaflet.js',
  '/manifest.json'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_NAME; }).map(function(n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  if (e.request.url.includes('/api/')) {
    e.respondWith(
      fetch(e.request).catch(function() {
        return new Response(JSON.stringify({ ok: false, error: 'Offline', source: 'sw_cache' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        return cached || fetch(e.request).then(function(resp) {
          var clone = resp.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
          return resp;
        });
      }).catch(function() {
        return caches.match('/index.html');
      })
    );
  }
});
