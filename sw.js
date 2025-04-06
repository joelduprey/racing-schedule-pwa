const CACHE_NAME = 'racing-schedule-pwa-cache-v8'; // Increment this (e.g., v3, v4) when you update your app
const urlsToCache = [
  '/racing-schedule-pwa/',
  '/racing-schedule-pwa/index.html',
  '/racing-schedule-pwa/manifest.json',
  '/racing-schedule-pwa/192x192.png',
  '/racing-schedule-pwa/512x512.png'
];

// Install event: Cache initial files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching files:', urlsToCache);
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Activate the new service worker immediately
      .catch(err => console.error('Cache addAll failed:', err))
  );
});

// Activate event: Clean up old caches and take control
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => self.clients.claim()) // Take control of all clients immediately
    .catch(err => console.error('Activate failed:', err))
  );
});

// Fetch event: Network-first for HTML, cache-first for other assets
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // Use network-first strategy for index.html to ensure updates are fetched
  if (requestUrl.pathname === '/racing-schedule-pwa/index.html') {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          // Update the cache with the new response
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(event.request)
            .then(response => response || Promise.reject('No cache available'));
        })
    );
  } else {
    // Cache-first for other assets (images, manifest, etc.)
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          return response || fetch(event.request).then(networkResponse => {
            // Cache new assets fetched from the network
            return caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse.clone());
              return networkResponse;
            });
          });
        })
        .catch(err => console.error('Fetch failed:', err))
    );
  }
});

// Notify clients of updates
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'UPDATE_AVAILABLE' });
      });
    });
  }
});
