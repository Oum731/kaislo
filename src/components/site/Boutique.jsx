'use client';
// ------------------------------------------------------------
// VITRINE D'UN COMMERÇANT : kaislo.com/boutique/nom-du-commerce/ (ou /boutique/?b=nom-du-commerce)
// Le client choisit ses articles, saisit son nom et son numéro, puis la commande s'ouvre sur WhatsApp (message déjà écrit,
// à envoyer au commerçant). La commande est aussi enregistrée dans Kaislo (le commerçant la voit dans « Commandes en ligne »).
// Kaislo n'encaisse rien : le client paie le commerçant comme d'habitude. Aucun suivi publicitaire sur cette page.
// ------------------------------------------------------------
import { useEffect, useMemo, useState } from 'react';
import Marque from '@/components/Marque';
import ChatBoutique from '@/components/site/ChatBoutique';
import { ChampTelephone } from '@/components/ui';
import { livraisonActive } from '@/lib/livraison';
import { tr } from '@/lib/i18n';
import { suivreCommande } from '@/lib/commandes-client';
import SuiviCommande from '@/components/site/SuiviCommande';
import { appelApi } from '@/lib/api';
import { chemin } from '@/config';
import { formatPrix } from '@/lib/utils/format';
import { normaliserTelephone } from '@/lib/donnees/telephone';
import { prixArticleBoutique, nomsOptions, cleLignePanier, totalPanier, nombreArticles, erreurOptions, lienCommandeWhatsApp, photosCommande } from '@/lib/donnees/boutique';

const cleStockage = (slug) => 'kaislo-panier-' + slug;
const lirePanier = (slug) => { try { return JSON.parse(localStorage.getItem(cleStockage(slug))) || []; } catch { return []; } };
const garderPanier = (slug, panier) => { try { localStorage.setItem(cleStockage(slug), JSON.stringify(panier)); } catch { /* panier gardé en mémoire seulement */ } };

// Les personnes qui ont déjà commandé dans cette boutique depuis cet appareil (nom, numéro, adresse) : proposées à la commande suivante.
// Gardé dans l'appareil seulement : la liste des clients d'une boutique n'est jamais montrée au public.
const cleClients = (slug) => 'kaislo-clients-' + slug;
const lireClients = (slug) => { try { const l = JSON.parse(localStorage.getItem(cleClients(slug))); return Array.isArray(l) ? l : []; } catch { return []; } };
const chiffres = (t) => String(t || '').replace(/\D/g, '').slice(-8);
const garderClient = (slug, c) => {
  try {
    const autres = lireClients(slug).filter((x) => chiffres(x.telephone) !== chiffres(c.telephone));
    localStorage.setItem(cleClients(slug), JSON.stringify([c, ...autres].slice(0, 5)));
  } catch { /* non gardé */ }
};

// slugFixe : la boutique s'ouvre dans l'accueil du site (sans adresse propre) ; sinon elle se lit dans l'adresse (démo, lien des grossistes)
export default function Boutique({ slugFixe = '' }) {
  const [slug, setSlug] = useState(null);
  const [boutique, setBoutique] = useState(null);
  const [erreur, setErreur] = useState('');
  const [categorie, setCategorie] = useState('');
  const [panier, setPanier] = useState([]);
  const [choix, setChoix] = useState(null); // { produit, options: [ids] } : article dont on choisit les options
  const [panierOuvert, setPanierOuvert] = useState(false);
  const [envoi, setEnvoi] = useState(null); // commande envoyée : { commande, lien }
  const [occupe, setOccupe] = useState(false);
  const [accepte, setAccepte] = useState(false); // conditions de vente cochées (obligatoire avant de confirmer la commande)
  const [form, setForm] = useState({ nom: '', telephone: '', adresse: '', note: '', site: '' });
  const [message, setMessage] = useState('');
  const [l1, setL1] = useState(false); // commande dans Kaislo (retrait ou livraison, suivi) : seulement quand le chantier est activé
  const [mode, setMode] = useState('livraison');
  const [suiviCle, setSuiviCle] = useState('');
  useEffect(() => { livraisonActive().then(setL1); }, []);
  const [anciens, setAnciens] = useState([]); // clients déjà venus depuis cet appareil
  const [choisi, setChoisi] = useState(null); // numéro du client choisi dans la liste, '' = un autre numéro

  const [demo, setDemo] = useState(null); // identifiant du commerce de démo, ou null
  const [pro, setPro] = useState(''); // clé du lien privé des grossistes (?pro=…) : prix de gros, au carton
  useEffect(() => {
    const params = new URLSearchParams(slugFixe ? '' : window.location.search);
    // Démo : kaislo.com/boutique/?demo=resto-ivoire (articles de la démo, commande gardée dans l'appareil)
    const idDemo = params.get('demo');
    if (idDemo) {
      setDemo(idDemo);
      setSlug('demo-' + idDemo);
      setPanier(lirePanier('demo-' + idDemo));
      import('@/lib/donnees/boutique-demo').then(async (m) => {
        const b = m.estDemo(idDemo) ? await m.boutiqueDemo(idDemo) : null;
        if (b) setBoutique(b); else setErreur(tr('Cette démonstration n’existe pas.'));
      }).catch(() => setErreur(tr('La démonstration n’a pas pu se charger.')));
      return;
    }
    // /boutique/nom-du-commerce/ (page réécrite par le serveur, avec le contenu pour Google) ou ancienne forme /boutique/?b=nom
    const dansLAdresse = /^\/boutique\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(window.location.pathname);
    const s = (slugFixe || params.get('b') || (dansLAdresse ? dansLAdresse[1] : '')).toLowerCase();
    document.getElementById('seo-boutique')?.remove(); // contenu en HTML simple ajouté par le serveur pour Google : la vitrine prend le relais
    const cle = (params.get('pro') || '').replace(/[^a-z0-9]/gi, '').slice(0, 40);
    setPro(cle);
    const cleStock = s + (cle ? '-gros' : ''); // le panier de gros et celui du détail ne se mélangent jamais
    setSlug(s);
    if (!s) { setErreur(tr('Adresse de boutique incomplète.')); return; }
    setPanier(lirePanier(cleStock));
    const deja = lireClients(s);
    setAnciens(deja);
    if (deja[0]) { setChoisi(deja[0].telephone); setForm((f) => ({ ...f, nom: deja[0].nom, telephone: deja[0].telephone, adresse: deja[0].adresse || '' })); }
    appelApi('GET', '/public/boutique?b=' + encodeURIComponent(s) + (cle ? '&pro=' + encodeURIComponent(cle) : ''))
      .then((r) => setBoutique(r.boutique))
      .catch((e) => setErreur(e.statut === 404 ? tr('Cette boutique n’existe pas ou est fermée pour le moment.') : (e.horsLigne ? tr('Pas de connexion internet.') : e.message)));
  }, []);

  // Les photos des articles arrivent en vraies images en deux temps (WhatsApp ne permet pas de les joindre dans le lien) :
  // 1. la commande part par le lien WhatsApp (directement au numéro de la boutique) ; 2. « Joindre les photos » ouvre le partage du téléphone,
  // où la discussion avec la boutique est tout en haut puisqu'on vient de lui écrire. Téléphones qui savent partager des images seulement.
  const peutPartagerPhotos = typeof navigator !== 'undefined' && !!navigator.share && !!navigator.canShare;
  const [photosEnvoyees, setPhotosEnvoyees] = useState(false);
  const partagerPhotos = async () => {
    setMessage('');
    try {
      const fichiers = await Promise.all(photosCommande(envoi.commande).slice(0, 6).map(async (u, i) => {
        const blob = await (await fetch(u)).blob();
        return new File([blob], 'article-' + (i + 1) + '.jpg', { type: blob.type || 'image/jpeg' });
      }));
      if (!navigator.canShare({ files: fichiers })) return setMessage(tr('Votre téléphone ne permet pas de joindre les photos : elles s’affichent avec les liens du message.'));
      await navigator.share({ files: fichiers, text: tr('Photos de la commande n° {0}', [envoi.commande.numero]) });
      setPhotosEnvoyees(true);
    } catch (e) {
      if (e?.name !== 'AbortError') setMessage(tr('Impossible de joindre les photos : elles s’affichent avec les liens du message.'));
    }
  };

  const majPanier = (liste) => { setPanier(liste); garderPanier(slug + (pro ? '-gros' : ''), liste); };
  const devise = boutique?.devise;
  const produits = useMemo(() => (boutique?.produits || []).filter((p) => !categorie || p.categorieId === categorie), [boutique, categorie]);

  const ajouter = (produit, optionIds) => {
    const cle = cleLignePanier(produit.id, optionIds);
    const i = panier.findIndex((l) => l.cle === cle);
    if (i >= 0) majPanier(panier.map((l, j) => (j === i ? { ...l, quantite: Math.min(99, l.quantite + 1) } : l)));
    else majPanier([...panier, { cle, produitId: produit.id, nom: produit.nom, options: nomsOptions(produit, optionIds), optionIds, quantite: pro ? Math.max(1, produit.minimum || 1) : 1, minimum: pro ? Math.max(1, produit.minimum || 1) : 1, prixUnitaire: prixArticleBoutique(produit, optionIds) }]);
  };
  const toucher = (produit) => {
    if ((produit.groupes || []).length) setChoix({ produit, options: [] });
    else ajouter(produit, []);
  };
  // Au prix de gros, descendre sous le minimum retire l'article (le serveur refuse de toute façon une quantité plus petite)
  const changer = (cle, delta) => majPanier(panier.map((l) => (l.cle === cle ? { ...l, quantite: l.quantite + delta } : l)).filter((l) => l.quantite >= (l.minimum || 1)));
  const basculerOption = (g, o) => setChoix((c) => {
    const ids = c.options.includes(o.id) ? c.options.filter((x) => x !== o.id) : (g.type === 'unique' ? [...c.options.filter((x) => !g.options.some((y) => y.id === x)), o.id] : [...c.options, o.id]);
    return { ...c, options: ids };
  });
  const validerOptions = () => {
    const err = erreurOptions(choix.produit, choix.options);
    if (err) return setMessage(err);
    setMessage('');
    ajouter(choix.produit, choix.options);
    setChoix(null);
  };

  const cmd = l1 && !pro && !demo ? boutique?.commande || null : null;
  const modeEff = cmd ? (mode === 'retrait' ? (cmd.retrait ? 'retrait' : 'livraison') : (cmd.livre ? 'livraison' : 'retrait')) : 'livraison';
  const frais = cmd && modeEff === 'livraison' ? cmd.frais : 0;

  const commander = async (e) => {
    e.preventDefault();
    setMessage('');
    if (form.nom.trim().length < 2) return setMessage(tr('Indiquez votre nom.'));
    if (modeEff === 'livraison' && form.adresse.trim().length < 3) return setMessage(tr('Indiquez votre adresse de livraison (quartier, rue ou repère).'));
    if (cmd && cmd.minimum > 0 && totalPanier(panier) < cmd.minimum) return setMessage(tr('Commande minimum : {0}.', [formatPrix(cmd.minimum, devise)]));
    if (!accepte) return setMessage(tr('Cochez la case pour accepter les conditions de vente avant de confirmer.'));
    const n = normaliserTelephone(form.telephone, boutique.pays);
    if (!n.ok && !demo) return setMessage(n.erreur);
    setOccupe(true);
    try {
      if (demo) {
        // Démonstration : la commande reste dans l'appareil (voir Compte → Commandes en ligne de l'application de démo)
        const m = await import('@/lib/donnees/boutique-demo');
        const commande = await m.passerCommandeDemo(demo, boutique, panier, { nom: form.nom.trim(), telephone: n.ok ? n.affichage : form.telephone, adresse: form.adresse.trim() }, form.note);
        majPanier([]);
        setPanierOuvert(false);
        setEnvoi({ commande, lien: lienCommandeWhatsApp(commande) });
        setOccupe(false);
        return;
      }
      const r = await appelApi('POST', '/public/commande', {
        b: slug, ...(pro ? { pro } : {}), ...(cmd ? { mode: modeEff } : {}), site: form.site, note: form.note, client: { nom: form.nom.trim(), telephone: form.telephone, adresse: form.adresse.trim() },
        lignes: panier.map((l) => ({ produitId: l.produitId, quantite: l.quantite, options: l.optionIds })),
      });
      if (!r.commande) { setOccupe(false); return; }
      garderClient(slug, { nom: form.nom.trim(), telephone: r.commande.client?.telephone || form.telephone, adresse: form.adresse.trim() });
      const lien = lienCommandeWhatsApp(r.commande);
      majPanier([]);
      setPanierOuvert(false);
      setEnvoi({ commande: r.commande, lien });
      // Commande dans Kaislo : le client la suit ici ; WhatsApp reste un bouton pour prévenir la boutique. Sinon, WhatsApp s'ouvre avec le message déjà écrit
      if (r.commande.suivi) suivreCommande({ cle: r.commande.suivi, numero: r.commande.numero, boutique: boutique.nom, le: new Date().toISOString() });
      else window.location.href = lien;
    } catch (err) {
      setMessage(err.horsLigne ? tr('Pas de connexion internet : réessayez dans un instant.') : err.message);
    }
    setOccupe(false);
  };

  if (erreur) return <div className="vitrine"><div className="vitrine-centre"><h1>{tr('Boutique indisponible')}</h1><p className="muet">{erreur}</p></div></div>;
  if (!boutique) return <div className="vitrine"><div className="vitrine-centre"><p className="muet">{tr('Chargement…')}</p></div></div>;

  if (suiviCle) return <SuiviCommande cle={suiviCle} surFermer={() => setSuiviCle('')} />;

  if (envoi && envoi.commande.suivi) {
    return (
      <div className="vitrine">
        <div className="vitrine-centre">
          <h1>{tr('Commande n° {0} envoyée', [envoi.commande.numero])}</h1>
          <p>{tr('{0} a reçu votre commande. Suivez-la ici : vous voyez quand elle est acceptée, prête et {1}.', [boutique.nom, envoi.commande.mode === 'retrait' ? tr('retirée') : tr('livrée')])}</p>
          <button className="btn grand" onClick={() => setSuiviCle(envoi.commande.suivi)}>{tr('Suivre ma commande')}</button>
          <a className="btn secondaire" href={envoi.lien}>{tr('Prévenir la boutique sur WhatsApp')}</a>
          <p className="petit muet">{tr('Total : {0}{1}. Vous payez {2} directement, à la {3} ou comme convenu avec le vendeur. Kaislo n’est pas le vendeur.', [formatPrix(envoi.commande.total, devise), envoi.commande.frais > 0 ? tr(' (livraison comprise)') : '', boutique.nom, envoi.commande.mode === 'retrait' ? tr('remise') : tr('livraison')])}</p>
          <button className="btn fantome" onClick={() => setEnvoi(null)}>{tr('Retour à la boutique')}</button>
        </div>
      </div>
    );
  }

  if (envoi) {
    return (
      <div className="vitrine">
        <div className="vitrine-centre">
          <h1>{tr('Commande n° {0}', [envoi.commande.numero])}</h1>
          <p>{demo ? tr('Dans la vraie boutique, WhatsApp s’ouvrirait ici avec la commande déjà écrite, à envoyer au commerçant. Essayez : le message s’ouvre sans destinataire, envoyez-le à vous-même.') : <>{tr('Il reste une étape :')} <b>{tr('envoyez la commande sur WhatsApp')}</b> {tr('à {0}. Le message est déjà écrit, appuyez sur « Envoyer ».', [boutique.nom])}</>}</p>
          <a className="btn grand" href={envoi.lien}>{peutPartagerPhotos && !demo && photosCommande(envoi.commande).length > 0 ? tr('1. Envoyer la commande sur WhatsApp') : tr('Ouvrir WhatsApp')}</a>
          {peutPartagerPhotos && !demo && photosCommande(envoi.commande).length > 0 && (
            <div className="pile" style={{ gap: 6 }}>
              <button className={'btn grand ' + (photosEnvoyees ? 'secondaire' : '')} onClick={partagerPhotos}>{photosEnvoyees ? tr('✓ Photos envoyées : en renvoyer') : tr('2. Joindre les photos des articles')}</button>
              <p className="petit muet">{tr('Une fois la commande envoyée, touchez ce bouton et choisissez la discussion avec {0} : elle est en haut de la liste. Les photos arrivent comme de vraies images.', [boutique.nom])}</p>
            </div>
          )}
          {message && <p className="alerte">{message}</p>}
          <p className="petit muet">{tr('Total : {0}. Vous payez {1} directement, à la livraison ou comme convenu avec le vendeur. Kaislo n’est pas le vendeur.', [formatPrix(envoi.commande.total, devise), boutique.nom])}</p>
          <button className="btn secondaire" onClick={() => setEnvoi(null)}>{tr('Retour à la boutique')}</button>
        </div>
      </div>
    );
  }

  const total = totalPanier(panier);
  // Logo ou photo de profil de la boutique : fichier du site (démo) ou image envoyée par le gérant ; rien tant qu'il n'y en a pas
  const logo = !boutique.logo ? null : boutique.logo.startsWith('/') ? chemin(boutique.logo) : demo ? null : chemin('/api/public/boutique-image?b=' + encodeURIComponent(slug) + '&i=' + encodeURIComponent(boutique.logo));
  const image = (p) => (!p.image ? null : p.image.startsWith('/') ? chemin(p.image) : demo ? null : chemin('/api/public/boutique-image?b=' + encodeURIComponent(slug) + '&i=' + encodeURIComponent(p.image)));

  return (
    <div className="vitrine">
      {demo && <p className="vitrine-demo petit">{tr('Boutique de démonstration : votre commande reste sur cet appareil. Vous la retrouvez dans l’application de démo, menu Compte → Commandes en ligne.')}</p>}
      {pro && boutique.gros && <p className="vitrine-demo petit"><b>{tr('Espace grossistes')}</b>{tr(' : prix de gros, vente au carton. Ce lien est réservé aux professionnels qui l’ont reçu de {0}.', [boutique.nom])}</p>}
      <header className="vitrine-tete">
        <div className="vitrine-largeur">
          <div className="vitrine-identite">
            {logo && <img className="vitrine-logo" src={logo} alt={tr('Logo {0}', [boutique.nom])} width="72" height="72" />}
            <div>
              <h1>{boutique.nom}</h1>
              <p className="muet">{[boutique.quartier, boutique.ville].filter(Boolean).join(', ')}</p>
            </div>
          </div>
          {boutique.description && <p>{boutique.description}</p>}
          {boutique.livraison && <p className="petit"><b>{tr('Livraison :')}</b> {boutique.livraison}</p>}
        </div>
      </header>
      <main className="vitrine-largeur">
        {boutique.categories.length > 1 && (
          <div className="vitrine-categories" role="tablist">
            <button className={'puce' + (!categorie ? ' actif' : '')} onClick={() => setCategorie('')}>{tr('Tout')}</button>
            {boutique.categories.map((c) => <button key={c.id} className={'puce' + (categorie === c.id ? ' actif' : '')} onClick={() => setCategorie(c.id)}>{c.nom}</button>)}
          </div>
        )}
        {!produits.length && <p className="muet">{tr('Aucun article pour le moment.')}</p>}
        <div className="vitrine-grille">
          {produits.map((p) => (
            <article key={p.id} className="vitrine-article">
              <div className="vitrine-photo">{image(p) ? <img src={image(p)} alt={p.nom} loading="lazy" /> : <span aria-hidden="true">{p.emoji || (p.nom || '?').trim().charAt(0).toUpperCase()}</span>}</div>
              <b>{p.nom}</b>
              <p className="vitrine-prix">
                {formatPrix(p.promo ?? p.prix, devise)}{p.promo ? <>{' '}<s className="muet">{formatPrix(p.prix, devise)}</s></> : null}
                {p.groupes.length ? <span className="petit muet"> · {tr('options')}</span> : null}
                {p.minimum > 1 ? <span className="petit muet"> · {tr('min.')} {p.minimum} {p.uniteGros}</span> : null}
              </p>
              <button className="btn petit bloc" onClick={() => toucher(p)}>{tr('Ajouter')}</button>
            </article>
          ))}
        </div>
        <p className="vitrine-pied petit muet"><Marque taille={16} /> {tr('Boutique propulsée par')} <a href="https://kaislo.com">Kaislo</a></p>
        <p className="vitrine-avertissement tres-petit muet">{tr('Cette boutique est tenue par un commerçant indépendant. Kaislo est un outil qui relie les boutiques et leurs clients : Kaislo n’est pas le vendeur et n’est en aucun cas responsable des articles, des photos et autres contenus publiés par la boutique, des prix, de la livraison ni de la vente. Confirmez le prix et la disponibilité avec la boutique avant de payer.')} <a href="/conditions-utilisation/#boutiques-en-ligne">{tr('Lire les règles des boutiques en ligne')}</a> · <a href="/conditions-vente-boutiques/">{tr('Conditions de vente')}</a></p>
      </main>

      {boutique.chat && !demo && !panierOuvert && !choix && <ChatBoutique slug={slug} nomBoutique={boutique.nom} releve={panier.length > 0} />}

      {panier.length > 0 && !panierOuvert && (
        <button className="vitrine-barre btn grand bloc" onClick={() => setPanierOuvert(true)}>
          {tr('Voir mon panier ({0}) · {1}', [nombreArticles(panier), formatPrix(total + (modeEff === 'livraison' ? (cmd?.frais || 0) : 0), devise)])}
        </button>
      )}

      {choix && (
        <div className="vitrine-voile" onClick={() => setChoix(null)}>
          <div className="vitrine-feuille" role="dialog" aria-label={choix.produit.nom} onClick={(e) => e.stopPropagation()}>
            <h2>{choix.produit.nom}</h2>
            {choix.produit.groupes.map((g) => (
              <fieldset key={g.id} className="vitrine-groupe">
                <legend>{g.nom}{g.obligatoire ? ' ' + tr('(obligatoire)') : ''}</legend>
                {g.options.map((o) => (
                  <label key={o.id} className="case-accord">
                    <input type={g.type === 'unique' ? 'radio' : 'checkbox'} name={g.id} checked={choix.options.includes(o.id)} onChange={() => basculerOption(g, o)} />
                    <span>{o.nom}{o.prix ? ' (+' + formatPrix(o.prix, devise) + ')' : ''}</span>
                  </label>
                ))}
              </fieldset>
            ))}
            {message && <p className="alerte">{message}</p>}
            <button className="btn grand bloc" onClick={validerOptions}>{tr('Ajouter · {0}', [formatPrix(prixArticleBoutique(choix.produit, choix.options), devise)])}</button>
          </div>
        </div>
      )}

      {panierOuvert && (
        <div className="vitrine-voile" onClick={() => setPanierOuvert(false)}>
          <form className="vitrine-feuille" onSubmit={commander} onClick={(e) => e.stopPropagation()}>
            <h2>{tr('Mon panier')}</h2>
            {panier.map((l) => (
              <div key={l.cle} className="vitrine-ligne">
                <div className="grandit"><b>{l.nom}</b>{l.options.length ? <span className="petit muet"> ({l.options.join(', ')})</span> : null}<br /><span className="petit">{formatPrix(l.prixUnitaire * l.quantite, devise)}</span></div>
                <div className="vitrine-quantite">
                  <button type="button" className="icone-btn" onClick={() => changer(l.cle, -1)} aria-label={tr('Moins')}>−</button>
                  <b>{l.quantite}</b>
                  <button type="button" className="icone-btn" onClick={() => changer(l.cle, 1)} aria-label={tr('Plus')}>+</button>
                </div>
              </div>
            ))}
            {cmd && (cmd.livre && cmd.retrait) && (
              <div className="pile" role="group" aria-label={tr('Livraison ou retrait')}>
                <span className="petit"><b>{tr('Comment recevoir votre commande ?')}</b></span>
                <div className="ligne" style={{ gap: 8 }}>
                  <button type="button" className={'btn petit ' + (modeEff === 'livraison' ? '' : 'secondaire')} aria-pressed={modeEff === 'livraison'} onClick={() => setMode('livraison')}>{tr('Livraison')}{cmd.frais > 0 ? ' · ' + formatPrix(cmd.frais, devise) : ' ' + tr('offerte')}</button>
                  <button type="button" className={'btn petit ' + (modeEff === 'retrait' ? '' : 'secondaire')} aria-pressed={modeEff === 'retrait'} onClick={() => setMode('retrait')}>{tr('Retrait en boutique')}</button>
                </div>
              </div>
            )}
            {cmd && cmd.minimum > 0 && <p className="petit muet">{tr('Commande minimum : {0}.', [formatPrix(cmd.minimum, devise)])}</p>}
            {frais > 0 && <p className="petit">{tr('Livraison :')} <b>{formatPrix(frais, devise)}</b></p>}
            <p className="vitrine-total">{tr('Total :')} <b>{formatPrix(total + frais, devise)}</b></p>
            {anciens.length > 0 && (
              <div className="pile" role="group" aria-label={tr('Qui commande ?')}>
                <span className="petit"><b>{tr('Qui commande ?')}</b></span>
                {anciens.map((c) => (
                  <button key={c.telephone} type="button" className={'btn petit ' + (choisi === c.telephone ? '' : 'secondaire')} aria-pressed={choisi === c.telephone}
                    onClick={() => { setChoisi(c.telephone); setForm({ ...form, nom: c.nom, telephone: c.telephone, adresse: c.adresse || form.adresse }); }}>{c.nom} · {c.telephone}</button>
                ))}
                <button type="button" className={'btn petit ' + (choisi === '' ? '' : 'secondaire')} aria-pressed={choisi === ''}
                  onClick={() => { setChoisi(''); setForm({ ...form, nom: '', telephone: '', adresse: '' }); }}>{tr('Un autre client, un autre numéro')}</button>
              </div>
            )}
            <label className="champ"><span>{tr('Votre nom')}</span><input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} autoComplete="name" /></label>
            <ChampTelephone libelle={tr('Votre numéro (WhatsApp)')} pays={boutique.pays} valeur={form.telephone} surChanger={(v) => setForm({ ...form, telephone: v })} verifier={!demo} />
            {modeEff === 'livraison' && <label className="champ"><span>{tr('Adresse de livraison')}</span><input value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} autoComplete="street-address" /></label>}
            <label className="champ"><span>{tr('Note pour le vendeur (facultatif)')}</span><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={300} /></label>
            <label className="case-accord"><input type="checkbox" checked={accepte} onChange={(e) => setAccepte(e.target.checked)} /><span>{tr('J’ai lu et j’accepte les')} <a href="/conditions-vente-boutiques/" target="_blank" rel="noreferrer">{tr('conditions de vente')}</a> {tr('de la boutique.')}</span></label>
            <input className="vitrine-piege" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} />
            {message && <p className="alerte">{message}</p>}
            {cmd ? <p className="tres-petit muet">{tr('Après avoir confirmé, {0} reçoit votre commande tout de suite et vous pouvez la suivre ici.', [boutique.nom])}</p> : <p className="tres-petit muet">{tr('Après avoir confirmé, WhatsApp s’ouvre avec votre commande déjà écrite : il suffit de l’envoyer à {0} pour qu’elle soit prise en compte.', [boutique.nom])}</p>}
            <button className="btn grand bloc" type="submit" disabled={occupe}>{occupe ? tr('Confirmation…') : tr('Confirmer la commande')}</button>
            <button type="button" className="btn fantome bloc" onClick={() => setPanierOuvert(false)}>{tr('Continuer mes achats')}</button>
          </form>
        </div>
      )}
    </div>
  );
}
