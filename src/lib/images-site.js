// ------------------------------------------------------------
// Images adaptées à l'écran (srcset) pour les captures et affiches du site.
// Les versions réduites sont fabriquées par « npm run images » (scripts/images.mjs) :
//   ordinateur : …-480, -800, -1200 puis l'original ; téléphone (image en hauteur) : …-390, -600 puis l'original.
// Un téléphone télécharge ainsi 5 à 18 Ko au lieu de 40 à 120 Ko par capture.
// ------------------------------------------------------------
import { chemin } from '../config.js';

const ADRESSE_REDUITE = /^\/(captures|videos)\/[^/]+\.webp$/;

/** Valeur de l'attribut srcset d'une capture ou d'une affiche (undefined si l'image n'a pas de versions réduites). */
export function jeuDeTailles(src, { telephone = false } = {}) {
  if (!ADRESSE_REDUITE.test(src)) return undefined;
  const base = src.replace(/\.webp$/, '');
  const petites = telephone ? [390, 600] : [480, 800, 1200];
  const largeurOriginale = telephone ? 780 : src.startsWith('/videos/') ? 1280 : 1440;
  return [...petites.map((l) => `${chemin(`${base}-${l}.webp`)} ${l}w`), `${chemin(src)} ${largeurOriginale}w`].join(', ');
}

/** Affiche d'une vidéo (attribut poster : une seule adresse, pas de srcset) : version réduite plus légère que l'original. */
export function afficheVideo(poster, vertical = false) {
  return ADRESSE_REDUITE.test(poster) ? poster.replace(/\.webp$/, vertical ? '-600.webp' : '-1200.webp') : poster;
}
