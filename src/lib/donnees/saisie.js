// ------------------------------------------------------------
// SAISIE : majuscules et minuscules des noms, et reconnaissance des numéros de téléphone visiblement faux.
// Mêmes règles que api/lib/saisie.php (tests/saisie.test.mjs compare les deux sur les mêmes exemples).
// ------------------------------------------------------------
const PARTICULES = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'et', 'd', 'l', 'sur', 'sous', 'en']);
const nettoyer = (t) => String(t ?? '').replace(/[\p{Cc}\s]+/gu, ' ').trim();

/** « jean-pierre  d'AUBIGNÉ » devient « Jean-Pierre d'Aubigné ». */
export function nomPropre(texte) {
  const t = nettoyer(texte);
  if (!t) return '';
  return t.toLowerCase().split(' ').map((mot, i) => mot.split(/([-’'])/u).map((m, k) => {
    if (m === '' || m === '-' || m === '’' || m === "'") return m;
    if (PARTICULES.has(m) && !(i === 0 && k === 0)) return m;
    const [premiere, ...reste] = Array.from(m);
    return premiere.toUpperCase() + reste.join('');
  }).join('')).join(' ');
}

/** Noms de commerce, de ville, de quartier : corrigé seulement si le texte est tout en minuscules, tout en majuscules, ou mêle un mot criard (« épicerie AL BARAKA »). « iPhone Store » et « SOS Dépannage » restent tels quels. */
export function nomPropreSiUniforme(texte) {
  const t = nettoyer(texte);
  if (!t) return '';
  if (t === t.toLowerCase() || t === t.toUpperCase()) return nomPropre(t);
  // Texte mêlant un mot criard (4 lettres ou plus, tout en majuscules) et d'autres mots : « épicerie AL BARAKA », « CHEZ awa »
  if (t.split(' ').some((m) => Array.from(m).length >= 4 && /^[\p{Lu}\-’']+$/u.test(m))) return nomPropre(t);
  return t;
}

/** Vrai si les chiffres du numéro national ont l'air inventés : 0000000, 1111122, 12345678, 12121212, 123123123… */
export function numeroFactice(national) {
  const n = String(national).length;
  if (n < 6) return false;
  const s = String(national);
  if (new Set(s).size <= 2) return true;
  if (/(\d)\1{4,}/.test(s)) return true;
  let montee = 1;
  let descente = 1;
  for (let i = 1; i < n; i++) {
    const d = (Number(s[i]) - Number(s[i - 1]) + 10) % 10;
    montee = d === 1 ? montee + 1 : 1;
    descente = d === 9 ? descente + 1 : 1;
    if (montee >= 7 || descente >= 7) return true;
  }
  for (let p = 1; p <= 4; p++) {
    if (n >= 2 * p && s.slice(0, p).repeat(Math.ceil(n / p)).slice(0, n) === s) return true;
  }
  return false;
}

/** Un nom de personne doit contenir au moins deux lettres (pas « 12345 » ni « ?? »). */
export const nomAvecLettres = (texte) => /\p{L}.*\p{L}/u.test(String(texte || ''));

/** Texte d'un message : retours à la ligne gardés (pas plus d'une ligne vide de suite), majuscule au début et après « . », « ! », « ? », « … » ou un retour à la ligne. Le reste n'est pas touché (« www.kaislo.com », sigles, noms propres). */
export function majusculesPhrases(texte) {
  const t = String(texte ?? '').replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return t.replace(/(^|[.!?…]\s+|\n)(\p{Ll})/gu, (_, avant, lettre) => avant + lettre.toLocaleUpperCase());
}
