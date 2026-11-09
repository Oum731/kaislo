// ------------------------------------------------------------
// SAUVEGARDE ET RESTAURATION (Réglages → Profil → Vos données)
//  - une copie automatique par jour, gardée dans l'appareil (les 5 dernières) : on peut revenir à un jour précis ;
//  - une sauvegarde en fichier (JSON) que le gérant peut garder ailleurs ou envoyer, puis restaurer ;
//  - avant toute restauration, l'état actuel est lui aussi mis de côté : on peut revenir en arrière.
// La restauration remet les listes du commerce (articles, ventes, clients, dépenses, stock, journal…) comme dans la copie.
// Elle ne touche ni à l'abonnement, ni au code du commerce, ni aux personnes autorisées et leurs codes PIN.
// ------------------------------------------------------------
import { lireLocal, ecrireLocal } from './stockage.js';

export const COPIES_GARDEES = 5;
const LISTES = ['postes', 'categories', 'produits', 'ventes', 'commandes', 'clients', 'remboursements', 'sessionsCaisse', 'depenses', 'mouvements', 'journal', 'fournisseurs', 'achats', 'reglementsFournisseurs'];
const jourDe = (date) => {
  const d = new Date(date);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

/** Le contenu d'une sauvegarde : les listes du commerce, ses réglages et ses personnes (sans les codes PIN). */
export function instantane(d, maintenant = new Date()) {
  const s = { kaislo: 'sauvegarde', exporteLe: maintenant.toISOString(), version: d.version, commerce: d.commerce, utilisateurs: (d.utilisateurs || []).map(({ pin, ...u }) => u), prochainNumero: d.prochainNumero };
  for (const l of LISTES) s[l] = d[l] || [];
  return s;
}

/**
 * Contrôle un fichier de sauvegarde avant de restaurer. `d` : les données actuelles du commerce.
 * Renvoie { ok: true, resume } ou { ok: false, code: 'format' | 'autre' (+ nom) | 'abimee' }.
 */
export function verifierSauvegarde(s, d) {
  if (!s || typeof s !== 'object' || !s.commerce || !Array.isArray(s.ventes) || !Array.isArray(s.produits)) return { ok: false, code: 'format' };
  if (s.commerce.id !== d.commerce.id) return { ok: false, code: 'autre', nom: String(s.commerce.nom || '?').slice(0, 60) };
  for (const l of LISTES) if (s[l] !== undefined && !Array.isArray(s[l])) return { ok: false, code: 'abimee' };
  const dates = s.ventes.map((v) => v.date).filter(Boolean).sort();
  return { ok: true, resume: { le: s.exporteLe || null, ventes: s.ventes.length, produits: s.produits.length, clients: (s.clients || []).length, depenses: (s.depenses || []).length, premiereVente: dates[0] || null, derniereVente: dates.at(-1) || null } };
}

/** Les données après restauration : les listes de la sauvegarde ; réglages, abonnement, personnes et PIN actuels conservés. */
export function appliquerSauvegarde(d, s) {
  const r = { ...d };
  for (const l of LISTES) r[l] = s[l] || [];
  // Le prochain numéro de ticket ne revient jamais en arrière : pas deux tickets avec le même numéro
  const maxNumero = Math.max(0, ...r.ventes.map((v) => Number(v.numero) || 0));
  r.prochainNumero = Math.max(Number(d.prochainNumero) || 1, Number(s.prochainNumero) || 1, maxNumero + 1);
  // Les produits gardent leur point de départ de stock : le stock actuel est recalculé par avecStocks()
  r.produits = r.produits.map(({ stockActuel, ...p }) => p);
  return r;
}

// ---------- Copies automatiques (dans l'appareil) ----------
const cle = (commerceId) => 'sauvegardes:' + commerceId;

/** Les copies gardées, la plus récente d'abord : [{ id, jour, creeLe, raison, taille }]. */
export function listerCopies(commerceId) {
  return (lireLocal(cle(commerceId)) || []).map(({ contenu, ...c }) => ({ ...c, taille: contenu.length })).sort((a, b) => b.creeLe.localeCompare(a.creeLe));
}

/** La sauvegarde (objet) d'une copie, ou null. */
export function lireCopie(commerceId, id) {
  const c = (lireLocal(cle(commerceId)) || []).find((x) => x.id === id);
  return c ? JSON.parse(c.contenu) : null;
}

/** Garde une copie (raison : 'auto' ou 'avant-restauration'). Une seule copie automatique par jour ; les plus anciennes automatiques sont retirées. */
export function garderCopie(d, raison = 'auto', maintenant = new Date()) {
  const id = d.commerce.id;
  const liste = lireLocal(cle(id)) || [];
  const jour = jourDe(maintenant);
  if (raison === 'auto' && liste.some((c) => c.raison === 'auto' && c.jour === jour)) return false;
  const nouvelle = { id: (raison === 'auto' ? 'c' : 'r') + maintenant.getTime().toString(36), jour, creeLe: maintenant.toISOString(), raison, contenu: JSON.stringify(instantane(d, maintenant)) };
  const autos = liste.filter((c) => c.raison === 'auto').sort((a, b) => b.creeLe.localeCompare(a.creeLe));
  const avant = liste.filter((c) => c.raison !== 'auto').sort((a, b) => b.creeLe.localeCompare(a.creeLe)).slice(0, 1); // la copie « avant restauration » la plus récente
  const gardees = raison === 'auto' ? [nouvelle, ...autos.slice(0, COPIES_GARDEES - 1), ...avant] : [...autos.slice(0, COPIES_GARDEES), nouvelle];
  ecrireLocal(cle(id), gardees);
  return true;
}

/** Vrai si la copie automatique du jour n'est pas encore faite (sert à ne pas recopier à chaque modification). */
export function copieDuJourFaite(commerceId, maintenant = new Date()) {
  const jour = jourDe(maintenant);
  return (lireLocal(cle(commerceId)) || []).some((c) => c.raison === 'auto' && c.jour === jour);
}
