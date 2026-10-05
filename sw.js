// ------------------------------------------------------------
// Service worker : garde une copie de l'application dans l'appareil
// pour qu'elle s'ouvre vite, même avec une mauvaise connexion.
// La version est remplacée automatiquement à chaque construction du site (scripts/version-sw.mjs).
// ------------------------------------------------------------
const VERSION = 'kaislo-202610050151'; // v7 : images, vidéos et icônes toujours à jour (seuls les fichiers /_next/static/ sont gardés tels quels)
// Dossier du site ("/" sur Hostinger, "/kaislo/" sur GitHub Pages)
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
  const adresse = new URL(e.request.url);
  if (e.request.method !== 'GET' || adresse.origin !== location.origin) return;
  // L'API (données, messages, connexion) passe toujours par le réseau : jamais de copie périmée
  if (adresse.pathname.startsWith(RACINE + 'api/')) return;
  // Pages : réseau d'abord (dernière version), sinon la copie
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((r) => { const copie = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copie)); return r; })
        .catch(() => caches.match(e.request).then((r) => r || caches.match(RACINE + 'app/')))
    );
    return;
  }
  // Vidéos : lues par morceaux par le navigateur, jamais copiées
  if (/\.(mp4|webm)$/.test(adresse.pathname)) return;
  const enregistrer = (r) => {
    if (r.ok && r.status === 200) { const clone = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, clone)); }
    return r;
  };
  // JS, CSS et polices de Next.js (nom unique à chaque version) : la copie d'abord, sinon le réseau
  if (adresse.pathname.startsWith(RACINE + '_next/static/')) {
    e.respondWith(caches.match(e.request).then((copie) => copie || fetch(e.request).then(enregistrer)));
    return;
  }
  // Images, icônes, captures… : le réseau d'abord (toujours la dernière version), la copie sans connexion
  e.respondWith(fetch(e.request).then(enregistrer).catch(() => caches.match(e.request)));
});
