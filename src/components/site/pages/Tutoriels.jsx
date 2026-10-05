// ------------------------------------------------------------
// PAGE « TUTORIELS » : toutes les vidéos sur un seul lien,
// à envoyer aux prospects (WhatsApp, e-mail, réseaux sociaux).
// Chaque vidéo a son ancre : /tutoriels/#produits ouvre directement « Ajouter un article ».
// ------------------------------------------------------------
import Link from 'next/link';
import { EnTeteSite, PiedSite, SectionVideos, AppelFinal, LIEN_DEMO_RESTO, VIDEOS, TUTORIELS } from '@/components/site/Site';
import { metaPage, JsonLd, filAriane } from '@/lib/seo';
import { SITE_URL } from '@/config';
import { tr, choisirLangue, langueActive } from '@/lib/i18n';
import { alternates, lien } from '@/lib/site-routes';

export function meta(lang) {
  choisirLangue(lang);
  return metaPage({
    title: tr('Tutoriels vidéo : apprenez Kaislo en 5 minutes'),
    description: tr('Kaislo en vidéo : présentation, restaurant, épicerie, ajout des articles et gestion des vendeurs. Avec voix, en une minute chacun.'),
    alternates: alternates('/tutoriels/', lang),
    langue: lang,
  });
}

// « 1 min 20 » → « PT1M20S » (durée lue par Google pour les vidéos)
const dureeIso = (d) => { const m = /(\d+)\s*min(?:\s*(\d+))?/.exec(d) || []; return 'PT' + (m[1] || 1) + 'M' + (m[2] ? m[2] + 'S' : ''); };
const DONNEES_VIDEOS = () => ([
  filAriane([[tr('Accueil'), lien('/')], [tr('Tutoriels vidéo'), lien('/tutoriels/')]]),
  ...TUTORIELS.map((cle) => ({
    '@context': 'https://schema.org', '@type': 'VideoObject',
    name: VIDEOS()[cle].titre, description: VIDEOS()[cle].texte, inLanguage: langueActive(),
    thumbnailUrl: SITE_URL + VIDEOS()[cle].poster, contentUrl: SITE_URL + VIDEOS()[cle].src, embedUrl: SITE_URL + lien('/tutoriels/#' + cle),
    uploadDate: '2026-10-05', duration: dureeIso(VIDEOS()[cle].duree),
  })),
]);

export default function Tutoriels({ lang }) {
  choisirLangue(lang);
  return (
    <div className="site">
      <EnTeteSite lang={lang} />
      <main>
        <section className="tutos-tete">
          <div className="site-largeur">
            <span className="etiquette">{tr('Tutoriels')}</span>
            <h1>{tr('Apprenez Kaislo en quelques minutes.')}</h1>
            <p className="chapo">{tr('Cinq courtes vidéos commentées, à regarder dans l’ordre ou selon votre besoin.')}</p>
            <nav className="sommaire-tutos" aria-label={tr('Sommaire des tutoriels')}>
              {TUTORIELS.map((cle, i) => (
                <Link key={cle} href={'#' + cle} className="puce">{i + 1}. {VIDEOS()[cle].titre} <span className="muet">· {VIDEOS()[cle].duree}</span></Link>
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
          titre={tr('Convaincu ? Essayez avec vos propres articles.')}
          texte={tr('Créez votre commerce en deux minutes : 30 jours gratuits, sans carte bancaire.')}
          lienDemo={LIEN_DEMO_RESTO}
        />
      </main>
      <PiedSite />
      <JsonLd donnees={DONNEES_VIDEOS()} />
    </div>
  );
}
