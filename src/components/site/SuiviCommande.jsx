'use client';
// ------------------------------------------------------------
// SUIVI D'UNE COMMANDE PAR LE CLIENT (lot L1) : statut mis à jour toutes les 20 secondes, notification quand il change, contact avec la boutique.
// La clé de suivi vient de l'appareil du client ; aucune adresse de page ne la contient.
// ------------------------------------------------------------
import { useEffect, useState } from 'react';
import { appelApi } from '@/lib/api';
import { chemin } from '@/config';
import { formatPrix } from '@/lib/utils/format';
import { etapesCommande } from '@/lib/commandes-client';
import { activerPushSuivi, etatPush, iosNonInstalle } from '@/lib/push-client';
import { tr, langueActive } from '@/lib/i18n';

export default function SuiviCommande({ cle, surFermer }) {
  const [c, setC] = useState(null);
  const [clePublique, setClePublique] = useState(null);
  const [erreur, setErreur] = useState('');
  const [push, setPush] = useState({ supporte: false, abonne: false, permission: 'default' });
  const [messagePush, setMessagePush] = useState('');

  useEffect(() => {
    let actif = true;
    const charger = () => appelApi('GET', '/public/commande-suivi?cle=' + encodeURIComponent(cle))
      .then((r) => { if (actif) { setC(r.commande); setClePublique(r.clePublique || null); setErreur(''); } })
      .catch((e) => { if (actif) setErreur(e.statut === 404 ? tr('Cette commande est introuvable.') : e.horsLigne ? tr('Pas de connexion internet : le statut se mettra à jour dès que le réseau revient.') : e.message); });
    charger();
    const t = setInterval(charger, 20000);
    etatPush().then((e) => { if (actif) setPush(e); });
    return () => { actif = false; clearInterval(t); };
  }, [cle]);

  const prevenir = async () => {
    setMessagePush('');
    try {
      await activerPushSuivi(clePublique, cle, langueActive(), async () => { await navigator.serviceWorker.register(chemin('/sw.js')); });
      setPush((p) => ({ ...p, abonne: true, permission: 'granted' }));
      setMessagePush(tr('C’est noté : vous serez prévenu à chaque étape.'));
    } catch (e) {
      setMessagePush(e.code === 'refuse' ? tr('Notifications refusées : autorisez-les dans les réglages du navigateur pour être prévenu.') : tr('Les notifications ne sont pas disponibles sur cet appareil.'));
    }
  };

  const fini = c && (c.statut === 'livree' || c.statut === 'annulee');
  const peutPrevenir = c && !fini && clePublique && push.supporte && push.permission !== 'denied';
  return (
    <div className="decouverte-boutique" role="dialog" aria-modal="true" aria-label={tr('Suivi de commande')}>
      <div className="decouverte-boutique-barre"><button type="button" className="btn secondaire petit" onClick={surFermer}>← {tr('Retour aux boutiques')}</button></div>
      <div className="vitrine-centre">
        {erreur && <p className="alerte">{erreur}</p>}
        {!c && !erreur && <p className="muet">{tr('Chargement…')}</p>}
        {c && (
          <>
            <h1>{tr('Commande n° {0}', [c.numero])}</h1>
            <p className="muet">{c.boutique} · {c.mode === 'retrait' ? tr('Retrait en boutique') : tr('Livraison')}</p>
            {c.statut === 'annulee' && <p className="alerte">{tr('La boutique a annulé cette commande. Écrivez-lui pour en savoir plus.')}</p>}
            <ol className="suivi-etapes">
              {etapesCommande(c.statut, c.mode).map((e) => <li key={e.id} className={'suivi-' + e.etat}><span aria-hidden="true">{e.etat === 'ok' ? '✓' : e.etat === 'en-cours' ? '●' : '○'}</span> {e.libelle}</li>)}
            </ol>
            {c.livreur && !fini && <p className="petit">{tr('Livreur : {0}', [c.livreur])}</p>}
            {c.code && (
              <div className="carte pile">
                <b>{tr('Votre code de livraison')}</b>
                <p style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: 6 }}>{c.code}</p>
                <p className="petit muet">{tr('Donnez ce code au livreur quand il vous remet la commande. Ne le donnez à personne d’autre.')}</p>
              </div>
            )}
            {peutPrevenir && !push.abonne && (
              <button type="button" className="btn grand" onClick={prevenir}>{tr('Me prévenir quand le statut change')}</button>
            )}
            {peutPrevenir && iosNonInstalle() && <p className="tres-petit muet">{tr('Sur iPhone, ajoutez d’abord Kaislo à l’écran d’accueil pour recevoir les notifications.')}</p>}
            {messagePush && <p className="petit">{messagePush}</p>}
            <div className="carte pile">
              {c.lignes.map((l, i) => <div key={i} className="ligne" style={{ justifyContent: 'space-between' }}><span>{l.quantite} × {l.nom}</span></div>)}
              {c.frais > 0 && <div className="ligne" style={{ justifyContent: 'space-between' }}><span className="muet">{tr('Livraison')}</span><span>{formatPrix(c.frais, c.devise)}</span></div>}
              <div className="ligne" style={{ justifyContent: 'space-between' }}><b>{tr('Total :').replace(/\s*:$/, '')}</b><b>{formatPrix(c.total, c.devise)}</b></div>
              <p className="petit muet">{tr('Vous payez {0} directement, à la {1} ou comme convenu avec le vendeur.', [c.boutique, c.mode === 'retrait' ? tr('remise') : tr('livraison')])}</p>
            </div>
            {c.whatsapp && <a className="btn secondaire bloc" target="_blank" rel="noreferrer" href={'https://wa.me/' + c.whatsapp + '?text=' + encodeURIComponent(tr('Bonjour, à propos de ma commande n° {0}', [c.numero]))}>{tr('Écrire à la boutique sur WhatsApp')}</a>}
            {!fini && <p className="tres-petit muet">{tr('Cette page se met à jour toute seule.')}</p>}
          </>
        )}
      </div>
    </div>
  );
}
