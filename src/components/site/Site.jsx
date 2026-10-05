// ------------------------------------------------------------
// Éléments du SITE PUBLIC (pages lues par Google) :
// en-tête, pied de page, captures de l'application, fonctions, FAQ…
// Ces composants sont rendus à l'avance en HTML (bon pour le SEO).
// Les captures (public/captures/) sont de vraies images de l'application.
// ------------------------------------------------------------
import Link from 'next/link';
import { Icone } from '@/components/ui';
import MenuMobile from './MenuMobile';
import { CONTACT_EMAIL, CONTACT_WHATSAPP, SITE_URL, chemin } from '@/config';
import Marque from '@/components/Marque';
import BulleChat from '@/components/BulleChat';
import { ACTIVITES } from './activites';
import LangueSite from './LangueSite';
import SelecteurLangueSite from './SelecteurLangueSite';
import { lien } from '@/lib/site-routes';
import { FORMULES } from '@/lib/donnees/tarifs';
import { tr, langueActive, choisirLangue } from '@/lib/i18n';

export const LIEN_INSCRIPTION = '/app/?inscription=1';
export const LIEN_DEMO_RESTO = '/app/?demo=resto-ivoire';
export const LIEN_DEMO_EPICERIE = '/app/?demo=chez-sentinelle';

export function Logo() {
  return <Link href={lien('/')} className="logo"><Marque /> {tr('Kaislo')}</Link>;
}

// Liens du menu du site (en-tête et menu sur petit écran)
const LIENS_SITE = () => ([
  [lien('/gestion-restaurant/'), tr('Restaurants')],
  [lien('/gestion-epicerie/'), tr('Épiceries')],
  [lien('/gestion-stock/'), tr('Stock')],
  [lien('/#fonctions'), tr('Fonctions')],
  [lien('/tarifs/'), tr('Tarifs')],
  [lien('/tutoriels/'), tr('Tutoriels')],
  [lien('/#questions'), tr('Questions')],
]);

// Première pièce de chaque page : fixe la langue (français par défaut) pour tout ce qui suit
export function EnTeteSite({ lang = 'fr' }) {
  choisirLangue(lang);
  const liens = LIENS_SITE();
  return (
    <header className="site-entete">
      <LangueSite lang={lang} />
      <div className="site-largeur">
        <Logo />
        <nav className="site-nav" aria-label={tr('Navigation du site')}>
          {liens.map(([adresse, nom]) => <Link key={adresse} href={adresse}>{nom}</Link>)}
        </nav>
        <div className="actions">
          <SelecteurLangueSite lang={lang} />
          <Link href="/app/" className="btn secondaire petit">{tr('Se connecter')}</Link>
          <Link href={LIEN_INSCRIPTION} className="btn petit">{tr('Essai gratuit')}</Link>
          <MenuMobile liens={liens} lienInscription={LIEN_INSCRIPTION} />
        </div>
      </div>
    </header>
  );
}

// Liste des pages légales (reprise dans le pied de page et le sitemap)
export const PAGES_LEGALES = () => ([
  ['/conditions-utilisation/', tr('Conditions d’utilisation')],
  ['/confidentialite/', tr('Confidentialité')],
  ['/cookies/', tr('Cookies et stockage')],
  ['/securite/', tr('Sécurité')],
  ['/mentions-legales/', tr('Mentions légales')],
]);

export function PiedSite() {
  return (
    <>
    <footer className="site-pied">
      <div className="site-largeur">
        <div className="colonnes">
          <div>
            <span className="logo"><Marque /> {tr('Kaislo')}</span>
            <p style={{ marginTop: 12, maxWidth: 360 }}>{tr('Gestion des ventes et du stock pour tous les commerces. Développé par Amorac.')}</p>
          </div>
          <div>
            <h4>{tr('Kaislo')}</h4>
            <Link href={lien('/gestion-restaurant/')}>{tr('Gestion pour restaurant')}</Link>
            <Link href={lien('/gestion-epicerie/')}>{tr('Gestion pour épicerie')}</Link>
            <Link href={lien('/gestion-stock/')}>{tr('Gestion de stock et inventaire')}</Link>
            <Link href={lien('/tarifs/')}>{tr('Tarifs')}</Link>
            <Link href="/devenir-commercial/">{tr('Devenir commercial Kaislo')}</Link>
            <Link href="/app/">{tr('Se connecter')}</Link>
            <Link href={LIEN_INSCRIPTION}>{tr('Créer mon commerce')}</Link>
          </div>
          {langueActive() === 'fr' && (
            <div>
              <h4>{tr('Par activité')}</h4>
              {Object.values(ACTIVITES).map((a) => <Link key={a.lien} href={a.lien}>{a.nom}</Link>)}
            </div>
          )}
          <div>
            <h4>{tr('Informations légales')}</h4>
            {PAGES_LEGALES().map(([lien, nom]) => <Link key={lien} href={lien}>{nom}</Link>)}
            {langueActive() === 'en' && <p className="tres-petit" style={{ opacity: 0.7 }}>{tr('Pages juridiques en français')}</p>}
          </div>
          <div>
            <h4>{tr('Contact')}</h4>
            <a href={`https://wa.me/${CONTACT_WHATSAPP}`} target="_blank" rel="noreferrer">{tr('WhatsApp')}</a>
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            <a href="https://amorac.com" target="_blank" rel="noreferrer">{tr('amorac.com')}</a>
          </div>
        </div>
        <div className="bas">
          <span>{tr('© {0} Amorac · Kaislo', [new Date().getFullYear()])}</span>
          <span>{tr('Disponible en Afrique, en Europe et ailleurs')}</span>
        </div>
      </div>
    </footer>
    <BulleChat />
    </>
  );
}

// Capture de l'application dans un cadre simple (ordinateur ou téléphone)
export function Capture({ src, alt, telephone = false, largeur, hauteur, priorite = false }) {
  return (
    <div className={`capture ${telephone ? 'telephone' : ''}`}>
      {!telephone && <div className="capture-barre" aria-hidden="true"><i /><i /><i /></div>}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={chemin(src)} alt={alt} width={largeur} height={hauteur} loading={priorite ? 'eager' : 'lazy'} fetchPriority={priorite ? 'high' : undefined} decoding="async" />
    </div>
  );
}

// Haut de page : titre, texte, boutons, puis les captures
export function Hero({ titre, chapo, lienDemo, garanties, capture, captureMobile }) {
  return (
    <section className="hero">
      <div className="site-largeur">
        <div className="hero-texte">
          <h1>{titre}</h1>
          <p className="chapo">{chapo}</p>
          <div className="boutons">
            <Link href={LIEN_INSCRIPTION} className="btn grand">{tr('Essayer gratuitement 30 jours')}</Link>
            <Link href={lienDemo} className="btn secondaire grand">{tr('Voir la démo')} <Icone nom="droite" taille="sm" /></Link>
          </div>
          <div className="garanties">
            {garanties.map((g) => <span key={g}><Icone nom="ok" taille="sm" /> {g}</span>)}
          </div>
        </div>
        <div className="hero-capture hero-captures">
          <Capture src={capture.src} alt={capture.alt} largeur={1440} hauteur={900} priorite />
          {captureMobile && <Capture src={captureMobile.src} alt={captureMobile.alt} telephone largeur={390} hauteur={844} />}
        </div>
      </div>
    </section>
  );
}

// Les vidéos de démonstration (public/videos/, générées par "npm run videos")
export const VIDEOS = () => ({
  presentation: {
    src: '/videos/presentation-kaislo.mp4', poster: '/videos/presentation-kaislo.webp', duree: '1 min 20',
    titre: tr('Présentation de Kaislo'),
    texte: tr('Le tour complet : tableau de bord, vente, tables, ventes et journées de vente, crédit, articles, équipe.'),
    lienDemo: LIEN_DEMO_RESTO,
  },
  restaurant: {
    src: '/videos/demo-restaurant.mp4', poster: '/videos/demo-restaurant.webp', duree: '1 min',
    titre: tr('Restaurant : de la commande au ticket'),
    texte: tr('Plats avec accompagnements, paiement Wave, ticket imprimé ou envoyé par WhatsApp, chiffre du jour.'),
    lienDemo: LIEN_DEMO_RESTO,
  },
  epicerie: {
    src: '/videos/demo-epicerie.mp4', poster: '/videos/demo-epicerie.webp', duree: '1 min', vertical: true,
    titre: tr('Épicerie : vente, crédit et comptes du soir'),
    texte: tr('Recherche d’article, vente à crédit notée dans le carnet, fermeture de la journée juste.'),
    lienDemo: LIEN_DEMO_EPICERIE,
  },
  produits: {
    src: '/videos/ajout-produits.mp4', poster: '/videos/ajout-produits.webp', duree: '1 min 10',
    titre: tr('Ajouter un article'),
    texte: tr('Nouveau plat, nouvelle catégorie, prix d’achat et marge calculée, accompagnements et suppléments : prêt à vendre tout de suite.'),
    lienDemo: LIEN_DEMO_RESTO,
  },
  vendeurs: {
    src: '/videos/gestion-vendeurs.mp4', poster: '/videos/gestion-vendeurs.webp', duree: '1 min', vertical: true,
    titre: tr('Gérer ses vendeurs'),
    texte: tr('Un compte et un code PIN par vendeur, des droits au choix, désactivation en un geste, ventes de chacun.'),
    lienDemo: LIEN_DEMO_RESTO,
  },
});

// Une vidéo de démonstration avec son titre et un lien pour essayer la même démo.
// preload="none" : rien n'est téléchargé avant que le visiteur appuie sur lecture.
// Les vidéos ont une voix et une musique : pas de « muted ».
export function VideoDemo({ video }) {
  const v = VIDEOS()[video];
  return (
    <figure id={video} className={`video-demo ${v.vertical ? 'vertical' : ''}`}>
      <div className="video-cadre">
        <video src={chemin(v.src)} poster={chemin(v.poster)} controls playsInline preload="none" width={v.vertical ? 780 : 1280} height={v.vertical ? 1560 : 720} aria-label={v.titre} />
      </div>
      <figcaption>
        <h3>{v.titre} <span className="badge">{tr('{0} · avec voix', [v.duree])}</span></h3>
        <p>{v.texte}</p>
        <Link href={v.lienDemo} className="suite">{tr('Essayer la démo →')}</Link>
      </figcaption>
    </figure>
  );
}

/**
 * Section de vidéos.
 * vedette : une vidéo mise en avant en grand · lignes : vidéos par ligne
 * (une vidéo paysage + une verticale par ligne, ou une seule) · vignettes : liens vers les autres tutoriels
 * toutes : bouton vers la page /tutoriels/
 */
export function SectionVideos({ titre = tr('Voyez Kaislo en action, en une minute.'), vedette, lignes = [], vignettes = [], toutes = false, id = 'videos' }) {
  return (
    <section className="section claire" id={id}>
      <div className="site-largeur">
        {titre && (
          <>
            <span className="etiquette">{tr('Démonstration en vidéo')}</span>
            <h2>{titre}</h2>
          </>
        )}
        {vedette && <div className="grille-videos n1 vedette"><VideoDemo video={vedette} /></div>}
        {lignes.map((ligne) => (
          <div key={ligne.join()} className={`grille-videos n${ligne.length}`}>
            {ligne.map((v) => <VideoDemo key={v} video={v} />)}
          </div>
        ))}
        {vignettes.length > 0 && <VignettesTutos videos={vignettes} />}
        <div className="boutons" style={{ marginTop: 28 }}>
          <Link href={LIEN_INSCRIPTION} className="btn grand">{tr('Créer mon commerce gratuitement')}</Link>
          {toutes && <Link href={lien('/tutoriels/')} className="btn secondaire grand">{tr('Tous les tutoriels')} <Icone nom="droite" taille="sm" /></Link>}
        </div>
      </div>
    </section>
  );
}

// Vignettes cliquables : image, titre et durée ; mènent à la vidéo sur la page Tutoriels
export function VignettesTutos({ videos, titre = tr('Les autres tutoriels') }) {
  return (
    <div className="vignettes-tutos">
      <h3>{titre}</h3>
      <div className="grille-vignettes">
        {videos.map((cle) => {
          const v = VIDEOS()[cle];
          return (
            <Link key={cle} href={lien('/tutoriels/#' + cle)} className="vignette-tuto">
              <span className="vignette-image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={chemin(v.poster)} alt="" loading="lazy" decoding="async" />
                <span className="vignette-lecture" aria-hidden="true">▶</span>
                <span className="vignette-duree">{v.duree}</span>
              </span>
              <b>{v.titre}</b>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// Liste des tutoriels, dans l'ordre de la page /tutoriels/
export const TUTORIELS = ['presentation', 'restaurant', 'epicerie', 'produits', 'vendeurs'];

// Une fonction expliquée à côté d'une capture
export function FonctionLigne({ titre, texte, points = [], capture, inverse = false }) {
  return (
    <div className={`fonction-ligne ${inverse ? 'inverse' : ''}`}>
      <div>
        <h3>{titre}</h3>
        <p>{texte}</p>
        {points.length > 0 && <ul>{points.map((p) => <li key={p}>{p}</li>)}</ul>}
      </div>
      <Capture src={capture.src} alt={capture.alt} largeur={1440} hauteur={900} />
    </div>
  );
}

// Liste de fonctions en colonnes.
// Chaque fonction : [titre, texte] ou [icône, titre, texte, …] (l'icône n'est plus affichée)
export function ListeFonctions({ fonctions }) {
  const estIcone = (x) => /^[a-z]+$/.test(x); // "carnet", "scan"… (un titre commence par une majuscule)
  return (
    <div className="liste-fonctions">
      {fonctions.map((f) => {
        const [titre, texte] = estIcone(f[0]) ? [f[1], f[2]] : [f[0], f[1]];
        return (
          <div key={titre}>
            <b>{titre}</b>
            <p>{texte}</p>
          </div>
        );
      })}
    </div>
  );
}

// Questions fréquentes + données structurées pour Google (FAQPage)
export function Faq({ questions }) {
  const donnees = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map(([q, r]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: r } })),
  };
  return (
    <div className="faq">
      {questions.map(([q, r]) => (
        <details key={q}>
          <summary>{q}</summary>
          <p>{r}</p>
        </details>
      ))}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(donnees) }} />
    </div>
  );
}

// Fiche "logiciel" pour Google
export function DonneesLogiciel({ description }) {
  const donnees = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Kaislo',
    applicationCategory: 'BusinessApplication',
    operatingSystem: tr('Android, iOS, Windows, macOS (navigateur web)'),
    areaServed: 'Worldwide',
    description,
    url: SITE_URL,
    inLanguage: langueActive(),
    publisher: { '@type': 'Organization', name: 'Amorac', url: 'https://amorac.com' },
    // Essai gratuit de 30 jours (les prix de l'abonnement dépendent du pays)
    featureList: [tr('Ventes et tickets (imprimés, WhatsApp ou sans ticket)'), tr('Gestion de stock et inventaire'), tr('Carnet de crédit des clients'), tr('Comptes du soir par mode de paiement (espèces, mobile money, carte)'), tr('Marges, dépenses et statistiques'), tr('Fonctionne sans internet'), tr('Vendeurs avec code PIN et droits')],
    offers: [
      { '@type': 'Offer', name: tr('Essai gratuit'), price: '0', priceCurrency: 'EUR', description: tr('Essai gratuit de 30 jours, sans engagement'), url: SITE_URL + '/app/?inscription=1' },
      { '@type': 'AggregateOffer', name: tr('Abonnement mensuel par métier'), priceCurrency: 'EUR', lowPrice: String(Math.min(...FORMULES.map((f) => f.prix.EUR))), highPrice: String(Math.max(...FORMULES.map((f) => f.prix.EUR))), offerCount: FORMULES.length, url: SITE_URL + '/tarifs/' },
    ],
    screenshot: SITE_URL + '/og-image.png',
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(donnees) }} />;
}

export function AppelFinal({ titre, texte, lienDemo }) {
  return (
    <section className="appel-final">
      <div className="site-largeur">
        <div className="boite">
          <div>
            <h2>{titre}</h2>
            <p>{texte}</p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href={LIEN_INSCRIPTION} className="btn grand">{tr('Créer mon commerce')}</Link>
            <Link href={lienDemo} className="btn secondaire grand">{tr('Voir la démo')}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
