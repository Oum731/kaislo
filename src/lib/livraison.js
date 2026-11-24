// ------------------------------------------------------------
// COMMANDE ET LIVRAISON : interrupteur (chantier préparé, pas encore activé : docs/chantier-livraison.md).
// Tout écran, bouton ou message de livraison doit d'abord demander `livraisonActive()` ; réponse « non » = on n'affiche rien.
// En cas d'erreur ou de réseau absent, la réponse est « non » : une fonction non terminée ne s'ouvre jamais par accident.
// ------------------------------------------------------------
import { appelApi } from '@/lib/api';

let etat = null; // promesse mise en mémoire pour la durée de la page

const charger = () => {
  if (!etat) etat = appelApi('GET', '/livraison/etat').then((r) => ({ actif: r.actif === true, options: r.options || [], paiementEnLigne: r.paiementEnLigne === true })).catch(() => ({ actif: false, options: [], paiementEnLigne: false }));
  return etat;
};

export const livraisonActive = () => charger().then((r) => r.actif);

/** Une option du chantier est-elle ouverte ? 'carte' | 'paiement' | 'independants' */
export const optionLivraison = (nom) => charger().then((r) => r.actif && r.options.includes(nom));

/** Paiement en ligne vraiment disponible (option ouverte, prestataire et secret réglés sur le serveur). */
export const paiementEnLigneActif = () => charger().then((r) => r.actif && r.paiementEnLigne);

/** Pour les tests : oublie la réponse mise en mémoire. */
export const oublierEtatLivraison = () => { etat = null; };
