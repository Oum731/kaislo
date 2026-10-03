// ------------------------------------------------------------
// POSTES : un poste est un point d'impression (le téléphone ou la tablette
// relié(e) à l'imprimante), avec 5 vendeurs au maximum.
//  - le gérant crée ses postes (« Comptoir », « Terrasse », « Caisse 2 »…)
//  - chaque vendeur est affecté à un seul poste ; ses tickets s'impriment sur l'imprimante de ce poste
//  - le gérant vend depuis n'importe quel poste et ne compte pas dans la limite
// Chaque formule comprend 1 poste ; au-delà, un poste supplémentaire est facturé (voir tarifs.js).
// ------------------------------------------------------------
import { VENDEURS_PAR_POSTE } from './tarifs.js';

// Poste créé avec chaque commerce (tant que le gérant n'en a pas créé d'autres)
export const POSTE_PRINCIPAL = { id: 'principal', nom: 'Poste principal' };

export const postesDe = (d) => (d?.postes?.length ? d.postes : [POSTE_PRINCIPAL]);

export const posteParId = (d, id) => postesDe(d).find((p) => p.id === (id || 'principal')) || postesDe(d)[0];

// Vendeurs actifs d'un poste (le gérant n'est jamais compté)
export function vendeursDuPoste(d, posteId, sauf = null) {
  return (d?.utilisateurs || []).filter((u) => u.role !== 'gerant' && u.actif !== false && (u.posteId || 'principal') === posteId && u.id !== sauf);
}

export const postePlein = (d, posteId, sauf = null) => vendeursDuPoste(d, posteId, sauf).length >= VENDEURS_PAR_POSTE;

// Poste dont dépend un ticket : celui du vendeur, sinon (gérant) celui de l'appareil
export function posteDuTicket(d, utilisateur, posteAppareil) {
  if (utilisateur?.role !== 'gerant' && utilisateur?.posteId) return utilisateur.posteId;
  return posteAppareil || (utilisateur?.role === 'gerant' ? null : 'principal');
}
