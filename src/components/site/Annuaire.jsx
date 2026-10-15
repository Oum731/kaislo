'use client';
// ------------------------------------------------------------
// ANNUAIRE DES BOUTIQUES (kaislo.com/boutiques/) : pour les clients qui arrivent sur le site.
// Les boutiques actives qui acceptent d'y figurer, rangées par rayon, avec quelques articles en exemple.
// Un clic ouvre la page de la boutique : la commande part ensuite directement sur le WhatsApp de CETTE boutique.
// ------------------------------------------------------------
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { appelApi } from '@/lib/api';
import { chemin } from '@/config';
import { formatPrix } from '@/lib/utils/format';
import { PAYS } from '@/lib/donnees/modeles';
import { CATEGORIES_ANNUAIRE, categorieAnnuaire, grouperBoutiques } from '@/lib/donnees/boutique';

const lienBoutique = (b) => '/boutique/?b=' + encodeURIComponent(b.slug);
const photo = (b, e) => (e.image ? chemin('/api/public/boutique-image?b=' + encodeURIComponent(b.slug) + '&i=' + encodeURIComponent(e.image)) : null);

function CarteBoutique({ b }) {
  const lieu = [b.quartier, b.ville].filter(Boolean).join(', ');
  return (
    <Link href={lienBoutique(b)} className="annuaire-carte">
      <div className="annuaire-entete">
        <b>{b.nom}</b>
        <span className="petit muet">{lieu}</span>
        {b.description && <p className="petit annuaire-description">{b.description}</p>}
      </div>
      <div className="annuaire-exemples">
        {b.exemples.map((e, i) => (
          <div key={i} className="annuaire-exemple">
            <div className="annuaire-vignette">
              {photo(b, e) ? <img src={photo(b, e)} alt={e.nom} loading="lazy" /> : <span aria-hidden="true">{e.emoji || '🛍️'}</span>}
            </div>
            <span className="tres-petit annuaire-nom">{e.nom}</span>
            <b className="tres-petit">{formatPrix(e.promo ?? e.prix, b.devise)}</b>
          </div>
        ))}
      </div>
      <span className="guide-lire">{b.nbArticles} article{b.nbArticles > 1 ? 's' : ''} · Voir la boutique →</span>
    </Link>
  );
}

export default function Annuaire() {
  const [boutiques, setBoutiques] = useState(null);
  const [erreur, setErreur] = useState('');
  const [texte, setTexte] = useState('');
  const [pays, setPays] = useState('');
  const [rayon, setRayon] = useState('');

  useEffect(() => {
    appelApi('GET', '/public/boutiques').then((r) => setBoutiques(r.boutiques)).catch((e) => setErreur(e.horsLigne ? 'Pas de connexion internet : réessayez dans un instant.' : 'Les boutiques ne se sont pas chargées : réessayez dans un instant.'));
  }, []);

  const paysPresents = useMemo(() => PAYS.filter((p) => (boutiques || []).some((b) => b.pays === p.id)), [boutiques]);
  const rayonsPresents = useMemo(() => CATEGORIES_ANNUAIRE.filter((c) => (boutiques || []).some((b) => categorieAnnuaire(b.type).id === c.id && (!pays || b.pays === pays))), [boutiques, pays]);
  const groupes = useMemo(() => grouperBoutiques(boutiques || [], { texte, pays, categorie: rayon }), [boutiques, texte, pays, rayon]);

  if (erreur) return <p className="alerte">{erreur}</p>;
  if (!boutiques) return <p className="muet">Chargement des boutiques…</p>;
  if (!boutiques.length) {
    return (
      <div className="annuaire-vide">
        <h2>Les premières boutiques arrivent bientôt</h2>
        <p className="muet">Les commerçants qui utilisent Kaislo ouvrent leur boutique en ligne : elles apparaîtront ici dès qu’elles seront prêtes.</p>
        <p><Link className="btn" href="/app/?inscription=1">Vous êtes commerçant ? Ouvrez la vôtre</Link></p>
      </div>
    );
  }
  return (
    <div className="annuaire">
      <div className="annuaire-filtres">
        <input type="search" className="saisie" value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Chercher une boutique, un article, une ville…" aria-label="Chercher une boutique" />
        {paysPresents.length > 1 && (
          <select className="saisie" value={pays} onChange={(e) => { setPays(e.target.value); setRayon(''); }} aria-label="Pays">
            <option value="">Tous les pays</option>
            {paysPresents.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
          </select>
        )}
      </div>
      {rayonsPresents.length > 1 && (
        <div className="vitrine-categories">
          <button className={'puce' + (!rayon ? ' actif' : '')} onClick={() => setRayon('')}>Tout</button>
          {rayonsPresents.map((c) => <button key={c.id} className={'puce' + (rayon === c.id ? ' actif' : '')} onClick={() => setRayon(c.id)}>{c.emoji} {c.nom}</button>)}
        </div>
      )}
      {!groupes.length && <p className="muet">Aucune boutique ne correspond à votre recherche.</p>}
      {groupes.map(({ categorie, boutiques: liste }) => (
        <section key={categorie.id} className="annuaire-rayon">
          <h2>{categorie.emoji} {categorie.nom} <span className="petit muet">({liste.length})</span></h2>
          <div className="annuaire-grille">{liste.map((b) => <CarteBoutique key={b.slug} b={b} />)}</div>
        </section>
      ))}
    </div>
  );
}
