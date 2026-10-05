// ------------------------------------------------------------
// ABONNEMENTS des commerces (gérés par l'équipe Amorac dans /admin)
//
// Chaque commerce a un champ commerce.abonnement :
//   { offre, statut, essaiFin, periodeFin, paiements: [], notes }
// statut : 'essai' | 'actif' | 'suspendu'  (« expiré » est calculé)
// ------------------------------------------------------------

export const DUREE_ESSAI_JOURS = 30;

// Offres proposées. Les prix sont des EXEMPLES, modifiables dans /admin.
export const OFFRES_DEFAUT = [
  {
    id: 'essai',
    nom: 'Essai gratuit',
    description: 'Toutes les fonctions pendant 30 jours, sans engagement.',
    prix: {},
  },
  {
    id: 'starter',
    nom: 'Starter',
    description: 'Ventes, tickets, carnet de crédit, statistiques. 1 appareil, 3 vendeurs.',
    prix: { MAD: 99, FCFA: 5000, EUR: 9, CAD: 14, USD: 10, GNF: 90000 },
  },
  {
    id: 'pro',
    nom: 'Pro',
    description: 'Tout Starter + stock et marges, tables et cuisine, vendeurs et appareils illimités.',
    prix: { MAD: 199, FCFA: 10000, EUR: 19, CAD: 27, USD: 20, GNF: 180000 },
  },
];

export const LIBELLES_STATUT = { essai: 'Essai', actif: 'Actif', expire: 'Expiré', suspendu: 'Suspendu' };

const JOUR = 86400000;

export function nouvelAbonnement(maintenant = new Date()) {
  return {
    offre: 'essai',
    statut: 'essai',
    debut: maintenant.toISOString(),
    essaiFin: new Date(maintenant.getTime() + DUREE_ESSAI_JOURS * JOUR).toISOString(),
    periodeFin: null,
    paiements: [],
    notes: '',
  };
}

// Statut réel (un essai ou une période dépassés deviennent « expiré »)
export function etatAbonnement(ab, maintenant = new Date()) {
  if (!ab) return { statut: 'actif', joursRestants: null, fin: null };
  if (ab.statut === 'suspendu') return { statut: 'suspendu', joursRestants: 0, fin: null };
  const fin = ab.statut === 'essai' ? ab.essaiFin : ab.periodeFin;
  const joursRestants = fin ? Math.ceil((new Date(fin) - maintenant) / JOUR) : null;
  if (fin && joursRestants <= 0) return { statut: 'expire', joursRestants: 0, fin };
  return { statut: ab.statut, joursRestants, fin };
}

// Ajoute des jours à une date (à partir d'aujourd'hui si la date est passée)
export function prolonger(dateIso, jours, maintenant = new Date()) {
  const depart = dateIso && new Date(dateIso) > maintenant ? new Date(dateIso) : maintenant;
  return new Date(depart.getTime() + jours * JOUR).toISOString();
}
