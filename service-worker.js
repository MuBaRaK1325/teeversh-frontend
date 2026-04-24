const CACHE_NAME = 'teeversh-v1';
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

self.addEventListener('fetch', event => {
  // Don't cache API calls
  if (event.request.url.includes('mayconnect-backend-1.onrender.com')) {
    return fetch(event.request);
  }
  
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});