// ------------------------------------------------------------
// Modèle commun des pages légales (conditions, confidentialité,
// cookies, sécurité, mentions légales) : titre, sommaire, sections.
// ------------------------------------------------------------
import Link from 'next/link';
import { EnTeteSite, PiedSite, PAGES_LEGALES } from './Site';
import { DATE_PAGES_LEGALES } from '@/config';

/**
 * titre : titre de la page · intro : phrase d'introduction
 * sections : [{ id, titre, contenu (JSX) }]
 */
export default function PageLegale({ titre, intro, sections }) {
  return (
    <div className="site">
      <EnTeteSite />
      <main className="legal site-largeur">
        <header className="legal-tete">
          <span className="etiquette">Informations légales</span>
          <h1>{titre}</h1>
          <p className="chapo">{intro}</p>
          <p className="petit muet">Dernière mise à jour : {DATE_PAGES_LEGALES}</p>
        </header>
        <div className="legal-grille">
          <nav className="legal-sommaire" aria-label="Sommaire">
            <p className="petit muet">Sur cette page</p>
            {sections.map((s, i) => <a key={s.id} href={'#' + s.id}>{i + 1}. {s.titre}</a>)}
            <p className="petit muet" style={{ marginTop: 18 }}>Autres pages</p>
            {PAGES_LEGALES.filter(([, nom]) => nom !== titre).map(([lien, nom]) => <Link key={lien} href={lien}>{nom}</Link>)}
          </nav>
          <div className="legal-texte">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id}>
                <h2>{i + 1}. {s.titre}</h2>
                {s.contenu}
              </section>
            ))}
          </div>
        </div>
      </main>
      <PiedSite />
    </div>
  );
}

// Affiche une ligne "Libellé : valeur" seulement si la valeur est renseignée
export function Info({ libelle, valeur }) {
  if (!valeur) return null;
  return <li><b>{libelle} :</b> {valeur}</li>;
}
