// ------------------------------------------------------------
// RETOUR D'UN OU PLUSIEURS ARTICLES d'une vente (le client rapporte un article, on le rembourse ou on le garde en crédit).
//
// Un retour est une ligne de vente « en négatif » (retourDe = identifiant de la vente d'origine) :
//   - quantités et montants négatifs, daté du jour du retour ;
//   - le chiffre d'affaires, la caisse (espèces rendues), le carnet de crédit, les marges et les ventes par article en tiennent compte tout seuls ;
//   - le stock remonte (sauf article abîmé : horsStock) ;
//   - il ne compte pas comme un ticket (nombre de tickets, panier moyen) : voir estRetour().
// La vente d'origine ne change pas. Un retour demande le code PIN du gérant (comme une annulation).
// ------------------------------------------------------------
import { arrondir, genId } from '../utils/format.js';

export const estRetour = (v) => !!v?.retourDe;
export const CREDIT = 'Crédit';

/** Les retours enregistrés pour une vente. */
export const retoursDe = (d, vente) => (d.ventes || []).filter((v) => v.retourDe === vente.id && !v.annulee);

/** Le montant d'une vente qui peut encore être rendu. */
export function resteARendre(d, vente) {
  const rendu = retoursDe(d, vente).reduce((n, r) => n + Math.abs(Number(r.total) || 0), 0);
  return Math.max(0, arrondir((Number(vente.total) || 0) - rendu, d.commerce.devise));
}

/** Chaque ligne de la vente avec ce qui a déjà été rendu : [{ index, ligne, vendu, rendu, reste }]. */
export function lignesRetournables(d, vente) {
  const rendu = new Map();
  for (const r of retoursDe(d, vente)) for (const l of r.lignes || []) rendu.set(l.ligneIndex, (rendu.get(l.ligneIndex) || 0) + Math.abs(Number(l.quantite) || 0));
  return (vente.lignes || []).map((ligne, index) => {
    const vendu = Number(ligne.quantite) || 0;
    const deja = rendu.get(index) || 0;
    return { index, ligne, vendu, rendu: deja, reste: Math.max(0, Math.round((vendu - deja) * 1000) / 1000) };
  });
}

/** Une vente peut-elle recevoir un retour ? (valide, pas elle-même un retour, quelque chose à rendre) */
export const retourPossible = (d, vente) => !vente.annulee && !estRetour(vente) && resteARendre(d, vente) > 0 && lignesRetournables(d, vente).some((l) => l.reste > 0);

/** Combien rendre pour `quantite` d'une ligne : le prix payé, remise de la vente comprise. */
export function montantLigneRendue(vente, ligne, quantite, devise) {
  if (!(Number(ligne.quantite) > 0)) return 0;
  const part = (Number(ligne.total) || 0) * (quantite / ligne.quantite);
  const coeff = vente.sousTotal > 0 ? vente.total / vente.sousTotal : 1; // la remise se répartit sur les articles
  return arrondir(part * coeff, devise);
}

/**
 * Le retour à enregistrer, ou { erreur: code }.
 * quantites : { [indexLigne]: quantité rendue } ; options : { mode, motif, remettreEnStock, vendeur: { id, nom }, gerantNom, posteId, appareil }
 * Codes d'erreur : 'rien' (aucune quantité), 'trop' (plus que vendu ou que le reste), 'motif', 'mode' (crédit sans client), 'montant'.
 */
export function creerRetour(d, vente, quantites, { mode, motif, remettreEnStock = true, vendeur, gerantNom, posteId, appareil, maintenant = new Date() }) {
  const dev = d.commerce.devise;
  if (!String(motif || '').trim()) return { erreur: 'motif' };
  if (mode === CREDIT && !vente.clientId) return { erreur: 'mode' };
  const lignes = [];
  for (const r of lignesRetournables(d, vente)) {
    const q = Number(quantites[r.index]) || 0;
    if (q <= 0) continue;
    if (q > r.reste + 1e-9) return { erreur: 'trop' };
    const montant = montantLigneRendue(vente, r.ligne, q, dev);
    const { prixNormal, ...base } = r.ligne;
    lignes.push({ ...base, quantite: -q, prixUnitaire: q ? arrondir(montant / q, dev) : 0, total: -montant, ligneIndex: r.index, ...(remettreEnStock ? {} : { horsStock: true }) });
  }
  if (!lignes.length) return { erreur: 'rien' };
  const total = arrondir(lignes.reduce((n, l) => n + l.total, 0), dev);
  if (-total > resteARendre(d, vente) + 1e-9) return { erreur: 'montant' };
  const numeros = (d.ventes || []).filter(estRetour).map((v) => Number(String(v.numero).replace(/\D/g, '')) || 0);
  return {
    retour: {
      id: genId('rt'),
      numero: 'R' + (Math.max(0, ...numeros) + 1),
      retourDe: vente.id,
      retourDeNumero: vente.numero,
      date: maintenant.toISOString(),
      vendeurId: vendeur?.id, vendeurNom: vendeur?.nom, retourPar: gerantNom,
      ...(posteId ? { posteId } : {}), ...(appareil ? { appareil } : {}),
      paiement: mode,
      recu: 0,
      clientId: mode === CREDIT ? vente.clientId : null,
      clientNom: vente.clientNom || null,
      table: null,
      lignes,
      sousTotal: total, remise: 0, total,
      motifRetour: String(motif).trim().slice(0, 200),
    },
  };
}
