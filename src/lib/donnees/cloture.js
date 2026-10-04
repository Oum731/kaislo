// ------------------------------------------------------------
// CLÔTURE DE CAISSE (fin de journée ou fin de service)
//
// Espèces attendues = fond de départ
//                   + ventes payées en espèces
//                   + remboursements de crédit reçus en espèces
//                   − dépenses payées avec l'argent de la caisse
// Le vendeur compte les billets, l'application calcule l'écart.
// ------------------------------------------------------------
import { arrondir } from '../utils/format.js';
import { CREDIT } from './modeles.js';

// Une vente annulée ne compte nulle part (stats, totaux, clôture)
export const venteValide = (v) => !v.annulee;

// Début de la période à clôturer : dernière clôture d'aujourd'hui, sinon minuit
export function debutCloture(clotures, maintenant = new Date()) {
  const minuit = new Date(maintenant);
  minuit.setHours(0, 0, 0, 0);
  const derniere = (clotures || [])
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
  const remboursements = (d.remboursements || []).filter((r) => dansPeriode(r));

  // Total par mode de paiement (dans l'ordre du commerce, + Crédit s'il y en a)
  const modes = [...d.commerce.modesPaiement];
  if (ventes.some((v) => v.paiement === CREDIT)) modes.push(CREDIT);
  // Chaque mode donne : total vendu, crédits remboursés reçus par ce mode, et « recu » = ce que le vendeur a vraiment reçu
  // (le Crédit n'est pas de l'argent reçu : il reste dans le carnet)
  const parPaiement = modes.map((mode) => {
    const liste = ventes.filter((v) => v.paiement === mode);
    const total = arrondir(liste.reduce((s, v) => s + v.total, 0), dev);
    const rembourse = arrondir(remboursements.filter((r) => r.mode === mode).reduce((s, r) => s + r.montant, 0), dev);
    return { mode, nb: liste.length, total, rembourse, recu: mode === CREDIT ? 0 : arrondir(total + rembourse, dev) };
  });

  // Total vendu par article (pour faciliter les comptes à la fermeture)
  const articles = new Map();
  for (const v of ventes) {
    for (const l of v.lignes) {
      const nom = l.produitNom || l.nom.split(' – ')[0];
      const a = articles.get(nom) || { nom, quantite: 0, total: 0 };
      a.quantite += l.quantite;
      a.total = arrondir(a.total + l.total, dev);
      articles.set(nom, a);
    }
  }
  const parArticle = [...articles.values()].sort((a, b) => b.quantite - a.quantite || b.total - a.total);

  const ventesEspeces = parPaiement.find((p) => p.mode === 'Espèces')?.total || 0;
  const remboursementsEspeces = arrondir(
    remboursements.filter((r) => r.mode === 'Espèces').reduce((s, r) => s + r.montant, 0), dev
  );
  const depensesCaisse = arrondir(depenses.reduce((s, x) => s + x.montant, 0), dev);
  const fond = Number(fondDeCaisse) || 0;
  return {
    debut: debut.toISOString(),
    fin: fin.toISOString(),
    nbVentes: ventes.length,
    nbAnnulees: annulees.length,
    totalVentes: arrondir(ventes.reduce((s, v) => s + v.total, 0), dev),
    totalRemises: arrondir(ventes.reduce((s, v) => s + (v.remise || 0), 0), dev),
    parPaiement,
    totalRecu: arrondir(parPaiement.reduce((s, p) => s + p.recu, 0), dev),
    parArticle,
    nbArticles: parArticle.reduce((s, a) => s + a.quantite, 0),
    fondDeCaisse: fond,
    ventesEspeces,
    remboursementsEspeces,
    depensesCaisse,
    attendu: arrondir(fond + ventesEspeces + remboursementsEspeces - depensesCaisse, dev),
  };
}

// ------------------------------------------------------------
// JOURNÉES DE CAISSE : ouverture le matin, fermeture le soir.
// d.sessionsCaisse = [{ id, ouverteLe, ouvertePar, fondDeCaisse, noteOuverture,
//                       fermeLe, fermePar, cloture }]   (cloture = résumé de fermeture)
// ------------------------------------------------------------

// La journée de vente en cours (ouverte et pas encore fermée), ou null
export function caisseOuverte(d) {
  return (d?.sessionsCaisse || []).find((x) => !x.fermeLe) || null;
}

// Historique, la plus récente en premier
export function historiqueCaisse(d) {
  return [...(d?.sessionsCaisse || [])].sort((a, b) => b.ouverteLe.localeCompare(a.ouverteLe));
}

// Anciennes données (avant l'ouverture de la journée) : chaque clôture devient une journée
export function migrerClotures(d) {
  if (d.sessionsCaisse) return false;
  d.sessionsCaisse = (d.clotures || []).map((cl) => ({
    id: 's-' + cl.id,
    ouverteLe: cl.debut,
    ouvertePar: '—',
    fondDeCaisse: cl.fondDeCaisse,
    fermeLe: cl.date,
    fermePar: cl.utilisateurNom,
    cloture: cl,
  }));
  return true;
}
