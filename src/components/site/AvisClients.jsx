'use client';
// ------------------------------------------------------------
// AVIS DES COMMERÇANTS sur kaislo.com : uniquement les vrais avis laissés par des gérants dans l'application et validés
// par l'équipe (GET /api/avis). Tant qu'il n'y en a aucun, la section n'apparaît pas : aucun avis n'est jamais inventé.
// ------------------------------------------------------------
import { useEffect, useState } from 'react';
import { appelApi } from '@/lib/api';
import { typeCommerce, paysParId } from '@/lib/donnees/modeles';
import { Icone } from '@/components/ui';
import { tr, tt } from '@/lib/i18n';

function Etoiles({ note }) {
  return (
    <span className="etoiles-avis" role="img" aria-label={`${note} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => <Icone key={n} nom="etoile" className={n <= note ? 'plein' : ''} />)}
    </span>
  );
}

export default function AvisClients() {
  const [rep, setRep] = useState(null);
  useEffect(() => {
    let vivant = true;
    appelApi('GET', '/avis').then((r) => { if (vivant) setRep(r); }).catch(() => {});
    return () => { vivant = false; };
  }, []);
  if (!rep || !rep.nombre) return null;
  const moyenne = Number(rep.moyenne).toLocaleString(tr('fr-FR'), { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return (
    <section className="section claire" id="avis">
      <div className="site-largeur">
        <span className="etiquette">{tr('Avis des commerçants')}</span>
        <h2>{tr('Ce qu’en disent ceux qui l’utilisent.')}</h2>
        <p className="chapo ligne" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Etoiles note={Math.round(rep.moyenne)} />
          <b>{moyenne} / 5</b>
          <span className="muet">{rep.nombre > 1 ? tr('{0} avis de commerçants', [rep.nombre]) : tr('1 avis de commerçant')}</span>
        </p>
        <div className="grille-avis">
          {rep.avis.map((a, i) => (
            <figure key={i} className="carte-avis">
              <Etoiles note={a.note} />
              <blockquote>{a.texte}</blockquote>
              <figcaption><b>{a.nom}</b> · {tt(typeCommerce(a.activite).nom)} · {a.ville}{a.pays && paysParId(a.pays)?.nom ? `, ${tt(paysParId(a.pays).nom)}` : ''}</figcaption>
            </figure>
          ))}
        </div>
        <p className="tres-petit muet" style={{ marginTop: 14 }}>{tr('Avis laissés par les gérants depuis l’application Kaislo, relus par notre équipe avant publication.')}</p>
      </div>
    </section>
  );
}
