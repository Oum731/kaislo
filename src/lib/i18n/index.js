// ------------------------------------------------------------
// LANGUES de l'application (français, anglais)
//
// Le texte français sert de clé : tr('Fermer la journée') renvoie le texte tel quel en français,
// et sa traduction (dictionnaire en.js) en anglais. Un texte sans traduction reste en français
// (rien ne casse) ; `npm run i18n` liste ce qui manque.
//
// Valeurs : tr('Stock {0} · alerte à {1}', [12, 5]) ou tr('Bonjour {nom}', { nom: 'Awa' }).
// Ajouter une langue : un nouveau dictionnaire ici, et la liste LANGUES.
// ------------------------------------------------------------
export const LANGUES = [['fr', 'Français'], ['en', 'English']];
// Le dictionnaire anglais (lourd) n'est pas livré avec les pages françaises : il s'enregistre seulement
// sur les pages /en/ (charge-en.js) ou à la demande dans l'application (chargerLangue).
const DICTIONNAIRES = {};
const CODES = LANGUES.map(([c]) => c);
export const enregistrerDictionnaire = (l, d) => { DICTIONNAIRES[l] = d; };
export const langueAcharger = (l) => l === 'en' && !DICTIONNAIRES.en;
export async function chargerLangue(l) {
  if (langueAcharger(l)) enregistrerDictionnaire('en', (await import('./en.js')).EN);
}
const INTL = { fr: 'fr-FR', en: 'en-GB' };

let langue = 'fr';

export const langueActive = () => langue;
export const localeIntl = () => INTL[langue] || INTL.fr;

export function choisirLangue(l) {
  langue = CODES.includes(l) ? l : 'fr';
  if (typeof document !== 'undefined') document.documentElement.lang = langue;
}

// Langue lue en dernier sur le site public (mémorisée dans l'appareil) : l'application s'ouvre dans la même
const CLE_SITE = 'kaislo-langue-site';
export function memoriserLangueSite(l) {
  try { localStorage.setItem(CLE_SITE, l); } catch { /* stockage bloqué */ }
}
export function langueDuSite() {
  try { const l = localStorage.getItem(CLE_SITE); return CODES.includes(l) ? l : null; } catch { return null; }
}

// Langue du navigateur parmi celles proposées (français si aucune ne correspond)
export function langueDuNavigateur() {
  const l = typeof navigator !== 'undefined' ? (navigator.language || 'fr').slice(0, 2).toLowerCase() : 'fr';
  return CODES.includes(l) ? l : 'fr';
}

export function tr(cle, valeurs) {
  let texte = (langue !== 'fr' && DICTIONNAIRES[langue]?.[cle]) || cle;
  if (valeurs !== undefined) texte = texte.replace(/\{(\w+)\}/g, (m, k) => (valeurs[k] === undefined ? m : String(valeurs[k])));
  return texte;
}

// Texte traduit seulement si la valeur est un de nos textes (ex : mode de paiement « Espèces »), sinon inchangé
export const tt = (valeur) => (typeof valeur === 'string' ? tr(valeur) : valeur);
