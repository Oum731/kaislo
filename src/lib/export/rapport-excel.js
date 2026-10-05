// ------------------------------------------------------------
// RAPPORT EXCEL (.xlsx) : un vrai classeur, pas un simple fichier de texte.
//  - une feuille « Résumé » (indicateurs et modes de paiement) puis une feuille par tableau (ventes, articles, dépenses…) ;
//  - montants, quantités, pourcentages et dates sont de vrais nombres et de vraies dates (tri, filtres et formules possibles) ;
//  - ligne d'en-tête figée avec filtres, largeurs de colonnes, ligne de total, mise en page paysage prête à imprimer.
// Les données viennent de construireRapport() (src/lib/donnees/rapport.js) : les mêmes que pour le PDF.
// ------------------------------------------------------------
import { tr, localeIntl } from '../i18n/index.js';

const VERT = 'FF1E5B43';
const VERT_CLAIR = 'FFEAF2EE';
const GRIS = 'FF9A9A9A';
const BORDURE = { style: 'thin', color: { argb: 'FFD9DDD8' } };
const BORDURES = { top: BORDURE, left: BORDURE, bottom: BORDURE, right: BORDURE };

// Excel compte les dates en heure « UTC » : on lui donne les chiffres de l'heure locale de l'appareil
// pour que la date et l'heure affichées soient exactement celles du ticket (sans décalage).
export const versDateExcel = (date) => new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()));

const decimales = (devise) => (devise === 'FCFA' || devise === 'GNF' ? 0 : 2);
const formatMontant = (devise) => (decimales(devise) ? '#,##0.00;[Red]-#,##0.00' : '#,##0;[Red]-#,##0');

// Valeur et format d'une cellule selon le type de la colonne
function cellule(type, valeur, devise) {
  if (valeur === null || valeur === undefined || valeur === '') return { valeur: null, format: undefined };
  switch (type) {
    case 'montant': return { valeur: Number(valeur), format: formatMontant(devise) };
    case 'entier': return { valeur: Number(valeur), format: '#,##0' };
    case 'quantite': return { valeur: Number(valeur), format: Number.isInteger(Number(valeur)) ? '#,##0' : '#,##0.###' };
    case 'pourcent': return { valeur: Number(valeur) / 100, format: '0.0%' }; // 12,3 devient 12,3 % (vrai pourcentage Excel)
    case 'date': return { valeur: versDateExcel(new Date(valeur.getFullYear(), valeur.getMonth(), valeur.getDate())), format: 'dd/mm/yyyy' }; // sans l'heure : tri et filtres par jour
    case 'datetime': return { valeur: versDateExcel(valeur), format: 'dd/mm/yyyy hh:mm' };
    case 'heure': return { valeur: versDateExcel(valeur), format: 'hh:mm' };
    default: return { valeur: String(valeur), format: undefined };
  }
}

// Nom de feuille valide : 31 caractères au plus, sans * ? : \ / [ ]
const nomFeuille = (titre, deja) => {
  let base = String(titre).replace(/[*?:\\/[\]]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31) || 'Feuille';
  let nom = base, n = 2;
  while (deja.has(nom.toLowerCase())) nom = base.slice(0, 28) + ' ' + n++;
  deja.add(nom.toLowerCase());
  return nom;
};

// Écrit un tableau à partir de la ligne `debut` ; renvoie { ligneEntete, derniere, suivante }
function ecrireTableau(feuille, t, debut, devise, { titre = true } = {}) {
  let ligne = debut;
  if (titre) {
    const c = feuille.getCell(ligne, 1);
    c.value = t.titre;
    c.font = { bold: true, size: 13, color: { argb: VERT } };
    ligne++;
    if (t.note) { feuille.getCell(ligne, 1).value = t.note; feuille.getCell(ligne, 1).font = { italic: true, color: { argb: GRIS }, size: 9 }; ligne++; }
  }
  const entete = ligne;
  t.colonnes.forEach((col, i) => {
    const c = feuille.getCell(ligne, i + 1);
    c.value = col.titre;
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERT } };
    c.alignment = { vertical: 'middle', horizontal: ['montant', 'entier', 'quantite', 'pourcent'].includes(col.type) ? 'right' : 'left', wrapText: true };
    c.border = BORDURES;
  });
  feuille.getRow(ligne).height = 22;
  ligne++;
  const premiere = ligne;
  for (const l of t.lignes) {
    t.colonnes.forEach((col, i) => {
      const { valeur, format } = cellule(col.type, l[col.cle], devise);
      const c = feuille.getCell(ligne, i + 1);
      c.value = valeur;
      if (format) c.numFmt = format;
      c.border = BORDURES;
      c.alignment = { vertical: 'top', wrapText: col.cle === 'detail', horizontal: ['montant', 'entier', 'quantite', 'pourcent'].includes(col.type) ? 'right' : 'left' };
      if (l.annulee) c.font = { italic: true, color: { argb: 'FF9A3B2E' } }; // vente annulée : en rouge, non comptée
    });
    ligne++;
  }
  if (!t.lignes.length) {
    feuille.getCell(ligne, 1).value = tr('Aucune donnée pour cette période.');
    feuille.getCell(ligne, 1).font = { italic: true, color: { argb: GRIS } };
    ligne++;
  } else if (t.total) {
    t.colonnes.forEach((col, i) => {
      const { valeur, format } = cellule(col.type, t.total[col.cle], devise);
      const c = feuille.getCell(ligne, i + 1);
      c.value = valeur;
      if (format) c.numFmt = format;
      c.font = { bold: true };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERT_CLAIR } };
      c.border = { ...BORDURES, top: { style: 'medium', color: { argb: VERT } } };
      c.alignment = { horizontal: ['montant', 'entier', 'quantite', 'pourcent'].includes(col.type) ? 'right' : 'left' };
    });
    ligne++;
  }
  return { entete, premiere, derniere: premiere + Math.max(t.lignes.length, 1) - 1, suivante: ligne + 1 };
}

function mettreEnPage(feuille, colonnes) {
  feuille.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } };
  feuille.headerFooter = { oddFooter: '&LKaislo&CPage &P / &N&R&D' };
  if (colonnes) colonnes.forEach((col, i) => { feuille.getColumn(i + 1).width = col.largeur || 14; });
}

/** Construit le classeur Excel du rapport (objet ExcelJS). */
export async function classeurRapport(rapport) {
  const ExcelJS = (await import('exceljs')).default;
  const { meta, resume, tableaux } = rapport;
  const dev = meta.devise;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Kaislo';
  wb.created = versDateExcel(meta.genereLe);
  wb.title = `${meta.commerce.nom} — ${meta.titre}`;
  const noms = new Set();

  // ----- Résumé -----
  const f = wb.addWorksheet(nomFeuille(tr('Résumé'), noms), { properties: { tabColor: { argb: VERT } } });
  mettreEnPage(f, [{ largeur: 38 }, { largeur: 20 }, { largeur: 16 }, { largeur: 22 }, { largeur: 16 }]);
  f.getCell('A1').value = meta.commerce.nom;
  f.getCell('A1').font = { bold: true, size: 18, color: { argb: VERT } };
  f.getCell('A2').value = tr('Rapport d’activité') + ' — ' + meta.titre;
  f.getCell('A2').font = { bold: true, size: 12 };
  f.getCell('A3').value = [meta.commerce.ville, meta.commerce.telephone].filter(Boolean).join(' · ') + (meta.commerce.ville || meta.commerce.telephone ? ' · ' : '') + tr('Devise : {0}', [dev]);
  f.getCell('A3').font = { color: { argb: GRIS } };
  f.getCell('A4').value = tr('Généré par Kaislo le {0}', [new Intl.DateTimeFormat(localeIntl(), { dateStyle: 'long', timeStyle: 'short' }).format(meta.genereLe)]);
  f.getCell('A4').font = { color: { argb: GRIS }, size: 9 };
  const kpis = { id: 'resume', titre: tr('Indicateurs'), colonnes: [{ cle: 'libelle', titre: tr('Indicateur'), type: 'texte' }, { cle: 'valeur', titre: tr('Valeur'), type: 'montant' }], lignes: [], total: null };
  let ligne = 6;
  f.getCell(ligne, 1).value = kpis.titre;
  f.getCell(ligne, 1).font = { bold: true, size: 13, color: { argb: VERT } };
  ligne++;
  [tr('Indicateur'), tr('Valeur')].forEach((titre, i) => {
    const c = f.getCell(ligne, i + 1);
    c.value = titre; c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERT } }; c.border = BORDURES;
    c.alignment = { horizontal: i ? 'right' : 'left' };
  });
  ligne++;
  for (const r of resume) {
    const a = f.getCell(ligne, 1); a.value = r.libelle; a.border = BORDURES; if (r.fort) a.font = { bold: true };
    const { valeur, format } = cellule(r.type, r.valeur, dev);
    const b = f.getCell(ligne, 2); b.value = valeur; if (format) b.numFmt = format; b.border = BORDURES; b.alignment = { horizontal: 'right' };
    if (r.fort) { b.font = { bold: true }; a.fill = b.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERT_CLAIR } }; }
    ligne++;
  }
  ligne += 1;
  for (const id of ['paiements']) {
    const t = tableaux.find((x) => x.id === id);
    if (t) ligne = ecrireTableau(f, t, ligne, dev).suivante;
  }
  f.getCell(ligne, 1).value = tr('Les ventes annulées ne sont pas comptées. Le crédit n’est pas de l’argent reçu : il reste dans le carnet jusqu’au remboursement.');
  f.getCell(ligne, 1).font = { italic: true, color: { argb: GRIS }, size: 9 };

  // ----- Un onglet par tableau -----
  const ordre = ['ventes', 'articles', 'evolution', 'vendeurs', 'depenses', 'remboursements', 'creditsDus', 'journees', 'stock'];
  for (const id of ordre) {
    const t = tableaux.find((x) => x.id === id);
    if (!t) continue;
    const titreCourt = { ventes: tr('Ventes'), articles: tr('Articles'), evolution: meta.type === 'jour' ? tr('Par heure') : meta.type === 'annee' ? tr('Par mois') : tr('Par jour'), vendeurs: tr('Vendeurs'), depenses: tr('Dépenses'), remboursements: tr('Crédits remboursés'), creditsDus: tr('Crédits dus'), journees: tr('Journées de vente'), stock: tr('Stock') }[id];
    const feuille = wb.addWorksheet(nomFeuille(titreCourt, noms));
    mettreEnPage(feuille, t.colonnes);
    const { entete, derniere } = ecrireTableau(feuille, t, 1, dev);
    feuille.views = [{ state: 'frozen', ySplit: entete, xSplit: 0 }]; // en-tête toujours visible
    if (t.lignes.length) feuille.autoFilter = { from: { row: entete, column: 1 }, to: { row: derniere, column: t.colonnes.length } };
    feuille.pageSetup.printTitlesRow = `${entete}:${entete}`;
  }
  return wb;
}

/** Octets du fichier .xlsx. */
export async function octetsExcel(rapport) {
  const wb = await classeurRapport(rapport);
  return wb.xlsx.writeBuffer();
}
