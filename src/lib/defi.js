// ------------------------------------------------------------
// DÉFI ANTI-ROBOT (voir api/lib/defi.php) : le navigateur cherche un nombre tel que sha256(sel + nombre) commence par `bits` zéros binaires.
// Une fraction de seconde pour une personne ; un coût réel pour un robot qui envoie des milliers de demandes. Aucun cookie, aucun service extérieur.
// ------------------------------------------------------------

export const ROUTES_DEFI = new Set([
  '/inscription', '/connexion', '/contact', '/public/chat', '/public/commande', '/avis',
  '/commercial/inscription', '/commercial/connexion', '/admin/connexion',
]);

// Nombre de zéros binaires au début d'un condensé
export function zerosEnTete(octets) {
  let n = 0;
  for (const v of octets) {
    if (v === 0) { n += 8; continue; }
    n += Math.clz32(v) - 24;
    break;
  }
  return n;
}

/** Cherche le nombre (en texte) qui résout le défi ; null si le navigateur ne sait pas calculer (alors le serveur décidera). */
export async function trouverNonce(sel, bits, crypto = globalThis.crypto) {
  if (!crypto?.subtle) return null;
  const encodeur = new TextEncoder();
  const LOT = 256;
  for (let debut = 0; ; debut += LOT) {
    const essais = Array.from({ length: LOT }, (_, i) => String(debut + i));
    const condenses = await Promise.all(essais.map((n) => crypto.subtle.digest('SHA-256', encodeur.encode(sel + n))));
    for (let i = 0; i < LOT; i++) {
      if (zerosEnTete(new Uint8Array(condenses[i])) >= bits) return essais[i];
    }
    if (debut > 50_000_000) return null; // garde-fou
  }
}

/** Défi résolu à joindre au corps de la demande : { sel, expire, signature, nonce } ; null s'il est désactivé côté serveur. */
export async function resoudreDefi(demanderDefi) {
  const d = await demanderDefi();
  if (d.actif === false) return null;
  const nonce = await trouverNonce(d.sel, d.bits);
  return nonce === null ? null : { sel: d.sel, expire: d.expire, signature: d.signature, nonce };
}
