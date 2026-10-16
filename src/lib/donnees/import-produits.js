// ------------------------------------------------------------
// IMPORT D'ARTICLES depuis un tableur (Excel .xlsx ou .csv).
//
// Ce module ne lit pas le fichier : il reçoit les lignes déjà lues (tableau de tableaux) et fait le travail de fond :
//   1. repère les colonnes d'après leurs titres (français ou anglais, avec ou sans accents) ;
//   2. lit les nombres tels qu'ils s'écrivent (« 1 500 », « 1.500,50 », « 2 500 FCFA ») ;
//   3. vérifie chaque ligne (nom, prix…) et la range en « à importer », « déjà présent » ou « erreur ».
// La lecture du fichier est dans lire-tableur.js, l'enregistrement dans le store (importerArticles).
// ------------------------------------------------------------

// Colonnes reconnues. Chaque colonne a des titres possibles (sans accents, en minuscules).
export const COLONNES_IMPORT = [
  { cle: 'nom', titres: ['nom', 'article', 'produit', 'designation', 'libelle', 'name', 'item', 'product'], obligatoire: true },
  { cle: 'prix', titres: ['prix', 'prix de vente', 'prix vente', 'pv', 'tarif', 'price', 'selling price', 'sale price'], obligatoire: true },
  { cle: 'prixAchat', titres: ['prix d achat', 'prix achat', 'achat', 'cout', 'cout d achat', 'pa', 'cost', 'purchase price', 'buying price'] },
  { cle: 'categorie', titres: ['categorie', 'famille', 'rayon', 'groupe', 'category', 'type'] },
  { cle: 'stock', titres: ['stock', 'quantite', 'qte', 'qty', 'quantity', 'stock initial', 'en stock'] },
  { cle: 'unite', titres: ['unite', 'unit', 'conditionnement'] },
  { cle: 'codeBarre', titres: ['code barre', 'code-barre', 'codebarre', 'code barres', 'ean', 'barcode', 'gtin', 'code'] },
  { cle: 'seuilAlerte', titres: ['seuil', 'seuil d alerte', 'alerte', 'stock mini', 'stock minimum', 'min', 'alert level', 'reorder level'] },
  { cle: 'promo', titres: ['promo', 'prix promo', 'prix promotionnel', 'promotion', 'promo price', 'sale', 'discount price'] },
];

export const MAX_LIGNES_IMPORT = 2000;

/** Titre de colonne mis en forme pour la comparaison : minuscules, sans accents, sans ponctuation superflue. */
export const normaliserTitre = (t) =>
  String(t ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’'`_\-./()*:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Lit un nombre écrit par une personne.
 * « 1 500 » → 1500 ; « 1.500,50 » → 1500.5 ; « 1,500.50 » → 1500.5 ; « 2 500 FCFA » → 2500 ; « 12,5 » → 12.5 ; « abc » → null
 * Un seul séparateur suivi d'exactement 3 chiffres est un séparateur de milliers (« 1.500 » = 1500).
 */
export function lireNombre(valeur) {
  if (valeur === null || valeur === undefined || valeur === '') return null;
  if (typeof valeur === 'number') return Number.isFinite(valeur) ? valeur : null;
  let t = String(valeur).replace(/[  ]/g, ' ').trim();
  if (!t) return null;
  t = t.replace(/[^\d.,\-\s]/g, '').replace(/\s+/g, '');
  if (!/\d/.test(t)) return null;
  const virgule = t.lastIndexOf(',');
  const point = t.lastIndexOf('.');
  if (virgule >= 0 && point >= 0) {
    // Les deux : le dernier est la virgule décimale, l'autre sépare les milliers
    const decimal = virgule > point ? ',' : '.';
    const milliers = decimal === ',' ? '.' : ',';
    t = t.split(milliers).join('').replace(decimal, '.');
  } else if (virgule >= 0 || point >= 0) {
    const sep = virgule >= 0 ? ',' : '.';
    const morceaux = t.split(sep);
    const dernier = morceaux[morceaux.length - 1];
    if (morceaux.length > 2 || (dernier.length === 3 && morceaux[0] !== '' && morceaux[0] !== '-')) t = morceaux.join('');
    else t = morceaux.join('.');
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Repère les colonnes : renvoie { colonnes: { cle: indice }, inconnues: [titres non reconnus], entete: indice de la ligne de titres } */
export function reperer(lignes) {
  // La ligne de titres est la première des 10 premières lignes qui contient au moins un nom d'article et un prix
  for (let i = 0; i < Math.min(lignes.length, 10); i++) {
    const titres = (lignes[i] || []).map(normaliserTitre);
    const colonnes = {};
    for (const def of COLONNES_IMPORT) {
      // Un titre exact d'abord ; « code » seul n'est pris que si aucune colonne « code-barres » plus précise n'existe
      const idx = titres.findIndex((t, k) => t && def.titres.includes(t) && !Object.values(colonnes).includes(k));
      if (idx >= 0) colonnes[def.cle] = idx;
    }
    if (colonnes.nom !== undefined && colonnes.prix !== undefined) {
      const utilisees = new Set(Object.values(colonnes));
      const inconnues = (lignes[i] || []).map((t, k) => [t, k]).filter(([t, k]) => String(t ?? '').trim() && !utilisees.has(k)).map(([t]) => String(t).trim());
      return { colonnes, inconnues, entete: i };
    }
  }
  return null;
}

const texte = (v) => (v === null || v === undefined ? '' : String(v).replace(/\s+/g, ' ').trim());
const cleNom = (n) => normaliserTitre(n);

/**
 * Analyse le fichier lu.
 *   lignes     : tableau de tableaux (première feuille du classeur, ou le CSV)
 *   existants  : articles déjà dans le commerce (pour repérer ceux qui sont déjà là)
 *   uniteParDefaut : unité des articles sans colonne « unité »
 * Renvoie { colonnes, inconnues, articles: [{ ligne, ...champs, etat: 'nouveau'|'existant', ancienId? }], erreurs: [{ ligne, raison }], trop }
 * ou { erreur } si le fichier n'a pas les colonnes minimales.
 */
export function analyserImport(lignes, existants = [], uniteParDefaut = 'pièce') {
  const repere = reperer(lignes);
  if (!repere) return { erreur: 'colonnes' };
  const { colonnes, inconnues, entete } = repere;
  const corps = lignes.slice(entete + 1).filter((l) => (l || []).some((c) => texte(c)));
  const trop = corps.length > MAX_LIGNES_IMPORT;
  const lu = (ligne, cle) => (colonnes[cle] === undefined ? undefined : ligne[colonnes[cle]]);

  const parNom = new Map(existants.map((p) => [cleNom(p.nom), p]));
  const vusDansLeFichier = new Set();
  const articles = [];
  const erreurs = [];

  corps.slice(0, MAX_LIGNES_IMPORT).forEach((ligne, i) => {
    const numero = entete + 2 + i; // numéro de ligne tel qu'affiché dans Excel
    const nom = texte(lu(ligne, 'nom'));
    if (!nom) return erreurs.push({ ligne: numero, raison: 'nom' });
    if (nom.length > 120) return erreurs.push({ ligne: numero, nom, raison: 'nomLong' });
    const prix = lireNombre(lu(ligne, 'prix'));
    if (prix === null) return erreurs.push({ ligne: numero, nom, raison: 'prix' });
    if (prix < 0) return erreurs.push({ ligne: numero, nom, raison: 'prixNegatif' });
    const cle = cleNom(nom);
    if (vusDansLeFichier.has(cle)) return erreurs.push({ ligne: numero, nom, raison: 'doublon' });
    vusDansLeFichier.add(cle);

    const prixAchat = lireNombre(lu(ligne, 'prixAchat'));
    let promo = lireNombre(lu(ligne, 'promo'));
    if (promo !== null && (promo <= 0 || promo >= prix)) promo = null; // un prix promo invalide est ignoré, l'article reste importable
    const stock = lireNombre(lu(ligne, 'stock'));
    const seuil = lireNombre(lu(ligne, 'seuilAlerte'));
    const unite = texte(lu(ligne, 'unite')).toLowerCase() || uniteParDefaut;
    const existant = parNom.get(cle);
    articles.push({
      ligne: numero,
      nom,
      prix,
      prixAchat: prixAchat !== null && prixAchat >= 0 ? prixAchat : null,
      promo,
      categorie: texte(lu(ligne, 'categorie')),
      stock: stock !== null && stock >= 0 ? stock : null, // null : pas de suivi de stock pour cet article
      seuilAlerte: seuil !== null && seuil >= 0 ? seuil : null,
      unite,
      codeBarre: texte(lu(ligne, 'codeBarre')).replace(/\.0+$/, ''), // Excel écrit parfois un code-barres comme un nombre : « 6111252421012.0 »
      etat: existant ? 'existant' : 'nouveau',
      ancienId: existant?.id || null,
    });
  });
  return { colonnes, inconnues, articles, erreurs, trop, total: corps.length };
}

/** Lit un texte CSV (séparateur « ; », « , » ou tabulation, guillemets) : renvoie un tableau de tableaux. */
export function lireCsv(contenu) {
  let t = String(contenu ?? '').replace(/^﻿/, '');
  const premiere = t.split(/\r?\n/, 1)[0] || '';
  const compte = (c) => (premiere.match(new RegExp(c === '\t' ? '\\t' : '\\' + c, 'g')) || []).length;
  const sep = [';', '\t', ','].map((c) => [c, compte(c)]).sort((a, b) => b[1] - a[1])[0];
  const separateur = sep[1] > 0 ? sep[0] : ',';
  const lignes = [];
  let ligne = [];
  let champ = '';
  let guillemets = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (guillemets) {
      if (c === '"' && t[i + 1] === '"') { champ += '"'; i++; }
      else if (c === '"') guillemets = false;
      else champ += c;
    } else if (c === '"') guillemets = true;
    else if (c === separateur) { ligne.push(champ); champ = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      ligne.push(champ); champ = '';
      lignes.push(ligne); ligne = [];
    } else champ += c;
  }
  if (champ !== '' || ligne.length) { ligne.push(champ); lignes.push(ligne); }
  return lignes;
}
