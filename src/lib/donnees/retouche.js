// ------------------------------------------------------------
// RETOUCHE AUTOMATIQUE des photos d'articles.
//
// La vendeuse prend sa photo comme elle peut (sombre, de travers, trop de décor) : Kaislo la met au même format que toutes
// les autres, sans réglage à faire. Tout se passe sur le téléphone (rien n'est envoyé), en trois étapes :
//   1. Cadrage : carré centré sur l'article (détecté quand le fond est assez uni, sinon centre de la photo).
//   2. Lumière et couleurs : niveaux étirés, blanc rééquilibré, couleurs un peu plus vives (corrections douces et limitées).
//   3. Fond propre : si le fond est uni (table, mur, drap), il devient un blanc cassé net. Si le fond est chargé
//      (marché, étagères), il est laissé tel quel : mieux vaut une photo vraie qu'un découpage raté.
// Les fonctions de pixels travaillent sur { data, w, h } (RGBA) et se testent sans navigateur.
// ------------------------------------------------------------

export const FOND_PROPRE = [247, 246, 242]; // blanc cassé de la charte (--fond)

const borne = (x, a, b) => Math.max(a, Math.min(b, x));
const lisse = (a, b, x) => { const t = borne((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const luminance = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

/** Couleur moyenne du bord de la photo, et à quel point ce bord est uni (écart-type le plus fort des trois canaux). */
export function analyserFond({ data, w, h }) {
  const e = Math.max(2, Math.round(Math.min(w, h) * 0.06));
  let n = 0;
  const somme = [0, 0, 0];
  const carres = [0, 0, 0];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x >= e && x < w - e && y >= e && y < h - e) { x = w - e - 1; continue; } // saute l'intérieur de la ligne
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) { somme[c] += data[i + c]; carres[c] += data[i + c] * data[i + c]; }
      n++;
    }
  }
  const couleur = somme.map((s) => s / n);
  const ecart = Math.max(...carres.map((q, c) => Math.sqrt(Math.max(0, q / n - couleur[c] * couleur[c]))));
  return { couleur, ecart, uniforme: ecart < 20 };
}

const distance = (data, i, fond) => Math.hypot(data[i] - fond[0], data[i + 1] - fond[1], data[i + 2] - fond[2]);

/** Rectangle qui contient l'article (pixels différents du fond). Renvoie null si rien de net ou si tout est « article ». */
export function trouverArticle(img, fond, seuil = 48) {
  const { data, w, h } = img;
  const colonnes = new Uint32Array(w);
  const lignes = new Uint32Array(h);
  let total = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (distance(data, (y * w + x) * 4, fond) > seuil) { colonnes[x]++; lignes[y]++; total++; }
    }
  }
  const part = total / (w * h);
  if (part < 0.02 || part > 0.9) return null;
  // On ignore les colonnes et lignes presque vides (poussière, ombre, bord du drap)
  const minCol = Math.max(2, Math.round(h * 0.015));
  const minLig = Math.max(2, Math.round(w * 0.015));
  let x0 = 0; while (x0 < w && colonnes[x0] < minCol) x0++;
  let x1 = w - 1; while (x1 > x0 && colonnes[x1] < minCol) x1--;
  let y0 = 0; while (y0 < h && lignes[y0] < minLig) y0++;
  let y1 = h - 1; while (y1 > y0 && lignes[y1] < minLig) y1--;
  if (x1 <= x0 || y1 <= y0) return null;
  return { x: x0, y: y0, l: x1 - x0 + 1, h: y1 - y0 + 1, part };
}

/** Carré à découper : centré sur l'article avec une marge, ou centre de la photo si l'article n'est pas trouvé. */
export function cadrageCarre(w, h, article, marge = 0.1) {
  const max = Math.min(w, h);
  if (!article) return { x: Math.round((w - max) / 2), y: Math.round((h - max) / 2), cote: max };
  const voulu = Math.max(article.l, article.h) * (1 + 2 * marge);
  const cote = Math.round(borne(voulu, Math.min(max, 64), max));
  const cx = article.x + article.l / 2;
  const cy = article.y + article.h / 2;
  return { x: Math.round(borne(cx - cote / 2, 0, w - cote)), y: Math.round(borne(cy - cote / 2, 0, h - cote)), cote };
}

/** Extrait un carré {x, y, cote} de l'image. */
export function decouper(img, { x, y, cote }) {
  const data = new Uint8ClampedArray(cote * cote * 4);
  for (let j = 0; j < cote; j++) {
    const debut = ((y + j) * img.w + x) * 4;
    data.set(img.data.subarray(debut, debut + cote * 4), j * cote * 4);
  }
  return { data, w: cote, h: cote };
}

/**
 * Lumière et couleurs, corrections douces :
 *  - niveaux : les 1 % les plus sombres et les 1 % les plus clairs sont étirés (sans écraser plus de 20 niveaux d'un côté)
 *  - exposant : rapproche le gris moyen du milieu (photo sombre éclaircie, photo brûlée adoucie), à 60 % de force
 *  - blanc : équilibre des canaux limité à ±10 % (photos jaunes sous une ampoule)
 *  - couleurs : +8 % de saturation
 * Renvoie l'image corrigée (nouvelle copie) et les réglages utilisés.
 */
export function corrigerCouleurs({ data, w, h }, { force = 1 } = {}) {
  const n = w * h;
  const histo = new Uint32Array(256);
  const moy = [0, 0, 0];
  for (let i = 0; i < data.length; i += 4) {
    histo[Math.round(luminance(data[i], data[i + 1], data[i + 2]))]++;
    moy[0] += data[i]; moy[1] += data[i + 1]; moy[2] += data[i + 2];
  }
  const centile = (p) => { let c = 0; for (let v = 0; v < 256; v++) { c += histo[v]; if (c >= n * p) return v; } return 255; };
  const bas = Math.min(centile(0.01), 20);
  const haut = Math.max(centile(0.99), 170); // jamais plus de ×1,5 de gain : au-delà, la photo devient dure
  const gris = (moy[0] + moy[1] + moy[2]) / 3;
  const gain = moy.map((m) => borne(1 + (gris / (m || 1) - 1) * 0.5 * force, 0.9, 1.1));
  // Gamma d'après la luminance moyenne après étirement : il amènerait le gris moyen à 50 %, appliqué à 60 % de force
  let lumTotale = 0;
  for (let v = 0; v < 256; v++) lumTotale += v * histo[v];
  const apres = borne((lumTotale / n - bas) / Math.max(1, haut - bas), 0.05, 0.95);
  const g = borne(Math.pow(Math.log(0.5) / Math.log(apres), 0.6 * force), 0.7, 1.3); // exposant : moins de 1 éclaircit, plus de 1 assombrit
  const sortie = new Uint8ClampedArray(data.length);
  const table = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) table[v] = Math.round(255 * Math.pow(borne((v - bas) / Math.max(1, haut - bas), 0, 1), g));
  const sat = 1 + 0.08 * force;
  for (let i = 0; i < data.length; i += 4) {
    const r = table[borne(Math.round(data[i] * gain[0]), 0, 255)];
    const v = table[borne(Math.round(data[i + 1] * gain[1]), 0, 255)];
    const b = table[borne(Math.round(data[i + 2] * gain[2]), 0, 255)];
    const l = luminance(r, v, b);
    // 75 % de correction, 25 % de la photo d'origine : la retouche reste naturelle
    sortie[i] = Math.round(data[i] * 0.25 + borne(l + (r - l) * sat, 0, 255) * 0.75);
    sortie[i + 1] = Math.round(data[i + 1] * 0.25 + borne(l + (v - l) * sat, 0, 255) * 0.75);
    sortie[i + 2] = Math.round(data[i + 2] * 0.25 + borne(l + (b - l) * sat, 0, 255) * 0.75);
    sortie[i + 3] = 255;
  }
  return { img: { data: sortie, w, h }, reglages: { bas, haut, gamma: Math.round(g * 100) / 100 } };
}

/**
 * Remplace un fond uni par le blanc cassé. Seuls les pixels du fond RELIÉS AU BORD de la photo sont touchés : une zone de
 * l'article qui aurait la même couleur que la table reste intacte. Le bord est adouci (fondu sur ~1 niveau de seuil).
 */
export function fondPropre({ data, w, h }, fond, seuil = 48) {
  const sortie = new Uint8ClampedArray(data);
  const proche = new Uint8Array(w * h); // 1 = ressemble au fond
  for (let p = 0; p < w * h; p++) proche[p] = distance(data, p * 4, fond) < seuil * 1.15 ? 1 : 0;
  const relie = new Uint8Array(w * h);
  const pile = [];
  const ajouter = (x, y) => { const p = y * w + x; if (proche[p] && !relie[p]) { relie[p] = 1; pile.push(p); } };
  for (let x = 0; x < w; x++) { ajouter(x, 0); ajouter(x, h - 1); }
  for (let y = 0; y < h; y++) { ajouter(0, y); ajouter(w - 1, y); }
  while (pile.length) {
    const p = pile.pop();
    const x = p % w;
    const y = (p - x) / w;
    if (x > 0) ajouter(x - 1, y);
    if (x < w - 1) ajouter(x + 1, y);
    if (y > 0) ajouter(x, y - 1);
    if (y < h - 1) ajouter(x, y + 1);
  }
  let remplaces = 0;
  for (let p = 0; p < w * h; p++) {
    if (!relie[p]) continue;
    const i = p * 4;
    const alpha = lisse(seuil * 0.55, seuil * 1.15, distance(data, i, fond)); // 0 = fond, 1 = article
    for (let c = 0; c < 3; c++) sortie[i + c] = Math.round(data[i + c] * alpha + FOND_PROPRE[c] * (1 - alpha));
    if (alpha < 0.5) remplaces++;
  }
  return { img: { data: sortie, w, h }, part: remplaces / (w * h) };
}

/**
 * Chaîne complète sur une image RGBA : cadrage carré → couleurs → fond propre (si le fond est uni).
 * Renvoie { img, infos } ; infos dit ce qui a été fait (pour l'afficher à la vendeuse).
 */
export function retoucher(img, { studio = true } = {}) {
  const fond = analyserFond(img);
  const article = fond.uniforme ? trouverArticle(img, fond.couleur) : null;
  const carre = decouper(img, cadrageCarre(img.w, img.h, article));
  let { img: suite, reglages } = corrigerCouleurs(carre);
  let fondRemplace = false;
  if (studio && fond.uniforme && article) {
    // Fond mesuré à nouveau après le cadrage et la correction des couleurs
    const f = analyserFond(suite);
    if (f.uniforme) {
      const r = fondPropre(suite, f.couleur);
      if (r.part > 0.08 && r.part < 0.9) { suite = r.img; fondRemplace = true; }
    }
  }
  return { img: suite, infos: { recadre: !!article, fondRemplace, reglages } };
}
