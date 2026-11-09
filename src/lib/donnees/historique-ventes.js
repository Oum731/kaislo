// ------------------------------------------------------------
// HISTORIQUE DES VENTES (Ventes → Tickets) : période libre, vendeur, mode de paiement, article, ventes annulées, recherche.
// Renvoie la liste (la plus récente d'abord), regroupée par jour, et un résumé des ventes retenues (les ventes annulées n'y comptent pas).
// ------------------------------------------------------------

export const PERIODES_HISTORIQUE = ['jour', 'hier', 'semaine', 'mois', 'moisPrecedent', 'tout', 'dates'];

const debutDuJour = (date) => { const d = new Date(date); d.setHours(0, 0, 0, 0); return d; };

// « 2026-11-09 » (champ date du navigateur) → minuit local de ce jour ; null si la date est vide ou fausse
function jourSaisi(texte) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(texte || ''));
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) || d.getMonth() !== Number(m[2]) - 1 ? null : d;
}

/**
 * Bornes d'une période : { debut, fin } (début compris, fin exclue ; null = sans limite).
 * jour = aujourd'hui · hier · semaine = les 7 derniers jours · mois = depuis le 1er · moisPrecedent = le mois d'avant · tout · dates = du … au … (inclus)
 */
export function bornesHistorique(periode, { du = '', au = '' } = {}, maintenant = new Date()) {
  const aujourdhui = debutDuJour(maintenant);
  if (periode === 'jour') return { debut: aujourdhui, fin: null };
  if (periode === 'hier') { const h = new Date(aujourdhui); h.setDate(h.getDate() - 1); return { debut: h, fin: aujourdhui }; }
  if (periode === 'semaine') { const s = new Date(aujourdhui); s.setDate(s.getDate() - 6); return { debut: s, fin: null }; }
  if (periode === 'mois') return { debut: new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1), fin: null };
  if (periode === 'moisPrecedent') return { debut: new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() - 1, 1), fin: new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1) };
  if (periode === 'dates') {
    const a = jourSaisi(du);
    const b = jourSaisi(au);
    if (b) b.setDate(b.getDate() + 1); // « au 10 » inclut tout le 10
    return { debut: a, fin: b };
  }
  return { debut: null, fin: null }; // tout
}

const simple = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Clé du jour local : « 2026-11-09 »
const cleJour = (iso) => {
  const d = new Date(iso);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

/**
 * ventes   : toutes les ventes du commerce
 * filtres  : { periode, du, au, vendeurId, paiement, statut: 'toutes' | 'valides' | 'annulees', recherche, seulementVendeurId }
 *            (seulementVendeurId : un vendeur ne voit que ses propres ventes)
 * Renvoie { liste, jours: [{ cle, date, total, nb, ventes }], resume: { nb, total, panierMoyen, remises, nbAnnulees, totalAnnule, parPaiement } }
 */
export function filtrerVentes(ventes = [], filtres = {}, maintenant = new Date()) {
  const { periode = 'jour', du = '', au = '', vendeurId = '', paiement = '', statut = 'toutes', recherche = '', seulementVendeurId = '' } = filtres;
  const { debut, fin } = bornesHistorique(periode, { du, au }, maintenant);
  const r = simple(recherche).trim();
  const liste = ventes
    .filter((v) => {
      const t = new Date(v.date);
      if (debut && t < debut) return false;
      if (fin && t >= fin) return false;
      if (seulementVendeurId && v.vendeurId !== seulementVendeurId) return false;
      if (vendeurId && v.vendeurId !== vendeurId) return false;
      if (paiement && v.paiement !== paiement) return false;
      if (statut === 'valides' && v.annulee) return false;
      if (statut === 'annulees' && !v.annulee) return false;
      if (r) {
        const trouve = String(v.numero) === r
          || [v.clientNom, v.table, v.vendeurNom, v.refPaiement].some((x) => simple(x).includes(r))
          || (v.lignes || []).some((l) => simple(l.produitNom || l.nom).includes(r));
        if (!trouve) return false;
      }
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const valides = liste.filter((v) => !v.annulee);
  const annulees = liste.filter((v) => v.annulee);
  const total = valides.reduce((n, v) => n + (Number(v.total) || 0), 0);
  const modes = new Map();
  for (const v of valides) {
    const e = modes.get(v.paiement) || { mode: v.paiement, total: 0, nb: 0 };
    e.total += Number(v.total) || 0;
    e.nb += 1;
    modes.set(v.paiement, e);
  }
  const jours = [];
  for (const v of liste) {
    const cle = cleJour(v.date);
    let j = jours[jours.length - 1];
    if (!j || j.cle !== cle) { j = { cle, date: new Date(v.date), total: 0, nb: 0, ventes: [] }; jours.push(j); }
    j.ventes.push(v);
    if (!v.annulee) { j.total += Number(v.total) || 0; j.nb += 1; }
  }
  return {
    liste,
    jours,
    resume: {
      nb: valides.length,
      total,
      panierMoyen: valides.length ? total / valides.length : 0,
      remises: valides.reduce((n, v) => n + (Number(v.remise) || 0), 0),
      nbAnnulees: annulees.length,
      totalAnnule: annulees.reduce((n, v) => n + (Number(v.total) || 0), 0),
      parPaiement: [...modes.values()].sort((a, b) => b.total - a.total),
    },
  };
}

/** Modes de paiement et vendeurs présents dans les ventes (pour remplir les listes de filtres). */
export function valeursDeFiltre(ventes = []) {
  const paiements = [...new Set(ventes.map((v) => v.paiement).filter(Boolean))].sort();
  const vendeurs = new Map();
  for (const v of ventes) if (v.vendeurId && !vendeurs.has(v.vendeurId)) vendeurs.set(v.vendeurId, v.vendeurNom || v.vendeurId);
  return { paiements, vendeurs: [...vendeurs].map(([id, nom]) => ({ id, nom })).sort((a, b) => a.nom.localeCompare(b.nom)) };
}
