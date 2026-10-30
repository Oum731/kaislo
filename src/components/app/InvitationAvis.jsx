'use client';
// ------------------------------------------------------------
// Carte « Donnez votre avis sur Kaislo » de l'accueil : proposée au gérant qui a utilisé Kaislo au moins 3 jours (voir
// lib/donnees/invitation-avis.js). Jamais en démo, jamais aux vendeurs (seul le gérant peut donner l'avis du commerce),
// jamais si un avis a déjà été envoyé.
// ------------------------------------------------------------
import { useEffect, useState } from 'react';
import { useKaislo } from '@/store/kaislo';
import { Icone } from '@/components/ui';
import { appelApi } from '@/lib/api';
import { estServeur } from '@/lib/donnees/synchro';
import { doitInviter, noterJourUsage } from '@/lib/donnees/invitation-avis';
import { tr } from '@/lib/i18n';

export default function InvitationAvis() {
  const s = useKaislo();
  const concerne = !s.estDemoActuel() && s.estGerant() && estServeur(s.d);
  const [avisDonne, setAvisDonne] = useState(!!s.prefs.invitationAvis?.fait);
  const jours = s.prefs.joursUsage || [];

  // Un jour d'usage de plus (une fois par jour), et le serveur dit si un avis existe déjà
  useEffect(() => {
    if (!concerne) return;
    const noter = noterJourUsage(jours);
    if (noter !== jours) s.sauverPrefs({ joursUsage: noter });
    if (!s.prefs.invitationAvis?.fait) {
      appelApi('GET', '/mon-avis', null, s.jetonServeur())
        .then((r) => { if (r.avis) { setAvisDonne(true); s.sauverPrefs({ invitationAvis: { ...(s.prefs.invitationAvis || {}), fait: true } }); } })
        .catch(() => {});
    }
  }, [concerne]); // eslint-disable-line react-hooks/exhaustive-deps

  const invitation = s.prefs.invitationAvis || {};
  if (!concerne || !doitInviter({ jours, invitation, avisDonne })) return null;
  const plusTard = () => s.sauverPrefs({ invitationAvis: { ...invitation, refus: (invitation.refus || 0) + 1, dernier: Date.now() } });
  const jamais = () => s.sauverPrefs({ invitationAvis: { ...invitation, jamais: true } });
  return (
    <div className="carte pile invitation-avis" style={{ marginBottom: 16, maxWidth: 720 }}>
      <div className="ligne" style={{ gap: 12, alignItems: 'flex-start' }}>
        <span className="mini-emoji teinte-safran"><Icone nom="etoile" /></span>
        <div className="grandit">
          <b>{tr('Kaislo vous est utile ? Donnez votre avis')}</b>
          <p className="petit muet">{tr('Trente secondes : une note et quelques lignes. Votre expérience aide d’autres commerçants à choisir, et nous aide à améliorer Kaislo.')}</p>
        </div>
      </div>
      <div className="grille-2">
        <button className="btn" onClick={() => s.ouvrir('avis')}>{tr('Donner mon avis')}</button>
        <button className="btn secondaire" onClick={plusTard}>{tr('Plus tard')}</button>
      </div>
      <button className="lien petit" style={{ justifySelf: 'start' }} onClick={jamais}>{tr('Ne plus me le demander')}</button>
    </div>
  );
}
