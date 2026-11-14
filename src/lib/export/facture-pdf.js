// ------------------------------------------------------------
// FACTURE D'ABONNEMENT OU FACTURE D'AVOIR EN PDF (A4) : modèle de la facture d'Amorac (logo, société au capital de…, RC / ICE / IF / TP,
// client, numéro et date, tableau DESCRIPTION / PRIX / TOTAL, MONTANT HT, TVA ou mention d'exonération, TOTAL TTC, conditions de paiement).
// Les données viennent de l'API (api/lib/facturation.php, versFacture) : le PDF reprend exactement la facture figée à son émission.
// Document en français (facture légale). Police standard du PDF : les caractères hors alphabet latin sont remplacés par « ? ».
// ------------------------------------------------------------
import { formatNombre, formatDate } from '../utils/format.js';
import { chemin } from '../../config.js';

const NOIR = [25, 25, 25];
const GRIS_FOND = [217, 217, 217];
const GRIS = [100, 100, 100];

const sur = (t) => String(t ?? '')
  .replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').replace(/[–—−]/g, '-').replace(/…/g, '...').replace(/[   ]/g, ' ')
  .replace(/€/g, 'EUR').replace(/[^\x20-\x7E\xA1-\xFF]/g, '?');
const monnaie = (x, dev) => sur(formatNombre(x, dev) + ' ' + dev);

/** Nom de fichier : FAC-2026-0001.pdf (ou AV-2026-0001.pdf pour un avoir) */
export const nomFichierFacture = (f) => `${f.numero}.pdf`;

// Logo d'Amorac (public/logo/amorac-logo.png) en image pour le PDF ; sans lui (hors ligne), le nom de la société s'écrit en texte
async function chargerLogo() {
  try {
    const r = await fetch(chemin('/logo/amorac-logo.png'));
    if (!r.ok) return null;
    const blob = await r.blob();
    return await new Promise((ok, ko) => { const l = new FileReader(); l.onload = () => ok(l.result); l.onerror = ko; l.readAsDataURL(blob); });
  } catch { return null; }
}

/** Construit le PDF (objet jsPDF). */
export async function creerPdfFacture(f, logo) {
  const { jsPDF } = await import('jspdf');
  const image = logo === undefined ? await chargerLogo() : logo;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setProperties({ title: `${f.type === 'avoir' ? 'Avoir' : 'Facture'} ${f.numero}`, author: f.emetteur?.nom || 'Amorac', creator: 'Kaislo' });
  const L = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const marge = 16;
  const dev = f.devise;
  const avoir = f.type === 'avoir';
  const e = f.emetteur || {};
  const c = f.client || {};
  const droite = L - marge;
  doc.setTextColor(...NOIR);

  // Texte « Libellé : valeur » (libellé en gras)
  const libelleValeur = (libelle, valeur, x, y) => {
    doc.setFont('helvetica', 'bold');
    doc.text(sur(libelle + ' :'), x, y);
    const l = doc.getTextWidth(sur(libelle + ' : '));
    doc.setFont('helvetica', 'normal');
    doc.text(sur(valeur), x + l, y);
  };

  // ----- En-tête : logo à gauche, identité de la société à droite -----
  let y = 16;
  if (image) doc.addImage(image, 'PNG', marge, y - 2, 56, 56 * 214 / 700);
  else { doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.text(sur(e.nom || 'AMORAC'), marge, y + 10); }
  const xE = 108;
  let yE = y + 2;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const nomForme = sur([e.nom, e.forme].filter(Boolean).join(' '));
  doc.text(nomForme, xE, yE);
  let xSuite = xE + doc.getTextWidth(nomForme + ' ');
  if (e.capital) {
    doc.setFont('helvetica', 'normal');
    doc.text('au capital de', xSuite, yE);
    xSuite += doc.getTextWidth('au capital de ');
    doc.setFont('helvetica', 'bold');
    doc.text(sur(e.capital), xSuite, yE);
  }
  yE += 4.6;
  doc.setFontSize(9);
  for (const [k, v] of Object.entries(e.identifiants || {})) { libelleValeur(k, v, xE, yE); yE += 4.6; }
  if (e.adresse) {
    doc.setFont('helvetica', 'bold');
    doc.text('Adresse :', xE, yE);
    const larg = doc.getTextWidth('Adresse :') + 1.2;
    doc.setFont('helvetica', 'normal');
    const coupe = doc.splitTextToSize(sur(e.adresse), droite - xE - larg);
    doc.text(coupe[0], xE + larg, yE);
    yE += 4.6;
    for (const suite of coupe.slice(1)) { doc.text(suite, xE, yE); yE += 4.6; }
  }
  if (e.email) { libelleValeur('Email', e.email, xE, yE); yE += 4.6; }
  if (e.site) { libelleValeur('Site', e.site, xE, yE); yE += 4.6; }

  // ----- Titre -----
  y = Math.max(yE, y + 20) + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(avoir ? 'AVOIR' : 'FACTURE', marge, y);
  doc.setDrawColor(...NOIR);
  doc.setLineWidth(0.3);
  doc.line(marge, y + 3, droite, y + 3);
  y += 12;

  // ----- Client, numéro et date -----
  doc.setFontSize(10);
  doc.text('CLIENT', marge + 2, y);
  const lignesClient = [
    [c.nom, c.gerant].filter(Boolean).join(' - '),
    c.adresse,
    [c.ville, c.pays].filter(Boolean).join(', '),
    c.email ? 'Email : ' + c.email : '',
    c.telephone ? 'Téléphone : ' + c.telephone : '',
  ].filter(Boolean);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  lignesClient.forEach((l, i) => doc.text(doc.splitTextToSize(sur(l), 95)[0], marge, y + 8 + i * 5));
  doc.setFontSize(9.5);
  libelleValeur(avoir ? "Numéro d'avoir" : 'Numéro de facture', f.numero, 112, y + 13);
  libelleValeur('Date', formatDate(f.date), 112, y + 18.5);
  y += Math.max(8 + lignesClient.length * 5, 26) + 8;

  // ----- Tableau : DESCRIPTION / PRIX / TOTAL -----
  doc.setFillColor(...GRIS_FOND);
  doc.rect(marge, y, droite - marge, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  const xTotal = droite - 3;
  const xPrix = droite - 48;
  doc.text('DESCRIPTION', marge + 4, y + 6);
  doc.text('PRIX', xPrix, y + 6, { align: 'right' });
  doc.text('TOTAL', xTotal, y + 6, { align: 'right' });
  y += 9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  for (const l of f.lignes || []) {
    const coupe = doc.splitTextToSize(sur(l.designation), xPrix - marge - 34);
    doc.text(coupe, marge + 4, y + 7);
    let h = coupe.length * 4.8;
    if (!avoir && f.periode?.du && f.periode?.au) {
      doc.setFontSize(8.5);
      doc.setTextColor(...GRIS);
      doc.text(sur(`Période : du ${formatDate(f.periode.du)} au ${formatDate(f.periode.au)}`), marge + 4, y + 7 + h);
      doc.setFontSize(10);
      doc.setTextColor(...NOIR);
      h += 5;
    }
    doc.text(monnaie(f.totalHt, dev), xPrix, y + 7, { align: 'right' });
    doc.text(monnaie(f.totalHt, dev), xTotal, y + 7, { align: 'right' });
    y += h + 10;
  }
  y += 6;

  // ----- Totaux : MONTANT HT, TVA, TOTAL TTC -----
  const xTot = 112;
  doc.setFontSize(11);
  libelleValeur('MONTANT HT', monnaie(f.totalHt, dev), xTot, y);
  y += 8;
  doc.setFontSize(9.5);
  if (f.tvaTaux > 0) {
    libelleValeur(`TVA ${String(f.tvaTaux).replace('.', ',')} %`, monnaie(f.tva, dev), xTot, y);
    y += 8;
  } else if (f.mentionTva) {
    doc.setFont('helvetica', 'bold');
    doc.text('TVA :', xTot, y);
    doc.setFont('helvetica', 'normal');
    const m = doc.splitTextToSize(sur(f.mentionTva), droite - xTot - 14);
    doc.text(m, xTot + 14, y);
    y += m.length * 4.6 + 3;
  } else {
    libelleValeur('TVA', monnaie(f.tva, dev), xTot, y);
    y += 8;
  }
  doc.setFillColor(...GRIS_FOND);
  doc.rect(xTot - 4, y, droite - xTot + 4, 11, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(sur('TOTAL TTC : ' + monnaie(f.totalTtc, dev)), xTot, y + 7.3);
  y += 22;

  // ----- Conditions de paiement (facture acquittée) ou facture créditée (avoir) -----
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  if (avoir) {
    doc.text('AVOIR', marge, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(sur(`Sur la facture ${f.reference?.factureNumero || ''}${f.reference?.factureDate ? ' du ' + formatDate(f.reference.factureDate) : ''}`), marge, y + 6);
    if (f.motif) { const m = doc.splitTextToSize(sur('Motif : ' + f.motif), droite - marge); doc.text(m, marge, y + 11.5); y += m.length * 4.8; }
    y += 14;
  } else {
    doc.text('CONDITIONS DE PAIEMENT', marge, y);
    doc.setFontSize(9.5);
    libelleValeur('Mode de paiement', f.reglement?.moyen || '-', marge, y + 6);
    libelleValeur('Échéance', f.reglement?.date ? 'Facture acquittée le ' + formatDate(f.reglement.date) : 'Facture acquittée', marge, y + 11.5);
    y += 20;
  }

  // ----- Pied de page -----
  doc.setTextColor(...GRIS);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const ids = Object.entries(e.identifiants || {}).map(([k, v]) => `${k} : ${v}`).join(' - ');
  const pied = [[e.nom, e.forme].filter(Boolean).join(' ') + (e.capital ? ' au capital de ' + e.capital : ''), e.adresse, ids].filter(Boolean).join(' - ');
  doc.text(doc.splitTextToSize(sur(pied), L - 2 * marge), L / 2, H - 14, { align: 'center' });
  return doc;
}

/** Octets du fichier .pdf. */
export async function octetsPdfFacture(f) {
  const doc = await creerPdfFacture(f);
  return doc.output('arraybuffer');
}
