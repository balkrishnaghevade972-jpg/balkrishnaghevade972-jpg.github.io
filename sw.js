const CACHE_NAME = 'mother-diet-v1';
const OFFLINE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install - pre-cache core files
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS))
  );
});

// Activate - clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map(k => (k !== CACHE_NAME) ? caches.delete(k) : null)
    ))
  );
  self.clients.claim();
});

// Fetch handler - cache-first for app shell, network-first for others
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // For navigation requests, serve index.html (SPA fallback)
  if (req.mode === 'navigate' || (req.method === 'GET' && req.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(req).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Try cache first, then network
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((resp) => {
        // put a copy in cache (only for GET)
        if (req.method === 'GET' && resp && resp.status === 200 && resp.type === 'basic') {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        }
        return resp;
      }).catch(() => {
        // fallback if json/image etc. not available
        return caches.match('/index.html');
      });
    })
  );
});

// Message listener — allow page to ask SW to show notification
self.addEventListener('message', (e) => {
  if (!e.data) return;
  if (e.data.type === 'show-notification' && self.registration) {
    const body = e.data.body || 'Reminder';
    const options = {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'diet-reminder',
      renotify: true
    };
    self.registration.showNotification('Diet Reminder', options);
  }
});
