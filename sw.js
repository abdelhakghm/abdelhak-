const CACHE_NAME = 'drahmi-v3';
const OFFLINE_URL = '/index.html';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/index.tsx',
  '/manifest.json',
  '/style.css',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'
];

// Install event - precache the core application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Precaching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - cleanup outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', (event) => {
  // We only handle GET requests for caching
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Strategy: Stale-While-Revalidate for most assets
  // This allows the app to load instantly from cache while updating in the background
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Cache the new response if it's valid
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic' || url.host === 'fonts.gstatic.com' || url.host === 'cdn.tailwindcss.com') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch((error) => {
        // If network fails and it's a navigation request, return index.html
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
        throw error;
      });

      return cachedResponse || fetchPromise;
    })
  );
});