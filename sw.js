// Bump CACHE_NAME every time you ship a new version of the app files.
// Without this, the browser would keep serving whatever was cached the
// first time it installed, forever — updates would silently never show up.
const CACHE_NAME = 'moodboard-v5';
const urlsToCache = ['./', './index.html', './css/style.css', './js/db.js', './js/state.js', './js/theme.js', './js/canvas.js', './js/images.js', './js/tree.js', './js/trash.js', './js/color.js', './js/backup.js', './js/app.js', './manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Network-first for our own app files: try to fetch the latest version,
// and only fall back to the cached copy if there's no connection. This is
// the opposite of "cache-first" — while this app is still under active
// development, you want to see your newest changes immediately, not
// whatever got cached weeks ago.
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});