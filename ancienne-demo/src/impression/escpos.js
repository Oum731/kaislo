// ------------------------------------------------------------
// Conversion des lignes du ticket en commandes ESC/POS
// (le "langage" des imprimantes thermiques).
// ------------------------------------------------------------

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
 * lignes : [{ texte, gras, grand }] (voir ticket.js)
 * avecAccents : false si l'imprimante affiche des caractères bizarres
 * Renvoie un Uint8Array prêt à envoyer à l'imprimante.
 */
export function versEscPos(lignes, avecAccents = true) {
  const o = [];
  o.push(ESC, 0x40); // initialisation
  o.push(ESC, 0x74, 2); // table de caractères CP850
  for (const l of lignes) {
    o.push(ESC, 0x45, l.gras ? 1 : 0); // gras oui/non
    o.push(GS, 0x21, l.grand ? 0x01 : 0x00); // double hauteur oui/non
    o.push(...encoderTexte(l.texte, avecAccents), 0x0a);
  }
  o.push(ESC, 0x45, 0, GS, 0x21, 0);
  o.push(ESC, 0x64, 4); // avance le papier de 4 lignes
  o.push(GS, 0x56, 0x42, 0x00); // coupe (ignoré si pas de massicot)
  return new Uint8Array(o);
}
