'use client';
// ------------------------------------------------------------
// APERÇU DES BOUTIQUES sur la page d'accueil : quatre boutiques du pays du visiteur (même détection que l'annuaire),
// ou, s'il n'y en a pas encore, les rayons à découvrir. Toujours un bouton vers /boutiques/.
// ------------------------------------------------------------
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { appelApi } from '@/lib/api';
import { PAYS } from '@/lib/donnees/modeles';
import { trouverPays } from '@/lib/pays-visiteur';
import { CATEGORIES_ANNUAIRE } from '@/lib/donnees/boutique';
import { CarteBoutique } from '@/components/site/Annuaire';

const AVEC_ARTICLE = { CI: 'en', SN: 'au', ML: 'au', BF: 'au', BJ: 'au', TG: 'au', NE: 'au', GN: 'en', CM: 'au', GA: 'au', CG: 'au', MA: 'au', FR: 'en', BE: 'en', CA: 'au' };

export default function ApercuBoutiques() {
  const [pays, setPays] = useState(null);
  const [donnees, setDonnees] = useState(null);

  useEffect(() => { trouverPays(setPays); }, []);
  useEffect(() => {
    if (!pays) return undefined;
    let actif = true;
    appelApi('GET', '/public/boutiques?pays=' + (pays === 'XX' ? 'ZZ' : pays)).then((r) => actif && setDonnees(r)).catch(() => actif && setDonnees({ boutiques: [] }));
    return () => { actif = false; };
  }, [pays]);

  const p = PAYS.find((x) => x.id === pays);
  const lieu = p && p.id !== 'XX' ? `${AVEC_ARTICLE[p.id] || 'en'} ${p.nom}` : '';
  const boutiques = (donnees?.boutiques || []).slice(0, 4);

  return (
    <section className="section accueil-boutiques" id="boutiques">
      <div className="site-largeur">
        <div className="accueil-boutiques-tete">
          <div>
            <span className="etiquette">Boutiques</span>
            <h2>Boutiques {lieu ? lieu : 'près de chez vous'}</h2>
          </div>
          <Link className="btn grand" href="/boutiques/">Voir toutes les boutiques →</Link>
        </div>
        {boutiques.length > 0 ? (
          <div className="annuaire-grille">{boutiques.map((b) => <CarteBoutique key={b.slug} b={b} />)}</div>
        ) : (
          <div className="accueil-rayons">
            {CATEGORIES_ANNUAIRE.slice(0, 6).map((c) => (
              <Link key={c.id} href="/boutiques/" className="accueil-rayon"><span aria-hidden="true">{c.emoji}</span><b>{c.nom}</b></Link>
            ))}
          </div>
        )}
        {donnees && !boutiques.length && <p className="muet petit" style={{ marginTop: 14 }}>Les premières boutiques arrivent bientôt{lieu ? ` ${lieu}` : ''}.</p>}
      </div>
    </section>
  );
}
