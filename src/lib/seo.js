// ------------------------------------------------------------
// RÉFÉRENCEMENT : balises de chaque page (titre, description, adresse canonique, aperçu de partage)
// et données structurées (JSON-LD) lues par Google.
// ------------------------------------------------------------
import { SITE_URL, SITE_NOM, chemin as cheminFichier } from '@/config';

// Google coupe les descriptions vers 155 caractères : on coupe proprement à la fin d'un mot
export function coupe(texte, max = 155) {
  if (!texte || texte.length <= max) return texte;
  const morceau = texte.slice(0, max - 1);
  return morceau.slice(0, Math.max(morceau.lastIndexOf(' '), 60)).replace(/[\s,;:.–—-]+$/, '') + '…';
}

// À utiliser dans chaque page : export const metadata = metaPage({ title, description, alternates: { canonical: '/ma-page/' } })
// Ajoute ce qui manquait : adresse propre à la page pour les partages (WhatsApp, Facebook, LinkedIn…) et description de longueur correcte.
export function metaPage(m) {
  const adresse = m.alternates?.canonical || '/';
  const description = coupe(m.description);
  const titre = typeof m.title === 'string' ? m.title : undefined;
  const titrePartage = titre ? (adresse === '/' ? titre : `${titre} | ${SITE_NOM}`) : undefined;
  const image = [{ url: cheminFichier('/og-image.png'), width: 1200, height: 630, alt: 'Kaislo, la gestion des ventes et du stock' }];
  return {
    ...m,
    description,
    openGraph: { type: 'website', locale: 'fr_FR', siteName: SITE_NOM, url: SITE_URL + adresse, title: titrePartage, description, images: image },
    twitter: { card: 'summary_large_image', title: titrePartage, description, images: [cheminFichier('/og-image.png')] },
  };
}

// Balise de données structurées (une ou plusieurs)
export function JsonLd({ donnees }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(donnees) }} />;
}

// Fil d'Ariane : [['Accueil', '/'], ['Tarifs', '/tarifs/']]
export function filAriane(elements) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: elements.map(([nom, lien], i) => ({ '@type': 'ListItem', position: i + 1, name: nom, item: SITE_URL + lien })),
  };
}
