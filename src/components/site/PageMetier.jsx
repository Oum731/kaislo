// ------------------------------------------------------------
// Modèle commun des pages "Gestion pour restaurant" et
// "Gestion pour épicerie" (même structure, contenus différents)
// ------------------------------------------------------------
import { JsonLd, filAriane } from '@/lib/seo';
import { EnTeteSite, PiedSite, Hero, FonctionLigne, ListeFonctions, Faq, AppelFinal, DonneesLogiciel, SectionVideos } from './Site';
import { tr, choisirLangue } from '@/lib/i18n';
import { lien } from '@/lib/site-routes';

export default function PageMetier({ c, lang = 'fr' }) {
  choisirLangue(lang);
  return (
    <div className="site">
      <EnTeteSite lang={lang} />
      <main>
        <Hero titre={c.titre} chapo={c.chapo} lienDemo={c.lienDemo} garanties={c.garanties} capture={c.capture} captureMobile={c.captureMobile} />
        {c.videos && <SectionVideos titre={c.titreVideo} lignes={[c.videos]} vignettes={c.vignettes} toutes />}
        <section className="section">
          <div className="site-largeur">
            <span className="etiquette">{c.etiquette}</span>
            <h2>{c.titreFonctions}</h2>
            <p className="chapo">{c.chapoFonctions}</p>
            {(c.lignes || []).map((l, i) => <FonctionLigne key={l.titre} {...l} inverse={i % 2 === 1} />)}
            <ListeFonctions fonctions={c.fonctions} />
          </div>
        </section>
        <section className="section claire">
          <div className="site-largeur">
            <span className="etiquette">{tr('Questions fréquentes')}</span>
            <h2>{c.titreFaq}</h2>
            <Faq questions={c.questions} />
          </div>
        </section>
        <AppelFinal titre={c.titreFinal} texte={c.texteFinal} lienDemo={c.lienDemo} />
      </main>
      <PiedSite />
      <DonneesLogiciel description={c.description} />
      {c.lien && <JsonLd donnees={filAriane([[tr('Accueil'), lien('/')], [c.nomFil || (c.nom ? tr('Gestion pour ') + c.nom.toLowerCase() : c.titre), lien(c.lien)]])} />}
    </div>
  );
}
