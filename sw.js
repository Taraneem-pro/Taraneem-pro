const CACHE_NAME = 'taraneem-pro-cache-v2';
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return Promise.all(
                    urlsToCache.map(url => {
                        return cache.add(url).catch(err => console.log('Failed to cache', url, err));
                    })
                );
            })
    );
    // Force the new Service Worker to activate immediately without waiting
    self.skipWaiting();
});

self.addEventListener('fetch', event => {
    // Only intercept basic GET requests, ignore Firebase/Firestore requests
    if (event.request.method !== 'GET' || event.request.url.includes('firestore.googleapis.com')) {
        return;
    }

    // Network-First strategy: try the network first, fall back to cache if offline
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Check if we received a valid response
                if (!response || response.status !== 200) {
                    return response;
                }

                // Clone the response because it's a stream and can only be consumed once
                const responseToCache = response.clone();

                // Update the cache with the fresh response
                caches.open(CACHE_NAME)
                    .then(cache => {
                        cache.put(event.request, responseToCache);
                    });

                return response;
            })
            .catch(() => {
                // Network failed (user is offline), try the cache
                return caches.match(event.request).then(cachedResponse => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // If not in cache either, return a basic offline message for navigation requests
                    if (event.request.mode === 'navigate') {
                        return new Response(
                            '<h1 style="text-align:center;margin-top:40vh;font-family:sans-serif">أنت غير متصل بالإنترنت</h1>',
                            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
                        );
                    }
                });
            })
    );
});

self.addEventListener('activate', event => {
    const cacheAllowlist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheAllowlist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Take control of all open tabs immediately
            return clients.claim();
        })
    );
});
