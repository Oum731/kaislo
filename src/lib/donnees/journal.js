// ------------------------------------------------------------
// JOURNAL D'ACTIVITÉ (Réglages → Journal) : qui a fait quoi, et quand, en un seul fil (le plus récent d'abord).
// Une grande partie se lit dans ce qui est déjà enregistré : ventes annulées, remises, dépenses, entrées et corrections de stock,
// ouvertures et fermetures de caisse. Ce qui ne laisse aucune trace autrement (dépense supprimée, article supprimé, prix changé)
// est noté dans d.journal au moment du geste : { id, date, par, type, ...détails }. Ce sont des ajouts : rien ne s'y modifie.
// ------------------------------------------------------------

export const TYPES_JOURNAL = ['annulation', 'remise', 'depense', 'depense-supprimee', 'stock', 'caisse', 'produit-supprime', 'prix', 'client-supprime', 'restauration', 'retour'];
export const JOURNAL_MAX = 3000; // au-delà, les plus anciennes lignes de d.journal sont retirées

let compteur = 0;
/** Une ligne à ajouter à d.journal. */
export function ligneJournal(par, type, details = {}, maintenant = new Date()) {
  return { id: 'j' + maintenant.getTime().toString(36) + (compteur++).toString(36), date: maintenant.toISOString(), par: par || '', type, ...details };
}

/** d.journal avec une ligne de plus (borné). */
export function ajouterAuJournal(journal = [], ligne) {
  const liste = [...journal, ligne];
  return liste.length > JOURNAL_MAX ? liste.slice(liste.length - JOURNAL_MAX) : liste;
}

const debutDuJour = (date) => { const d = new Date(date); d.setHours(0, 0, 0, 0); return d; };

/** Début de la période (null = depuis toujours) : jour, semaine (7 jours), mois (30 jours), tout. */
export function debutPeriodeJournal(periode, maintenant = new Date()) {
  const j = debutDuJour(maintenant);
  if (periode === 'jour') return j;
  if (periode === 'semaine') { j.setDate(j.getDate() - 6); return j; }
  if (periode === 'mois') { j.setDate(j.getDate() - 29); return j; }
  return null;
}

/**
 * Le fil d'activité du commerce.
 * filtres : { periode: 'jour' | 'semaine' | 'mois' | 'tout', par: nom de la personne ('' = tous), type: '' | un type de TYPES_JOURNAL, seulementGraves }
 * Chaque ligne : { id, date (ISO), par, type, ...détails } ; les ventes annulées, remises et écarts de caisse sont les plus utiles à surveiller.
 * Renvoie { lignes, personnes, comptes } (comptes : nombre de lignes par type, avant le filtre de type).
 */
export function journalActivite(d, filtres = {}, maintenant = new Date()) {
  const { periode = 'semaine', par = '', type = '' } = filtres;
  const debut = debutPeriodeJournal(periode, maintenant);
  const toutes = [];
  for (const v of d.ventes || []) {
    if (v.annulee) toutes.push({ id: 'a' + v.id, date: v.annulee.date, par: v.annulee.par || '', type: 'annulation', numero: v.numero, total: v.total, vendeur: v.vendeurNom || '', motif: v.annulee.motif || '' });
    if (v.retourDe) { toutes.push({ id: 'rt' + v.id, date: v.date, par: v.retourPar || v.vendeurNom || '', type: 'retour', numero: v.retourDeNumero, total: -v.total, mode: v.paiement, motif: v.motifRetour || '' }); continue; }
    if (v.remise > 0 && !v.annulee) toutes.push({ id: 'r' + v.id, date: v.date, par: v.vendeurNom || '', type: 'remise', numero: v.numero, total: v.total, remise: v.remise });
  }
  for (const x of d.depenses || []) toutes.push({ id: 'd' + x.id, date: x.date, par: x.utilisateurNom || '', type: 'depense', montant: x.montant, note: x.note || '', categorie: x.categorie || '' });
  for (const m of d.mouvements || []) {
    if (m.type !== 'entree' && m.type !== 'ajustement') continue;
    toutes.push({ id: 'm' + m.id, date: m.date, par: m.utilisateurNom || '', type: 'stock', produit: m.produitNom || '', quantite: m.quantite, sens: m.type, note: m.note || '' });
  }
  for (const s of d.sessionsCaisse || []) {
    toutes.push({ id: 'o' + s.id, date: s.ouverteLe, par: s.ouvertePar || '', type: 'caisse', etape: 'ouverture', fond: s.fondDeCaisse || 0 });
    if (s.fermeLe) toutes.push({ id: 'f' + s.id, date: s.fermeLe, par: s.fermePar || '', type: 'caisse', etape: 'fermeture', ecart: s.cloture?.ecart || 0 });
  }
  for (const j of d.journal || []) toutes.push(j);

  const dansPeriode = toutes.filter((x) => x.date && (!debut || new Date(x.date) >= debut));
  const personnes = [...new Set(dansPeriode.map((x) => x.par).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const filtrees = dansPeriode.filter((x) => (!par || x.par === par));
  const comptes = {};
  for (const x of filtrees) comptes[x.type] = (comptes[x.type] || 0) + 1;
  const lignes = filtrees.filter((x) => !type || x.type === type).sort((a, b) => b.date.localeCompare(a.date));
  return { lignes, personnes, comptes };
}

/** Une ligne est « à surveiller » : vente annulée, remise, dépense ou article supprimé, prix changé, écart de caisse, correction de stock en moins. */
export function aSurveiller(l) {
  if (l.type === 'annulation' || l.type === 'remise' || l.type === 'depense-supprimee' || l.type === 'produit-supprime' || l.type === 'client-supprime' || l.type === 'prix' || l.type === 'restauration' || l.type === 'retour') return true;
  if (l.type === 'caisse') return l.etape === 'fermeture' && l.ecart !== 0;
  if (l.type === 'stock') return l.sens === 'ajustement' && l.quantite < 0;
  return false;
}
