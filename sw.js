// Version 1.3
const CACHE_NAME = 'taraneem-pro-cache-v1';
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
                // We use catch to avoid stopping the entire installation if an icon is missing initially
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
    // Only intercept basic get requests, ignore Firebase/Firestore requests to let them handle their own persistence
    if (event.request.method !== 'GET' || event.request.url.includes('firestore.googleapis.com')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }

                // Fallback to fetch from network
                return fetch(event.request).then(
                    function (response) {
                        // Check if we received a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response because it's a stream and can only be consumed once
                        var responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then(function (cache) {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    }
                ).catch(err => {
                    console.log('Fetch failed, user is likely offline', err);
                    // Standard offline fallback could go here
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



