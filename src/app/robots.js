// Règles pour les robots (généré au moment du build : /robots.txt)
import { SITE_URL } from '@/config';

export const dynamic = 'force-static';

export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: ['/', '/api/public/boutique-image'], disallow: ['/app/', '/admin/', '/commercial/', '/livraison/', '/api/', '/purge-cache.txt'] }],
    sitemap: SITE_URL + '/sitemap.xml',
  };
}
