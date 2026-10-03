// ------------------------------------------------------------
// Service worker : garde une copie de l'application dans l'appareil
// pour qu'elle s'ouvre vite, même avec une mauvaise connexion.
// Changer VERSION à chaque mise en ligne force la mise à jour.
// ------------------------------------------------------------
const VERSION = 'kaisly-v4';
// Dossier du site ("/" sur Hostinger, "/kaisly/" sur GitHub Pages)
const RACINE = new URL(self.registration.scope).pathname;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll([RACINE + 'app/', RACINE + 'manifest.webmanifest'])));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((cles) => Promise.all(cles.filter((k) => k !== VERSION).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  // Pages : réseau d'abord (dernière version), sinon la copie
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((r) => { const copie = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copie)); return r; })
        .catch(() => caches.match(e.request).then((r) => r || caches.match(RACINE + 'app/')))
    );
    return;
  }
  // Fichiers (JS, CSS, polices, icônes) : la copie d'abord, sinon le réseau
  e.respondWith(
    caches.match(e.request).then((copie) => copie || fetch(e.request).then((r) => {
      const clone = r.clone();
      caches.open(VERSION).then((c) => c.put(e.request, clone));
      return r;
    }))
  );
});
