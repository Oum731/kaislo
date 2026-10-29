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
import { articlePays } from '@/lib/donnees/liste-pays';
import { trouverPays, choisirPays, paysParGps } from '@/lib/pays-visiteur';
import { CATEGORIES_ANNUAIRE, categorieAnnuaire, grouperBoutiques } from '@/lib/donnees/boutique';

const lienBoutique = (b) => '/boutique/' + encodeURIComponent(b.slug) + '/';
const logoBoutique = (b) => (b.logo ? chemin(b.logo.startsWith('/') ? b.logo : '/api/public/boutique-image?b=' + encodeURIComponent(b.slug) + '&i=' + encodeURIComponent(b.logo)) : null);
const photo = (b, e) => (e.image ? chemin('/api/public/boutique-image?b=' + encodeURIComponent(b.slug) + '&i=' + encodeURIComponent(e.image)) : null);

export function CarteBoutique({ b }) {
  const lieu = [b.quartier, b.ville].filter(Boolean).join(', ');
  return (
    // Lien ordinaire (pas next/link) : la page de la boutique est écrite par le serveur, elle n'existe pas dans l'export statique
    <a href={chemin(lienBoutique(b))} className="annuaire-carte">
      <div className="annuaire-entete">
        {/* Logo de la boutique, ou son initiale tant que le gérant n'en a pas choisi */}
        {logoBoutique(b) ? <img className="annuaire-logo" src={logoBoutique(b)} alt={'Logo ' + b.nom} width="44" height="44" loading="lazy" /> : <span className="annuaire-logo vide" aria-hidden="true">{(b.nom || '?').trim().charAt(0).toUpperCase()}</span>}
        <div className="annuaire-identite">
          <b>{b.nom}</b>
          <span className="petit muet">{lieu}</span>
          {b.description && <p className="petit annuaire-description">{b.description}</p>}
        </div>
      </div>
      <div className="annuaire-exemples">
        {b.exemples.map((e, i) => (
          <div key={i} className="annuaire-exemple">
            <div className="annuaire-vignette">
              {photo(b, e) ? <img src={photo(b, e)} alt={e.nom} loading="lazy" /> : <span aria-hidden="true">{e.emoji || (e.nom || '?').trim().charAt(0).toUpperCase()}</span>}
            </div>
            <span className="tres-petit annuaire-nom">{e.nom}</span>
            <b className="tres-petit">{formatPrix(e.promo ?? e.prix, b.devise)}</b>
          </div>
        ))}
      </div>
      <span className="guide-lire">{b.nbArticles} article{b.nbArticles > 1 ? 's' : ''} · Voir la boutique →</span>
    </a>
  );
}

// « Boutiques en Côte d'Ivoire » : l'article change selon le pays
const lieuPays = (p) => `${articlePays(p.id)} ${p.nom}`;

export default function Annuaire() {
  const [pays, setPays] = useState(null); // pays du visiteur : choisi, sinon déduit (fuseau, puis adresse IP), 'XX' si inconnu
  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur] = useState('');
  const [texte, setTexte] = useState('');
  const [rayon, setRayon] = useState('');
  const [gps, setGps] = useState('');

  useEffect(() => { trouverPays(setPays); }, []);
  useEffect(() => {
    if (!pays) return undefined;
    let actif = true;
    setDonnees(null);
    setErreur('');
    setRayon('');
    // Le serveur ne renvoie que les boutiques de ce pays ('ZZ' : pays inconnu, aucune boutique, seulement la liste des pays disponibles)
    appelApi('GET', '/public/boutiques?pays=' + (pays === 'XX' ? 'ZZ' : pays)).then((r) => actif && setDonnees(r)).catch((e) => actif && setErreur(e.horsLigne ? 'Pas de connexion internet : réessayez dans un instant.' : 'Les boutiques ne se sont pas chargées : réessayez dans un instant.'));
    return () => { actif = false; };
  }, [pays]);

  const changer = (id) => { choisirPays(id); setGps(''); setPays(id); };
  const utiliserPosition = async () => {
    setGps('Recherche de votre position…');
    const r = await paysParGps();
    if (r.pays) { choisirPays(r.pays); setGps(''); setPays(r.pays); } else setGps(r.erreur);
  };

  const boutiques = donnees?.boutiques || [];
  const paysActuel = PAYS.find((p) => p.id === pays);
  const rayonsPresents = useMemo(() => CATEGORIES_ANNUAIRE.filter((c) => boutiques.some((b) => categorieAnnuaire(b.type).id === c.id)), [boutiques]);
  const groupes = useMemo(() => grouperBoutiques(boutiques, { texte, categorie: rayon }), [boutiques, texte, rayon]);
  const disponibles = Object.keys(donnees?.paysDisponibles || {});

  const choixPays = (
    <p className="petit annuaire-pays">
      {paysActuel && paysActuel.id !== 'XX' ? <>Boutiques {lieuPays(paysActuel)} · </> : <b>Choisissez votre pays pour voir les boutiques près de chez vous · </b>}
      <label className="lien" style={{ cursor: 'pointer' }}>{paysActuel && paysActuel.id !== 'XX' ? 'ce n’est pas votre pays ?' : 'Choisir mon pays'}{' '}
        <select value={paysActuel?.id === 'XX' ? '' : pays || ''} onChange={(e) => e.target.value && changer(e.target.value)} aria-label="Changer de pays" style={{ maxWidth: 220 }}>
          <option value="">—</option>
          {PAYS.filter((p) => p.id !== 'XX').map((p) => <option key={p.id} value={p.id}>{p.nom}{disponibles.includes(p.id) ? ' ●' : ''}</option>)}
        </select>
      </label>{' '}
      <button type="button" className="lien" onClick={utiliserPosition}>Utiliser ma position</button>
      {gps && <span className="muet" role="status"> {gps}</span>}
    </p>
  );

  if (erreur) return <>{choixPays}<p className="alerte">{erreur}</p></>;
  if (!pays || !donnees) return <>{pays && choixPays}<p className="muet">Chargement des boutiques…</p></>;
  if (!boutiques.length) {
    const autres = disponibles.map((id) => PAYS.find((p) => p.id === id)).filter(Boolean);
    return (
      <div className="annuaire">
        {choixPays}
        <div className="annuaire-vide">
          {paysActuel && paysActuel.id !== 'XX' ? (
            <>
              <h2>Pas encore de boutique {lieuPays(paysActuel)}</h2>
              <p className="muet">Les commerçants {lieuPays(paysActuel)} qui utilisent Kaislo ouvrent leur boutique en ligne : elles apparaîtront ici dès qu’elles seront prêtes.</p>
            </>
          ) : (
            <>
              <h2>Choisissez votre pays</h2>
              <p className="muet">Nous n’avons pas pu deviner votre pays : indiquez-le avec la liste ci-dessus ou « Utiliser ma position ».</p>
            </>
          )}
          {autres.length > 0 && (
            <p className="petit">Boutiques disponibles : {autres.map((p, i) => <span key={p.id}>{i ? ', ' : ''}<button type="button" className="lien" onClick={() => changer(p.id)}>{p.nom}</button></span>)}</p>
          )}
          <p><Link className="btn" href="/app/?inscription=1">Vous êtes commerçant ? Ouvrez votre boutique</Link></p>
        </div>
      </div>
    );
  }
  return (
    <div className="annuaire">
      {choixPays}
      <div className="annuaire-filtres">
        <input type="search" className="saisie" value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Chercher une boutique, un article, une ville…" aria-label="Chercher une boutique" />
      </div>
      {rayonsPresents.length > 1 && (
        <div className="vitrine-categories">
          <button className={'puce' + (!rayon ? ' actif' : '')} onClick={() => setRayon('')}>Tout</button>
          {rayonsPresents.map((c) => <button key={c.id} className={'puce' + (rayon === c.id ? ' actif' : '')} onClick={() => setRayon(c.id)}>{c.nom}</button>)}
        </div>
      )}
      {!groupes.length && <p className="muet">Aucune boutique ne correspond à votre recherche.</p>}
      {groupes.map(({ categorie, boutiques: liste }) => (
        <section key={categorie.id} className="annuaire-rayon">
          <h2>{categorie.nom} <span className="petit muet">({liste.length})</span></h2>
          <div className="annuaire-grille">{liste.map((b) => <CarteBoutique key={b.slug} b={b} />)}</div>
        </section>
      ))}
    </div>
  );
}
