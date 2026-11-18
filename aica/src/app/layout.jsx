import './globals.css';
import { SITE } from '@/config';

export const metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: 'AICA — Association des Ivoiriens de Casablanca', template: '%s · AICA' },
  description: 'Événements, actions et activités de l’Association des Ivoiriens de Casablanca. Obtenez votre carte de membre en ligne.',
  icons: { icon: '/brand/logo.png' },
  openGraph: { title: 'AICA — Association des Ivoiriens de Casablanca', images: ['/brand/logo.png'], locale: 'fr_FR', type: 'website' },
};
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#f77f00' };

export default function Root({ children }) {
  return (<html lang="fr"><body>{children}</body></html>);
}
