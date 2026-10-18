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
import { appelApi } from '@/lib/api';
import { chemin } from '@/config';
import { formatPrix } from '@/lib/utils/format';
import { normaliserTelephone } from '@/lib/donnees/telephone';
import { prixArticleBoutique, nomsOptions, cleLignePanier, totalPanier, nombreArticles, erreurOptions, lienCommandeWhatsApp, messageCommande, photosCommande } from '@/lib/donnees/boutique';

const cleStockage = (slug) => 'kaislo-panier-' + slug;
const lirePanier = (slug) => { try { return JSON.parse(localStorage.getItem(cleStockage(slug))) || []; } catch { return []; } };
const garderPanier = (slug, panier) => { try { localStorage.setItem(cleStockage(slug), JSON.stringify(panier)); } catch { /* panier gardé en mémoire seulement */ } };

export default function Boutique() {
  const [slug, setSlug] = useState(null);
  const [boutique, setBoutique] = useState(null);
  const [erreur, setErreur] = useState('');
  const [categorie, setCategorie] = useState('');
  const [panier, setPanier] = useState([]);
  const [choix, setChoix] = useState(null); // { produit, options: [ids] } : article dont on choisit les options
  const [panierOuvert, setPanierOuvert] = useState(false);
  const [envoi, setEnvoi] = useState(null); // commande envoyée : { commande, lien }
  const [occupe, setOccupe] = useState(false);
  const [form, setForm] = useState({ nom: '', telephone: '', adresse: '', note: '', site: '' });
  const [message, setMessage] = useState('');

  const [demo, setDemo] = useState(null); // identifiant du commerce de démo, ou null
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Démo : kaislo.com/boutique/?demo=resto-ivoire (articles de la démo, commande gardée dans l'appareil)
    const idDemo = params.get('demo');
    if (idDemo) {
      setDemo(idDemo);
      setSlug('demo-' + idDemo);
      setPanier(lirePanier('demo-' + idDemo));
      import('@/lib/donnees/boutique-demo').then(async (m) => {
        const b = m.estDemo(idDemo) ? await m.boutiqueDemo(idDemo) : null;
        if (b) setBoutique(b); else setErreur('Cette démonstration n’existe pas.');
      }).catch(() => setErreur('La démonstration n’a pas pu se charger.'));
      return;
    }
    // /boutique/nom-du-commerce/ (page réécrite par le serveur, avec le contenu pour Google) ou ancienne forme /boutique/?b=nom
    const dansLAdresse = /^\/boutique\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(window.location.pathname);
    const s = (params.get('b') || (dansLAdresse ? dansLAdresse[1] : '')).toLowerCase();
    document.getElementById('seo-boutique')?.remove(); // contenu en HTML simple ajouté par le serveur pour Google : la vitrine prend le relais
    setSlug(s);
    if (!s) { setErreur('Adresse de boutique incomplète.'); return; }
    setPanier(lirePanier(s));
    appelApi('GET', '/public/boutique?b=' + encodeURIComponent(s))
      .then((r) => setBoutique(r.boutique))
      .catch((e) => setErreur(e.statut === 404 ? 'Cette boutique n’existe pas ou est fermée pour le moment.' : (e.horsLigne ? 'Pas de connexion internet.' : e.message)));
  }, []);

  // Partage avec les vraies photos jointes (téléphones qui le permettent) : le client choisit le contact WhatsApp du vendeur
  const peutPartagerPhotos = typeof navigator !== 'undefined' && !!navigator.share && !!navigator.canShare;
  const partagerAvecPhotos = async () => {
    setMessage('');
    try {
      const fichiers = await Promise.all(photosCommande(envoi.commande).slice(0, 6).map(async (u, i) => {
        const blob = await (await fetch(u)).blob();
        return new File([blob], 'article-' + (i + 1) + '.jpg', { type: blob.type || 'image/jpeg' });
      }));
      if (!navigator.canShare({ files: fichiers })) return setMessage('Votre téléphone ne permet pas d’envoyer les photos : utilisez « Ouvrir WhatsApp ».');
      await navigator.share({ files: fichiers, text: messageCommande(envoi.commande, { liensPhotos: false }) });
    } catch (e) {
      if (e?.name !== 'AbortError') setMessage('Impossible d’envoyer les photos : utilisez « Ouvrir WhatsApp ».');
    }
  };

  const majPanier = (liste) => { setPanier(liste); garderPanier(slug, liste); };
  const devise = boutique?.devise;
  const produits = useMemo(() => (boutique?.produits || []).filter((p) => !categorie || p.categorieId === categorie), [boutique, categorie]);

  const ajouter = (produit, optionIds) => {
    const cle = cleLignePanier(produit.id, optionIds);
    const i = panier.findIndex((l) => l.cle === cle);
    if (i >= 0) majPanier(panier.map((l, j) => (j === i ? { ...l, quantite: Math.min(99, l.quantite + 1) } : l)));
    else majPanier([...panier, { cle, produitId: produit.id, nom: produit.nom, options: nomsOptions(produit, optionIds), optionIds, quantite: 1, prixUnitaire: prixArticleBoutique(produit, optionIds) }]);
  };
  const toucher = (produit) => {
    if ((produit.groupes || []).length) setChoix({ produit, options: [] });
    else ajouter(produit, []);
  };
  const changer = (cle, delta) => majPanier(panier.map((l) => (l.cle === cle ? { ...l, quantite: l.quantite + delta } : l)).filter((l) => l.quantite > 0));
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

  const commander = async (e) => {
    e.preventDefault();
    setMessage('');
    if (form.nom.trim().length < 2) return setMessage('Indiquez votre nom.');
    if (form.adresse.trim().length < 3) return setMessage('Indiquez votre adresse de livraison (quartier, rue ou repère).');
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
        b: slug, site: form.site, note: form.note, client: { nom: form.nom.trim(), telephone: form.telephone, adresse: form.adresse.trim() },
        lignes: panier.map((l) => ({ produitId: l.produitId, quantite: l.quantite, options: l.optionIds })),
      });
      if (!r.commande) { setOccupe(false); return; }
      const lien = lienCommandeWhatsApp(r.commande);
      majPanier([]);
      setPanierOuvert(false);
      setEnvoi({ commande: r.commande, lien });
      window.location.href = lien; // WhatsApp s'ouvre avec le message déjà écrit
    } catch (err) {
      setMessage(err.horsLigne ? 'Pas de connexion internet : réessayez dans un instant.' : err.message);
    }
    setOccupe(false);
  };

  if (erreur) return <div className="vitrine"><div className="vitrine-centre"><h1>Boutique indisponible</h1><p className="muet">{erreur}</p></div></div>;
  if (!boutique) return <div className="vitrine"><div className="vitrine-centre"><p className="muet">Chargement…</p></div></div>;

  if (envoi) {
    return (
      <div className="vitrine">
        <div className="vitrine-centre">
          <h1>Commande n° {envoi.commande.numero}</h1>
          <p>{demo ? <>Dans la vraie boutique, WhatsApp s’ouvrirait ici avec la commande déjà écrite, à envoyer au commerçant. Essayez : le message s’ouvre sans destinataire, envoyez-le à vous-même.</> : <>Il reste une étape : <b>envoyez la commande sur WhatsApp</b> à {boutique.nom}. Le message est déjà écrit, appuyez sur « Envoyer ».</>}</p>
          <a className="btn grand" href={envoi.lien}>Ouvrir WhatsApp</a>
          {peutPartagerPhotos && photosCommande(envoi.commande).length > 0 && (
            <button className="btn secondaire" onClick={partagerAvecPhotos}>Envoyer avec les photos des articles</button>
          )}
          {message && <p className="alerte">{message}</p>}
          <p className="petit muet">Total : {formatPrix(envoi.commande.total, devise)}. Vous payez {boutique.nom} directement, à la livraison ou comme convenu avec le vendeur. Kaislo n’est pas le vendeur.</p>
          <button className="btn secondaire" onClick={() => setEnvoi(null)}>Retour à la boutique</button>
        </div>
      </div>
    );
  }

  const total = totalPanier(panier);
  const image = (p) => (!p.image ? null : p.image.startsWith('/') ? chemin(p.image) : demo ? null : chemin('/api/public/boutique-image?b=' + encodeURIComponent(slug) + '&i=' + encodeURIComponent(p.image)));

  return (
    <div className="vitrine">
      {demo && <p className="vitrine-demo petit">Boutique de démonstration : votre commande reste sur cet appareil. Vous la retrouvez dans l’application de démo, menu Compte → Commandes en ligne.</p>}
      <header className="vitrine-tete">
        <div className="vitrine-largeur">
          <h1>{boutique.nom}</h1>
          <p className="muet">{[boutique.quartier, boutique.ville].filter(Boolean).join(', ')}</p>
          {boutique.description && <p>{boutique.description}</p>}
          {boutique.livraison && <p className="petit"><b>Livraison :</b> {boutique.livraison}</p>}
        </div>
      </header>
      <main className="vitrine-largeur">
        {boutique.categories.length > 1 && (
          <div className="vitrine-categories" role="tablist">
            <button className={'puce' + (!categorie ? ' actif' : '')} onClick={() => setCategorie('')}>Tout</button>
            {boutique.categories.map((c) => <button key={c.id} className={'puce' + (categorie === c.id ? ' actif' : '')} onClick={() => setCategorie(c.id)}>{c.nom}</button>)}
          </div>
        )}
        {!produits.length && <p className="muet">Aucun article pour le moment.</p>}
        <div className="vitrine-grille">
          {produits.map((p) => (
            <article key={p.id} className="vitrine-article">
              <div className="vitrine-photo">{image(p) ? <img src={image(p)} alt={p.nom} loading="lazy" /> : <span aria-hidden="true">{p.emoji || '🛍️'}</span>}</div>
              <b>{p.nom}</b>
              <p className="vitrine-prix">
                {formatPrix(p.promo ?? p.prix, devise)}{p.promo ? <>{' '}<s className="muet">{formatPrix(p.prix, devise)}</s></> : null}
                {p.groupes.length ? <span className="petit muet"> · options</span> : null}
              </p>
              <button className="btn petit bloc" onClick={() => toucher(p)}>Ajouter</button>
            </article>
          ))}
        </div>
        <p className="vitrine-pied petit muet"><Marque taille={16} /> Boutique propulsée par <a href="https://kaislo.com">Kaislo</a></p>
        <p className="vitrine-avertissement tres-petit muet">Cette boutique est tenue par un commerçant indépendant. Kaislo est un outil qui relie les boutiques et leurs clients : Kaislo n’est pas le vendeur et n’est en aucun cas responsable des articles, des photos et autres contenus publiés par la boutique, des prix, de la livraison ni de la vente. Confirmez le prix et la disponibilité avec la boutique avant de payer. <a href="/conditions-utilisation/#boutiques-en-ligne">Lire les règles des boutiques en ligne</a></p>
      </main>

      {boutique.chat && !demo && !panierOuvert && !choix && <ChatBoutique slug={slug} nomBoutique={boutique.nom} releve={panier.length > 0} />}

      {panier.length > 0 && !panierOuvert && (
        <button className="vitrine-barre btn grand bloc" onClick={() => setPanierOuvert(true)}>
          Voir mon panier ({nombreArticles(panier)}) · {formatPrix(total, devise)}
        </button>
      )}

      {choix && (
        <div className="vitrine-voile" onClick={() => setChoix(null)}>
          <div className="vitrine-feuille" role="dialog" aria-label={choix.produit.nom} onClick={(e) => e.stopPropagation()}>
            <h2>{choix.produit.nom}</h2>
            {choix.produit.groupes.map((g) => (
              <fieldset key={g.id} className="vitrine-groupe">
                <legend>{g.nom}{g.obligatoire ? ' (obligatoire)' : ''}</legend>
                {g.options.map((o) => (
                  <label key={o.id} className="case-accord">
                    <input type={g.type === 'unique' ? 'radio' : 'checkbox'} name={g.id} checked={choix.options.includes(o.id)} onChange={() => basculerOption(g, o)} />
                    <span>{o.nom}{o.prix ? ' (+' + formatPrix(o.prix, devise) + ')' : ''}</span>
                  </label>
                ))}
              </fieldset>
            ))}
            {message && <p className="alerte">{message}</p>}
            <button className="btn grand bloc" onClick={validerOptions}>Ajouter · {formatPrix(prixArticleBoutique(choix.produit, choix.options), devise)}</button>
          </div>
        </div>
      )}

      {panierOuvert && (
        <div className="vitrine-voile" onClick={() => setPanierOuvert(false)}>
          <form className="vitrine-feuille" onSubmit={commander} onClick={(e) => e.stopPropagation()}>
            <h2>Mon panier</h2>
            {panier.map((l) => (
              <div key={l.cle} className="vitrine-ligne">
                <div className="grandit"><b>{l.nom}</b>{l.options.length ? <span className="petit muet"> ({l.options.join(', ')})</span> : null}<br /><span className="petit">{formatPrix(l.prixUnitaire * l.quantite, devise)}</span></div>
                <div className="vitrine-quantite">
                  <button type="button" className="icone-btn" onClick={() => changer(l.cle, -1)} aria-label="Moins">−</button>
                  <b>{l.quantite}</b>
                  <button type="button" className="icone-btn" onClick={() => changer(l.cle, 1)} aria-label="Plus">+</button>
                </div>
              </div>
            ))}
            <p className="vitrine-total">Total : <b>{formatPrix(total, devise)}</b></p>
            <label className="champ"><span>Votre nom</span><input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} autoComplete="name" /></label>
            <ChampTelephone libelle="Votre numéro (WhatsApp)" pays={boutique.pays} valeur={form.telephone} surChanger={(v) => setForm({ ...form, telephone: v })} verifier={!demo} />
            <label className="champ"><span>Adresse de livraison</span><input value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} autoComplete="street-address" /></label>
            <label className="champ"><span>Note pour le vendeur (facultatif)</span><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={300} /></label>
            <input className="vitrine-piege" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} />
            {message && <p className="alerte">{message}</p>}
            <p className="tres-petit muet">Après avoir confirmé, WhatsApp s’ouvre avec votre commande déjà écrite : il suffit de l’envoyer à {boutique.nom} pour qu’elle soit prise en compte.</p>
            <button className="btn grand bloc" type="submit" disabled={occupe}>{occupe ? 'Confirmation…' : 'Confirmer la commande'}</button>
            <button type="button" className="btn fantome bloc" onClick={() => setPanierOuvert(false)}>Continuer mes achats</button>
          </form>
        </div>
      )}
    </div>
  );
}
