// ------------------------------------------------------------
// Éléments du SITE PUBLIC (pages lues par Google) :
// en-tête, pied de page, captures de l'application, fonctions, FAQ…
// Ces composants sont rendus à l'avance en HTML (bon pour le SEO).
// Les captures (public/captures/) sont de vraies images de l'application.
// ------------------------------------------------------------
import Link from 'next/link';
import { Icone } from '@/components/ui';
import { CONTACT_EMAIL, CONTACT_WHATSAPP, SITE_URL, chemin } from '@/config';

export const LIEN_INSCRIPTION = '/app/?inscription=1';
export const LIEN_DEMO_RESTO = '/app/?demo=resto-ivoire';
export const LIEN_DEMO_EPICERIE = '/app/?demo=chez-sentinelle';

export function Logo() {
  return <Link href="/" className="logo"><span className="logo-marque">K</span> Kaisly</Link>;
}

export function EnTeteSite() {
  return (
    <header className="site-entete">
      <div className="site-largeur">
        <Logo />
        <nav className="site-nav" aria-label="Navigation du site">
          <Link href="/caisse-restaurant/">Restaurants</Link>
          <Link href="/caisse-epicerie/">Épiceries</Link>
          <Link href="/#fonctions">Fonctions</Link>
          <Link href="/#questions">Questions</Link>
        </nav>
        <div className="actions">
          <Link href="/app/" className="btn secondaire petit">Se connecter</Link>
          <Link href={LIEN_INSCRIPTION} className="btn petit">Essai gratuit</Link>
        </div>
      </div>
    </header>
  );
}

export function PiedSite() {
  return (
    <footer className="site-pied">
      <div className="site-largeur">
        <div className="colonnes">
          <div>
            <span className="logo"><span className="logo-marque">K</span> Kaisly</span>
            <p style={{ marginTop: 12, maxWidth: 360 }}>Logiciel de caisse pour restaurants, épiceries et boutiques. Développé par Amorac.</p>
          </div>
          <div>
            <h4>Kaisly</h4>
            <Link href="/caisse-restaurant/">Caisse pour restaurant</Link>
            <Link href="/caisse-epicerie/">Caisse pour épicerie</Link>
            <Link href="/app/">Se connecter</Link>
            <Link href={LIEN_INSCRIPTION}>Créer mon commerce</Link>
          </div>
          <div>
            <h4>Contact</h4>
            <a href={`https://wa.me/${CONTACT_WHATSAPP}`} target="_blank" rel="noreferrer">WhatsApp</a>
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            <a href="https://amorac.com" target="_blank" rel="noreferrer">amorac.com</a>
          </div>
        </div>
        <div className="bas">
          <span>© {new Date().getFullYear()} Amorac · Kaisly</span>
          <span>Disponible en Afrique, en Europe et ailleurs</span>
        </div>
      </div>
    </footer>
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
    name: 'Kaisly',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Android, iOS, Windows, macOS (navigateur web)',
    areaServed: 'Worldwide',
    description,
    url: SITE_URL,
    inLanguage: 'fr',
    publisher: { '@type': 'Organization', name: 'Amorac', url: 'https://amorac.com' },
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
