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
import { EN } from './en.js';

export const LANGUES = [['fr', 'Français'], ['en', 'English']];
const DICTIONNAIRES = { en: EN };
const INTL = { fr: 'fr-FR', en: 'en-GB' };

let langue = 'fr';

export const langueActive = () => langue;
export const localeIntl = () => INTL[langue] || INTL.fr;

export function choisirLangue(l) {
  langue = DICTIONNAIRES[l] || l === 'fr' ? l : 'fr';
  if (typeof document !== 'undefined') document.documentElement.lang = langue;
}

// Langue du navigateur parmi celles proposées (français si aucune ne correspond)
export function langueDuNavigateur() {
  const l = typeof navigator !== 'undefined' ? (navigator.language || 'fr').slice(0, 2).toLowerCase() : 'fr';
  return DICTIONNAIRES[l] ? l : 'fr';
}

export function tr(cle, valeurs) {
  let texte = (langue !== 'fr' && DICTIONNAIRES[langue]?.[cle]) || cle;
  if (valeurs !== undefined) texte = texte.replace(/\{(\w+)\}/g, (m, k) => (valeurs[k] === undefined ? m : String(valeurs[k])));
  return texte;
}

// Texte traduit seulement si la valeur est un de nos textes (ex : mode de paiement « Espèces »), sinon inchangé
export const tt = (valeur) => (typeof valeur === 'string' ? tr(valeur) : valeur);
