// ------------------------------------------------------------
// CLÔTURE DE CAISSE (fin de journée ou fin de service)
//
// Espèces attendues = fond de caisse
//                   + ventes payées en espèces
//                   − dépenses payées avec l'argent de la caisse
// Le vendeur compte les billets, l'application calcule l'écart.
// ------------------------------------------------------------
import { arrondir } from '../utils/format.js';

// Une vente annulée ne compte nulle part (stats, totaux, clôture)
export const venteValide = (v) => !v.annulee;

// Début de la période à clôturer : dernière clôture d'aujourd'hui, sinon minuit
export function debutCloture(clotures, maintenant = new Date()) {
  const minuit = new Date(maintenant);
  minuit.setHours(0, 0, 0, 0);
  const derniere = clotures
    .map((c) => new Date(c.date))
    .filter((d) => d >= minuit && d <= maintenant)
    .sort((a, b) => b - a)[0];
  return derniere || minuit;
}

export function calculerCloture(d, debut, fin, fondDeCaisse) {
  const dev = d.commerce.devise;
  const dansPeriode = (x) => {
    const t = new Date(x.date);
    return t >= debut && t <= fin;
  };
  const ventes = d.ventes.filter((v) => venteValide(v) && dansPeriode(v));
  const annulees = d.ventes.filter((v) => v.annulee && dansPeriode(v));
  const depenses = (d.depenses || []).filter((x) => x.depuisCaisse && dansPeriode(x));

  // Total par mode de paiement (dans l'ordre du commerce)
  const parPaiement = d.commerce.modesPaiement.map((mode) => {
    const liste = ventes.filter((v) => v.paiement === mode);
    return { mode, nb: liste.length, total: arrondir(liste.reduce((s, v) => s + v.total, 0), dev) };
  });

  const ventesEspeces = parPaiement.find((p) => p.mode === 'Espèces')?.total || 0;
  const depensesCaisse = arrondir(depenses.reduce((s, x) => s + x.montant, 0), dev);
  return {
    debut: debut.toISOString(),
    fin: fin.toISOString(),
    nbVentes: ventes.length,
    nbAnnulees: annulees.length,
    totalVentes: arrondir(ventes.reduce((s, v) => s + v.total, 0), dev),
    parPaiement,
    fondDeCaisse: Number(fondDeCaisse) || 0,
    ventesEspeces,
    depensesCaisse,
    attendu: arrondir((Number(fondDeCaisse) || 0) + ventesEspeces - depensesCaisse, dev),
  };
}
