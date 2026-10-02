// Règles pour les robots (généré au moment du build : /robots.txt)
import { SITE_URL } from '@/config';

export const dynamic = 'force-static';

export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/app/', '/admin/'] }],
    sitemap: SITE_URL + '/sitemap.xml',
  };
}
