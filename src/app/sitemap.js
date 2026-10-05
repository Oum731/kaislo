// Plan du site pour Google (généré au moment du build : /sitemap.xml)
// Pas de date de modification : Google préfère aucune date à une fausse date (elle serait celle de la construction du site).
import { SITE_URL } from '@/config';
import { PAGES_LEGALES } from '@/components/site/Site';
import { ACTIVITES } from '@/components/site/activites';
import { PAYS_SEO, lienPays } from '@/lib/pays-seo';

export const dynamic = 'force-static';

export default function sitemap() {
  const pages = [
    '/', '/gestion-restaurant/', '/gestion-epicerie/', '/gestion-stock/',
    ...Object.values(ACTIVITES).map((a) => a.lien),
    '/tarifs/', '/tutoriels/', ...PAYS_SEO.map(lienPays), '/devenir-commercial/',
    ...PAGES_LEGALES.map(([lien]) => lien),
  ];
  return pages.map((lien) => ({ url: SITE_URL + lien }));
}
