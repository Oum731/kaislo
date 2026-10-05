// ------------------------------------------------------------
// ADRESSES DU SITE PUBLIC EN FRANÇAIS ET EN ANGLAIS
// Une page = une paire [français, anglais]. Les pages sans version anglaise (pour l'instant les pages
// légales, les pages par pays et par activité) gardent leur adresse française dans les deux langues.
// ------------------------------------------------------------
import { SITE_URL } from '@/config';
import { langueActive } from '@/lib/i18n';
import { GUIDES } from '@/lib/guides';

export const PAGES = [
  ['/', '/en/'],
  ['/tarifs/', '/en/pricing/'],
  ['/gestion-restaurant/', '/en/restaurant-management/'],
  ['/gestion-epicerie/', '/en/grocery-store-management/'],
  ['/gestion-stock/', '/en/stock-management/'],
  ['/tutoriels/', '/en/tutorials/'],
  ['/gestion-boutique/', '/en/boutique-management/'],
  ['/gestion-quincaillerie/', '/en/hardware-store-management/'],
  ['/gestion-boulangerie/', '/en/bakery-management/'],
  ['/gestion-bar/', '/en/bar-management/'],
  ['/logiciel-grossiste/', '/en/wholesale-management/'],
  ['/guides/', '/en/guides/'],
  ...GUIDES.map((g) => [`/guides/${g.fr.slug}/`, `/en/guides/${g.en.slug}/`]),
];

const VERS_EN = new Map(PAGES);
const VERS_FR = new Map(PAGES.map(([fr, en]) => [en, fr]));

// Adresse d'une page dans la langue en cours (garde l'ancre : '/#fonctions' → '/en/#fonctions')
export function lien(adresseFr) {
  if (langueActive() !== 'en') return adresseFr;
  const [chemin, ancre] = adresseFr.split('#');
  const en = VERS_EN.get(chemin);
  return en ? en + (ancre ? '#' + ancre : '') : adresseFr;
}

// Page équivalente dans l'autre langue, à partir de l'adresse en cours (pathname) ; null si elle n'existe pas
export function autreLangue(pathname) {
  const p = pathname.endsWith('/') ? pathname : pathname + '/';
  if (VERS_FR.has(p)) return { langue: 'fr', adresse: VERS_FR.get(p) };
  if (VERS_EN.has(p)) return { langue: 'en', adresse: VERS_EN.get(p) };
  return null;
}

// Balises « alternates » d'une page : adresse canonique + équivalents (hreflang) pour Google
export function alternates(adresseFr, langue) {
  const en = VERS_EN.get(adresseFr);
  const canonical = langue === 'en' ? en : adresseFr;
  return en ? { canonical, languages: { fr: adresseFr, en, 'x-default': adresseFr } } : { canonical };
}
