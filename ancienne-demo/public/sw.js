// ------------------------------------------------------------
// Service worker : garde une copie de l'application dans le téléphone
// pour qu'elle s'ouvre vite, même avec une mauvaise connexion.
// Changer VERSION à chaque mise en ligne force la mise à jour.
// ------------------------------------------------------------
const VERSION = 'kaisly-demo-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(['./', './manifest.webmanifest'])));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cles) => Promise.all(cles.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const polices = url.host.includes('fonts.googleapis.com') || url.host.includes('fonts.gstatic.com');
  if (url.origin !== location.origin && !polices) return;

  // Pages : réseau d'abord (pour avoir la dernière version), sinon la copie
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((r) => { caches.open(VERSION).then((c) => c.put('./', r.clone())); return r; })
        .catch(() => caches.match('./'))
    );
    return;
  }
  // Fichiers (JS, CSS, icônes, polices) : la copie d'abord, sinon le réseau
  e.respondWith(
    caches.match(e.request).then(
      (copie) => copie || fetch(e.request).then((r) => {
        const clone = r.clone();
        caches.open(VERSION).then((c) => c.put(e.request, clone));
        return r;
      })
    )
  );
});
