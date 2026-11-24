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
import { grosDisponible } from '@/lib/donnees/gros';
import { tr } from '@/lib/i18n';
import { formatDate, formatHeure, formatPrix } from '@/lib/utils/format';
import { lienWhatsApp } from '@/lib/donnees/whatsapp';
import { choixDepuisCommande, STATUTS_COMMANDE, articlesAPublier, messageAnnuaire, venteDeCommande } from '@/lib/donnees/boutique';
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
  const donnees = (plus = {}) => ({ actif: b.actif, conditionsAcceptees: !!b.accord, publique: b.publique !== false, chat: b.chat !== false, pro: !!b.proActif, slug: b.slug, whatsapp: b.whatsapp, description: b.description, livraison: b.livraison, localisation: s.d.commerce.localisation || null, ...plus });
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
  // Publie d'un geste les articles qui ne sont pas encore « Vendre en ligne » ; la boutique apparaît alors dans la liste du site
  const aPublier = articlesAPublier(s.d.produits).length;
  const publierTout = async () => {
    if (!confirm(tr('Publier {0} article(s) sur votre boutique en ligne ? Vous pourrez en retirer un à tout moment : ouvrez sa fiche et décochez « Vendre en ligne ».', [aPublier]))) return;
    setErreur(''); setMessage(''); setOccupe(true);
    try {
      s.publierTousArticles();
      await s.synchroniser?.();
      const r = await appelApi('GET', '/boutique', null, s.jetonServeur());
      setB((x) => ({ ...x, ...r.boutique, slug: r.boutique.slug || x.slug }));
      setMessage(tr('Articles publiés.'));
    } catch (e) { setErreur(messageErreur(e)); }
    setOccupe(false);
  };

  if (demo) {
    const lienDemo = chemin('/boutique/?demo=' + s.d.commerce.id);
    const publies = s.d.produits.filter((p) => p.enLigne).length;
    return (
      <Feuille titre={tr('Boutique en ligne')} surFermer={s.fermer}
        pied={<a className="btn grand bloc" href={lienDemo} target="_blank" rel="noreferrer"><Icone nom="lienExterne" /> {tr('Voir ma boutique (démo)')}</a>}>
        <div className="pile">
          <p className="petit muet">{tr('Vos clients proches de vous voient vos articles sur l’accueil de kaislo.com, puis la commande s’ouvre sur WhatsApp : ils vous l’envoient, vous la recevez aussi dans Compte → Commandes en ligne. Vous êtes payé comme d’habitude, Kaislo n’encaisse rien.')}</p>
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
            <p className="petit muet">{tr('Vos clients proches de vous voient vos articles sur l’accueil de kaislo.com, puis la commande s’ouvre sur WhatsApp : ils vous l’envoient, vous la recevez aussi dans Compte → Commandes en ligne. Vous êtes payé comme d’habitude, Kaislo n’encaisse rien.')}</p>
            <label className="case-accord"><input type="checkbox" checked={!!b.actif} onChange={(e) => maj({ actif: e.target.checked })} /><span>{tr('Boutique en ligne activée')}</span></label>
            {!b.conditionsAcceptees && (
              <label className="case-accord"><input type="checkbox" checked={!!b.accord} onChange={(e) => maj({ accord: e.target.checked })} /><span>{tr('Je comprends que Kaislo est un outil, un pont entre les boutiques et leurs clients : je suis seul responsable de mes articles, de mes prix, de la livraison et de mes ventes. J’accepte les conditions de la boutique en ligne.')} <a href={chemin('/conditions-utilisation/#boutiques-en-ligne')} target="_blank" rel="noreferrer">{tr('Lire')}</a></span></label>
            )}
            <label className="case-accord"><input type="checkbox" checked={b.publique !== false} onChange={(e) => maj({ publique: e.target.checked })} /><span>{tr('Apparaître près de mes clients sur kaislo.com')}<br /><span className="tres-petit muet">{tr('Les clients voient d’abord les boutiques les plus proches d’eux, avec quelques articles. Placez votre commerce sur la carte pour être classé par distance.')}</span></span></label>
            <label className="case-accord"><input type="checkbox" checked={b.chat !== false} onChange={(e) => maj({ chat: e.target.checked })} /><span>{tr('Discussion en direct avec les clients')}<br /><span className="tres-petit muet">{tr('Une bulle « Discuter » sur votre boutique : les clients vous écrivent, vous répondez depuis l’écran Discussions et recevez une notification. Vous restez seul responsable de vos réponses.')}</span></span></label>
            <ChampTelephone libelle={tr('Numéro WhatsApp qui reçoit les commandes')} pays={s.d.commerce.pays} valeur={b.whatsapp} surChanger={(v) => maj({ whatsapp: v })} />
            <label className="champ"><span>{tr('Présentation (facultatif)')}</span><textarea value={b.description} onChange={(e) => maj({ description: e.target.value })} maxLength={300} placeholder={tr('Ex : Boissons fraîches et jus naturels à Cocody')} /></label>
            <label className="champ"><span>{tr('Livraison (facultatif)')}</span><textarea value={b.livraison} onChange={(e) => maj({ livraison: e.target.value })} maxLength={300} placeholder={tr('Ex : Livraison à Cocody et Marcory, 1 000 FCFA')} /></label>
            <p className="petit">{tr('{0} article(s) publié(s) en ligne. Pour en publier d’autres : ouvrez la fiche de l’article et cochez « Vendre en ligne ».', [b.articlesPublies])}</p>
            {messageAnnuaire(b) && <p className={messageAnnuaire(b).ok ? 'info-verte petit' : 'alerte petit'}>{messageAnnuaire(b).texte}</p>}
            {aPublier > 0 && <button type="button" className="btn secondaire bloc" disabled={occupe} onClick={publierTout}>{tr('Publier mes {0} article(s) en ligne', [aPublier])}</button>}
            {!s.d.commerce.localisation && <p className="alerte petit">{tr('Votre commerce n’est pas placé sur la carte : les clients ne peuvent pas vous trouver par proximité. Ouvrez Compte → Informations du commerce → Localisation.')}</p>}
            {grosDisponible(s.d.commerce) && <label className="case-accord"><input type="checkbox" checked={!!b.proActif} onChange={(e) => maj({ proActif: e.target.checked })} /><span>{tr('Lien privé pour les grossistes')}<br /><span className="tres-petit muet">{tr('Un second lien, que vous envoyez vous-même à vos grossistes : ils y voient seulement les prix de gros (au carton). Vos clients au détail ne le voient jamais, et les grossistes ne voient pas vos prix de détail. Enregistrez pour le créer.')}</span></span></label>}
            {grosDisponible(s.d.commerce) && b.proActif && b.lienPro && (
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

