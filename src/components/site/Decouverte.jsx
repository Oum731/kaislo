'use client';
// ------------------------------------------------------------
// ACCUEIL PAR PROXIMITÉ : les produits et les boutiques autour du client, de la plus proche à la plus lointaine.
// Aucune boutique n'a d'adresse propre à partager : un clic ouvre la boutique dans cette page.
// La position (demandée à l'arrivée) sert seulement à classer : elle est arrondie (≈ 100 m), gardée dans l'appareil du visiteur
// et envoyée au serveur dans le corps de la demande, sans être conservée.
// ------------------------------------------------------------
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { appelApi } from '@/lib/api';
import { chemin } from '@/config';
import { formatPrix } from '@/lib/utils/format';
import { PAYS } from '@/lib/donnees/modeles';
import { trouverPays, choisirPays } from '@/lib/pays-visiteur';
import { CATEGORIES_ANNUAIRE, categorieAnnuaire } from '@/lib/donnees/boutique';
import { tr, tt, localeIntl } from '@/lib/i18n';
import Boutique from '@/components/site/Boutique';
import SuiviCommande from '@/components/site/SuiviCommande';
import { livraisonActive } from '@/lib/livraison';
import { lireCommandesSuivies, oublierCommande } from '@/lib/commandes-client';

const CLE_POSITION = 'kaislo-position';
const arrondi = (n) => Math.round(n * 1000) / 1000;
const lirePosition = () => {
  try {
    const p = JSON.parse(localStorage.getItem(CLE_POSITION));
    return p && Number.isFinite(p.lat) && Number.isFinite(p.lng) ? { lat: p.lat, lng: p.lng } : null;
  } catch { return null; }
};
const garderPosition = (p) => { try { if (p) localStorage.setItem(CLE_POSITION, JSON.stringify(p)); else localStorage.removeItem(CLE_POSITION); } catch { /* stockage bloqué */ } };

const distance = (km) => (km === null || km === undefined ? '' : km < 0.1 ? tr('à moins de 100 m') : tr('à {0} km', [km.toLocaleString(localeIntl(), { maximumFractionDigits: 1 })]));
const logo = (b) => (b.logo ? chemin(b.logo.startsWith('/') ? b.logo : '/api/public/boutique-image?b=' + encodeURIComponent(b.slug) + '&i=' + encodeURIComponent(b.logo)) : null);
const photo = (b, e) => (e.image ? chemin('/api/public/boutique-image?b=' + encodeURIComponent(b.slug) + '&i=' + encodeURIComponent(e.image)) : null);
const initiale = (t) => (t || '?').trim().charAt(0).toUpperCase();

function Vignette({ b, e }) {
  return (
    <div className="annuaire-vignette">
      {photo(b, e) ? <img src={photo(b, e)} alt={e.nom} loading="lazy" /> : <span aria-hidden="true">{e.emoji || initiale(e.nom)}</span>}
    </div>
  );
}

function CarteBoutique({ b, ouvrir }) {
  const lieu = [b.quartier, b.ville].filter(Boolean).join(', ');
  return (
    <button type="button" className="annuaire-carte decouverte-carte" onClick={() => ouvrir(b.slug)}>
      <div className="annuaire-entete">
        {logo(b) ? <img className="annuaire-logo" src={logo(b)} alt="" width="44" height="44" loading="lazy" /> : <span className="annuaire-logo annuaire-initiale" aria-hidden="true">{initiale(b.nom)}</span>}
        <div className="annuaire-identite">
          <b>{b.nom}</b>
          <span className="petit muet">{[distance(b.distanceKm), lieu].filter(Boolean).join(' · ')}</span>
        </div>
      </div>
      <div className="annuaire-exemples">
        {b.exemples.map((e, i) => (
          <div key={i} className="annuaire-exemple">
            <Vignette b={b} e={e} />
            <span className="tres-petit annuaire-nom">{e.nom}</span>
            <b className="tres-petit">{formatPrix(e.promo ?? e.prix, b.devise)}</b>
          </div>
        ))}
      </div>
      <span className="guide-lire">{tr('{0} article(s)', [b.nbArticles])} · {tr('Voir la boutique →')}</span>
    </button>
  );
}

export default function Decouverte() {
  const [pays, setPays] = useState(null); // pays du visiteur : choisi, sinon déduit (fuseau, puis adresse IP), 'XX' si inconnu
  const [position, setPosition] = useState(null);
  const [message, setMessage] = useState('');
  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur] = useState('');
  const [texte, setTexte] = useState('');
  const [rayon, setRayon] = useState('');
  const [ouverte, setOuverte] = useState('');
  const [commandes, setCommandes] = useState([]); // commandes passées depuis cet appareil (commande dans Kaislo, quand le chantier est activé)
  const [suivie, setSuivie] = useState('');
  useEffect(() => { livraisonActive().then((a) => { if (a) setCommandes(lireCommandesSuivies()); }); }, []);

  useEffect(() => { trouverPays(setPays); setPosition(lirePosition()); }, []);

  const localiser = () => {
    if (!navigator.geolocation) return setMessage(tr('La localisation n’est pas disponible sur cet appareil.'));
    setMessage(tr('Recherche de votre position…'));
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pos = { lat: arrondi(p.coords.latitude), lng: arrondi(p.coords.longitude) };
        garderPosition(pos);
        setPosition(pos);
        setMessage('');
      },
      () => setMessage(tr('Position refusée ou introuvable : autorisez la localisation, ou choisissez votre pays.')),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };
  // Position demandée à l'arrivée (une seule fois) ; refusée, le pays déduit suffit et les boutiques restent affichées sans distance
  useEffect(() => { if (!lirePosition()) localiser(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!pays) return undefined;
    let actif = true;
    setErreur('');
    // 'ZZ' : pays inconnu (aucune boutique, seulement la liste des pays disponibles)
    appelApi('POST', '/public/boutiques', { pays: pays === 'XX' ? 'ZZ' : pays, ...(position || {}) })
      .then((r) => { if (actif) { setDonnees(r); setRayon(''); } })
      .catch((e) => actif && setErreur(e.horsLigne ? tr('Pas de connexion internet : réessayez dans un instant.') : tr('Les boutiques n’ont pas pu se charger : réessayez dans un instant.')));
    return () => { actif = false; };
  }, [pays, position]);

  // Boutique ouverte dans la page : le bouton Retour du téléphone la ferme
  useEffect(() => {
    if (!ouverte) return undefined;
    window.history.pushState({ boutique: true }, '');
    const fermer = () => setOuverte('');
    window.addEventListener('popstate', fermer);
    return () => window.removeEventListener('popstate', fermer);
  }, [ouverte]);
  const fermer = () => { if (window.history.state?.boutique) window.history.back(); else setOuverte(''); };

  const boutiques = donnees?.boutiques || [];
  const normalise = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const filtrees = useMemo(() => {
    const q = normalise(texte).trim();
    return boutiques.filter((b) => {
      if (rayon && categorieAnnuaire(b.type).id !== rayon) return false;
      return !q || [b.nom, b.ville, b.quartier, b.description, ...b.exemples.map((e) => e.nom)].some((t) => normalise(t).includes(q));
    });
  }, [boutiques, texte, rayon]);
  const rayonsPresents = CATEGORIES_ANNUAIRE.filter((c) => boutiques.some((b) => categorieAnnuaire(b.type).id === c.id));
  // Produits : les articles en exemple des boutiques, dans l'ordre de proximité
  const produits = useMemo(() => filtrees.slice(0, 8).flatMap((b) => b.exemples.slice(0, 2).map((e) => ({ b, e }))).slice(0, 12), [filtrees]);
  const paysActuel = PAYS.find((p) => p.id === pays);
  const disponibles = Object.keys(donnees?.paysDisponibles || {});
  const changerPays = (id) => { choisirPays(id); setPays(id); };

  const barre = message ? <p className="petit muet" role="status">{message}</p> : null;

  if (suivie) return <SuiviCommande cle={suivie} surFermer={() => { setSuivie(''); livraisonActive().then((a) => a && setCommandes(lireCommandesSuivies())); }} />;

  if (ouverte) {
    return (
      <div className="decouverte-boutique" role="dialog" aria-modal="true">
        <div className="decouverte-boutique-barre"><button type="button" className="btn secondaire petit" onClick={fermer}>← {tr('Retour aux boutiques')}</button></div>
        <Boutique slugFixe={ouverte} />
      </div>
    );
  }

  const mesCommandes = commandes.length > 0 && (
    <section className="annuaire-rayon">
      <h2>{tr('Mes commandes')}</h2>
      {commandes.slice(0, 3).map((c) => (
        <button key={c.cle} type="button" className="annuaire-carte decouverte-carte" onClick={() => setSuivie(c.cle)}>
          <b>{tr('Commande n° {0}', [c.numero])} · {c.boutique}</b>
          <span className="guide-lire">{tr('Suivre ma commande')} →</span>
        </button>
      ))}
    </section>
  );

  if (erreur) return <>{barre}{mesCommandes}<p className="alerte">{erreur}</p></>;
  if (!pays || !donnees) return <>{barre}<p className="muet">{tr('Chargement des boutiques…')}</p></>;
  if (!boutiques.length) {
    const autres = disponibles.map((id) => PAYS.find((p) => p.id === id)).filter(Boolean);
    return (
      <div className="annuaire">
        {barre}
        {mesCommandes}
        <div className="annuaire-vide">
          <h2>{paysActuel && paysActuel.id !== 'XX' ? tr('Pas encore de boutique dans votre pays') : tr('Choisissez votre pays')}</h2>
          <p className="muet">{tr('Les commerçants qui utilisent Kaislo ouvrent leur boutique : elles apparaîtront ici dès qu’elles seront prêtes.')}</p>
          <label className="petit decouverte-pays">{tr('Pays')}{' '}
            <select value={paysActuel?.id === 'XX' ? '' : pays || ''} onChange={(e) => e.target.value && changerPays(e.target.value)} aria-label={tr('Changer de pays')}>
              <option value="">—</option>
              {PAYS.filter((p) => p.id !== 'XX').map((p) => <option key={p.id} value={p.id}>{tt(p.nom)}{disponibles.includes(p.id) ? ' ●' : ''}</option>)}
            </select>
          </label>
          {autres.length > 0 && <p className="petit">{tr('Boutiques disponibles :')} {autres.map((p, i) => <span key={p.id}>{i ? ', ' : ''}<button type="button" className="lien" onClick={() => changerPays(p.id)}>{tt(p.nom)}</button></span>)}</p>}
          <p><Link prefetch={false} className="btn" href="/app/?inscription=1">{tr('Vous êtes commerçant ? Ouvrez votre boutique')}</Link></p>
        </div>
      </div>
    );
  }
  return (
    <div className="annuaire">
      {barre}
      {mesCommandes}
      <div className="annuaire-filtres">
        <input type="search" className="saisie" value={texte} onChange={(e) => setTexte(e.target.value)} placeholder={tr('Chercher un produit, une boutique, une ville…')} aria-label={tr('Chercher un produit, une boutique, une ville…')} />
      </div>
      {rayonsPresents.length > 1 && (
        <div className="vitrine-categories">
          <button className={'puce' + (!rayon ? ' actif' : '')} onClick={() => setRayon('')}>{tr('Tout')}</button>
          {rayonsPresents.map((c) => <button key={c.id} className={'puce' + (rayon === c.id ? ' actif' : '')} onClick={() => setRayon(c.id)}>{tt(c.nom)}</button>)}
        </div>
      )}
      {!filtrees.length && <p className="muet">{tr('Rien ne correspond à votre recherche.')}</p>}
      {produits.length > 0 && (
        <section className="annuaire-rayon">
          <h2>{position ? tr('Produits près de vous') : tr('Produits en vedette')}</h2>
          <div className="decouverte-produits">
            {produits.map(({ b, e }, i) => (
              <button key={b.slug + i} type="button" className="decouverte-produit" onClick={() => setOuverte(b.slug)}>
                <Vignette b={b} e={e} />
                <b className="petit">{e.nom}</b>
                <span className="petit">{formatPrix(e.promo ?? e.prix, b.devise)}</span>
                <span className="tres-petit muet">{b.nom}{b.distanceKm !== null && b.distanceKm !== undefined ? ' · ' + distance(b.distanceKm) : ''}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      {filtrees.length > 0 && (
        <section className="annuaire-rayon">
          <h2>{position ? tr('Boutiques près de vous') : tr('Boutiques')} <span className="petit muet">({filtrees.length})</span></h2>
                    <div className="annuaire-grille">{filtrees.map((b) => <CarteBoutique key={b.slug} b={b} ouvrir={setOuverte} />)}</div>
        </section>
      )}
    </div>
  );
}
