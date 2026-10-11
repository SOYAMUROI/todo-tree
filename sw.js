// Offline support: keep the app shell cached so the home-screen app opens without a connection.
// Bump CACHE when shipping changes to the shell files.
const CACHE = 'todo-tree-v4';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './firebase-config.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const put = (req, res) => caches.open(CACHE).then(c => c.put(req, res));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // Page and config: network first so updates arrive, cache as the offline fallback.
  if (req.mode === 'navigate' || (sameOrigin && /\/(index\.html|firebase-config\.js)?$/.test(url.pathname))) {
    e.respondWith(
      fetch(req)
        .then(res => { if (res.ok) put(req, res.clone()); return res; })
        .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  // Icons and the versioned Firebase SDK files: cache first.
  if (sameOrigin || url.hostname === 'www.gstatic.com') {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok) put(req, res.clone());
        return res;
      }))
    );
  }
  // Everything else (Firestore and login traffic) goes straight to the network.
});
