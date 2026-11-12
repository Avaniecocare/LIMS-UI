// Offline fallback only. Pages, scripts and API responses always come from the network: lab data is never kept
// on the device, and a new release is picked up on the next load. When the network is down, page loads get a
// short "you are offline" page instead of the browser's error.
const CACHE = 'lims-offline-v1';
const OFFLINE = ['/offline.html', '/offline.css', '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(OFFLINE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline.html')));
    return;
  }
  const url = new URL(request.url);
  if (url.origin === self.location.origin && OFFLINE.includes(url.pathname)) {
    event.respondWith(caches.match(request).then((hit) => hit || fetch(request)));
  }
});
