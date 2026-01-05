
const CACHE_NAME = 'drahmi-v4';
const OFFLINE_URL = '/index.html';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/index.tsx',
  '/manifest.json',
  '/lib/supabase.ts',
  '/types.ts',
  '/components/Auth.tsx',
  '/components/Dashboard.tsx',
  '/components/Modal.tsx',
  '/components/TransactionList.tsx',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
  'https://jwcvbgfuktoqqzkqsnec.supabase.co/storage/v1/object/public/assets/icon-192.png',
  'https://jwcvbgfuktoqqzkqsnec.supabase.co/storage/v1/object/public/assets/icon-512.png'
];

// Install event - precache core shell
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Immediate activation
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim(); // Immediate control
});

// Fetch event with Cache First Strategy for Static Assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // For navigation requests (opening the app), try network first but fallback to cached index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
    return;
  }

  // Cache First Strategy for static assets and CDN calls
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        // Cache external CSS/Fonts/CDN and local JS/Assets
        if (
          networkResponse.ok && 
          (url.origin === location.origin || 
           url.host === 'cdn.tailwindcss.com' || 
           url.host === 'fonts.googleapis.com' || 
           url.host === 'fonts.gstatic.com' ||
           url.host === 'jwcvbgfuktoqqzkqsnec.supabase.co')
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Silent fail for other fetch requests if offline
      });
    })
  );
});
