// ------------------------------------------------------------
// Captures d'écran et vidéos de démonstration dans la devise du visiteur.
// public/captures/vente-ordi.webp est la version en FCFA (devise par défaut) ;
// vente-ordi-mad.webp, -gnf, -eur, -cad, -usd sont les mêmes écrans dans les autres devises (npm run captures).
// Idem pour les vidéos : demo-restaurant.mp4 (FCFA) et demo-restaurant-eur.mp4 (npm run videos -- --devise=EUR).
// ------------------------------------------------------------
const SUFFIXES = { MAD: 'mad', GNF: 'gnf', EUR: 'eur', CAD: 'cad', USD: 'usd' };
const ADRESSE_CAPTURE = /^\/(captures|videos)\/[^/]+\.(webp|mp4)$/;

/** Adresse de la capture dans la devise demandée (l'original en FCFA si la devise n'a pas sa propre version). */
export function captureDevise(src, devise) {
  const suffixe = SUFFIXES[devise];
  return suffixe && ADRESSE_CAPTURE.test(src) ? src.replace(/\.(webp|mp4)$/, `-${suffixe}.$1`) : src;
}
