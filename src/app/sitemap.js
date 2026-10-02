// Plan du site pour Google (généré au moment du build : /sitemap.xml)
import { SITE_URL } from '@/config';

export const dynamic = 'force-static';

export default function sitemap() {
  const maintenant = new Date();
  return [
    { url: SITE_URL + '/', lastModified: maintenant, changeFrequency: 'weekly', priority: 1 },
    { url: SITE_URL + '/caisse-restaurant/', lastModified: maintenant, changeFrequency: 'monthly', priority: 0.9 },
    { url: SITE_URL + '/caisse-epicerie/', lastModified: maintenant, changeFrequency: 'monthly', priority: 0.9 },
  ];
}
