// ------------------------------------------------------------
// HISTORIQUE DES DÉPENSES : filtre par période et par texte, regroupé par jour (le plus récent d'abord).
// ------------------------------------------------------------

/** Premier instant de la période : 'jour' = aujourd'hui, 'semaine' = les 7 derniers jours, 'mois' = depuis le 1er du mois, 'tout' = null. */
export function debutPeriodeDepenses(periode, maintenant = new Date()) {
  const debut = new Date(maintenant);
  debut.setHours(0, 0, 0, 0);
  if (periode === 'jour') return debut;
  if (periode === 'semaine') { debut.setDate(debut.getDate() - 6); return debut; }
  if (periode === 'mois') { debut.setDate(1); return debut; }
  return null;
}

// Jour local d'une date ISO : « 2026-10-31 »
const cleJour = (iso) => {
  const d = new Date(iso);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

/**
 * Dépenses d'une période, filtrées par texte (note, catégorie, personne, montant), regroupées par jour.
 * Renvoie { jours: [{ cle, date, total, depenses }], total, nombre }.
 */
export function historiqueDepenses(depenses = [], { periode = 'mois', recherche = '', maintenant = new Date(), libelleCategorie = (c) => c } = {}) {
  const debut = debutPeriodeDepenses(periode, maintenant);
  const r = String(recherche || '').trim().toLowerCase();
  const chiffres = r.replace(/[^\d]/g, '');
  const gardees = depenses
    .filter((x) => !debut || new Date(x.date) >= debut)
    .filter((x) => !r
      || [x.note, x.categorie, libelleCategorie(x.categorie), x.utilisateurNom].some((t) => String(t || '').toLowerCase().includes(r))
      || (chiffres.length >= 2 && String(Math.round(Number(x.montant) || 0)).includes(chiffres)))
    .sort((a, b) => b.date.localeCompare(a.date));
  const jours = [];
  for (const x of gardees) {
    const cle = cleJour(x.date);
    let j = jours[jours.length - 1];
    if (!j || j.cle !== cle) { j = { cle, date: new Date(x.date), total: 0, depenses: [] }; jours.push(j); }
    j.depenses.push(x);
    j.total += Number(x.montant) || 0;
  }
  return { jours, total: gardees.reduce((n, x) => n + (Number(x.montant) || 0), 0), nombre: gardees.length };
}
