// ------------------------------------------------------------
// Conversion des lignes du ticket en commandes ESC/POS
// (le "langage" des imprimantes thermiques).
// ------------------------------------------------------------
import { tr } from '../i18n/index.js';

const ESC = 0x1b;
const GS = 0x1d;

// Table de caractères CP850 (Europe de l'Ouest) : caractères 128 à 255.
// Elle permet d'imprimer les accents français sur la plupart des imprimantes.
const CP850 =
  'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜø£Ø×ƒáíóúñÑªº¿®¬½¼¡«»░▒▓│┤ÁÂÀ©╣║╗╝¢¥┐' +
  '└┴┬├─┼ãÃ╚╔╩╦╠═╬¤ðÐÊËÈıÍÎÏ┘┌█▄¦Ì▀ÓßÔÒõÕµþÞÚÛÙýÝ¯´­±‗¾¶§÷¸°¨·¹³²■ ';

// Caractères absents de CP850 : on les remplace par un équivalent
const REMPLACEMENTS = { '–': '-', '—': '-', '’': "'", '‘': "'", '“': '"', '”': '"', 'œ': 'oe', 'Œ': 'OE', '…': '...', '€': 'EUR' };

function encoderTexte(texte, avecAccents) {
  let t = texte.replace(/[–—’‘“”œŒ…€]/g, (c) => REMPLACEMENTS[c]);
  if (!avecAccents) t = t.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const octets = [];
  for (const c of t) {
    const code = c.charCodeAt(0);
    if (code < 128) octets.push(code);
    else {
      const i = CP850.indexOf(c);
      octets.push(i >= 0 ? 128 + i : 0x3f); // "?" si inconnu
    }
  }
  return octets;
}

/**
 * lignes : [{ texte, gras, grand }] ou { logo: true } (voir ticket.js)
 * avecAccents : false si l'imprimante affiche des caractères bizarres
 * logo : commande d'image déjà préparée par logoEnRaster() (ou null)
 * Renvoie un Uint8Array prêt à envoyer à l'imprimante.
 */
export function versEscPos(lignes, avecAccents = true, logo = null) {
  const o = [];
  o.push(ESC, 0x40); // initialisation
  o.push(ESC, 0x74, 2); // table de caractères CP850
  for (const l of lignes) {
    if (l.logo) {
      if (logo) o.push(...logo, 0x0a);
      continue;
    }
    o.push(ESC, 0x45, l.gras ? 1 : 0); // gras oui/non
    o.push(GS, 0x21, l.grand ? 0x01 : 0x00); // double hauteur oui/non
    o.push(...encoderTexte(l.texte, avecAccents), 0x0a);
  }
  o.push(ESC, 0x45, 0, GS, 0x21, 0);
  o.push(ESC, 0x64, 4); // avance le papier de 4 lignes
  o.push(GS, 0x56, 0x42, 0x00); // coupe (ignoré si pas de massicot)
  return new Uint8Array(o);
}

function chargerImage(src) {
  return new Promise((ok, erreur) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => erreur(new Error(tr('Logo illisible')));
    img.src = src;
  });
}

/**
 * Transforme le logo en points noirs/blancs pour l'imprimante thermique
 * (commande ESC/POS "GS v 0"). Le logo est centré et prend un peu plus
 * de la moitié de la largeur du papier.
 */
export async function logoEnRaster(src, largeurPapier = 58) {
  const L = largeurPapier === 80 ? 576 : 384; // points par ligne
  const img = await chargerImage(src);
  let w = Math.round(L * 0.55);
  let h = Math.round((img.height * w) / img.width);
  if (h > 180) {
    h = 180;
    w = Math.round((img.width * h) / img.height);
  }
  const canvas = document.createElement('canvas');
  canvas.width = L;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, L, h);
  ctx.drawImage(img, Math.round((L - w) / 2), 0, w, h);
  const px = ctx.getImageData(0, 0, L, h).data;

  // Niveaux de gris puis tramage (Floyd-Steinberg) pour garder les nuances
  const gris = new Float32Array(L * h);
  for (let i = 0; i < L * h; i++) gris[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
  const octetsParLigne = L / 8;
  const bits = new Uint8Array(octetsParLigne * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < L; x++) {
      const i = y * L + x;
      const noir = gris[i] < 128;
      if (noir) bits[y * octetsParLigne + (x >> 3)] |= 0x80 >> (x & 7);
      const erreur = gris[i] - (noir ? 0 : 255);
      if (x + 1 < L) gris[i + 1] += (erreur * 7) / 16;
      if (y + 1 < h) {
        if (x > 0) gris[i + L - 1] += (erreur * 3) / 16;
        gris[i + L] += (erreur * 5) / 16;
        if (x + 1 < L) gris[i + L + 1] += erreur / 16;
      }
    }
  }
  return [GS, 0x76, 0x30, 0, octetsParLigne & 0xff, octetsParLigne >> 8, h & 0xff, h >> 8, ...bits];
}
