const CACHE_NAME = 'vesselx-v2';
const STATIC_CACHE = 'vesselx-static-v2';
const OFFLINE_URL = '/offline.html';

const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== STATIC_CACHE).map(k => caches.delete(k))
      )
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  if (url.hostname === 'vesselx.onrender.com' || url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        if (request.headers.get('accept')?.includes('application/json')) {
          return new Response(JSON.stringify({ error: 'offline', message: 'No internet connection' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 503,
          });
        }
      })
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') return response;
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          return response;
        }).catch(async () => {
          if (request.mode === 'navigate') {
            const cached = await caches.match('/');
            return cached || caches.match(OFFLINE_URL);
          }
        });
      })
    );
    return;
  }

  if (url.hostname.includes('cloudinary') || url.hostname.includes('res.cloudinary')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (!response || response.status !== 200) return response;
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          return response;
        }).catch(() => new Response('', { status: 408 }));
      })
    );
    return;
  }
});

self.addEventListener('push', function (event) {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'VesselX', body: event.data.text() }; }

  const title = data.title || 'VesselX';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    tag: data.tag || 'vesselx-notif',
    renotify: true,
    data: data.data || {},
    vibrate: [200, 100, 200],
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const notifData = event.notification.data || {};
  const url = notifData.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'NAVIGATE', url });
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/#' + url);
      }
    })
  );
});
