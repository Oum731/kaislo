// ------------------------------------------------------------
// RAPPORT PDF (A4 paysage) : en-tête du commerce, indicateurs, graphique des ventes, puis les tableaux.
// Les données viennent de construireRapport() : exactement les mêmes chiffres que l'Excel.
// Pour un mois ou une année, le détail ticket par ticket reste dans l'Excel (trop long pour un PDF utile).
// Police standard du PDF : les caractères hors alphabet latin (accents compris) sont remplacés par « ? » ; l'Excel garde tout.
// ------------------------------------------------------------
import { formatNombre, symbole, formatDate, formatHeure } from '../utils/format.js';
import { tr, localeIntl } from '../i18n/index.js';

const VERT = [30, 91, 67];
const VERT_CLAIR = [234, 242, 238];
const GRIS = [120, 124, 120];
const MAX_LIGNES_TICKETS = 600; // au-delà, le détail est dans l'Excel

// Texte sûr pour la police standard du PDF (latin) : apostrophes et tirets typographiques simplifiés, le reste hors latin → « ? »
const sur = (t) => String(t ?? '')
  .replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').replace(/[–—−]/g, '-').replace(/…/g, '...').replace(/[   ]/g, ' ')
  .replace(/€/g, 'EUR').replace(/[^\x20-\x7E\xA1-\xFF]/g, '?');

const monnaie = (x, dev) => sur(formatNombre(x, dev) + ' ' + (dev === 'EUR' ? 'EUR' : symbole(dev)));

// Texte d'une cellule selon le type de la colonne
function texte(type, valeur, dev) {
  if (valeur === null || valeur === undefined || valeur === '') return '';
  switch (type) {
    case 'montant': return monnaie(valeur, dev);
    case 'entier': return sur(Number(valeur).toLocaleString(localeIntl()));
    case 'quantite': return sur(Number(valeur).toLocaleString(localeIntl(), { maximumFractionDigits: 3 }));
    case 'pourcent': return sur(Number(valeur).toLocaleString(localeIntl(), { maximumFractionDigits: 1 }) + ' %');
    case 'date': return sur(formatDate(valeur));
    case 'datetime': return sur(formatDate(valeur) + ' ' + formatHeure(valeur));
    case 'heure': return sur(formatHeure(valeur));
    default: return sur(valeur);
  }
}
const aDroite = (type) => ['montant', 'entier', 'quantite', 'pourcent'].includes(type);

/** Construit le PDF (objet jsPDF). */
export async function creerPdfRapport(rapport) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const { meta, resume, tableaux } = rapport;
  const dev = meta.devise;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setProperties({ title: `${meta.commerce.nom} - ${meta.titre}`, author: 'Kaislo', creator: 'Kaislo' });
  const L = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const marge = 12;
  let y = 0;

  // ----- En-tête -----
  doc.setFillColor(...VERT);
  doc.rect(0, 0, L, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(sur(meta.commerce.nom), marge, 12);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(sur(tr('Rapport d’activité') + ' - ' + meta.titre), marge, 19.5);
  doc.setFontSize(8.5);
  doc.text(sur([meta.commerce.ville, meta.commerce.telephone, tr('Devise : {0}', [dev])].filter(Boolean).join(' - ')), L - marge, 12, { align: 'right' });
  doc.text(sur(tr('Généré par Kaislo le {0}', [new Intl.DateTimeFormat(localeIntl(), { dateStyle: 'long', timeStyle: 'short' }).format(meta.genereLe)])), L - marge, 19.5, { align: 'right' });
  doc.setTextColor(30, 30, 30);
  y = 34;

  // ----- Indicateurs : cartes en grille -----
  const cartes = resume.filter((r) => ['ca', 'tickets', 'panier', 'depenses', 'solde', 'recu', 'credit', 'marge'].includes(r.cle));
  const largeurCarte = (L - 2 * marge - 3 * 4) / 4;
  cartes.forEach((r, i) => {
    const x = marge + (i % 4) * (largeurCarte + 4);
    const yc = y + Math.floor(i / 4) * 21;
    doc.setFillColor(...(r.fort ? VERT_CLAIR : [247, 247, 244]));
    doc.setDrawColor(215, 220, 215);
    doc.roundedRect(x, yc, largeurCarte, 18, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(...GRIS);
    doc.setFont('helvetica', 'normal');
    doc.text(sur(r.libelle), x + 3, yc + 6);
    doc.setFontSize(13);
    doc.setTextColor(...(r.cle === 'solde' && r.valeur < 0 ? [170, 50, 40] : [20, 20, 20]));
    doc.setFont('helvetica', 'bold');
    doc.text(texte(r.type, r.valeur, dev), x + 3, yc + 14);
  });
  y += Math.ceil(cartes.length / 4) * 21 + 2;

  // Le reste des indicateurs, sur une ligne de texte
  const autres = resume.filter((r) => !cartes.includes(r) && r.valeur);
  if (autres.length) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRIS);
    const ligne = autres.map((r) => `${r.libelle} : ${texte(r.type, r.valeur, dev)}`).join('   |   ');
    const coupe = doc.splitTextToSize(sur(ligne), L - 2 * marge);
    doc.text(coupe, marge, y + 3);
    y += coupe.length * 4 + 4;
  }
  doc.setTextColor(30, 30, 30);

  // ----- Graphique : ventes par heure / jour / mois -----
  const evo = tableaux.find((t) => t.id === 'evolution');
  if (evo && evo.lignes.some((l) => l.ventes > 0)) {
    const hauteur = 38;
    if (y + hauteur + 14 > H - 14) { doc.addPage(); y = marge; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...VERT);
    doc.text(sur(evo.titre), marge, y + 4);
    const x0 = marge, largeurZone = L - 2 * marge, yBase = y + 6 + hauteur - 8;
    const max = Math.max(...evo.lignes.map((l) => l.ventes), 1);
    const n = evo.lignes.length;
    const pas = largeurZone / n;
    doc.setFillColor(...VERT);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRIS);
    evo.lignes.forEach((l, i) => {
      const h = (l.ventes / max) * (hauteur - 14);
      if (h > 0) { doc.setFillColor(...VERT); doc.rect(x0 + i * pas + pas * 0.15, yBase - h, pas * 0.7, h, 'F'); } // la couleur est remise à chaque barre : le texte écrit entre-temps a changé la couleur courante
      const etiquette = n > 20 ? (i === 0 || (i + 1) % 5 === 0 ? String(i + 1) : '') : n > 12 ? (i % 2 === 0 ? l.label.split(' ')[0] : '') : l.label.split(' ')[0].slice(0, 10);
      if (etiquette) doc.text(sur(etiquette), x0 + i * pas + pas / 2, yBase + 4, { align: 'center' });
    });
    doc.setDrawColor(200, 205, 200);
    doc.line(x0, yBase, x0 + largeurZone, yBase);
    doc.text(sur(tr('Maximum : {0}', [monnaie(max, dev)])), L - marge, y + 4, { align: 'right' });
    doc.setTextColor(30, 30, 30);
    y = yBase + 9;
  }

  // ----- Tableaux -----
  const detailTickets = meta.type === 'jour' || meta.type === 'semaine';
  const ordre = ['paiements', 'evolution', 'articles', 'vendeurs', 'depenses', 'remboursements', 'creditsDus', 'journees', 'ventes', 'stock'];
  for (const id of ordre) {
    const t = tableaux.find((x) => x.id === id);
    if (!t) continue;
    if (id === 'evolution' && meta.type === 'jour') continue; // déjà dans le graphique ; les autres périodes gardent leur tableau jour par jour / mois par mois
    if (!t.lignes.length && !['paiements', 'ventes', 'articles'].includes(id)) continue; // pas de tableau vide, sauf l'essentiel
    let lignes = t.lignes;
    let remarque = t.note || '';
    if (id === 'ventes' && !detailTickets) { lignes = []; remarque = tr('Le détail ticket par ticket est dans l’export Excel.'); }
    else if (id === 'ventes' && lignes.length > MAX_LIGNES_TICKETS) { lignes = lignes.slice(0, MAX_LIGNES_TICKETS); remarque = tr('Les {0} premiers tickets sont affichés : la liste complète est dans l’export Excel.', [MAX_LIGNES_TICKETS]); }
    if ((id === 'articles' || id === 'creditsDus') && lignes.length > 40) { lignes = lignes.slice(0, 40); remarque = tr('Les 40 premières lignes sont affichées : la liste complète est dans l’export Excel.'); }
    // Colonnes de détail trop larges ou peu utiles en PDF
    const colonnes = t.colonnes.filter((c) => !(id === 'ventes' && ['table', 'sousTotal'].includes(c.cle) && lignes.every((l) => !l[c.cle])) && !(id === 'ventes' && c.cle === 'motif' && !lignes.some((l) => l.motif)));
    if (y + 24 > H - 14) { doc.addPage(); y = marge; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...VERT);
    doc.text(sur(t.titre), marge, y + 4);
    doc.setTextColor(30, 30, 30);
    const corps = lignes.map((l) => colonnes.map((c) => texte(c.type, l[c.cle], dev)));
    const pied = lignes.length && t.total ? [colonnes.map((c) => texte(c.type, t.total[c.cle], dev))] : undefined;
    if (!lignes.length && !remarque) corps.push([{ content: sur(tr('Aucune donnée pour cette période.')), colSpan: colonnes.length, styles: { fontStyle: 'italic', textColor: GRIS } }]);
    autoTable(doc, {
      startY: y + 6,
      head: [colonnes.map((c) => sur(c.titre))],
      body: corps,
      foot: pied,
      showFoot: 'lastPage',
      theme: 'grid',
      margin: { left: marge, right: marge, bottom: 14 },
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.6, lineColor: [217, 221, 216], lineWidth: 0.1, textColor: [30, 30, 30], overflow: 'linebreak' },
      headStyles: { fillColor: VERT, textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: VERT_CLAIR, textColor: [20, 20, 20], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 250, 248] },
      columnStyles: Object.fromEntries(colonnes.map((c, i) => [i, { halign: aDroite(c.type) ? 'right' : 'left', ...(c.cle === 'detail' ? { cellWidth: 70 } : {}) }])),
      didParseCell: (data) => {
        // Ticket annulé : en rouge, non compté dans les totaux
        if (data.section === 'body' && id === 'ventes' && lignes[data.row.index]?.annulee) { data.cell.styles.textColor = [154, 59, 46]; data.cell.styles.fontStyle = 'italic'; }
      },
      didDrawPage: () => {},
    });
    y = doc.lastAutoTable.finalY + 3;
    if (remarque) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...GRIS);
      doc.text(sur(remarque), marge, y + 2);
      doc.setTextColor(30, 30, 30);
      y += 5;
    }
    y += 6;
  }

  // ----- Pied de page : « Kaislo · Page x / y » -----
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRIS);
    doc.text(sur(`Kaislo - ${meta.commerce.nom} - ${meta.titre}`), marge, H - 6);
    doc.text(sur(tr('Page {0} / {1}', [i, pages])), L - marge, H - 6, { align: 'right' });
  }
  return doc;
}

/** Octets du fichier .pdf. */
export async function octetsPdf(rapport) {
  const doc = await creerPdfRapport(rapport);
  return doc.output('arraybuffer');
}
