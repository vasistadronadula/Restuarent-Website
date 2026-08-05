/**
 * Service worker for the Pala Pitta Ruchulu admin PWA.
 * Plain, hand-written (no next-pwa/workbox) since the project builds with
 * Turbopack — this is just a static file served from /sw.js, no bundler
 * integration required. Scope: admin app shell caching + push notifications.
 */

// Bumped when the shell list or push handling changes — activating a new
// version wipes the previous cache.
const CACHE_VERSION = 'ppr-admin-v4';
// Each role's app starts on its own page, so all of them are pre-cached:
// a chef opening Kitchen offline must not land on the dashboard's shell.
const APP_SHELL = [
  '/admin',
  '/admin/orders',
  '/admin/kitchen',
  '/admin/pos',
  '/admin/reservations',
  '/admin/customers',
  '/logo.png',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Network-first for navigations (so admins always get fresh data when
// online), falling back to the cached shell when offline. Everything else
// (static assets) is cache-first for speed.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then((cached) => cached || caches.match('/admin'))
      )
    );
    return;
  }

  const url = new URL(request.url);
  const isStaticAsset = /\.(png|jpg|jpeg|svg|webp|avif|ico|woff2?)$/.test(url.pathname);
  if (!isStaticAsset) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
        return response;
      });
    })
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Pala Pitta Ruchulu', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Pala Pitta Ruchulu', {
      body: payload.body || '',
      icon: '/logo.png',
      badge: '/logo.png',
      data: { url: payload.url || '/admin' },
      // Distinct tags per stream: a table booking must not silently replace
      // an unread order alert on the same phone.
      tag: payload.tag || 'ppr-alert',
      renotify: true,
      // A phone in an apron pocket in a loud kitchen needs more than a chime.
      vibrate: [180, 80, 180],
      requireInteraction: true,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/admin';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) return client.focus();
      }
      if (clientList.length > 0 && 'focus' in clientList[0]) {
        clientList[0].navigate(targetUrl);
        return clientList[0].focus();
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
