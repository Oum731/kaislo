'use client';
// ------------------------------------------------------------
// NOTIFICATIONS : résumé du soir automatique et nouvelles commandes en ligne, par e-mail et/ou WhatsApp.
// Le serveur envoie (voir api/lib/notifications.php) ; ici le gérant choisit quoi recevoir, où, et à quelle heure.
// Les choix sont des réglages du commerce (d.commerce.notifications), envoyés au serveur par la synchronisation habituelle.
// ------------------------------------------------------------
import { useEffect, useState } from 'react';
import { useKaislo } from '@/store/kaislo';
import { Feuille, Icone, Interrupteur } from '@/components/ui';
import { appelApi } from '@/lib/api';
import { etatPush, activerPush, desactiverPush, iosNonInstalle } from '@/lib/push-client';
import { formatHeure } from '@/lib/utils/format';
import { tr } from '@/lib/i18n';

const HEURES = [19, 20, 21, 22, 23];
const LIBELLE_CANAL = (c) => (c === 'email' ? tr('e-mail') : c === 'push' ? tr('notification') : 'WhatsApp');

export function FeuilleNotifications() {
  const s = useKaislo();
  const [etat, setEtat] = useState(null); // réponse du serveur
  const [erreur, setErreur] = useState('');
  const [essai, setEssai] = useState(null); // null | 'en cours' | résultats
  const [nouvelEmail, setNouvelEmail] = useState('');
  const [appareil, setAppareil] = useState(null); // { supporte, permission, abonne } pour CET appareil
  const [occupePush, setOccupePush] = useState(false);
  const choix = s.d.commerce.notifications || {};
  const resume = choix.resume !== false;
  const heure = Number.isInteger(choix.heure) ? choix.heure : 21;
  const email = choix.email !== false;
  const whatsapp = choix.whatsapp === true;
  const commandes = choix.commandes !== false;

  const charger = () => appelApi('GET', '/notifications', null, s.jetonServeur()).then(setEtat).catch((e) => setErreur(e.horsLigne ? tr('Connexion internet nécessaire') : e.message));
  useEffect(() => { charger(); etatPush().then(setAppareil); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const regler = (x) => s.enregistrerNotifications(x);

  const tester = async () => {
    setEssai('en cours');
    setErreur('');
    try {
      await s.synchroniser?.(); // le serveur lit les réglages : on s'assure qu'ils sont à jour
      const r = await appelApi('POST', '/notifications/tester', {}, s.jetonServeur());
      setEssai(r.resultats);
      charger();
    } catch (e) {
      setEssai(null);
      setErreur(e.horsLigne ? tr('Connexion internet nécessaire') : e.message);
    }
  };

  // Notifications sur cet appareil : la permission se demande à ce clic
  const basculerPush = async (v) => {
    setOccupePush(true);
    setErreur('');
    try {
      if (v) await activerPush(etat?.push?.clePublique, s.jetonServeur());
      else await desactiverPush(s.jetonServeur());
      setAppareil(await etatPush());
      charger();
    } catch (e) {
      setErreur(e.code === 'refuse' ? tr('Notifications refusées : autorisez-les dans les réglages de votre navigateur.') : e.code === 'indisponible' ? tr('Les notifications ne sont pas disponibles sur cet appareil.') : e.horsLigne ? tr('Connexion internet nécessaire') : e.message);
      setAppareil(await etatPush());
    } finally {
      setOccupePush(false);
    }
  };

  const ajouterEmail = async () => {
    const err = s.enregistrerEmailCommerce(nouvelEmail);
    if (err) return setErreur(err);
    setErreur('');
    try { await s.synchroniser?.(); } catch { /* réessayé automatiquement */ }
    setNouvelEmail('');
    charger();
  };

  const emailOk = etat?.email.disponible;
  const waPlateforme = etat?.whatsapp.plateforme;
  const waOk = etat?.whatsapp.disponible;

  return (
    <Feuille titre={tr('Notifications')} sousTitre={tr('Soyez prévenu sans ouvrir l’application')} surFermer={s.fermer}
      pied={<button className="btn bloc" onClick={tester} disabled={essai === 'en cours' || (!email && !whatsapp && !(etat?.push.appareils > 0))}><Icone nom="cloche" /> {essai === 'en cours' ? tr('Envoi…') : tr('Envoyer un essai maintenant')}</button>}>
      <div className="pile">
        {erreur && <p className="alerte">{erreur}</p>}

        {/* Résumé du soir */}
        <div className="carte notif-carte">
          <div className="ligne">
            <span className="notif-icone vert"><Icone nom="cloche" /></span>
            <span className="grandit"><b>{tr('Résumé du soir')}</b><span className="tres-petit muet bloc-texte">{tr('Ventes, dépenses, crédits, stock bas')}</span></span>
            <Interrupteur actif={resume} surChanger={(v) => regler({ resume: v })} label={tr('Résumé du soir')} />
          </div>
          {resume && (
            <div className="puces" style={{ marginTop: 12 }} role="group" aria-label={tr('Heure d’envoi')}>
              {HEURES.map((h) => <button key={h} className={'puce ' + (heure === h ? 'actif' : '')} onClick={() => regler({ heure: h })}>{h} h</button>)}
            </div>
          )}
        </div>

        {/* Sur cet appareil (notification push) */}
        <div className="carte notif-carte">
          <div className="ligne">
            <span className="notif-icone vert"><Icone nom="telephone" /></span>
            <span className="grandit">
              <b>{tr('Sur cet appareil')}</b>
              <span className="tres-petit muet bloc-texte">
                {!appareil ? ' ' : !appareil.supporte ? tr('Non disponible sur ce navigateur') : iosNonInstalle() ? tr('Sur iPhone : ajoutez d’abord Kaislo à l’écran d’accueil') : appareil.permission === 'denied' ? tr('Refusées dans le navigateur') : tr('Une notification, même application fermée')}
              </span>
            </span>
            {appareil?.supporte && !iosNonInstalle() && appareil.permission !== 'denied'
              ? <Interrupteur actif={appareil.abonne} surChanger={(v) => !occupePush && basculerPush(v)} label={tr('Sur cet appareil')} />
              : <span className="badge gris">{tr('Indisponible')}</span>}
          </div>
          {etat && etat.push.appareils > 0 && <p className="tres-petit muet" style={{ marginTop: 8 }}>{etat.push.appareils > 1 ? tr('{0} appareils reçoivent les notifications', [etat.push.appareils]) : tr('1 appareil reçoit les notifications')}</p>}
        </div>

        {/* Où le recevoir */}
        <p className="section-titre">{tr('Où le recevoir')}</p>
        <div className="liste">
          <div className="liste-item">
            <span className="notif-icone bleu"><Icone nom="mail" /></span>
            <span className="grandit">
              <b>{tr('E-mail')}</b>
              <span className="tres-petit muet bloc-texte tronque">{emailOk ? etat.email.adresse : tr('Aucune adresse sur le compte')}</span>
            </span>
            {emailOk || !etat ? <Interrupteur actif={email} surChanger={(v) => regler({ email: v })} label={tr('E-mail')} /> : <span className="badge gris">{tr('À ajouter')}</span>}
          </div>
          {etat && !emailOk && (
            <div className="liste-item">
              <input className="saisie grandit" type="email" inputMode="email" autoComplete="email" placeholder={tr('votre@adresse.com')} value={nouvelEmail} onChange={(e) => setNouvelEmail(e.target.value)} />
              <button className="btn petit" onClick={ajouterEmail} disabled={!nouvelEmail.trim()}>{tr('Enregistrer')}</button>
            </div>
          )}
          {/* WhatsApp : proposé seulement quand Kaislo a activé l'envoi (voir README) ; sinon l'e-mail suffit */}
          {waPlateforme && (
            <div className="liste-item">
              <span className="notif-icone vert"><Icone nom="whatsapp" /></span>
              <span className="grandit">
                <b>WhatsApp</b>
                <span className="tres-petit muet bloc-texte tronque">{!etat ? ' ' : waOk ? etat.whatsapp.numero : tr('Aucun numéro sur le compte')}</span>
              </span>
              {waOk ? <Interrupteur actif={whatsapp} surChanger={(v) => regler({ whatsapp: v })} label="WhatsApp" /> : <span className="badge gris">{tr('Indisponible')}</span>}
            </div>
          )}
        </div>
        {waOk && whatsapp && <p className="tres-petit muet">{tr('En activant WhatsApp, vous acceptez de recevoir ces messages de Kaislo sur ce numéro. Vous pouvez les couper à tout moment.')}</p>}

        {/* Commandes */}
        <div className="carte notif-carte">
          <div className="ligne">
            <span className="notif-icone safran"><Icone nom="caisse" /></span>
            <span className="grandit"><b>{tr('Nouvelles commandes en ligne')}</b><span className="tres-petit muet bloc-texte">{tr('Un message dès qu’un client commande')}</span></span>
            <Interrupteur actif={commandes} surChanger={(v) => regler({ commandes: v })} label={tr('Nouvelles commandes en ligne')} />
          </div>
        </div>

        {/* Résultat de l'essai et derniers envois */}
        {Array.isArray(essai) && essai.length > 0 && (
          <div className="pile" style={{ gap: 6 }}>
            {essai.map((x) => (
              <p key={x.canal} className={x.statut === 'envoye' ? 'info-verte' : 'alerte'}>
                {x.statut === 'envoye' ? tr('Essai envoyé par {0}', [LIBELLE_CANAL(x.canal)]) : tr('Échec : {0}', [LIBELLE_CANAL(x.canal)])}
              </p>
            ))}
          </div>
        )}
        {etat?.derniers?.length > 0 && (
          <div>
            <p className="section-titre">{tr('Derniers envois')}</p>
            <div className="liste">
              {etat.derniers.map((n, i) => (
                <div key={i} className="liste-item">
                  <span className={'notif-icone petit ' + (n.statut === 'envoye' ? 'vert' : 'rouge')}><Icone nom={n.statut === 'envoye' ? 'ok' : 'alerte'} /></span>
                  <span className="grandit"><b>{n.type === 'resume' ? tr('Résumé du soir') : n.type === 'commande' ? tr('Nouvelle commande') : tr('Essai')}</b></span>
                  <span className="petit muet">{LIBELLE_CANAL(n.canal)} · {formatHeure(n.le)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Feuille>
  );
}
