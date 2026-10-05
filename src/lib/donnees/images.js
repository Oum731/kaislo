// ------------------------------------------------------------
// IMAGES : photos des articles et logo du commerce.
//
// Les photos sont réduites (environ 40 Ko) puis rangées dans la base
// d'images du navigateur (IndexedDB), séparée des autres données car
// le stockage principal est limité à environ 5 Mo.
// Dans la vraie application, elles seront envoyées sur le serveur.
//
// Une "référence d'image" est :
//  - soit un identifiant "img_…" (image enregistrée par le commerçant)
//  - soit une adresse de fichier "/demo/…" (images des démos)
// ------------------------------------------------------------
import { genId } from '../utils/format.js';
import { chemin } from '../../config.js';
import { tr } from '../i18n/index.js';

const BASE = 'kaislo-images';
const TABLE = 'images';
const cache = new Map(); // images déjà lues (évite de relire la base)

function ouvrirBase() {
  return new Promise((ok, erreur) => {
    const req = indexedDB.open(BASE, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(TABLE);
    req.onsuccess = () => ok(req.result);
    req.onerror = () => erreur(req.error);
  });
}

async function operation(mode, action) {
  const db = await ouvrirBase();
  return new Promise((ok, erreur) => {
    const tx = db.transaction(TABLE, mode);
    const req = action(tx.objectStore(TABLE));
    tx.oncomplete = () => ok(req?.result);
    tx.onerror = () => erreur(tx.error);
  });
}

export const estImageLocale = (ref) => typeof ref === 'string' && ref.startsWith('img_');

// Adresse d'un fichier du site ("/demo/…"), avec le sous-dossier éventuel
export const adresseImage = (ref) => (ref.startsWith('/') ? chemin(ref) : ref);

// Renvoie quelque chose d'affichable dans <img src=…> (ou null)
export async function lireImage(ref) {
  if (!ref) return null;
  if (!estImageLocale(ref)) return adresseImage(ref); // simple adresse de fichier
  if (cache.has(ref)) return cache.get(ref);
  try {
    const donnees = await operation('readonly', (t) => t.get(ref));
    cache.set(ref, donnees || null);
    return donnees || null;
  } catch {
    return null;
  }
}

// Enregistre une image (déjà réduite) et renvoie sa référence
export async function enregistrerImage(dataUrl, ref = null) {
  const id = estImageLocale(ref) ? ref : genId('img_');
  await operation('readwrite', (t) => t.put(dataUrl, id));
  cache.set(id, dataUrl);
  return id;
}

export async function supprimerImage(ref) {
  if (!estImageLocale(ref)) return;
  cache.delete(ref);
  try {
    await operation('readwrite', (t) => t.delete(ref));
  } catch { /* rien */ }
}

/**
 * Réduit une photo choisie par l'utilisateur.
 * cote : taille maximale (en pixels) du plus grand côté.
 * Fond blanc (logos transparents) puis JPEG : léger et imprimable.
 */
export function reduireImage(fichier, cote = 600, qualite = 0.8) {
  return new Promise((ok, erreur) => {
    if (!fichier || !fichier.type.startsWith('image/')) return erreur(new Error(tr('Ce fichier n’est pas une image')));
    const url = URL.createObjectURL(fichier);
    const img = new Image();
    img.onload = () => {
      const echelle = Math.min(1, cote / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * echelle);
      canvas.height = Math.round(img.height * echelle);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      ok(canvas.toDataURL('image/jpeg', qualite));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      erreur(new Error(tr('Image illisible')));
    };
    img.src = url;
  });
}
