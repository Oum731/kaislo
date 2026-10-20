'use client';
// ------------------------------------------------------------
// BOUTIQUE EN LIGNE (côté commerçant) :
//  - « Boutique en ligne » : activer la vitrine, choisir son adresse et le WhatsApp qui reçoit les commandes, partager le lien ;
//  - « Commandes en ligne » : commandes envoyées par les clients (statut, WhatsApp au client, reprise dans la caisse).
// Les articles à publier se choisissent dans leur fiche (case « Vendre en ligne »).
// ------------------------------------------------------------
import { useEffect, useState } from 'react';
import { useKaislo } from '@/store/kaislo';
import { Feuille, Icone, ChampTelephone, ImageStockee } from '@/components/ui';
import { appelApi } from '@/lib/api';
import { tr } from '@/lib/i18n';
import { formatDate, formatHeure, formatPrix } from '@/lib/utils/format';
import { lienWhatsApp } from '@/lib/donnees/whatsapp';
import { choixDepuisCommande, STATUTS_COMMANDE } from '@/lib/donnees/boutique';
import { chemin } from '@/config';

const libelleStatut = (id) => ({ nouvelle: tr('Nouvelle'), confirmee: tr('Confirmée'), prete: tr('Prête'), livree: tr('Livrée'), annulee: tr('Annulée') }[id] || id);

const messageErreur = (e) => (e.horsLigne ? tr('Pas de connexion internet : réessayez quand le réseau est revenu.') : e.message);

export function FeuilleBoutique() {
  const s = useKaislo();
  const demo = s.estDemoActuel();
  const [b, setB] = useState(null);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');
  const [occupe, setOccupe] = useState(false);

  useEffect(() => {
    if (demo) return;
    appelApi('GET', '/boutique', null, s.jetonServeur())
      .then((r) => setB({ ...r.boutique, slug: r.boutique.slug || r.boutique.suggestion, whatsapp: r.boutique.whatsapp || s.d.commerce.telephone || '' }))
      .catch((e) => setErreur(messageErreur(e)));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const maj = (x) => setB({ ...b, ...x });
  // Ce qu'on envoie au serveur (le lien privé des grossistes : activé ou non ; « regenererPro » : nouvelle clé)
  const donnees = (plus = {}) => ({ actif: b.actif, conditionsAcceptees: !!b.accord, publique: b.publique !== false, chat: b.chat !== false, pro: !!b.proActif, slug: b.slug, whatsapp: b.whatsapp, description: b.description, livraison: b.livraison, ...plus });
  const changerLienPro = async () => {
    if (!confirm(tr('Changer le lien des grossistes ? L’ancien lien ne marchera plus : il faudra envoyer le nouveau à vos grossistes.'))) return;
    setErreur(''); setOccupe(true);
    try {
      const r = await appelApi('POST', '/boutique', donnees({ regenererPro: true }), s.jetonServeur());
      setB({ ...b, ...r.boutique });
      setMessage(tr('Nouveau lien des grossistes créé. Envoyez-le à vos grossistes.'));
    } catch (e) { setErreur(messageErreur(e)); }
    setOccupe(false);
  };
  const copierPro = async () => {
    try { await navigator.clipboard.writeText(b.lienPro); setMessage(tr('Lien des grossistes copié.')); } catch { setErreur(tr('Copie impossible : utilisez le bouton WhatsApp.')); }
  };
  const enregistrer = async () => {
    setErreur('');
    setMessage('');
    if (b.actif && !b.conditionsAcceptees && !b.accord) return setErreur(tr('Pour activer votre boutique, cochez la case des conditions : Kaislo est un outil, vous restez seul responsable de vos articles et de vos ventes.'));
    setOccupe(true);
    try {
      const r = await appelApi('POST', '/boutique', donnees(), s.jetonServeur());
      setB({ ...r.boutique });
      setMessage(r.boutique.actif ? tr('Boutique enregistrée : elle est en ligne.') : tr('Boutique enregistrée (désactivée).'));
    } catch (e) { setErreur(messageErreur(e)); }
    setOccupe(false);
  };
  const copier = async () => {
    try { await navigator.clipboard.writeText(b.lien); setMessage(tr('Lien copié.')); } catch { setErreur(tr('Copie impossible : utilisez le bouton WhatsApp.')); }
  };

  if (demo) {
    const lienDemo = chemin('/boutique/?demo=' + s.d.commerce.id);
    const publies = s.d.produits.filter((p) => p.enLigne).length;
    return (
      <Feuille titre={tr('Boutique en ligne')} surFermer={s.fermer}
        pied={<a className="btn grand bloc" href={lienDemo} target="_blank" rel="noreferrer"><Icone nom="lienExterne" /> {tr('Voir ma boutique (démo)')}</a>}>
        <div className="pile">
          <p className="petit muet">{tr('Vos clients choisissent leurs articles sur une page à votre nom, puis la commande s’ouvre sur WhatsApp : ils vous l’envoient, vous la recevez aussi dans Compte → Commandes en ligne. Vous êtes payé comme d’habitude, Kaislo n’encaisse rien.')}</p>
          <p className="info-verte petit">{tr('Démo : la boutique est déjà activée avec {0} article(s) publié(s). Passez une commande, elle apparaît dans Compte → Commandes en ligne. Pour publier ou retirer un article : cochez « Vendre en ligne » dans sa fiche.', [publies])}</p>
          <div className="carte pile">
            <b>{tr('Votre lien')}</b>
            <p className="petit" style={{ wordBreak: 'break-all' }}>kaislo.com{lienDemo}</p>
          </div>
        </div>
      </Feuille>
    );
  }

  return (
    <Feuille titre={tr('Boutique en ligne')} surFermer={s.fermer}
      pied={b && <button className="btn grand bloc" disabled={occupe} onClick={enregistrer}>{occupe ? tr('Enregistrement…') : tr('Enregistrer')}</button>}>
      <div className="pile">
        {erreur && <p className="alerte">{erreur}</p>}
        {message && <p className="info-verte">{message}</p>}
        {!b && !erreur && !demo && <p className="muet petit">{tr('Chargement…')}</p>}
        {b && (
          <>
            <p className="petit muet">{tr('Vos clients choisissent leurs articles sur une page à votre nom, puis la commande s’ouvre sur WhatsApp : ils vous l’envoient, vous la recevez aussi dans Compte → Commandes en ligne. Vous êtes payé comme d’habitude, Kaislo n’encaisse rien.')}</p>
            <label className="case-accord"><input type="checkbox" checked={!!b.actif} onChange={(e) => maj({ actif: e.target.checked })} /><span>{tr('Boutique en ligne activée')}</span></label>
            {!b.conditionsAcceptees && (
              <label className="case-accord"><input type="checkbox" checked={!!b.accord} onChange={(e) => maj({ accord: e.target.checked })} /><span>{tr('Je comprends que Kaislo est un outil, un pont entre les boutiques et leurs clients : je suis seul responsable de mes articles, de mes prix, de la livraison et de mes ventes. J’accepte les conditions de la boutique en ligne.')} <a href={chemin('/conditions-utilisation/#boutiques-en-ligne')} target="_blank" rel="noreferrer">{tr('Lire')}</a></span></label>
            )}
            <label className="case-accord"><input type="checkbox" checked={b.publique !== false} onChange={(e) => maj({ publique: e.target.checked })} /><span>{tr('Afficher ma boutique sur kaislo.com/boutiques')}<br /><span className="tres-petit muet">{tr('Les clients du site la trouvent par rayon, avec quelques articles en exemple. Sans cette case, seuls ceux qui ont votre lien la voient.')}</span></span></label>
            <label className="case-accord"><input type="checkbox" checked={b.chat !== false} onChange={(e) => maj({ chat: e.target.checked })} /><span>{tr('Discussion en direct avec les clients')}<br /><span className="tres-petit muet">{tr('Une bulle « Discuter » sur votre boutique : les clients vous écrivent, vous répondez depuis l’écran Discussions et recevez une notification. Vous restez seul responsable de vos réponses.')}</span></span></label>
            <label className="champ"><span>{tr('Adresse de la boutique')}</span>
              <input value={b.slug} onChange={(e) => maj({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} placeholder="chez-awa" />
              <p className="aide">kaislo.com/boutique/{b.slug || '…'}/</p>
            </label>
            <ChampTelephone libelle={tr('Numéro WhatsApp qui reçoit les commandes')} pays={s.d.commerce.pays} valeur={b.whatsapp} surChanger={(v) => maj({ whatsapp: v })} />
            <label className="champ"><span>{tr('Présentation (facultatif)')}</span><textarea value={b.description} onChange={(e) => maj({ description: e.target.value })} maxLength={300} placeholder={tr('Ex : Boissons fraîches et jus naturels à Cocody')} /></label>
            <label className="champ"><span>{tr('Livraison (facultatif)')}</span><textarea value={b.livraison} onChange={(e) => maj({ livraison: e.target.value })} maxLength={300} placeholder={tr('Ex : Livraison à Cocody et Marcory, 1 000 FCFA')} /></label>
            <p className="petit">{tr('{0} article(s) publié(s) en ligne. Pour en publier d’autres : ouvrez la fiche de l’article et cochez « Vendre en ligne ».', [b.articlesPublies])}</p>
            {b.lien && (
              <div className="carte pile">
                <b>{tr('Lien public (prix de détail)')}</b>
                <p className="petit" style={{ wordBreak: 'break-all' }}>{b.lien}</p>
                <div className="grille-2">
                  <button className="btn secondaire" onClick={copier}><Icone nom="ok" /> {tr('Copier le lien')}</button>
                  <a className="btn" target="_blank" rel="noreferrer" href={'https://wa.me/?text=' + encodeURIComponent(tr('Commandez chez {0} : {1}', [s.d.commerce.nom, b.lien]))}><Icone nom="whatsapp" /> {tr('Partager')}</a>
                </div>
              </div>
            )}
            <label className="case-accord"><input type="checkbox" checked={!!b.proActif} onChange={(e) => maj({ proActif: e.target.checked })} /><span>{tr('Lien privé pour les grossistes')}<br /><span className="tres-petit muet">{tr('Un second lien, que vous envoyez vous-même à vos grossistes : ils y voient seulement les prix de gros (au carton). Vos clients au détail ne le voient jamais, et les grossistes ne voient pas vos prix de détail. Enregistrez pour le créer.')}</span></span></label>
            {b.proActif && b.lienPro && (
              <div className="carte pile">
                <b>{tr('Lien des grossistes (privé)')}</b>
                <p className="petit" style={{ wordBreak: 'break-all' }}>{b.lienPro}</p>
                {!b.articlesGros && <p className="alerte petit">{tr('Aucun article n’a encore de prix de gros : ouvrez la fiche d’un article et activez « Vendre aussi en gros ». Seuls ces articles apparaissent sur ce lien.')}</p>}
                <div className="grille-2">
                  <button className="btn secondaire" onClick={copierPro}><Icone nom="ok" /> {tr('Copier le lien')}</button>
                  <a className="btn" target="_blank" rel="noreferrer" href={'https://wa.me/?text=' + encodeURIComponent(tr('Prix de gros de {0} : {1}', [s.d.commerce.nom, b.lienPro]))}><Icone nom="whatsapp" /> {tr('Envoyer à un grossiste')}</a>
                </div>
                <button className="lien" onClick={changerLienPro} disabled={occupe}>{tr('Changer ce lien (l’ancien cessera de marcher)')}</button>
              </div>
            )}
          </>
        )}
      </div>
    </Feuille>
  );
}

const TEXTE_STATUT = {
  nouvelle: (c, boutique) => tr('Bonjour {0}, c’est {1}. Nous avons bien reçu votre commande n° {2}. Nous revenons vers vous très vite.', [c.client.nom, boutique, c.numero]),
  confirmee: (c, boutique) => tr('Bonjour {0}, c’est {1}. Votre commande n° {2} est confirmée. Merci !', [c.client.nom, boutique, c.numero]),
  prete: (c, boutique) => tr('Bonjour {0}, c’est {1}. Votre commande n° {2} est prête.', [c.client.nom, boutique, c.numero]),
  livree: (c, boutique) => tr('Bonjour {0}, c’est {1}. Merci pour votre commande n° {2} !', [c.client.nom, boutique, c.numero]),
  annulee: (c, boutique) => tr('Bonjour {0}, c’est {1}. Nous ne pouvons pas honorer votre commande n° {2}. Désolé, écrivez-nous pour en parler.', [c.client.nom, boutique, c.numero]),
};

export function FeuilleCommandesEnLigne() {
  const s = useKaislo();
  const demo = s.estDemoActuel();
  const [liste, setListe] = useState(null);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');

  const charger = () => (demo
    ? import('@/lib/donnees/boutique-demo').then((m) => m.commandesDemo(s.d.commerce.id)).then(setListe)
    : appelApi('GET', '/commandes-en-ligne', null, s.jetonServeur()).then((r) => setListe(r.commandes)).catch((e) => setErreur(messageErreur(e))));
  useEffect(() => { charger(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const changer = async (c, statut) => {
    setErreur('');
    if (demo) {
      const m = await import('@/lib/donnees/boutique-demo');
      setListe(await m.changerStatutDemo(s.d.commerce.id, c.id, statut));
      return;
    }
    try {
      const r = await appelApi('POST', '/commandes-en-ligne', { id: c.id, statut }, s.jetonServeur());
      setListe((l) => l.map((x) => (x.id === c.id ? r.commande : x)));
    } catch (e) { setErreur(messageErreur(e)); }
  };

  // Reprend les articles dans la caisse : le vendeur encaisse comme d'habitude (stock et comptes du soir restent justes)
  const ouvrirDansCaisse = (c) => {
    const manquants = [];
    s.viderPanier();
    if (c.gros) s.choisirModeGros(true); // commande de grossiste : au carton, au prix de gros
    for (const l of c.lignes) {
      const produit = s.d.produits.find((p) => p.id === l.produitId);
      if (!produit) { manquants.push(l.nom); continue; }
      s.ajouterAuPanier(produit, choixDepuisCommande(produit, l.optionIds || []), l.quantite);
    }
    useKaislo.setState({ aDistance: true, telephoneDistance: c.client.telephone });
    if (c.statut === 'nouvelle') changer(c, 'confirmee');
    s.allerA('caisse');
    if (manquants.length) s.message(tr('Article(s) introuvable(s) dans votre catalogue : {0}', [manquants.join(', ')]), 'erreur');
    else setMessage('');
  };

  const nom = s.d.commerce.nom;
  const pays = s.d.commerce.pays;
  const dev = s.d.commerce.devise;

  return (
    <Feuille titre={tr('Commandes en ligne')} surFermer={s.fermer} pleine large
      avant={<span className="mini-emoji teinte-vert"><Icone nom="caisse" /></span>}
      pied={<button className="btn secondaire bloc" onClick={() => { setErreur(''); charger(); }}>{tr('Actualiser')}</button>}>
      <div className="pile">
        {demo && <p className="info-verte petit">{tr('Démo : les deux premières commandes sont des exemples. Passez-en une vous-même depuis la boutique de démo : elle apparaît ici.')}</p>}
        {erreur && <p className="alerte">{erreur}</p>}
        {message && <p className="info-verte">{message}</p>}
        {liste && !liste.length && <p className="astuce">{tr('Aucune commande pour le moment. Partagez le lien de votre boutique (Compte → Boutique en ligne).')}</p>}
        {(liste || []).map((c) => (
          <div key={c.id} className="carte pile">
            <div className="ligne espace">
              <b>{tr('Commande n° {0}', [c.numero])}{c.gros && <span className="badge safran" style={{ marginLeft: 8 }}>{tr('Gros')}</span>}</b>
              <span className={'badge' + (c.statut === 'nouvelle' ? ' safran' : c.statut === 'annulee' ? ' gris' : '')}>{libelleStatut(c.statut)}</span>
            </div>
            <p className="tres-petit muet">{formatDate(c.creeLe)} {formatHeure(c.creeLe)}</p>
            <p className="petit"><b>{c.client.nom}</b> · {c.client.telephone}{c.client.adresse ? ' · ' + c.client.adresse : ''}</p>
            <ul className="petit" style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 8 }}>
              {c.lignes.map((l, i) => {
                const produit = s.d.produits.find((p) => p.id === l.produitId);
                return (
                  <li key={i} className="ligne-commande-photo">
                    <ImageStockee reference={produit?.image} className="mini-photo" alt={l.nom} secours={<span className="mini-photo mini-photo-vide" aria-hidden="true">{produit?.emoji || '🛍️'}</span>} />
                    <span>{l.quantite} × {l.nom}{l.options?.length ? ' (' + l.options.join(', ') + ')' : ''} : {formatPrix(l.total, dev)}</span>
                  </li>
                );
              })}
            </ul>
            {c.note && <p className="petit muet">{tr('Note : {0}', [c.note])}</p>}
            <p><b>{tr('Total : {0}', [formatPrix(c.total, c.devise)])}</b></p>
            <div className="grille-2">
              <a className="btn secondaire" target="_blank" rel="noreferrer" href={lienWhatsApp(c.client.telephone, pays, TEXTE_STATUT[c.statut](c, nom))}><Icone nom="whatsapp" /> {tr('Écrire au client')}</a>
              <button className="btn" onClick={() => ouvrirDansCaisse(c)}><Icone nom="caisse" /> {tr('Ouvrir dans la caisse')}</button>
            </div>
            <div className="puces enveloppe">
              {STATUTS_COMMANDE.map(([id]) => <button key={id} className={'puce' + (c.statut === id ? ' actif' : '')} onClick={() => c.statut !== id && changer(c, id)}>{libelleStatut(id)}</button>)}
            </div>
          </div>
        ))}
      </div>
    </Feuille>
  );
}
