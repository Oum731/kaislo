// ------------------------------------------------------------
// PAGE « TUTORIELS » : toutes les vidéos sur un seul lien,
// à envoyer aux prospects (WhatsApp, e-mail, réseaux sociaux).
// Chaque vidéo a son ancre : /tutoriels/#produits ouvre directement « Ajouter un article ».
// ------------------------------------------------------------
import Link from 'next/link';
import { EnTeteSite, PiedSite, SectionVideos, AppelFinal, LIEN_DEMO_RESTO, VIDEOS, TUTORIELS } from '@/components/site/Site';

export const metadata = {
  title: 'Tutoriels vidéo',
  description: 'Kaisly en vidéo : présentation, caisse restaurant, caisse épicerie, ajout des articles et gestion des vendeurs. Avec voix, en une minute chacun.',
  alternates: { canonical: '/tutoriels/' },
};

export default function PageTutoriels() {
  return (
    <div className="site">
      <EnTeteSite />
      <main>
        <section className="tutos-tete">
          <div className="site-largeur">
            <span className="etiquette">Tutoriels</span>
            <h1>Apprenez Kaisly en quelques minutes.</h1>
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
    </div>
  );
}
