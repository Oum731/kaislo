// ------------------------------------------------------------
// Service worker : garde une copie de l'application dans l'appareil
// pour qu'elle s'ouvre vite, même avec une mauvaise connexion.
// La version est remplacée automatiquement à chaque construction du site (scripts/version-sw.mjs).
// ------------------------------------------------------------
const VERSION = 'kaislo-202610291855'; // v8 : notifications push ; v7 : images, vidéos et icônes toujours à jour (seuls les fichiers /_next/static/ sont gardés tels quels)
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

// ------------------------------------------------------------
// Notifications push (voir api/lib/push.php) : le serveur envoie un signal sans texte ; l'appareil vient lire le texte
// chez Kaislo puis affiche la notification. Les navigateurs exigent d'afficher quelque chose à chaque signal.
// ------------------------------------------------------------
const SANS_BARRE = RACINE.replace(/\/$/, '');
self.addEventListener('push', (e) => {
  e.waitUntil((async () => {
    let messages = [{ titre: 'Kaislo', texte: 'Ouvrez Kaislo pour voir les nouveautés.', url: '/app/', tag: 'kaislo' }];
    try {
      const abonnement = await self.registration.pushManager.getSubscription();
      if (abonnement) {
        const r = await fetch(RACINE + 'api/push/message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: abonnement.endpoint }) });
        const j = await r.json();
        if (j && j.ok && Array.isArray(j.messages) && j.messages.length) messages = j.messages;
      }
    } catch { /* pas de connexion : notification générale */ }
    await Promise.all(messages.map((m) => self.registration.showNotification(m.titre, {
      body: m.texte, tag: m.tag || 'kaislo', renotify: true, icon: RACINE + 'icons/icone-192.png', badge: RACINE + 'icons/icone-48.png', data: { url: m.url || '/app/' },
    })));
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const adresse = new URL(SANS_BARRE + ((e.notification.data && e.notification.data.url) || '/app/'), self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((fenetres) => {
    for (const f of fenetres) if (new URL(f.url).pathname.startsWith(RACINE + 'app') && 'focus' in f) return f.focus();
    return self.clients.openWindow(adresse);
  }));
});
