// Based off of https://github.com/ryandav/template-progressive-web-app

var dataCacheName = 'fmk';
var cacheName = 'fmk';
var filesToCache = [
  '/',
  '.',
  './img',
  './img/icon.png',
  './img/ball.png',
  './img/brick.png',
  './img/paddle.png',
  './index.html',
  './index.js',
  './manifest.json',
  './serviceWorker.js',
  './style.css',
];

var log = function(err) {
  console.log(err);
};

self.addEventListener('install', function(e) {
  // Install service worker
  e.waitUntil(
    caches.open(cacheName)
      .then(function(cache) {
        // Cache app shell
        return cache.addAll(filesToCache);
      })
      .catch(log)
  );
});

self.addEventListener('activate', function(e) {
  // Activate service worker
  e.waitUntil(
    caches.keys()
      .then(function(keyList) {
        return Promise.all(keyList.map(function(key) {
          if (key !== cacheName && key !== dataCacheName) {
            // Remove old cache
            return caches.delete(key);
          }
        }));
      })
      .catch(log)
  );
  return self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request)
      .then(function(response) {
        return response || fetch(e.request);
      })
      .catch(log)
  );
});
