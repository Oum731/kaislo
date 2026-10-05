// ------------------------------------------------------------
// MÉMOIRE DE L'APPAREIL (sous stockage.js)
//
// Avant : tout dans localStorage, limité à environ 5 Mo — un commerce qui vend beaucoup pouvait le remplir en
// quelques mois, et les ventes ne s'enregistraient plus. Maintenant : les données sont gardées en mémoire
// pendant l'utilisation (lecture instantanée, comme avant) et enregistrées dans IndexedDB (des centaines de Mo).
//
//   initialiserStockage() : à appeler une fois au démarrage (charge IndexedDB, reprend les anciennes
//                           données de localStorage, une seule fois)
//   lire / ecrire / effacer : mêmes appels qu'avant, synchrones ; l'écriture sur le disque se fait juste après
//
// Si IndexedDB n'est pas disponible (navigation privée sur de vieux navigateurs…), on revient à localStorage.
// ------------------------------------------------------------
const PREFIXE = 'kaislo:';
const BASE = 'kaislo-donnees';
const TABLE = 'kv';

const memoire = new Map(); // clé → valeur
const aEcrire = new Map(); // clé → valeur (ou SUPPRIMER) en attente d'écriture sur le disque
const SUPPRIMER = Symbol('supprimer');
let db = null; // connexion IndexedDB (null : repli sur localStorage)
let initialisation = null;
let planifie = false;
let signalerErreur = () => {};

// L'application est prévenue si l'enregistrement échoue (mémoire de l'appareil pleine)
export const surErreurStockage = (rappel) => { signalerErreur = rappel; };

const copie = (v) => (typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)));

function ouvrir() {
  return new Promise((ok, erreur) => {
    if (typeof indexedDB === 'undefined') return erreur(new Error('IndexedDB indisponible'));
    const req = indexedDB.open(BASE, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(TABLE);
    req.onsuccess = () => ok(req.result);
    req.onerror = () => erreur(req.error);
    req.onblocked = () => erreur(new Error('IndexedDB bloquée'));
  });
}

function toutLire(base) {
  return new Promise((ok, erreur) => {
    const tx = base.transaction(TABLE, 'readonly');
    const curseur = tx.objectStore(TABLE).openCursor();
    curseur.onsuccess = () => {
      const c = curseur.result;
      if (c) { memoire.set(c.key, c.value); c.continue(); }
    };
    tx.oncomplete = ok;
    tx.onerror = () => erreur(tx.error);
  });
}

// Écrit sur le disque tout ce qui est en attente (une seule transaction)
async function vider() {
  planifie = false;
  if (!aEcrire.size) return true;
  const lot = [...aEcrire];
  aEcrire.clear();
  try {
    await new Promise((ok, erreur) => {
      const tx = db.transaction(TABLE, 'readwrite');
      const table = tx.objectStore(TABLE);
      for (const [cle, valeur] of lot) valeur === SUPPRIMER ? table.delete(cle) : table.put(valeur, cle);
      tx.oncomplete = ok;
      tx.onerror = () => erreur(tx.error);
      tx.onabort = () => erreur(tx.error || new Error('Écriture annulée'));
    });
    return true;
  } catch (e) {
    // Dernier recours : localStorage (peut aussi être plein)
    for (const [cle, valeur] of lot) if (valeur !== SUPPRIMER) ecrireRepli(cle, valeur);
    signalerErreur(e);
    return false;
  }
}

function planifier() {
  if (planifie) return;
  planifie = true;
  setTimeout(vider, 0);
}

function ecrireRepli(cle, valeur) {
  try {
    localStorage.setItem(PREFIXE + cle, JSON.stringify(valeur));
  } catch (e) {
    signalerErreur(e);
  }
}

export function initialiserStockage() {
  if (initialisation) return initialisation;
  initialisation = (async () => {
    if (typeof window === 'undefined') return;
    try {
      db = await ouvrir();
      await toutLire(db);
    } catch {
      db = null; // repli sur localStorage
    }
    // Anciennes données (localStorage) : reprises une seule fois
    let cles = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIXE)) cles.push(k);
      }
    } catch { cles = []; }
    const reprises = [];
    for (const k of cles) {
      const cle = k.slice(PREFIXE.length);
      if (memoire.has(cle)) continue; // déjà dans IndexedDB : la copie de localStorage est périmée
      try {
        const valeur = JSON.parse(localStorage.getItem(k));
        if (valeur === null || valeur === undefined) continue;
        memoire.set(cle, valeur);
        reprises.push(cle);
        if (db) aEcrire.set(cle, valeur);
      } catch { /* donnée illisible : ignorée */ }
    }
    if (db) {
      // localStorage n'est vidé que si tout est bien arrivé dans IndexedDB
      if (await vider()) for (const k of cles) { try { localStorage.removeItem(k); } catch { /* rien */ } }
    }
    // Enregistre ce qui reste en attente quand la page se ferme ou passe en arrière-plan
    const sauver = () => { if (db) vider(); };
    window.addEventListener('pagehide', sauver);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') sauver(); });
  })();
  return initialisation;
}

export function lireMemoire(cle) {
  const v = memoire.get(cle);
  return v === undefined ? null : copie(v);
}

export function ecrireMemoire(cle, valeur) {
  memoire.set(cle, valeur);
  if (db) { aEcrire.set(cle, valeur); planifier(); } else ecrireRepli(cle, valeur);
}

export function effacerMemoire(cle) {
  memoire.delete(cle);
  if (db) { aEcrire.set(cle, SUPPRIMER); planifier(); } else { try { localStorage.removeItem(PREFIXE + cle); } catch { /* rien */ } }
}
