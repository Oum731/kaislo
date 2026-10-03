// ------------------------------------------------------------
// Mise en page commune à toutes les pages (site + application)
// ------------------------------------------------------------
import { Bricolage_Grotesque, DM_Sans } from 'next/font/google';
import { SITE_URL, SITE_NOM, SITE_SLOGAN, chemin } from '@/config';
import './globals.css';

// Polices téléchargées au moment du "build" et servies par le site lui-même
const titre = Bricolage_Grotesque({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-titre', display: 'swap' });
const texte = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-texte', display: 'swap' });

// Informations lues par Google et par les réseaux sociaux
export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NOM} — Caisse et gestion de stock pour restaurants, épiceries et tous les commerces`,
    template: `%s | ${SITE_NOM}`,
  },
  description:
    'Kaislo est la caisse et l’outil de gestion de stock simples, sur téléphone, tablette et ordinateur, pour les commerces d’Afrique et du monde entier : ventes, inventaire, tickets imprimés ou envoyés par WhatsApp, carnet de crédit, tables, marges et statistiques. Toutes les devises. Essai gratuit.',
  applicationName: SITE_NOM,
  keywords: ['logiciel de caisse', 'caisse enregistreuse', 'caisse restaurant', 'caisse épicerie', 'caisse boutique', 'Afrique', 'Côte d’Ivoire', 'Sénégal', 'Maroc', 'Cameroun', 'France', 'carnet de crédit', 'ticket de caisse', 'gestion de stock', 'logiciel inventaire', 'gestion d’inventaire', 'outil de gestion commerce', 'mobile money'],
  // Image affichée quand un lien est partagé (WhatsApp, Facebook, LinkedIn…) : npm run icones
  openGraph: { type: 'website', locale: 'fr_FR', siteName: SITE_NOM, title: `${SITE_NOM} — ${SITE_SLOGAN}`, url: SITE_URL, images: [{ url: chemin('/og-image.png'), width: 1200, height: 630, alt: 'Kaislo, la caisse et la gestion de stock' }] },
  twitter: { card: 'summary_large_image', images: [chemin('/og-image.png')] },
  manifest: chemin('/manifest.webmanifest'),
  // favicon.ico (16-48 px) pour Google et les anciens navigateurs, SVG pour les récents, PNG pour iPhone
  icons: {
    icon: [{ url: chemin('/favicon.ico'), sizes: '16x16 32x32 48x48' }, { url: chemin('/icons/icone.svg'), type: 'image/svg+xml' }, { url: chemin('/icons/icone-48.png'), sizes: '48x48', type: 'image/png' }],
    apple: chemin('/icons/icone-180.png'),
  },
  alternates: { canonical: '/' },
};

export const viewport = {
  themeColor: '#F6F4EE',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={`${titre.variable} ${texte.variable}`}>
      <body>{children}</body>
    </html>
  );
}
