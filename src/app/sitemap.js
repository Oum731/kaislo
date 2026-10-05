// Plan du site pour Google (généré au moment du build : /sitemap.xml)
// Pas de date de modification : Google préfère aucune date à une fausse date (elle serait celle de la construction du site).
import { SITE_URL } from '@/config';
import { PAGES_LEGALES } from '@/components/site/Site';
import { ACTIVITES } from '@/components/site/activites';
import { PAYS_SEO, lienPays } from '@/lib/pays-seo';
import { PAGES } from '@/lib/site-routes';

export const dynamic = 'force-static';

export default function sitemap() {
  const pages = [
    '/', '/gestion-restaurant/', '/gestion-epicerie/', '/gestion-stock/',
    ...Object.values(ACTIVITES).map((a) => a.lien),
    '/tarifs/', '/tutoriels/', ...PAYS_SEO.map(lienPays), '/devenir-commercial/',
    ...PAGES_LEGALES().map(([lien]) => lien),
  ];
  // Pages avec version anglaise : chacune indique son équivalent (hreflang) pour Google
  const anglais = new Map(PAGES);
  return pages.map((lien) => {
    const en = anglais.get(lien);
    return en
      ? { url: SITE_URL + lien, alternates: { languages: { fr: SITE_URL + lien, en: SITE_URL + en, 'x-default': SITE_URL + lien } } }
      : { url: SITE_URL + lien };
  }).concat(PAGES.map(([fr, en]) => ({ url: SITE_URL + en, alternates: { languages: { fr: SITE_URL + fr, en: SITE_URL + en, 'x-default': SITE_URL + fr } } })));
}
