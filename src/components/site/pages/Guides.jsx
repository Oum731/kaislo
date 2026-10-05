// ------------------------------------------------------------
// GUIDES PRATIQUES : page d'index (/guides/) et page d'un guide (/guides/<titre>/).
// Contenu : src/lib/guides.js (français et anglais). Données structurées Article + FAQ + fil d'Ariane.
// ------------------------------------------------------------
import Link from 'next/link';
import { EnTeteSite, PiedSite, Faq, AppelFinal, LIEN_DEMO_EPICERIE } from '@/components/site/Site';
import { metaPage, JsonLd, filAriane } from '@/lib/seo';
import { SITE_URL, SITE_NOM, chemin } from '@/config';
import { GUIDES, MODELES, DATE_GUIDES, adresseGuide, guideParSlug } from '@/lib/guides';
import { tr, choisirLangue } from '@/lib/i18n';
import { alternates, lien } from '@/lib/site-routes';

export function metaIndex(lang) {
  choisirLangue(lang);
  return metaPage({
    title: tr('Guides pour commerçants : stock, marges, crédit, caisse'),
    description: tr('Guides pratiques et modèles Excel gratuits pour gérer votre commerce : inventaire, marge, crédit clients, clôture de caisse, pertes de stock, mobile money.'),
    alternates: alternates('/guides/', lang),
    langue: lang,
  });
}

export function metaGuide(lang, slug) {
  choisirLangue(lang);
  const g = guideParSlug(slug, lang);
  return metaPage({ title: g[lang].seo || g[lang].titre, description: g[lang].description, alternates: alternates(`/guides/${g.fr.slug}/`, lang), langue: lang });
}

export const slugsGuides = (lang) => GUIDES.map((g) => ({ slug: g[lang].slug }));

function CarteModele({ g, lang }) {
  const m = MODELES[g.modele][lang];
  return (
    <aside className="guide-modele">
      <div>
        <b>{m.nom}</b>
        <p className="petit muet">{tr('Fichier Excel prêt à remplir, avec les calculs déjà faits. Gratuit, sans inscription.')}</p>
      </div>
      <a className="btn" href={chemin('/modeles/' + m.fichier)} download>{tr('Télécharger le modèle')}</a>
    </aside>
  );
}

export function Guide({ lang, slug }) {
  choisirLangue(lang);
  const g = guideParSlug(slug, lang);
  const c = g[lang];
  const adresse = adresseGuide(g, lang);
  const autres = GUIDES.filter((x) => x !== g).slice(0, 3);
  const donnees = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: c.titre, description: c.description, inLanguage: lang,
    datePublished: DATE_GUIDES, dateModified: DATE_GUIDES,
    image: SITE_URL + '/og-image.png',
    mainEntityOfPage: SITE_URL + adresse,
    author: { '@type': 'Organization', name: 'Amorac', url: 'https://amorac.com' },
    publisher: { '@type': 'Organization', name: SITE_NOM, url: SITE_URL, logo: { '@type': 'ImageObject', url: SITE_URL + '/icons/icone-512.png' } },
  };
  return (
    <div className="site">
      <EnTeteSite lang={lang} />
      <main>
        <article>
          <section className="tutos-tete">
            <div className="site-largeur guide-colonne">
              <nav className="fil" aria-label={tr('Fil d’Ariane')}>
                <Link href={lien('/')}>{tr('Accueil')}</Link> › <Link href={lien('/guides/')}>{tr('Guides')}</Link>
              </nav>
              <h1>{c.titre}</h1>
              <p className="chapo">{c.chapo}</p>
            </div>
          </section>
          <section className="section">
            <div className="site-largeur guide-colonne guide">
              <nav className="guide-sommaire" aria-label={tr('Sommaire')}>
                <b>{tr('Dans ce guide')}</b>
                <ol>{c.sections.map((s, i) => <li key={s.h}><a href={'#e' + (i + 1)}>{s.h}</a></li>)}</ol>
              </nav>
              {c.sections.map((s, i) => (
                <div key={s.h} id={'e' + (i + 1)} className="guide-etape">
                  <h2>{s.h}</h2>
                  {(s.p || []).map((p) => <p key={p}>{p}</p>)}
                  {s.l && <ul>{s.l.map((x) => <li key={x}>{x}</li>)}</ul>}
                  {i === 1 && <CarteModele g={g} lang={lang} />}
                </div>
              ))}
              <div className="guide-cta">
                <b>{tr('Gagnez du temps avec Kaislo')}</b>
                <p>{tr('Ventes, stock, crédit clients et comptes du soir au même endroit, sur téléphone ou ordinateur. Essai gratuit de 30 jours.')}</p>
                <div className="ligne" style={{ gap: 10, flexWrap: 'wrap' }}>
                  <Link className="btn" href="/app/?inscription=1">{tr('Essai gratuit')}</Link>
                  <Link className="btn secondaire" href={lien(g.metier)}>{tr('Découvrir la gestion de stock et de ventes')}</Link>
                </div>
              </div>
            </div>
          </section>
          <section className="section claire">
            <div className="site-largeur guide-colonne">
              <span className="etiquette">{tr('Questions fréquentes')}</span>
              <h2>{c.titre}</h2>
              <Faq questions={c.faq} />
            </div>
          </section>
          <section className="section">
            <div className="site-largeur guide-colonne">
              <h2>{tr('À lire aussi')}</h2>
              <ul className="guide-liens">
                {autres.map((x) => <li key={x.cle}><Link href={adresseGuide(x, lang)}>{x[lang].titre}</Link></li>)}
                <li><Link href={lien('/tarifs/')}>{tr('Voir les tarifs de votre pays')}</Link></li>
              </ul>
            </div>
          </section>
        </article>
        <AppelFinal titre={tr('Gérez votre commerce plus simplement.')} texte={tr('Essayez la démo, ou créez votre commerce en quelques minutes.')} lienDemo={LIEN_DEMO_EPICERIE} />
      </main>
      <PiedSite />
      <JsonLd donnees={donnees} />
      <JsonLd donnees={filAriane([[tr('Accueil'), lien('/')], [tr('Guides'), lien('/guides/')], [c.court, adresse]])} />
    </div>
  );
}

export default function Guides({ lang }) {
  choisirLangue(lang);
  return (
    <div className="site">
      <EnTeteSite lang={lang} />
      <main>
        <section className="tutos-tete">
          <div className="site-largeur guide-colonne">
            <span className="etiquette">{tr('Guides')}</span>
            <h1>{tr('Guides pratiques pour gérer votre commerce')}</h1>
            <p className="chapo">{tr('Inventaire, marges, crédit clients, caisse du soir, pertes de stock, mobile money : des méthodes simples, avec des modèles Excel gratuits.')}</p>
          </div>
        </section>
        <section className="section">
          <div className="site-largeur">
            <div className="guide-grille">
              {GUIDES.map((g) => (
                <Link key={g.cle} href={adresseGuide(g, lang)} className="guide-carte">
                  <b>{g[lang].titre}</b>
                  <span className="muet">{g[lang].description}</span>
                  <span className="guide-lire">{tr('Lire le guide')} →</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
        <section className="section claire" id="modeles">
          <div className="site-largeur guide-colonne">
            <span className="etiquette">{tr('Modèles Excel')}</span>
            <h2>{tr('Modèles Excel gratuits')}</h2>
            <p className="chapo">{tr('Deux fichiers prêts à remplir pour commencer aujourd’hui, sans inscription. Quand vous voudrez arrêter de tout recopier, Kaislo le fait pour vous.')}</p>
            {Object.keys(MODELES).map((k) => (
              <div key={k} className="guide-modele">
                <b>{MODELES[k][lang].nom}</b>
                <a className="btn" href={chemin('/modeles/' + MODELES[k][lang].fichier)} download>{tr('Télécharger le modèle')}</a>
              </div>
            ))}
          </div>
        </section>
        <AppelFinal titre={tr('Gérez votre commerce plus simplement.')} texte={tr('Essayez la démo, ou créez votre commerce en quelques minutes.')} lienDemo={LIEN_DEMO_EPICERIE} />
      </main>
      <PiedSite />
      <JsonLd donnees={filAriane([[tr('Accueil'), lien('/')], [tr('Guides'), lien('/guides/')]])} />
    </div>
  );
}
