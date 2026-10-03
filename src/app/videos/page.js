// ------------------------------------------------------------
// PAGE « VIDÉOS » : toutes les démonstrations sur un seul lien,
// à envoyer aux prospects (WhatsApp, e-mail, réseaux sociaux).
// ------------------------------------------------------------
import { EnTeteSite, PiedSite, SectionVideos, AppelFinal, LIEN_DEMO_RESTO } from '@/components/site/Site';

export const metadata = {
  title: 'Vidéos de démonstration',
  description: 'Kaisly en vidéo : présentation en 1 minute, caisse restaurant, caisse épicerie, ajout des articles et gestion des vendeurs.',
  alternates: { canonical: '/videos/' },
};

export default function PageVideos() {
  return (
    <div className="site">
      <EnTeteSite />
      <main>
        <SectionVideos
          titre="Kaisly en vidéo : regardez, puis essayez."
          vedette="presentation"
          lignes={[['restaurant', 'epicerie'], ['produits', 'vendeurs']]}
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
