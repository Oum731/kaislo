// ------------------------------------------------------------
// Mise en page commune à toutes les pages (site + application)
// ------------------------------------------------------------
import { Bricolage_Grotesque, DM_Sans } from 'next/font/google';
import { SITE_URL, SITE_NOM, SITE_SLOGAN, GOOGLE_VERIFICATION, BASE_PATH, chemin } from '@/config';
import '@/app/globals.css';
import BandeauMesure from '@/components/site/BandeauMesure';

// Polices téléchargées au moment du "build" et servies par le site lui-même
const titre = Bricolage_Grotesque({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-titre', display: 'swap' });
const texte = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-texte', display: 'swap' });

// Informations lues par Google et par les réseaux sociaux
export function metadataRacine(lang) {
  const en = lang === 'en';
  return {
  metadataBase: new URL(SITE_URL),
  title: {
    default: en ? `${SITE_NOM} — Sales and stock management for businesses` : `${SITE_NOM} — Gestion des ventes et du stock pour commerces`,
    template: `%s | ${SITE_NOM}`,
  },
  description: en
      ? 'Kaislo is simple sales and stock management software for phone, tablet and computer, for businesses in Africa and around the world: sales, inventory, receipts printed or sent via WhatsApp, customer credit book, tables, margins and statistics. Every currency. Free trial.'
      : 'Kaislo est l’outil de gestion des ventes et du stock, simple, sur téléphone, tablette et ordinateur, pour les commerces d’Afrique et du monde entier : ventes, inventaire, tickets imprimés ou envoyés par WhatsApp, carnet de crédit, tables, marges et statistiques. Toutes les devises. Essai gratuit.',
  applicationName: SITE_NOM,
  keywords: ['logiciel de gestion des ventes', 'gestion commerce', 'logiciel restaurant', 'logiciel épicerie', 'logiciel boutique', 'Afrique', 'Côte d’Ivoire', 'Sénégal', 'Maroc', 'Cameroun', 'France', 'carnet de crédit', 'ticket de vente', 'gestion de stock', 'logiciel inventaire', 'gestion d’inventaire', 'outil de gestion commerce', 'mobile money'],
  // Image affichée quand un lien est partagé (WhatsApp, Facebook, LinkedIn…) : npm run icones
  openGraph: { type: 'website', locale: en ? 'en_GB' : 'fr_FR', siteName: SITE_NOM, title: en ? `${SITE_NOM} — Sales and stock management` : `${SITE_NOM} — ${SITE_SLOGAN}`, url: SITE_URL + (en ? '/en/' : ''), images: [{ url: chemin('/og-image.png'), width: 1200, height: 630, alt: 'Kaislo, la gestion des ventes et du stock' }] },
  twitter: { card: 'summary_large_image', images: [chemin('/og-image.png')] },
  manifest: chemin('/manifest.webmanifest'),
  // favicon.ico (16-48 px) pour Google et les anciens navigateurs, SVG pour les récents, PNG pour iPhone
  icons: {
    icon: [{ url: chemin('/favicon.ico'), sizes: '16x16 32x32 48x48' }, { url: chemin('/icons/icone.svg'), type: 'image/svg+xml' }, { url: chemin('/icons/icone-48.png'), sizes: '48x48', type: 'image/png' }],
    apple: chemin('/icons/icone-180.png'),
  },
  alternates: { canonical: en ? '/en/' : '/' },
  // Code de Google Search Console (src/config.js)
  ...(GOOGLE_VERIFICATION ? { verification: { google: GOOGLE_VERIFICATION } } : {}),
  // La copie de test GitHub Pages ne doit pas apparaître dans Google (seul kaislo.com compte)
  ...(BASE_PATH ? { robots: { index: false, follow: false } } : {}),
  };
}

// Qui édite Kaislo et quel est le site officiel (lu par Google)
const donneesSite = (lang) => [
  { '@context': 'https://schema.org', '@type': 'Organization', name: SITE_NOM, url: SITE_URL, logo: SITE_URL + '/icons/icone-512.png', parentOrganization: { '@type': 'Organization', name: 'Amorac', url: 'https://amorac.com' } },
  { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NOM, url: SITE_URL, inLanguage: lang },
];

export const viewport = {
  themeColor: '#F6F4EE',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export function LayoutRacine({ lang, children }) {
  return (
    <html lang={lang} className={`${titre.variable} ${texte.variable}`}>
      <body>
        {children}
        <BandeauMesure />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(donneesSite(lang)) }} />
      </body>
    </html>
  );
}
