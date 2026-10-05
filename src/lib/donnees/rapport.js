// ------------------------------------------------------------
// RAPPORT D'ACTIVITÉ (jour, semaine, mois ou année) : toutes les données du commerce pour la période,
// sous forme de tableaux prêts à être mis en page en Excel ou en PDF (voir src/lib/export/).
//
// Règles de calcul (les mêmes que le tableau de bord et la fermeture de la journée) :
//  - une vente annulée ne compte nulle part (elle est seulement listée, marquée « Annulée ») ;
//  - le chiffre d'affaires = total des ventes valides de la période ; solde = ventes − dépenses (avant les autres charges) ;
//  - « Total reçu » = ce qui a vraiment été reçu (ventes payées par chaque mode + crédits remboursés) : le crédit n'est pas de l'argent reçu ;
//  - marge brute = prix de vente − prix d'achat, seulement quand le prix d'achat est connu ;
//  - montants arrondis selon la devise (FCFA et GNF sans décimale, les autres à 2 décimales).
// La période commence à minuit (heure de l'appareil) et se termine avant le début de la suivante.
// ------------------------------------------------------------
import { arrondir } from '../utils/format.js';
import { localeIntl, tr, tt } from '../i18n/index.js';
import { coutVente } from './vente.js';
import { venteValide } from './cloture.js';
import { CREDIT } from './modeles.js';
import { clientsAvecSolde } from './credit.js';
import { stockDe } from './stock.js';

export const PERIODES_RAPPORT = ['jour', 'semaine', 'mois', 'annee'];

// ---------- Dates ----------

/** Début (inclus) et fin (exclue) de la période qui contient `ref`, à l'heure de l'appareil. */
export function bornesPeriode(type, ref = new Date()) {
  const debut = new Date(ref);
  debut.setHours(0, 0, 0, 0);
  if (type === 'semaine') debut.setDate(debut.getDate() - ((debut.getDay() + 6) % 7)); // lundi
  if (type === 'mois') debut.setDate(1);
  if (type === 'annee') debut.setMonth(0, 1);
  const fin = new Date(debut);
  if (type === 'jour') fin.setDate(fin.getDate() + 1);
  else if (type === 'semaine') fin.setDate(fin.getDate() + 7);
  else if (type === 'mois') fin.setMonth(fin.getMonth() + 1);
  else fin.setFullYear(fin.getFullYear() + 1);
  return { debut, fin };
}

const deuxChiffres = (n) => String(n).padStart(2, '0');
const jourIso = (d) => `${d.getFullYear()}-${deuxChiffres(d.getMonth() + 1)}-${deuxChiffres(d.getDate())}`;
const majuscule = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const intl = (options, date) => majuscule(new Intl.DateTimeFormat(localeIntl(), options).format(date));

/** Titre lisible de la période et partie de nom de fichier. */
export function titrePeriode(type, debut, fin) {
  const veille = new Date(fin.getTime() - 1);
  if (type === 'jour') return { titre: intl({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }, debut), fichier: jourIso(debut) };
  if (type === 'semaine') {
    const court = { day: 'numeric', month: 'long', year: 'numeric' };
    return {
      titre: tr('Semaine du {0} au {1}', [new Intl.DateTimeFormat(localeIntl(), court).format(debut), new Intl.DateTimeFormat(localeIntl(), court).format(veille)]),
      fichier: jourIso(debut) + '_' + jourIso(veille),
    };
  }
  if (type === 'mois') return { titre: intl({ month: 'long', year: 'numeric' }, debut), fichier: `${debut.getFullYear()}-${deuxChiffres(debut.getMonth() + 1)}` };
  return { titre: String(debut.getFullYear()), fichier: String(debut.getFullYear()) };
}

// ---------- Calcul ----------

// Les « tranches » de l'évolution : heures d'un jour, jours d'une semaine ou d'un mois, mois d'une année
function tranches(type, debut, fin) {
  const liste = [];
  const nb = type === 'jour' ? 24 : type === 'semaine' ? 7 : type === 'mois' ? Math.round((fin - debut) / 86400000) : 12;
  for (let i = 0; i < nb; i++) {
    let label;
    if (type === 'jour') label = `${i}h – ${i + 1}h`;
    else if (type === 'annee') label = intl({ month: 'long' }, new Date(debut.getFullYear(), i, 1));
    else {
      const j = new Date(debut);
      j.setDate(debut.getDate() + i);
      label = type === 'semaine' ? intl({ weekday: 'long', day: 'numeric', month: 'numeric' }, j) : intl({ day: 'numeric', month: 'long' }, j);
    }
    liste.push({ label, tickets: 0, ventes: 0, depenses: 0 });
  }
  return liste;
}
const indexTranche = (type, date, debut) => {
  if (type === 'jour') return date.getHours();
  if (type === 'semaine') return (date.getDay() + 6) % 7;
  if (type === 'mois') return date.getDate() - 1;
  return date.getMonth();
};

/**
 * Construit le rapport.
 * type : 'jour' | 'semaine' | 'mois' | 'annee' · ref : une date de la période voulue.
 * Renvoie { meta, resume, tableaux } :
 *  - resume : lignes « libellé / valeur » (type : montant | entier | pourcent | texte) ;
 *  - tableaux : [{ id, titre, colonnes: [{ cle, titre, type, largeur }], lignes, total }] (type : texte | entier | montant | quantite | pourcent | date | datetime | heure).
 */
export function construireRapport(d, type = 'jour', ref = new Date(), maintenant = new Date()) {
  const dev = d.commerce.devise;
  const R = (x) => arrondir(x, dev);
  const { debut, fin } = bornesPeriode(type, ref);
  const dans = (iso) => { const t = new Date(iso); return t >= debut && t < fin; };
  const parDate = (a, b) => String(a.date).localeCompare(String(b.date));

  const ventes = (d.ventes || []).filter((v) => dans(v.date)).sort(parDate);
  const valides = ventes.filter(venteValide);
  const annulees = ventes.filter((v) => v.annulee);
  const depenses = (d.depenses || []).filter((x) => dans(x.date)).sort(parDate);
  const remboursements = (d.remboursements || []).filter((r) => dans(r.date)).sort(parDate);

  // ----- Totaux -----
  const somme = (liste, champ) => R(liste.reduce((s, x) => s + (Number(x[champ]) || 0), 0));
  const chiffreAffaires = somme(valides, 'total');
  const nbTickets = valides.length;
  const totalDepenses = somme(depenses, 'montant');
  let marge = 0, margeConnue = false;
  for (const v of valides) {
    const cout = coutVente(v);
    if (cout !== null) { marge += v.total - cout; margeConnue = true; }
  }
  const articlesVendus = valides.reduce((s, v) => s + v.lignes.reduce((n, l) => n + (Number(l.quantite) || 0), 0), 0);

  // ----- Par mode de paiement : modes du commerce, puis ceux qui apparaissent dans les données, le crédit à la fin -----
  const modes = [...d.commerce.modesPaiement];
  for (const m of [...valides.map((v) => v.paiement), ...remboursements.map((r) => r.mode)]) if (m && m !== CREDIT && !modes.includes(m)) modes.push(m);
  if (valides.some((v) => v.paiement === CREDIT)) modes.push(CREDIT);
  const parPaiement = modes.map((mode) => {
    const liste = valides.filter((v) => v.paiement === mode);
    const total = somme(liste, 'total');
    const rembourse = R(remboursements.filter((r) => r.mode === mode).reduce((s, r) => s + r.montant, 0));
    return { mode: tt(mode), nb: liste.length, total, rembourse, recu: mode === CREDIT ? 0 : R(total + rembourse) };
  });
  const totalRecu = R(parPaiement.reduce((s, p) => s + p.recu, 0));
  const aCredit = somme(valides.filter((v) => v.paiement === CREDIT), 'total');
  const totalRembourse = somme(remboursements, 'montant');

  // ----- Résumé -----
  const resume = [
    { cle: 'ca', libelle: tr('Chiffre d’affaires'), valeur: chiffreAffaires, type: 'montant', fort: true },
    { cle: 'tickets', libelle: tr('Nombre de tickets'), valeur: nbTickets, type: 'entier' },
    { cle: 'panier', libelle: tr('Panier moyen'), valeur: nbTickets ? R(chiffreAffaires / nbTickets) : 0, type: 'montant' },
    { cle: 'articles', libelle: tr('Articles vendus'), valeur: articlesVendus, type: 'quantite' },
    { cle: 'remises', libelle: tr('Remises accordées'), valeur: somme(valides, 'remise'), type: 'montant' },
    { cle: 'recu', libelle: tr('Total reçu (hors crédit)'), valeur: totalRecu, type: 'montant' },
    { cle: 'credit', libelle: tr('Vendu à crédit'), valeur: aCredit, type: 'montant' },
    { cle: 'rembourse', libelle: tr('Crédits remboursés'), valeur: totalRembourse, type: 'montant' },
    { cle: 'depenses', libelle: tr('Dépenses'), valeur: totalDepenses, type: 'montant' },
    { cle: 'solde', libelle: tr('Solde (ventes − dépenses)'), valeur: R(chiffreAffaires - totalDepenses), type: 'montant', fort: true },
    ...(margeConnue ? [
      { cle: 'marge', libelle: tr('Marge brute'), valeur: R(marge), type: 'montant' },
      { cle: 'tauxMarge', libelle: tr('Taux de marge'), valeur: chiffreAffaires ? Math.round((marge / chiffreAffaires) * 100) : 0, type: 'pourcent' },
    ] : []),
    { cle: 'annulees', libelle: tr('Ventes annulées (non comptées)'), valeur: annulees.length, type: 'entier' },
    { cle: 'montantAnnule', libelle: tr('Montant des ventes annulées'), valeur: somme(annulees, 'total'), type: 'montant' },
  ];

  const tableaux = [];

  // ----- Évolution (heure, jour ou mois) -----
  const evolution = tranches(type, debut, fin);
  for (const v of valides) { const t = evolution[indexTranche(type, new Date(v.date), debut)]; t.tickets++; t.ventes += v.total; }
  for (const x of depenses) evolution[indexTranche(type, new Date(x.date), debut)].depenses += x.montant;
  const lignesEvolution = evolution.map((t) => ({ ...t, ventes: R(t.ventes), depenses: R(t.depenses), solde: R(t.ventes - t.depenses) }));
  tableaux.push({
    id: 'evolution',
    titre: type === 'jour' ? tr('Ventes par heure') : type === 'annee' ? tr('Ventes par mois') : tr('Ventes par jour'),
    colonnes: [
      { cle: 'label', titre: type === 'jour' ? tr('Heure') : type === 'annee' ? tr('Mois') : tr('Jour'), type: 'texte', largeur: 22 },
      { cle: 'tickets', titre: tr('Tickets'), type: 'entier', largeur: 10 },
      { cle: 'ventes', titre: tr('Ventes'), type: 'montant', largeur: 16 },
      { cle: 'depenses', titre: tr('Dépenses'), type: 'montant', largeur: 16 },
      { cle: 'solde', titre: tr('Solde'), type: 'montant', largeur: 16 },
    ],
    lignes: lignesEvolution,
    total: { label: tr('Total'), tickets: nbTickets, ventes: chiffreAffaires, depenses: totalDepenses, solde: R(chiffreAffaires - totalDepenses) },
  });

  // ----- Par mode de paiement -----
  tableaux.push({
    id: 'paiements',
    titre: tr('Par mode de paiement'),
    colonnes: [
      { cle: 'mode', titre: tr('Mode de paiement'), type: 'texte', largeur: 24 },
      { cle: 'nb', titre: tr('Tickets'), type: 'entier', largeur: 10 },
      { cle: 'total', titre: tr('Total vendu'), type: 'montant', largeur: 16 },
      { cle: 'rembourse', titre: tr('+ Crédits remboursés'), type: 'montant', largeur: 20 },
      { cle: 'recu', titre: tr('Total reçu'), type: 'montant', largeur: 16 },
    ],
    lignes: parPaiement,
    total: { mode: tr('Total'), nb: nbTickets, total: chiffreAffaires, rembourse: totalRembourse, recu: totalRecu },
  });

  // ----- Ventes (un ticket par ligne, annulées comprises mais marquées) -----
  tableaux.push({
    id: 'ventes',
    titre: tr('Ventes (détail des tickets)'),
    colonnes: [
      { cle: 'numero', titre: tr('N° ticket'), type: 'texte', largeur: 10 },
      { cle: 'date', titre: tr('Date'), type: 'date', largeur: 12 },
      { cle: 'heure', titre: tr('Heure'), type: 'heure', largeur: 8 },
      { cle: 'vendeur', titre: tr('Vendeur'), type: 'texte', largeur: 18 },
      { cle: 'paiement', titre: tr('Paiement'), type: 'texte', largeur: 14 },
      { cle: 'client', titre: tr('Client'), type: 'texte', largeur: 18 },
      { cle: 'table', titre: tr('Table'), type: 'texte', largeur: 12 },
      { cle: 'nbArticles', titre: tr('Articles'), type: 'quantite', largeur: 9 },
      { cle: 'detail', titre: tr('Détail'), type: 'texte', largeur: 40 },
      { cle: 'sousTotal', titre: tr('Sous-total'), type: 'montant', largeur: 14 },
      { cle: 'remise', titre: tr('Remise'), type: 'montant', largeur: 12 },
      { cle: 'total', titre: tr('Total'), type: 'montant', largeur: 14 },
      { cle: 'statut', titre: tr('Statut'), type: 'texte', largeur: 10 },
      { cle: 'motif', titre: tr('Motif d’annulation'), type: 'texte', largeur: 22 },
    ],
    lignes: ventes.map((v) => {
      const date = new Date(v.date);
      return {
        numero: v.numero != null ? String(v.numero) : '',
        date, heure: date,
        vendeur: v.vendeurNom || '', paiement: tt(v.paiement) || '', client: v.clientNom || '', table: v.table || '',
        nbArticles: v.lignes.reduce((n, l) => n + (Number(l.quantite) || 0), 0),
        detail: v.lignes.map((l) => `${l.quantite} × ${l.nom}`).join(' ; '),
        sousTotal: R(v.sousTotal ?? v.total), remise: R(v.remise || 0), total: R(v.total),
        statut: v.annulee ? tr('Annulée') : tr('Valide'), motif: v.annulee?.motif || '',
        annulee: !!v.annulee,
      };
    }),
    // Le total ne compte que les ventes valides
    total: { numero: tr('Total (ventes valides)'), nbArticles: articlesVendus, sousTotal: R(valides.reduce((s, v) => s + (v.sousTotal ?? v.total), 0)), remise: somme(valides, 'remise'), total: chiffreAffaires },
  });

  // ----- Articles vendus -----
  const produitsParId = new Map((d.produits || []).map((p) => [p.id, p]));
  const categories = new Map((d.categories || []).map((c) => [c.id, c.nom]));
  const articles = new Map();
  for (const v of valides) {
    for (const l of v.lignes) {
      const nom = l.produitNom || String(l.nom).split(' – ')[0];
      const cle = l.produitId || nom;
      const p = produitsParId.get(l.produitId);
      const a = articles.get(cle) || { nom, categorie: p ? categories.get(p.categorieId) || '' : '', unite: p ? tt(p.unite || 'pièce') : '', quantite: 0, total: 0, cout: 0, coutConnu: false };
      a.quantite += Number(l.quantite) || 0;
      a.total += l.total;
      if (l.coutUnitaire !== null && l.coutUnitaire !== undefined) { a.cout += l.coutUnitaire * l.quantite; a.coutConnu = true; }
      articles.set(cle, a);
    }
  }
  // Les montants des articles sont ceux des lignes de ticket, AVANT les remises faites sur l'ensemble d'un ticket :
  // leur total égale donc le sous-total des ventes valides (et non le chiffre d'affaires s'il y a eu des remises)
  const totalLignes = R([...articles.values()].reduce((s, a) => s + a.total, 0));
  const lignesArticles = [...articles.values()].sort((a, b) => b.total - a.total || a.nom.localeCompare(b.nom)).map((a) => ({
    nom: a.nom, categorie: a.categorie, unite: a.unite, quantite: Math.round(a.quantite * 1000) / 1000, total: R(a.total),
    part: totalLignes ? Math.round((a.total / totalLignes) * 1000) / 10 : 0,
    marge: a.coutConnu ? R(a.total - a.cout) : null,
  }));
  const margeArticles = lignesArticles.some((l) => l.marge !== null) ? R(lignesArticles.reduce((s, l) => s + (l.marge || 0), 0)) : null;
  tableaux.push({
    id: 'articles',
    titre: tr('Articles vendus'),
    colonnes: [
      { cle: 'nom', titre: tr('Article'), type: 'texte', largeur: 30 },
      { cle: 'categorie', titre: tr('Catégorie'), type: 'texte', largeur: 18 },
      { cle: 'unite', titre: tr('Unité'), type: 'texte', largeur: 10 },
      { cle: 'quantite', titre: tr('Quantité'), type: 'quantite', largeur: 11 },
      { cle: 'total', titre: tr('Chiffre d’affaires'), type: 'montant', largeur: 18 },
      { cle: 'part', titre: tr('Part (%)'), type: 'pourcent', largeur: 9 },
      { cle: 'marge', titre: tr('Marge brute'), type: 'montant', largeur: 15 },
    ],
    lignes: lignesArticles,
    total: { nom: tr('Total'), quantite: Math.round(articlesVendus * 1000) / 1000, total: totalLignes, part: lignesArticles.length ? 100 : 0, marge: margeArticles },
    note: somme(valides, 'remise') > 0 ? tr('Montants avant les remises faites sur l’ensemble d’un ticket.') : null,
  });

  // ----- Vendeurs -----
  const vendeurs = new Map();
  for (const v of valides) {
    const cle = v.vendeurId || v.vendeurNom;
    const e = vendeurs.get(cle) || { nom: v.vendeurNom || '', nb: 0, total: 0 };
    e.nb++; e.total += v.total;
    vendeurs.set(cle, e);
  }
  const lignesVendeurs = [...vendeurs.values()].sort((a, b) => b.total - a.total).map((e) => ({ nom: e.nom, nb: e.nb, total: R(e.total), panier: R(e.total / e.nb) }));
  tableaux.push({
    id: 'vendeurs',
    titre: tr('Par vendeur'),
    colonnes: [
      { cle: 'nom', titre: tr('Vendeur'), type: 'texte', largeur: 26 },
      { cle: 'nb', titre: tr('Tickets'), type: 'entier', largeur: 10 },
      { cle: 'total', titre: tr('Ventes'), type: 'montant', largeur: 16 },
      { cle: 'panier', titre: tr('Panier moyen'), type: 'montant', largeur: 16 },
    ],
    lignes: lignesVendeurs,
    total: { nom: tr('Total'), nb: nbTickets, total: chiffreAffaires, panier: nbTickets ? R(chiffreAffaires / nbTickets) : 0 },
  });

  // ----- Dépenses -----
  tableaux.push({
    id: 'depenses',
    titre: tr('Dépenses'),
    colonnes: [
      { cle: 'date', titre: tr('Date'), type: 'date', largeur: 12 },
      { cle: 'categorie', titre: tr('Catégorie'), type: 'texte', largeur: 24 },
      { cle: 'note', titre: tr('Note'), type: 'texte', largeur: 36 },
      { cle: 'espaces', titre: tr('Payée avec les espèces du jour'), type: 'texte', largeur: 16 },
      { cle: 'montant', titre: tr('Montant'), type: 'montant', largeur: 16 },
    ],
    lignes: depenses.map((x) => ({ date: new Date(x.date), categorie: tt(x.categorie) || '', note: x.note || '', espaces: x.depuisCaisse ? tr('Oui') : tr('Non'), montant: R(x.montant) })),
    total: { categorie: tr('Total'), montant: totalDepenses },
  });

  // ----- Crédit : remboursements reçus dans la période, puis ce que les clients doivent aujourd'hui -----
  const clients = new Map((d.clients || []).map((c) => [c.id, c]));
  tableaux.push({
    id: 'remboursements',
    titre: tr('Crédits remboursés'),
    colonnes: [
      { cle: 'date', titre: tr('Date'), type: 'date', largeur: 12 },
      { cle: 'client', titre: tr('Client'), type: 'texte', largeur: 28 },
      { cle: 'mode', titre: tr('Mode'), type: 'texte', largeur: 16 },
      { cle: 'montant', titre: tr('Montant'), type: 'montant', largeur: 16 },
    ],
    lignes: remboursements.map((r) => ({ date: new Date(r.date), client: clients.get(r.clientId)?.nom || r.clientNom || '', mode: tt(r.mode) || '', montant: R(r.montant) })),
    total: { client: tr('Total'), montant: totalRembourse },
  });
  const dus = clientsAvecSolde(d).filter((c) => c.solde > 0);
  tableaux.push({
    id: 'creditsDus',
    titre: tr('Ce que les clients doivent (carnet de crédit)'),
    colonnes: [
      { cle: 'nom', titre: tr('Client'), type: 'texte', largeur: 28 },
      { cle: 'telephone', titre: tr('Téléphone'), type: 'texte', largeur: 18 },
      { cle: 'dernier', titre: tr('Dernier mouvement'), type: 'date', largeur: 18 },
      { cle: 'solde', titre: tr('Doit'), type: 'montant', largeur: 16 },
    ],
    lignes: dus.map((c) => ({ nom: c.nom, telephone: c.telephone || '', dernier: c.dernier ? new Date(c.dernier) : null, solde: R(c.solde) })),
    total: { nom: tr('Total'), solde: R(dus.reduce((s, c) => s + c.solde, 0)) },
    note: tr('Situation à la date de l’export, tous achats à crédit confondus.'),
  });

  // ----- Journées de vente (ouverture / fermeture) de la période -----
  const journees = (d.sessionsCaisse || []).filter((s) => dans(s.fermeLe || s.ouverteLe)).sort((a, b) => String(a.ouverteLe).localeCompare(String(b.ouverteLe)));
  tableaux.push({
    id: 'journees',
    titre: tr('Journées de vente (ouverture et fermeture)'),
    colonnes: [
      { cle: 'ouverteLe', titre: tr('Ouverte le'), type: 'datetime', largeur: 18 },
      { cle: 'ouvertePar', titre: tr('Ouverte par'), type: 'texte', largeur: 16 },
      { cle: 'fermeLe', titre: tr('Fermée le'), type: 'datetime', largeur: 18 },
      { cle: 'fermePar', titre: tr('Fermée par'), type: 'texte', largeur: 16 },
      { cle: 'fond', titre: tr('Fond de départ'), type: 'montant', largeur: 15 },
      { cle: 'ventes', titre: tr('Ventes'), type: 'montant', largeur: 15 },
      { cle: 'recu', titre: tr('Total reçu'), type: 'montant', largeur: 15 },
      { cle: 'attendu', titre: tr('Espèces attendues'), type: 'montant', largeur: 17 },
      { cle: 'compte', titre: tr('Espèces comptées'), type: 'montant', largeur: 17 },
      { cle: 'ecart', titre: tr('Écart'), type: 'montant', largeur: 12 },
    ],
    lignes: journees.map((s) => ({
      ouverteLe: new Date(s.ouverteLe), ouvertePar: s.ouvertePar || '', fermeLe: s.fermeLe ? new Date(s.fermeLe) : null, fermePar: s.fermePar || '',
      fond: R(s.fondDeCaisse || 0), ventes: s.cloture ? R(s.cloture.totalVentes) : null, recu: s.cloture?.totalRecu != null ? R(s.cloture.totalRecu) : null,
      attendu: s.cloture ? R(s.cloture.attendu) : null, compte: s.cloture?.compte != null ? R(s.cloture.compte) : null, ecart: s.cloture?.ecart != null ? R(s.cloture.ecart) : null,
    })),
    total: null,
  });

  // ----- Stock actuel (articles dont le stock est suivi) -----
  const suivis = (d.produits || []).filter((p) => p.actif !== false && p.suiviStock);
  if (suivis.length) {
    const lignesStock = suivis.map((p) => {
      const q = Number(stockDe(p)) || 0;
      const seuil = p.seuilAlerte ?? 5;
      return {
        nom: p.nom, categorie: categories.get(p.categorieId) || '', unite: tt(p.unite || 'pièce'), quantite: q, seuil,
        prixAchat: p.prixAchat ? R(p.prixAchat) : null, prix: R(p.prix),
        valeurAchat: R(q * (p.prixAchat || 0)), valeurVente: R(q * p.prix),
        etat: q <= 0 ? tr('Rupture') : q <= seuil ? tr('Stock bas') : 'OK',
      };
    }).sort((a, b) => a.categorie.localeCompare(b.categorie) || a.nom.localeCompare(b.nom));
    tableaux.push({
      id: 'stock',
      titre: tr('Stock à la date de l’export'),
      colonnes: [
        { cle: 'nom', titre: tr('Article'), type: 'texte', largeur: 30 },
        { cle: 'categorie', titre: tr('Catégorie'), type: 'texte', largeur: 18 },
        { cle: 'unite', titre: tr('Unité'), type: 'texte', largeur: 10 },
        { cle: 'quantite', titre: tr('Quantité'), type: 'quantite', largeur: 11 },
        { cle: 'seuil', titre: tr('Alerte à partir de'), type: 'quantite', largeur: 14 },
        { cle: 'prixAchat', titre: tr('Prix d’achat'), type: 'montant', largeur: 14 },
        { cle: 'prix', titre: tr('Prix de vente'), type: 'montant', largeur: 14 },
        { cle: 'valeurAchat', titre: tr('Valeur au prix d’achat'), type: 'montant', largeur: 20 },
        { cle: 'valeurVente', titre: tr('Valeur à la vente'), type: 'montant', largeur: 18 },
        { cle: 'etat', titre: tr('État'), type: 'texte', largeur: 11 },
      ],
      lignes: lignesStock,
      total: { nom: tr('Total'), valeurAchat: R(lignesStock.reduce((s, l) => s + l.valeurAchat, 0)), valeurVente: R(lignesStock.reduce((s, l) => s + l.valeurVente, 0)) },
    });
  }

  const { titre, fichier } = titrePeriode(type, debut, fin);
  return {
    meta: {
      type, debut, fin, titre, fichier, devise: dev, genereLe: maintenant,
      commerce: { nom: d.commerce.nom, ville: d.commerce.ville || '', telephone: d.commerce.telephone || '', adresse: d.commerce.adresse || '' },
      vide: !ventes.length && !depenses.length && !remboursements.length,
    },
    resume,
    tableaux,
  };
}
