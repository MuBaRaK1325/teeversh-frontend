const CACHE_NAME = 'teeversh-v2'; // bump version when you change SW
const urlsToCache = [
  '/',
  '/dashboard.html',
  '/images/TEEVERSH-192.png',
  '/images/TEEVERSH-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
});

self.addEventListener('fetch', event => {
  // Don't cache API POST requests
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
// Handle push notifications
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'TEEVERSH';
  const options = {
    body: data.body || 'You have a new update',
    icon: '/images/TEEVERSH-192.png',
    badge: '/images/TEEVERSH-192.png',
    vibrate: [200, 100, 200],
    data: data.url || '/dashboard.html'
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.data || '/dashboard.html'));
});