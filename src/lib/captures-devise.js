// ------------------------------------------------------------
// Captures d'écran dans la devise du visiteur.
// public/captures/vente-ordi.webp est la version en FCFA (devise par défaut) ;
// vente-ordi-mad.webp, -gnf, -eur, -cad, -usd sont les mêmes écrans dans les autres devises (npm run captures).
// ------------------------------------------------------------
const SUFFIXES = { MAD: 'mad', GNF: 'gnf', EUR: 'eur', CAD: 'cad', USD: 'usd' };
const ADRESSE_CAPTURE = /^\/captures\/[^/]+\.webp$/;

/** Adresse de la capture dans la devise demandée (l'original en FCFA si la devise n'a pas sa propre version). */
export function captureDevise(src, devise) {
  const suffixe = SUFFIXES[devise];
  return suffixe && ADRESSE_CAPTURE.test(src) ? src.replace(/\.webp$/, `-${suffixe}.webp`) : src;
}
