// Change this version number (e.g., v2, v3) EVERY time you update your app files!
const CACHE_NAME = 'training-hub-v2'; 

const ASSETS = [
    './',
    './index.html',
    './app.js',
    './data/abs.json',
    './data/boxing.json'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

// This is the new magic script that forces the browser to dump the old app
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => response || fetch(e.request))
    );
});
