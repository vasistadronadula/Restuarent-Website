/**
 * Service worker for the Pala Pitta Ruchulu admin PWA.
 * Plain, hand-written (no next-pwa/workbox) — just a static file served
 * from /sw.js, no bundler integration required.
 * Scope: admin app shell caching + rich push notifications.
 */

// Bumped when the shell list or push handling changes — activating a new
// version wipes the previous cache.
const CACHE_VERSION = 'ppr-admin-v5';

// Each role's app starts on its own page, so all are pre-cached so a chef
// opening Kitchen offline doesn't land on the dashboard shell.
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

// Network-first for navigations (admins always get fresh data when online),
// falling back to the cached shell when offline. Static assets are cache-first.
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

/* ================================================================
   Push notification display
   ================================================================
   Payload shape (JSON):
   {
     title:    string          — bold headline
     body:     string          — detail line
     url:      string          — where clicking the notification navigates
     tag:      string          — groups notifications per stream
     type:     string?         — 'new_order' | 'reservation' | 'status_update' | 'delay'
     actions:  Action[]?       — up to 2 OS-level action buttons
     image:    string?         — hero image URL (Android/Chrome)
     badge:    string?         — monochrome icon URL
   }
   ================================================================ */

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Pala Pitta Ruchulu 🌶️', body: event.data.text(), url: '/admin' };
  }

  const type = payload.type || 'alert';

  // Vibration patterns: more urgent = more intense
  const VIBRATE = {
    new_order:     [200, 100, 200, 100, 400],   // long-short-long ramp
    reservation:   [150, 80, 150],               // double tap
    status_update: [100, 60, 100],               // short double
    delay:         [80, 60, 80, 60, 80],          // triple short
    alert:         [180, 80, 180],
  };

  // Action buttons shown in the notification tray (max 2 on most platforms)
  const DEFAULT_ACTIONS = {
    new_order: [
      { action: 'view_orders', title: '📋 View Orders' },
      { action: 'view_kitchen', title: '🔥 Kitchen' },
    ],
    reservation: [
      { action: 'view_reservations', title: '📅 Reservations' },
    ],
    status_update: [
      { action: 'view_orders', title: '📋 Orders' },
    ],
    delay: [
      { action: 'view_kitchen', title: '🔥 Kitchen' },
    ],
    alert: [
      { action: 'view_admin', title: '🏠 Dashboard' },
    ],
  };

  const vibrate = VIBRATE[type] || VIBRATE.alert;
  const actions = payload.actions || DEFAULT_ACTIONS[type] || DEFAULT_ACTIONS.alert;

  // Choose a silent flag: status updates mid-service are less urgent than new orders
  const silent = type === 'status_update' || type === 'delay';

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Pala Pitta Ruchulu 🌶️', {
      body:             payload.body || '',
      icon:             '/logo.png',
      badge:            '/logo.png',
      image:            payload.image || undefined,
      data:             { url: payload.url || '/admin', type },
      tag:              payload.tag || `ppr-${type}`,
      // renotify: true replaces an older same-tag notification AND still rings/vibrates
      renotify:         true,
      vibrate,
      // requireInteraction keeps the notification visible until the user dismisses it.
      // Only for high-priority types (new orders, reservations) — status updates
      // auto-dismiss after the system decides, which is less intrusive mid-service.
      requireInteraction: type === 'new_order' || type === 'reservation',
      silent,
      actions,
      // Timestamp is shown as "2 minutes ago" on Android
      timestamp:        Date.now(),
    })
  );
});

/* ================================================================
   Notification click routing
   ================================================================ */

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Map action IDs to specific URLs
  const ACTION_URLS = {
    view_orders:       '/admin/orders',
    view_kitchen:      '/admin/kitchen',
    view_reservations: '/admin/reservations',
    view_admin:        '/admin',
  };

  const actionUrl = ACTION_URLS[event.action];
  const targetUrl = actionUrl || event.notification.data?.url || '/admin';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If there's already a window on the right page, just focus it
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // If there's any open window, navigate it
      if (clientList.length > 0 && 'navigate' in clientList[0]) {
        clientList[0].navigate(targetUrl);
        return clientList[0].focus();
      }
      // Last resort: open a new tab
      return self.clients.openWindow(targetUrl);
    })
  );
});

/* ================================================================
   Notification close tracking (optional analytics hook)
   ================================================================ */

self.addEventListener('notificationclose', () => {
  // Extend here to log dismiss events if analytics is added later.
});
