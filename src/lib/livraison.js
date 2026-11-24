// ------------------------------------------------------------
// COMMANDE ET LIVRAISON : interrupteur (chantier préparé, pas encore activé : docs/chantier-livraison.md).
// Tout écran, bouton ou message de livraison doit d'abord demander `livraisonActive()` ; réponse « non » = on n'affiche rien.
// En cas d'erreur ou de réseau absent, la réponse est « non » : une fonction non terminée ne s'ouvre jamais par accident.
// ------------------------------------------------------------
import { appelApi } from '@/lib/api';

let etat = null; // promesse mise en mémoire pour la durée de la page

export function livraisonActive() {
  if (!etat) etat = appelApi('GET', '/livraison/etat').then((r) => r.actif === true).catch(() => false);
  return etat;
}

/** Pour les tests : oublie la réponse mise en mémoire. */
export const oublierEtatLivraison = () => { etat = null; };
