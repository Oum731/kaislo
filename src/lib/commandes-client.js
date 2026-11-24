// ------------------------------------------------------------
// COMMANDES DU CLIENT (lot L1) : les commandes passées depuis cet appareil, pour les suivre sans compte.
// Chaque commande a une clé de suivi au hasard, gardée seulement ici (et jamais dans une adresse de page).
// ------------------------------------------------------------
const CLE = 'kaislo-commandes-suivies';
const MAX = 10;

export function lireCommandesSuivies() {
  try { const l = JSON.parse(localStorage.getItem(CLE)); return Array.isArray(l) ? l.filter((c) => c && typeof c.cle === 'string') : []; } catch { return []; }
}

/** Ajoute une commande en tête de liste : { cle, numero, boutique, le }. */
export function suivreCommande(c) {
  try { localStorage.setItem(CLE, JSON.stringify([c, ...lireCommandesSuivies().filter((x) => x.cle !== c.cle)].slice(0, MAX))); } catch { /* stockage bloqué */ }
}

export function oublierCommande(cle) {
  try { localStorage.setItem(CLE, JSON.stringify(lireCommandesSuivies().filter((c) => c.cle !== cle))); } catch { /* stockage bloqué */ }
}

import { tr } from '@/lib/i18n';

// Étapes vues par le client, d'après le statut du commerçant (nouvelle, confirmee, prete, livree, annulee)
export function etapesCommande(statut, mode) {
  const retrait = mode === 'retrait';
  const base = [
    ['nouvelle', tr('Commande envoyée')],
    ['confirmee', tr('Acceptée par la boutique')],
    ['prete', retrait ? tr('Prête à retirer') : tr('Prête, la livraison se prépare')],
    ...(retrait ? [] : [['en_route', tr('En route')]]),
    ['livree', retrait ? tr('Retirée') : tr('Livrée')],
  ];
  const i = base.findIndex(([id]) => id === statut);
  return base.map(([id, libelle], k) => ({ id, libelle, etat: statut === 'annulee' ? (k === 0 ? 'ok' : 'attente') : k < i || (k === i && statut === 'livree') ? 'ok' : k === i ? 'en-cours' : 'attente' }));
}
