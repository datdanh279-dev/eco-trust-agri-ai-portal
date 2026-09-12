const CACHE_NAME = 'mekong-eco-shield-v114.2';
const ASSETS = [
  '/',
  '/index.html',
  '/engine-ui.js',
  '/satellite-pipeline.js',
  '/mirofish-ui.js',
  '/leaflet.css',
  '/leaflet.js',
  '/manifest.json',
  '/v114.js'
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

// === v108: PUSH-LIKE NOTIFICATIONS via SW message ===
self.addEventListener('message', function(e) {
  var d = e.data || {};
  if (d.type === 'MES_NOTIFY') {
    var title = d.title || 'Mekong Eco-Shield';
    var body = d.body || '';
    var opt = {
      body: body,
      icon: d.icon || '/icon-192.png',
      badge: d.icon || '/icon-192.png',
      tag: d.tag || 'mes-alert',
      renotify: true,
      requireInteraction: (d.urgent === true),
      data: { url: d.url || '/' }
    };
    self.registration.showNotification(title, opt);
  }
});

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      for (var i = 0; i < list.length; i++) {
        if ('focus' in list[i]) { list[i].focus(); list[i].navigate(url); return; }
      }
      return clients.openWindow(url);
    })
  );
});

self.addEventListener('notificationclose', function(e) {
  e.notification.close();
});

function isCacheableRequest(req) {
  if (!req || req.method !== 'GET') return false;
  try {
    var p = new URL(req.url).protocol;
    return p === 'http:' || p === 'https:';
  } catch (er) { return false; }
}

self.addEventListener('fetch', function(e) {
  // Ignor mọi request không phải GET / không phải http(s):
  // tránh cache.put lên scheme chrome-extension://, chrome-untrusted://, etc.
  if (!isCacheableRequest(e.request)) return;

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
          if (!resp || !resp.ok) return resp;
          try {
            var clone = resp.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(e.request, clone).catch(function() {});
            });
          } catch (er) {}
          return resp;
        });
      }).catch(function() {
        return caches.match('/index.html');
      })
    );
  }
});
