const CACHE_NAME = 'teeversh-v4'; // Bumped to force update
const OFFLINE_URL = '/offline.html';

// Static assets - cache first
const STATIC_ASSETS = [
  '/',
  '/dashboard.html',
  '/login.html',
  '/offline.html',
  '/images/TEEVERSH-72.png',
  '/images/TEEVERSH-96.png',
  '/images/TEEVERSH-128.png',
  '/images/TEEVERSH-144.png',
  '/images/TEEVERSH-152.png',
  '/images/TEEVERSH-192.png',
  '/images/TEEVERSH-384.png',
  '/images/TEEVERSH-512.png',
  '/css/style.css',
  '/js/app.js'
];

// Install - cache static assets immediately
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[TEEVERSH SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.log('[TEEVERSH SW] Cache failed for some assets:', err);
      });
    })
  );
});

// Activate - delete old caches and take control
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => {
        console.log('[TEEVERSH SW] Deleting old cache:', k);
        return caches.delete(k);
      })
    )).then(() => {
      console.log('[TEEVERSH SW] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch - Network first for API/HTML, Cache first for assets
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip: POST, external origins, Paystack webhooks
  if (request.method !== 'GET' || 
      url.origin !== location.origin ||
      url.pathname.startsWith('/api/paystack/webhook') ||
      url.hostname.includes('paystack')) {
    return;
  }

  // API calls - Network first, cache response for offline fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const resClone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, resClone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // HTML pages - Network first, fallback to offline page
  if (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, resClone));
          return response;
        })
        .catch(() => caches.match(request).then(res => res || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // Static assets - Cache first, then network
  event.respondWith(
    caches.match(request).then(response => {
      return response || fetch(request).then(fetchRes => {
        if (fetchRes.ok) {
          const resClone = fetchRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, resClone));
        }
        return fetchRes;
      });
    }).catch(() => {
      if (request.destination === 'image') {
        return caches.match('/images/TEEVERSH-192.png');
      }
    })
  );
});

// Push notifications
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'TEEVERSH';
  const options = {
    body: data.body || 'You have a new update',
    icon: '/images/TEEVERSH-192.png',
    badge: '/images/TEEVERSH-192.png',
    vibrate: [200, 100, 200],
    tag: 'teeversh-notification',
    renotify: true,
    data: data.url || '/dashboard.html',
    actions: [
      { action: 'open', title: 'View' },
      { action: 'close', title: 'Close' }
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'close') return;
  
  const urlToOpen = event.notification.data || '/dashboard.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (let client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});