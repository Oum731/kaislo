// ------------------------------------------------------------
// ACHATS ET FOURNISSEURS (Stock → Achats, gérant)
//  - fournisseurs : { id, nom, telephone, note }
//  - achats : une commande reçue = plusieurs articles chez un fournisseur, avec ce qui a été payé tout de suite ;
//    chaque ligne fait entrer la marchandise dans le stock (mouvements « entrée », reliés à l'achat) et met à jour le prix d'achat
//  - règlements : ce qu'on paie plus tard à un fournisseur ; la dette = achats − payé à l'achat − règlements.
// Les achats ne sont pas des dépenses du commerce : le stock acheté est une valeur, pas une charge (les dépenses restent à part).
// ------------------------------------------------------------
import { arrondir, genId } from '../utils/format.js';

const somme = (liste, champ) => liste.reduce((n, x) => n + (Number(x[champ]) || 0), 0);

/** Ce que le commerce doit encore à un fournisseur. */
export function soldeFournisseur(d, fournisseurId) {
  const achats = (d.achats || []).filter((a) => a.fournisseurId === fournisseurId);
  const du = somme(achats, 'total') - somme(achats, 'paye');
  const regle = somme((d.reglementsFournisseurs || []).filter((r) => r.fournisseurId === fournisseurId), 'montant');
  return arrondir(du - regle, d.commerce.devise);
}

/** Les fournisseurs avec ce qu'on leur doit et leur dernier achat, ceux à qui on doit le plus d'abord. */
export function fournisseursAvecSolde(d) {
  return (d.fournisseurs || []).map((f) => {
    const achats = (d.achats || []).filter((a) => a.fournisseurId === f.id);
    return { ...f, solde: soldeFournisseur(d, f.id), nbAchats: achats.length, totalAchete: arrondir(somme(achats, 'total'), d.commerce.devise), dernierAchat: achats.map((a) => a.date).sort().at(-1) || null };
  }).sort((a, b) => b.solde - a.solde || a.nom.localeCompare(b.nom));
}

/** Total dû à tous les fournisseurs. */
export const totalDu = (d) => arrondir((d.fournisseurs || []).reduce((n, f) => n + Math.max(0, soldeFournisseur(d, f.id)), 0), d.commerce.devise);

/** Achats et règlements d'un fournisseur, du plus récent au plus ancien : [{ type: 'achat' | 'reglement', ... }]. */
export function historiqueFournisseur(d, fournisseurId) {
  const achats = (d.achats || []).filter((a) => a.fournisseurId === fournisseurId).map((a) => ({ type: 'achat', ...a }));
  const reglements = (d.reglementsFournisseurs || []).filter((r) => r.fournisseurId === fournisseurId).map((r) => ({ type: 'reglement', ...r }));
  return [...achats, ...reglements].sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Un achat à enregistrer : { achat, mouvements } ou { erreur: 'fournisseur' | 'lignes' | 'paye' }.
 * lignes : [{ produitId, quantite, prixAchat }] ; paye : montant payé tout de suite (0 = tout à payer plus tard).
 */
export function creerAchat(d, { fournisseurId, lignes, paye = 0, note = '', numeroFacture = '', utilisateurNom = '', maintenant = new Date() }) {
  const dev = d.commerce.devise;
  const fournisseur = (d.fournisseurs || []).find((f) => f.id === fournisseurId);
  if (!fournisseur) return { erreur: 'fournisseur' };
  const lignesOk = [];
  for (const l of lignes || []) {
    const produit = d.produits.find((p) => p.id === l.produitId);
    const quantite = Number(l.quantite);
    const prixAchat = Number(l.prixAchat);
    if (!produit || !(quantite > 0)) continue;
    if (!(prixAchat >= 0) || l.prixAchat === null || l.prixAchat === '' || l.prixAchat === undefined) return { erreur: 'prix' };
    lignesOk.push({ produitId: produit.id, produitNom: produit.nom, quantite, prixAchat, total: arrondir(quantite * prixAchat, dev) });
  }
  if (!lignesOk.length) return { erreur: 'lignes' };
  const total = arrondir(somme(lignesOk, 'total'), dev);
  const payeOk = arrondir(Number(paye) || 0, dev);
  if (payeOk < 0 || payeOk > total) return { erreur: 'paye' };
  const date = maintenant.toISOString();
  const id = genId('ac');
  const achat = { id, date, fournisseurId, fournisseurNom: fournisseur.nom, lignes: lignesOk, total, paye: payeOk, utilisateurNom, ...(note.trim() ? { note: note.trim().slice(0, 200) } : {}), ...(numeroFacture.trim() ? { numeroFacture: numeroFacture.trim().slice(0, 40) } : {}) };
  const mouvements = lignesOk.map((l) => ({
    id: genId('m'), date, produitId: l.produitId, produitNom: l.produitNom, type: 'entree', quantite: l.quantite, prixAchat: l.prixAchat,
    fournisseur: fournisseur.nom, note: numeroFacture.trim() ? 'Facture ' + numeroFacture.trim() : '', utilisateurNom, achatId: id,
  }));
  return { achat, mouvements };
}

/** Un règlement à un fournisseur : { reglement } ou { erreur: 'montant' | 'trop' | 'fournisseur' }. */
export function creerReglement(d, { fournisseurId, montant, mode, utilisateurNom = '', maintenant = new Date() }) {
  if (!(d.fournisseurs || []).some((f) => f.id === fournisseurId)) return { erreur: 'fournisseur' };
  const m = arrondir(Number(montant) || 0, d.commerce.devise);
  if (!(m > 0)) return { erreur: 'montant' };
  if (m > soldeFournisseur(d, fournisseurId) + 1e-9) return { erreur: 'trop' };
  return { reglement: { id: genId('rf'), date: maintenant.toISOString(), fournisseurId, montant: m, mode: mode || '', utilisateurNom } };
}
