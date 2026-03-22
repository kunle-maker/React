const CACHE_VERSION = 'v3';
const CACHE_NAME = `vesselx-dynamic-${CACHE_VERSION}`;
const STATIC_CACHE = `vesselx-static-${CACHE_VERSION}`;
const IMAGE_CACHE = `vesselx-images-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const CURRENT_CACHES = [CACHE_NAME, STATIC_CACHE, IMAGE_CACHE];
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !CURRENT_CACHES.includes(k))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/') || url.hostname === 'vesselx.onrender.com') {
    event.respondWith(
      fetch(request).catch(() => {
        if (request.headers.get('accept')?.includes('application/json')) {
          return new Response(
            JSON.stringify({ error: 'offline', message: 'No internet connection' }),
            { headers: { 'Content-Type': 'application/json' }, status: 503 }
          );
        }
      })
    );
    return;
  }

  if (
    request.destination === 'image' ||
    url.hostname.includes('cloudinary') ||
    url.hostname.includes('res.cloudinary')
  ) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response && response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          }).catch(() => new Response('', { status: 408 }));
        })
      )
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request).then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          }
          return response;
        }).catch(async () => {
          if (request.mode === 'navigate') {
            const cachedRoot = await caches.match('/');
            return cachedRoot || caches.match(OFFLINE_URL);
          }
        });
        return cached || networkFetch;
      })
    );
    return;
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-posts') {
    event.waitUntil(syncPendingPosts());
  }
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncPendingMessages());
  }
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function syncPendingPosts() {
  try {
    const db = await openDB();
    const pending = await getAllFromStore(db, 'pending-posts');
    for (const post of pending) {
      try {
        const token = post.token;
        await fetch('/api/posts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(post.data),
        });
        await deleteFromStore(db, 'pending-posts', post.id);
      } catch {}
    }
  } catch {}
}

async function syncPendingMessages() {
  try {
    const db = await openDB();
    const pending = await getAllFromStore(db, 'pending-messages');
    for (const msg of pending) {
      try {
        await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${msg.token}`,
          },
          body: JSON.stringify(msg.data),
        });
        await deleteFromStore(db, 'pending-messages', msg.id);
      } catch {}
    }
  } catch {}
}

async function syncNotifications() {
  try {
    const token = await getStoredToken();
    if (!token) return;
    const res = await fetch('/api/notifications/unread-count', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    const count = data?.count ?? 0;
    if (count > 0) {
      const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of allClients) {
        client.postMessage({ type: 'NOTIFICATION_COUNT', count });
      }
    }
  } catch {}
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'refresh-feed') {
    event.waitUntil(refreshFeedCache());
  }
  if (event.tag === 'check-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function refreshFeedCache() {
  try {
    const token = await getStoredToken();
    if (!token) return;
    const res = await fetch('/api/posts/feed?limit=10', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (res.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put('/api/posts/feed?limit=10', res);
    }
  } catch {}
}

self.addEventListener('push', (event) => {
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
    silent: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  const url = notifData.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
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

self.addEventListener('notificationclose', (event) => {
  const notifData = event.notification.data || {};
  if (notifData.trackClose) {
    fetch('/api/notifications/track-close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag: event.notification.tag }),
    }).catch(() => {});
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CACHE_URLS') {
    const urls = event.data.urls || [];
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => cache.addAll(urls).catch(() => {}))
    );
  }
  if (event.data?.type === 'STORE_TOKEN') {
    storeToken(event.data.token).catch(() => {});
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === 'POST' && url.pathname === '/' && url.searchParams.has('share-target')) {
    event.respondWith((async () => {
      const formData = await event.request.formData();
      const title = formData.get('title') || '';
      const text = formData.get('text') || '';
      const shareUrl = formData.get('url') || '';
      const redirectUrl = `/#/create?title=${encodeURIComponent(title)}&text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
      return Response.redirect(redirectUrl, 303);
    })());
  }
});

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('vesselx-offline', 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('pending-posts')) {
        db.createObjectStore('pending-posts', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('pending-messages')) {
        db.createObjectStore('pending-messages', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('kv')) {
        db.createObjectStore('kv', { keyPath: 'key' });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllFromStore(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function deleteFromStore(db, storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function storeToken(token) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite');
    const store = tx.objectStore('kv');
    const req = store.put({ key: 'auth-token', value: token });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function getStoredToken() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('kv', 'readonly');
      const store = tx.objectStore('kv');
      const req = store.get('auth-token');
      req.onsuccess = () => resolve(req.result?.value || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}
