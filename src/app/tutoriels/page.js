// ------------------------------------------------------------
// PAGE « TUTORIELS » : toutes les vidéos sur un seul lien,
// à envoyer aux prospects (WhatsApp, e-mail, réseaux sociaux).
// Chaque vidéo a son ancre : /tutoriels/#produits ouvre directement « Ajouter un article ».
// ------------------------------------------------------------
import Link from 'next/link';
import { EnTeteSite, PiedSite, SectionVideos, AppelFinal, LIEN_DEMO_RESTO, VIDEOS, TUTORIELS } from '@/components/site/Site';
import { metaPage, JsonLd, filAriane } from '@/lib/seo';
import { SITE_URL } from '@/config';

export const metadata = metaPage({
  title: 'Tutoriels vidéo : apprenez Kaislo en 5 minutes',
  description: 'Kaislo en vidéo : présentation, restaurant, épicerie, ajout des articles et gestion des vendeurs. Avec voix, en une minute chacun.',
  alternates: { canonical: '/tutoriels/' },
});

// « 1 min 20 » → « PT1M20S » (durée lue par Google pour les vidéos)
const dureeIso = (d) => { const m = /(\d+)\s*min(?:\s*(\d+))?/.exec(d) || []; return 'PT' + (m[1] || 1) + 'M' + (m[2] ? m[2] + 'S' : ''); };
const DONNEES_VIDEOS = [
  filAriane([['Accueil', '/'], ['Tutoriels vidéo', '/tutoriels/']]),
  ...TUTORIELS.map((cle) => ({
    '@context': 'https://schema.org', '@type': 'VideoObject',
    name: VIDEOS[cle].titre, description: VIDEOS[cle].texte, inLanguage: 'fr',
    thumbnailUrl: SITE_URL + VIDEOS[cle].poster, contentUrl: SITE_URL + VIDEOS[cle].src, embedUrl: SITE_URL + '/tutoriels/#' + cle,
    uploadDate: '2026-10-05', duration: dureeIso(VIDEOS[cle].duree),
  })),
];

export default function PageTutoriels() {
  return (
    <div className="site">
      <EnTeteSite />
      <main>
        <section className="tutos-tete">
          <div className="site-largeur">
            <span className="etiquette">Tutoriels</span>
            <h1>Apprenez Kaislo en quelques minutes.</h1>
            <p className="chapo">Cinq courtes vidéos commentées, à regarder dans l’ordre ou selon votre besoin.</p>
            <nav className="sommaire-tutos" aria-label="Sommaire des tutoriels">
              {TUTORIELS.map((cle, i) => (
                <Link key={cle} href={'#' + cle} className="puce">{i + 1}. {VIDEOS[cle].titre} <span className="muet">· {VIDEOS[cle].duree}</span></Link>
              ))}
            </nav>
          </div>
        </section>
        <SectionVideos
          titre={null}
          vedette="presentation"
          lignes={[['restaurant', 'epicerie'], ['produits', 'vendeurs']]}
          id="tutoriels"
        />
        <AppelFinal
          titre="Convaincu ? Essayez avec vos propres articles."
          texte="Créez votre commerce en deux minutes : 30 jours gratuits, sans carte bancaire."
          lienDemo={LIEN_DEMO_RESTO}
        />
      </main>
      <PiedSite />
      <JsonLd donnees={DONNEES_VIDEOS} />
    </div>
  );
}
