const CACHE = 'mekong-eco-v78';
const API_CACHE = 'mekong-api-v78';
const ASSETS = ['/', '/index.html', '/manifest.json', '/leaflet.css', '/leaflet.js', '/icon-192.svg', '/icon-512.svg', '/qr-vnpay.jpg', '/qr-vietqr.jpg', '/qr-vietqr-napas.jpg'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== API_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith('/api/')) {
    if (e.request.method === 'GET') {
      e.respondWith(
        fetch(e.request)
          .then(res => {
            const clone = res.clone();
            caches.open(API_CACHE).then(c => c.put(e.request, clone));
            return res;
          })
          .catch(() =>
            caches.match(e.request).then(cached => {
              if (cached) return cached;
              if (url.pathname.indexOf('/alerts/history') >= 0) {
                return caches.match('/api/offline-alerts').then(snap => {
                  if (snap) return snap;
                  return new Response(JSON.stringify({ error: 'offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
                });
              }
              return new Response(JSON.stringify({ error: 'offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
            })
          )
      );
      return;
    }
    e.respondWith(fetch(e.request).catch(() => new Response(JSON.stringify({ error: 'offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } })));
    return;
  }
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request).then(cached => cached || caches.match('/')))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res.ok && url.origin === self.location.origin) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match('/')))
  );
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
  if (e.data && e.data.type === 'CACHE_ALERT') {
    // store a manual alert copy for offline replay
    const key = '/api/offline-alerts';
    caches.open(API_CACHE).then(c => c.put(key, new Response(JSON.stringify(e.data.alerts), { headers: { 'Content-Type': 'application/json' } })));
  }
});
