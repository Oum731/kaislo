// Plan du site pour Google (généré au moment du build : /sitemap.xml)
import { SITE_URL } from '@/config';
import { PAGES_LEGALES } from '@/components/site/Site';
import { ACTIVITES } from '@/components/site/activites';

export const dynamic = 'force-static';

export default function sitemap() {
  const maintenant = new Date();
  return [
    { url: SITE_URL + '/', lastModified: maintenant, changeFrequency: 'weekly', priority: 1 },
    { url: SITE_URL + '/caisse-restaurant/', lastModified: maintenant, changeFrequency: 'monthly', priority: 0.9 },
    { url: SITE_URL + '/caisse-epicerie/', lastModified: maintenant, changeFrequency: 'monthly', priority: 0.9 },
    { url: SITE_URL + '/gestion-stock/', lastModified: maintenant, changeFrequency: 'monthly', priority: 0.9 },
    ...Object.values(ACTIVITES).map((a) => ({ url: SITE_URL + a.lien, lastModified: maintenant, changeFrequency: 'monthly', priority: 0.8 })),
    { url: SITE_URL + '/tarifs/', lastModified: maintenant, changeFrequency: 'monthly', priority: 0.9 },
    { url: SITE_URL + '/devenir-commercial/', lastModified: maintenant, changeFrequency: 'monthly', priority: 0.5 },
    { url: SITE_URL + '/tutoriels/', lastModified: maintenant, changeFrequency: 'monthly', priority: 0.8 },
    ...PAGES_LEGALES.map(([lien]) => ({ url: SITE_URL + lien, lastModified: maintenant, changeFrequency: 'yearly', priority: 0.3 })),
  ];
}
