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
    default: `${SITE_NOM} — Logiciel de caisse simple pour restaurants, épiceries et boutiques`,
    template: `%s | ${SITE_NOM}`,
  },
  description:
    'Kaisly est la caisse simple sur téléphone, tablette et ordinateur, pour les commerces d’Afrique et du monde entier : ventes, tickets imprimés ou envoyés par WhatsApp, carnet de crédit, tables, stock, marges et statistiques. Toutes les devises. Essai gratuit.',
  applicationName: SITE_NOM,
  keywords: ['logiciel de caisse', 'caisse enregistreuse', 'caisse restaurant', 'caisse épicerie', 'caisse boutique', 'Afrique', 'Côte d’Ivoire', 'Sénégal', 'Maroc', 'Cameroun', 'France', 'carnet de crédit', 'ticket de caisse', 'gestion de stock', 'logiciel inventaire', 'gestion d’inventaire', 'outil de gestion commerce', 'mobile money'],
  openGraph: { type: 'website', locale: 'fr_FR', siteName: SITE_NOM, title: `${SITE_NOM} — ${SITE_SLOGAN}`, url: SITE_URL },
  manifest: chemin('/manifest.webmanifest'),
  icons: { icon: chemin('/icons/icone.svg'), apple: chemin('/icons/icone-180.png') },
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
