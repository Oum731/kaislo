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

export const LIEN_INSCRIPTION = '/app/?inscription=1';
export const LIEN_DEMO_RESTO = '/app/?demo=resto-ivoire';
export const LIEN_DEMO_EPICERIE = '/app/?demo=chez-sentinelle';

export function Logo() {
  return <Link href="/" className="logo"><Marque /> Kaislo</Link>;
}

// Liens du menu du site (en-tête et menu sur petit écran)
const LIENS_SITE = [
  ['/caisse-restaurant/', 'Restaurants'],
  ['/caisse-epicerie/', 'Épiceries'],
  ['/gestion-stock/', 'Stock'],
  ['/#fonctions', 'Fonctions'],
  ['/tarifs/', 'Tarifs'],
  ['/tutoriels/', 'Tutoriels'],
  ['/#questions', 'Questions'],
];

export function EnTeteSite() {
  return (
    <header className="site-entete">
      <div className="site-largeur">
        <Logo />
        <nav className="site-nav" aria-label="Navigation du site">
          {LIENS_SITE.map(([lien, nom]) => <Link key={lien} href={lien}>{nom}</Link>)}
        </nav>
        <div className="actions">
          <Link href="/app/" className="btn secondaire petit">Se connecter</Link>
          <Link href={LIEN_INSCRIPTION} className="btn petit">Essai gratuit</Link>
          <MenuMobile liens={LIENS_SITE} lienInscription={LIEN_INSCRIPTION} />
        </div>
      </div>
    </header>
  );
}

// Liste des pages légales (reprise dans le pied de page et le sitemap)
export const PAGES_LEGALES = [
  ['/conditions-utilisation/', 'Conditions d’utilisation'],
  ['/confidentialite/', 'Confidentialité'],
  ['/cookies/', 'Cookies et stockage'],
  ['/securite/', 'Sécurité'],
  ['/mentions-legales/', 'Mentions légales'],
];

export function PiedSite() {
  return (
    <>
    <footer className="site-pied">
      <div className="site-largeur">
        <div className="colonnes">
          <div>
            <span className="logo"><Marque /> Kaislo</span>
            <p style={{ marginTop: 12, maxWidth: 360 }}>Caisse et gestion de stock pour tous les commerces. Développé par Amorac.</p>
          </div>
          <div>
            <h4>Kaislo</h4>
            <Link href="/caisse-restaurant/">Caisse pour restaurant</Link>
            <Link href="/caisse-epicerie/">Caisse pour épicerie</Link>
            <Link href="/gestion-stock/">Gestion de stock et inventaire</Link>
            <Link href="/tarifs/">Tarifs</Link>
            <Link href="/devenir-commercial/">Devenir commercial Kaislo</Link>
            <Link href="/app/">Se connecter</Link>
            <Link href={LIEN_INSCRIPTION}>Créer mon commerce</Link>
          </div>
          <div>
            <h4>Par activité</h4>
            {Object.values(ACTIVITES).map((a) => <Link key={a.lien} href={a.lien}>{a.nom}</Link>)}
          </div>
          <div>
            <h4>Informations légales</h4>
            {PAGES_LEGALES.map(([lien, nom]) => <Link key={lien} href={lien}>{nom}</Link>)}
          </div>
          <div>
            <h4>Contact</h4>
            <a href={`https://wa.me/${CONTACT_WHATSAPP}`} target="_blank" rel="noreferrer">WhatsApp</a>
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            <a href="https://amorac.com" target="_blank" rel="noreferrer">amorac.com</a>
          </div>
        </div>
        <div className="bas">
          <span>© {new Date().getFullYear()} Amorac · Kaislo</span>
          <span>Disponible en Afrique, en Europe et ailleurs</span>
        </div>
      </div>
    </footer>
    <BulleChat />
    </>
  );
}

// Capture de l'application dans un cadre simple (ordinateur ou téléphone)
export function Capture({ src, alt, telephone = false, largeur, hauteur }) {
  return (
    <div className={`capture ${telephone ? 'telephone' : ''}`}>
      {!telephone && <div className="capture-barre" aria-hidden="true"><i /><i /><i /></div>}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={chemin(src)} alt={alt} width={largeur} height={hauteur} loading="lazy" decoding="async" />
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
            <Link href={LIEN_INSCRIPTION} className="btn grand">Essayer gratuitement 30 jours</Link>
            <Link href={lienDemo} className="btn secondaire grand">Voir la démo <Icone nom="droite" taille="sm" /></Link>
          </div>
          <div className="garanties">
            {garanties.map((g) => <span key={g}><Icone nom="ok" taille="sm" /> {g}</span>)}
          </div>
        </div>
        <div className="hero-capture hero-captures">
          <Capture src={capture.src} alt={capture.alt} largeur={1440} hauteur={900} />
          {captureMobile && <Capture src={captureMobile.src} alt={captureMobile.alt} telephone largeur={390} hauteur={844} />}
        </div>
      </div>
    </section>
  );
}

// Les vidéos de démonstration (public/videos/, générées par "npm run videos")
export const VIDEOS = {
  presentation: {
    src: '/videos/presentation-kaislo.mp4', poster: '/videos/presentation-kaislo.webp', duree: '1 min 20',
    titre: 'Présentation de Kaislo',
    texte: 'Le tour complet : tableau de bord, caisse, tables, ventes et journées de caisse, crédit, articles, équipe.',
    lienDemo: LIEN_DEMO_RESTO,
  },
  restaurant: {
    src: '/videos/demo-restaurant.mp4', poster: '/videos/demo-restaurant.webp', duree: '1 min',
    titre: 'Restaurant : de la commande au ticket',
    texte: 'Plats avec accompagnements, paiement Wave, ticket imprimé ou envoyé par WhatsApp, chiffre du jour.',
    lienDemo: LIEN_DEMO_RESTO,
  },
  epicerie: {
    src: '/videos/demo-epicerie.mp4', poster: '/videos/demo-epicerie.webp', duree: '1 min', vertical: true,
    titre: 'Épicerie : vente, crédit et caisse du soir',
    texte: 'Recherche d’article, vente à crédit notée dans le carnet, fermeture de caisse juste.',
    lienDemo: LIEN_DEMO_EPICERIE,
  },
  produits: {
    src: '/videos/ajout-produits.mp4', poster: '/videos/ajout-produits.webp', duree: '1 min 10',
    titre: 'Ajouter un article',
    texte: 'Nouveau plat, nouvelle catégorie, prix d’achat et marge calculée, accompagnements et suppléments : prêt à vendre tout de suite.',
    lienDemo: LIEN_DEMO_RESTO,
  },
  vendeurs: {
    src: '/videos/gestion-vendeurs.mp4', poster: '/videos/gestion-vendeurs.webp', duree: '1 min', vertical: true,
    titre: 'Gérer ses vendeurs',
    texte: 'Un compte et un code PIN par vendeur, des droits au choix, désactivation en un geste, ventes de chacun.',
    lienDemo: LIEN_DEMO_RESTO,
  },
};

// Une vidéo de démonstration avec son titre et un lien pour essayer la même démo.
// preload="none" : rien n'est téléchargé avant que le visiteur appuie sur lecture.
// Les vidéos ont une voix et une musique : pas de « muted ».
export function VideoDemo({ video }) {
  const v = VIDEOS[video];
  return (
    <figure id={video} className={`video-demo ${v.vertical ? 'vertical' : ''}`}>
      <div className="video-cadre">
        <video src={chemin(v.src)} poster={chemin(v.poster)} controls playsInline preload="none" width={v.vertical ? 780 : 1280} height={v.vertical ? 1560 : 720} aria-label={v.titre} />
      </div>
      <figcaption>
        <h3>{v.titre} <span className="badge">{v.duree} · avec voix</span></h3>
        <p>{v.texte}</p>
        <Link href={v.lienDemo} className="suite">Essayer la démo →</Link>
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
export function SectionVideos({ titre = 'Voyez Kaislo en action, en une minute.', vedette, lignes = [], vignettes = [], toutes = false, id = 'videos' }) {
  return (
    <section className="section claire" id={id}>
      <div className="site-largeur">
        {titre && (
          <>
            <span className="etiquette">Démonstration en vidéo</span>
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
          <Link href={LIEN_INSCRIPTION} className="btn grand">Créer mon commerce gratuitement</Link>
          {toutes && <Link href="/tutoriels/" className="btn secondaire grand">Tous les tutoriels <Icone nom="droite" taille="sm" /></Link>}
        </div>
      </div>
    </section>
  );
}

// Vignettes cliquables : image, titre et durée ; mènent à la vidéo sur la page Tutoriels
export function VignettesTutos({ videos, titre = 'Les autres tutoriels' }) {
  return (
    <div className="vignettes-tutos">
      <h3>{titre}</h3>
      <div className="grille-vignettes">
        {videos.map((cle) => {
          const v = VIDEOS[cle];
          return (
            <Link key={cle} href={'/tutoriels/#' + cle} className="vignette-tuto">
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
    operatingSystem: 'Android, iOS, Windows, macOS (navigateur web)',
    areaServed: 'Worldwide',
    description,
    url: SITE_URL,
    inLanguage: 'fr',
    publisher: { '@type': 'Organization', name: 'Amorac', url: 'https://amorac.com' },
    // Essai gratuit de 30 jours (les prix de l'abonnement dépendent du pays)
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR', description: 'Essai gratuit de 30 jours', url: SITE_URL + '/app/?inscription=1' },
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
            <Link href={LIEN_INSCRIPTION} className="btn grand">Créer mon commerce</Link>
            <Link href={lienDemo} className="btn secondaire grand">Voir la démo</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
