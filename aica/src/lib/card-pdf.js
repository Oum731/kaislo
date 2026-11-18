import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import sharp from 'sharp';
import assets from './assets-data';
import { W, H, FLAG_CI, FLAG_MA, PHOTO, BADGE, STAMP, LOGO, QR, NAVY, frontTexts, backTexts } from './card-layout';
import { SITE } from '@/config';

const hex = (h) => { const n = parseInt(h.slice(1), 16); return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); };
const b64 = (k) => Buffer.from(assets[k], 'base64');

let fondCache;
async function fond() {
  if (!fondCache) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1020" height="644"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7c59f"/><stop offset=".5" stop-color="#efe6b5"/><stop offset="1" stop-color="#a5dba3"/></linearGradient></defs><rect width="1020" height="644" fill="url(#g)"/></svg>`;
    fondCache = await sharp(Buffer.from(svg)).png().toBuffer();
  }
  return fondCache;
}

export function urlVerification(number) {
  return `${SITE.url}/verification/${encodeURIComponent(number)}`;
}

// Génère le PDF recto/verso de la carte. `m` = ligne members (dates en texte) ; `photo` = Buffer JPEG
export async function genererCartePdf(m, photo) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Carte de membre ${m.number}`);
  pdf.setAuthor('AICA');
  const f = {
    n: await pdf.embedFont(StandardFonts.Helvetica),
    b: await pdf.embedFont(StandardFonts.HelveticaBold),
    i: await pdf.embedFont(StandardFonts.HelveticaOblique),
    bi: await pdf.embedFont(StandardFonts.HelveticaBoldOblique),
  };
  const bg = await pdf.embedPng(await fond());
  const img = {
    ci: await pdf.embedPng(b64('ci')), ma: await pdf.embedPng(b64('ma')),
    logo: await pdf.embedPng(b64('logo')), cachet: await pdf.embedPng(b64('cachet')),
    photo: photo ? await pdf.embedJpg(photo) : null,
    qr: await pdf.embedPng(await QRCode.toBuffer(urlVerification(m.number), { margin: 1, width: 360, errorCorrectionLevel: 'M' })),
  };

  // Les polices standard ne gèrent pas tous les caractères : on retire ceux qui poseraient problème
  const propre = (font, s) => [...String(s)].filter((c) => { try { font.encodeText(c); return true; } catch { return false; } }).join('');
  const dessiner = (page, items) => {
    for (const it of items) {
      const font = f[it.bold && it.italic ? 'bi' : it.bold ? 'b' : it.italic ? 'i' : 'n'];
      const txt = propre(font, it.t);
      const w = font.widthOfTextAtSize(txt, it.size);
      const x = it.align === 'center' ? it.x - w / 2 : it.align === 'right' ? it.x - w : it.x;
      page.drawText(txt, { x, y: H - it.y - it.size * 0.8, size: it.size, font, color: hex(it.color) });
    }
  };
  const place = (page, image, b, opts = {}) => page.drawImage(image, { x: b.x, y: H - b.y - b.h, width: b.w, height: b.h, ...opts });

  // RECTO
  const p1 = pdf.addPage([W, H]);
  p1.drawImage(bg, { x: 0, y: 0, width: W, height: H });
  place(p1, img.ci, FLAG_CI); place(p1, img.ma, FLAG_MA);
  if (img.photo) {
    p1.drawRectangle({ x: PHOTO.x - 1, y: H - PHOTO.y - PHOTO.h - 1, width: PHOTO.w + 2, height: PHOTO.h + 2, color: hex('#ffffff') });
    place(p1, img.photo, PHOTO);
  }
  p1.drawRectangle({ x: BADGE.x, y: H - BADGE.y - BADGE.h, width: BADGE.w, height: BADGE.h, color: hex(NAVY) });
  place(p1, img.cachet, { ...STAMP, h: STAMP.w / (img.cachet.width / img.cachet.height) });
  dessiner(p1, frontTexts(m));

  // VERSO
  const p2 = pdf.addPage([W, H]);
  p2.drawImage(bg, { x: 0, y: 0, width: W, height: H });
  place(p2, img.logo, LOGO);
  p2.drawRectangle({ x: QR.x - 3, y: H - QR.y - QR.h - 3, width: QR.w + 6, height: QR.h + 6, color: hex('#ffffff') });
  place(p2, img.qr, QR);
  dessiner(p2, backTexts());
  return Buffer.from(await pdf.save());
}
