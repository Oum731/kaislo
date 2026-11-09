// ------------------------------------------------------------
// FACTURE D'ABONNEMENT OU FACTURE D'AVOIR EN PDF (A4) : émetteur Amorac, client, désignation, totaux HT / TVA / TTC, « acquittée » (ou référence de la facture créditée), mentions légales.
// Les données viennent de l'API (api/lib/facturation.php, versFacture) : le PDF reprend exactement la facture figée à son émission.
// Document en français (facture légale). Police standard du PDF : les caractères hors alphabet latin sont remplacés par « ? ».
// ------------------------------------------------------------
import { formatNombre, symbole, formatDate } from '../utils/format.js';

const VERT = [30, 91, 67];
const GRIS = [110, 114, 110];

const sur = (t) => String(t ?? '')
  .replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').replace(/[–—−]/g, '-').replace(/…/g, '...').replace(/[   ]/g, ' ')
  .replace(/€/g, 'EUR').replace(/[^\x20-\x7E\xA1-\xFF]/g, '?');
const monnaie = (x, dev) => sur(formatNombre(x, dev) + ' ' + (dev === 'EUR' ? 'EUR' : symbole(dev)));

/** Nom de fichier : FAC-2026-0001.pdf (ou AV-2026-0001.pdf pour un avoir) */
export const nomFichierFacture = (f) => `${f.numero}.pdf`;

/** Construit le PDF (objet jsPDF). */
export async function creerPdfFacture(f) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setProperties({ title: `${f.type === 'avoir' ? 'Avoir' : 'Facture'} ${f.numero}`, author: f.emetteur?.nom || 'Amorac', creator: 'Kaislo' });
  const L = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const marge = 16;
  const dev = f.devise;
  const avoir = f.type === 'avoir';
  const e = f.emetteur || {};
  const c = f.client || {};
  let y = 18;

  // ----- Émetteur (gauche) et titre (droite) -----
  doc.setTextColor(...VERT);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(sur(e.nom || 'AMORAC'), marge, y);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  const ids = Object.entries(e.identifiants || {}).map(([k, v]) => `${k} : ${v}`).join('  -  ');
  let yE = y + 6;
  for (const l of [e.forme, e.adresse, ids, [e.email, e.site].filter(Boolean).join('  -  ')].filter(Boolean)) {
    const coupe = doc.splitTextToSize(sur(l), 100);
    doc.text(coupe, marge, yE);
    yE += coupe.length * 4.2;
  }
  doc.setTextColor(...VERT);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(avoir ? 'AVOIR' : 'FACTURE', L - marge, y, { align: 'right' });
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(sur('N° ' + f.numero), L - marge, y + 7, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(sur('Date : ' + formatDate(f.date)), L - marge, y + 13, { align: 'right' });
  y = Math.max(yE, y + 16) + 8;

  // ----- Client -----
  doc.setDrawColor(215, 220, 215);
  doc.setFillColor(247, 247, 244);
  const lignesClient = [c.nom, c.gerant ? 'A l\'attention de ' + c.gerant : '', c.adresse, [c.ville, c.pays].filter(Boolean).join(', '), c.telephone ? 'Tel : ' + c.telephone : ''].filter(Boolean);
  const hClient = 11 + lignesClient.length * 4.6;
  doc.roundedRect(marge, y, 95, hClient, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...GRIS);
  doc.text(avoir ? 'CLIENT' : 'FACTURE A', marge + 4, y + 6);
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  lignesClient.forEach((l, i) => {
    doc.setFont('helvetica', i === 0 ? 'bold' : 'normal');
    doc.text(doc.splitTextToSize(sur(l), 88)[0], marge + 4, y + 12 + i * 4.6);
  });
  y += hClient + 10;

  // ----- Désignation -----
  doc.setFillColor(...VERT);
  doc.rect(marge, y, L - 2 * marge, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Désignation', marge + 3, y + 5.5);
  doc.text(sur(f.tvaTaux > 0 ? 'Montant HT' : 'Montant'), L - marge - 3, y + 5.5, { align: 'right' });
  y += 8;
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  for (const l of f.lignes || []) {
    const coupe = doc.splitTextToSize(sur(l.designation), L - 2 * marge - 50);
    doc.text(coupe, marge + 3, y + 6);
    if (!avoir && f.periode?.du && f.periode?.au) {
      doc.setFontSize(8.5);
      doc.setTextColor(...GRIS);
      doc.text(sur(`Période : du ${formatDate(f.periode.du)} au ${formatDate(f.periode.au)}`), marge + 3, y + 6 + coupe.length * 4.6);
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
    }
    doc.text(monnaie(f.totalHt, dev), L - marge - 3, y + 6, { align: 'right' });
    y += 8 + coupe.length * 4.6 + (!avoir && f.periode?.du ? 4 : 0);
    doc.setDrawColor(215, 220, 215);
    doc.line(marge, y, L - marge, y);
  }
  y += 8;

  // ----- Totaux -----
  const xTot = L - marge - 80;
  const ligne = (libelle, valeur, fort = false) => {
    doc.setFont('helvetica', fort ? 'bold' : 'normal');
    doc.setFontSize(fort ? 12 : 10);
    doc.text(sur(libelle), xTot, y);
    doc.text(sur(valeur), L - marge, y, { align: 'right' });
    y += fort ? 8 : 6;
  };
  ligne('Total HT', monnaie(f.totalHt, dev));
  ligne(f.tvaTaux > 0 ? `TVA ${String(f.tvaTaux).replace('.', ',')} %` : 'TVA', monnaie(f.tva, dev));
  doc.setDrawColor(...VERT);
  doc.line(xTot, y - 2, L - marge, y - 2);
  y += 4;
  ligne('Total TTC', monnaie(f.totalTtc, dev), true);

  // ----- Acquittée -----
  y += 4;
  doc.setFillColor(234, 242, 238);
  doc.roundedRect(marge, y, L - 2 * marge, 12, 2, 2, 'F');
  doc.setTextColor(...VERT);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(sur(avoir
    ? `AVOIR SUR LA FACTURE ${f.reference?.factureNumero || ''}${f.reference?.factureDate ? ' DU ' + formatDate(f.reference.factureDate) : ''}`
    : 'FACTURE ACQUITTEE' + (f.reglement?.date ? ' le ' + formatDate(f.reglement.date) : '') + (f.reglement?.moyen ? ' - ' + f.reglement.moyen : '')), marge + 4, y + 7.5);
  y += 20;

  if (avoir && f.motif) { doc.setTextColor(30, 30, 30); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); const m = doc.splitTextToSize(sur('Motif : ' + f.motif), L - 2 * marge); doc.text(m, marge, y); y += m.length * 4.6 + 4; }

  // ----- Mention de TVA -----
  doc.setTextColor(...GRIS);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  if (f.mentionTva) { const m = doc.splitTextToSize(sur(f.mentionTva), L - 2 * marge); doc.text(m, marge, y); y += m.length * 4; }

  // ----- Pied de page -----
  doc.setFontSize(7.5);
  const pied = [e.nom, e.forme, e.adresse, ids].filter(Boolean).join(' - ');
  doc.text(doc.splitTextToSize(sur(pied), L - 2 * marge), L / 2, H - 14, { align: 'center' });
  return doc;
}

/** Octets du fichier .pdf. */
export async function octetsPdfFacture(f) {
  const doc = await creerPdfFacture(f);
  return doc.output('arraybuffer');
}
