// Mise en page de la carte (format carte bancaire 85,6 × 54 mm) : source unique
// utilisée par le PDF (card-pdf.js) ET par l'aperçu à l'écran (components/CardView.jsx).
import { fmtTel } from './validate.js';

export const W = 242.65, H = 153.07;
export const FLAG_CI = { x: 9, y: 8, w: 25, h: 17 };
export const FLAG_MA = { x: W - 9 - 25, y: 8, w: 25, h: 17 };
export const PHOTO = { x: 185, y: 37, w: 53, h: 66 };
export const BADGE = { x: 161, y: 106, w: 77, h: 13 };
export const STAMP = { x: 124, y: 120, w: 40, h: 23 };
export const LOGO = { x: 16, y: 80, w: 56, h: 56 };
export const QR = { x: 171, y: 80, w: 58, h: 58 };
export const NAVY = '#0b1f3a';
export const BG_CSS = 'linear-gradient(135deg, #f7c59f 0%, #efe6b5 50%, #a5dba3 100%)';

export function fmtDate(d) {
  const s = typeof d === 'string' ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10);
  const [y, m, j] = s.split('-');
  return `${j}-${m}-${y}`;
}

// Largeur approximative d'un texte en Helvetica (suffisante pour réduire la police si le texte est long)
function largeur(text, size) {
  let w = 0;
  for (const c of text) w += /[A-ZÀ-ÖØ-Þ]/.test(c) ? 0.68 : /\s/.test(c) ? 0.28 : /[mwMW]/.test(c) ? 0.8 : /[il.,'’:;|!]/.test(c) ? 0.26 : 0.53;
  return w * size;
}
function ajuste(text, size, maxW) {
  const l = largeur(text, size);
  return l > maxW ? size * (maxW / l) : size;
}

const LX = 12, VX = 60, VMAX = 100;

export function frontTexts(m) {
  const t = [];
  t.push({ t: 'AICA', x: W / 2, y: 5, size: 14, bold: true, align: 'center', color: NAVY });
  t.push({ t: 'Association des Ivoiriens de Casablanca', x: W / 2, y: 19.5, size: 6.3, bold: true, align: 'center', color: NAVY });
  t.push({ t: 'CARTE DE MEMBRE', x: W / 2, y: 27, size: 8.5, bold: true, align: 'center', color: NAVY });
  const rows = [
    ['NOM', String(m.nom).toUpperCase()],
    ['PRÉNOMS', m.prenoms],
    ['NAISSANCE', `${fmtDate(m.naissance_date)} à ${m.naissance_lieu}`],
    ['FONCTION', m.fonction],
    ['PROFESSION', m.profession],
    ['QUARTIER', m.quartier],
    ['TÉLÉPHONE', fmtTel(m.telephone)],
    ['URGENCE', m.urgence_nom],
  ];
  let y = 38;
  for (const [l, v] of rows) {
    t.push({ t: l + ' :', x: LX, y, size: 5.8, bold: true, color: NAVY });
    t.push({ t: v, x: VX, y, size: ajuste(v, 6.4, VMAX), color: '#1a2433' });
    y += 10.8;
  }
  t.push({ t: fmtTel(m.urgence_tel), x: VX, y: y - 1.8, size: 6.4, color: '#1a2433' });
  t.push({ t: 'N° :', x: LX, y: 134, size: 5.8, bold: true, color: NAVY });
  t.push({ t: m.piece_no, x: VX, y: 134, size: ajuste(m.piece_no, 6.4, 60), color: '#1a2433' });
  t.push({ t: m.number, x: BADGE.x + BADGE.w / 2, y: BADGE.y + 3, size: 7.2, bold: true, align: 'center', color: '#ffffff' });
  t.push({ t: 'Valable : ' + fmtDate(m.valid_from), x: W - 9, y: 122, size: 5.6, italic: true, align: 'right', color: NAVY });
  t.push({ t: 'Au : ' + fmtDate(m.valid_to), x: W - 9, y: 130, size: 5.6, italic: true, align: 'right', color: NAVY });
  t.push({ t: 'Président', x: STAMP.x + STAMP.w / 2, y: 144, size: 6, bold: true, italic: true, align: 'center', color: NAVY });
  return t;
}

export function backTexts() {
  return [
    { t: 'Cette carte strictement personnelle est délivrée à un membre immatriculé de', x: W / 2, y: 20, size: 6.6, align: 'center', color: '#1a2433' },
    { t: 'l’Association A.I.C.A.', x: W / 2, y: 29, size: 6.6, align: 'center', color: '#1a2433' },
    { t: 'aicaivoirienscasa@gmail.com', x: W / 2, y: 141, size: 5.4, align: 'center', color: NAVY },
  ];
}
