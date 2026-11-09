'use client';
// ------------------------------------------------------------
// SAUVEGARDES (Réglages → Profil → Vos données) : copies automatiques de l'appareil, sauvegarde en fichier, restauration ;
// commerce en ligne : copies datées sur le serveur (une par jour, 14 jours) qu'on peut restaurer avec le code PIN du gérant.
// Voir lib/donnees/sauvegarde.js et api/lib/sauvegardes.php.
// ------------------------------------------------------------
import { useEffect, useState } from 'react';
import { useKaislo } from '@/store/kaislo';
import { listerCopies, lireCopie, verifierSauvegarde } from '@/lib/donnees/sauvegarde';
import { estServeur } from '@/lib/donnees/synchro';
import { appelApi } from '@/lib/api';
import { formatDate, formatHeure } from '@/lib/utils/format';
import { tr } from '@/lib/i18n';

export default function Sauvegardes() {
  const s = useKaislo();
  const { d } = s;
  const [version, setVersion] = useState(0); // redessine la liste après une restauration
  const [erreur, setErreur] = useState(null);
  const copies = listerCopies(d.commerce.id);

  const restaurer = (sauvegarde) => {
    setErreur(null);
    const v = verifierSauvegarde(sauvegarde, d);
    if (!v.ok) return setErreur(s.restaurerSauvegarde(sauvegarde)); // le message d'erreur vient de l'action
    const quand = v.resume.le ? formatDate(v.resume.le) + ' ' + formatHeure(v.resume.le) : '—';
    const ok = window.confirm(tr('Restaurer la copie du {0} ? {1} ventes, {2} articles, {3} clients. Ce qui a été fait depuis cette date disparaîtra, mais l’état actuel est gardé de côté : vous pourrez y revenir.', [quand, v.resume.ventes, v.resume.produits, v.resume.clients]));
    if (!ok) return;
    const e = s.restaurerSauvegarde(sauvegarde);
    setErreur(e);
    setVersion(version + 1);
  };

  const depuisFichier = async (e) => {
    const fichier = e.target.files?.[0];
    e.target.value = '';
    if (!fichier) return;
    try { restaurer(JSON.parse(await fichier.text())); } catch { setErreur(tr('Ce fichier n’est pas une sauvegarde Kaislo')); }
  };

  const libelle = (c) => (c.raison === 'avant-restauration' ? tr('Avant la dernière restauration') : tr('Copie automatique'));
  return (
    <>
    {estServeur(d) && <SauvegardesServeur />}
    <div className="carte pile" key={version}>
      <h3>{tr('Copies automatiques')}</h3>
      <p className="petit muet">{tr('Kaislo garde dans cet appareil une copie par jour (les 5 derniers jours). Pour être tranquille, téléchargez aussi une sauvegarde complète de temps en temps et gardez-la ailleurs.')}</p>
      {!copies.length ? <p className="petit muet">{tr('La première copie sera faite à la prochaine modification.')}</p> : copies.map((c) => (
        <div key={c.id} className="ligne espace" style={{ gap: 8, flexWrap: 'wrap' }}>
          <span className="petit"><b>{libelle(c)}</b> · {formatDate(c.creeLe)} {formatHeure(c.creeLe)}</span>
          <button className="btn secondaire petit" onClick={() => restaurer(lireCopie(d.commerce.id, c.id))}>{tr('Restaurer')}</button>
        </div>
      ))}
      <label className="btn secondaire bloc" style={{ cursor: 'pointer' }}>
        {tr('Restaurer depuis un fichier de sauvegarde')}
        <input type="file" accept="application/json,.json" onChange={depuisFichier} style={{ display: 'none' }} />
      </label>
      {erreur && <p className="alerte">{erreur}</p>}
    </div>
    </>
  );
}

// Copies du serveur : une par jour (14 jours), « Sauvegarder maintenant », restauration avec le code PIN du gérant
function SauvegardesServeur() {
  const s = useKaislo();
  const [copies, setCopies] = useState(null);
  const [jours, setJours] = useState(14);
  const [choix, setChoix] = useState(null); // copie à restaurer
  const [pin, setPin] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState(null); // { ok, texte }
  const appel = (m, c, corps) => appelApi(m, c, corps, s.jetonServeur());
  const charger = () => appel('GET', '/sauvegardes').then((r) => { setCopies(r.sauvegardes); setJours(r.joursGardes || 14); }).catch(() => setCopies([]));
  useEffect(() => { charger(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sauvegarder = async () => {
    setEnCours(true); setMessage(null);
    try { await appel('POST', '/sauvegardes', { action: 'creer' }); setMessage({ ok: true, texte: tr('Copie faite sur le serveur') }); await charger(); } catch (e) { setMessage({ ok: false, texte: e.message }); }
    setEnCours(false);
  };
  const restaurer = async () => {
    setEnCours(true); setMessage(null);
    try {
      await appel('POST', '/sauvegardes/restaurer', { id: choix.id, pin });
      await s.synchroniser(); // cet appareil reçoit tout de suite les données restaurées
      setChoix(null); setPin('');
      setMessage({ ok: true, texte: tr('Données restaurées. Les autres appareils les recevront à leur prochaine synchronisation.') });
      await charger();
    } catch (e) { setMessage({ ok: false, texte: e.message }); setPin(''); }
    setEnCours(false);
  };
  const libelle = (c) => (c.raison === 'avant-restauration' ? tr('Avant la dernière restauration') : c.raison === 'manuelle' ? tr('Copie manuelle') : tr('Copie automatique'));
  return (
    <div className="carte pile">
      <h3>{tr('Copies sur le serveur')}</h3>
      <p className="petit muet">{tr('Kaislo garde sur son serveur une copie de vos données chaque jour ({0} jours). Pratique si un article, un client ou une dépense est supprimé par erreur : vous revenez à un jour précis, sur tous vos appareils.', [jours])}</p>
      {copies === null ? <p className="petit muet">{tr('Chargement…')}</p> : !copies.length ? <p className="petit muet">{tr('La première copie sera faite à la prochaine modification.')}</p> : copies.map((c) => (
        <div key={c.id} className="pile" style={{ gap: 6 }}>
          <div className="ligne espace" style={{ gap: 8, flexWrap: 'wrap' }}>
            <span className="petit"><b>{libelle(c)}</b> · {formatDate(c.creeLe)} {formatHeure(c.creeLe)}<br /><span className="muet">{tr('{0} ventes, {1} articles, {2} clients', [c.details?.ventes || 0, c.details?.produits || 0, c.details?.clients || 0])}</span></span>
            <button className="btn secondaire petit" onClick={() => { setChoix(choix?.id === c.id ? null : c); setPin(''); setMessage(null); }}>{tr('Restaurer')}</button>
          </div>
          {choix?.id === c.id && (
            <div className="carte pile" style={{ padding: 12 }}>
              <p className="petit">{tr('Restaurer cette copie ? Ce qui a été fait depuis disparaîtra sur tous vos appareils, mais l’état actuel est gardé de côté : vous pourrez y revenir.')}</p>
              <label className="champ"><span>{tr('Code PIN du gérant')}</span><input className="pin-saisie" type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value)} placeholder="••••" onKeyDown={(e) => e.key === 'Enter' && pin.length === 4 && restaurer()} /></label>
              <button className="btn danger" onClick={restaurer} disabled={pin.length < 4 || enCours}>{enCours ? tr('Restauration…') : tr('Restaurer cette copie')}</button>
            </div>
          )}
        </div>
      ))}
      <button className="btn secondaire bloc" onClick={sauvegarder} disabled={enCours}>{tr('Sauvegarder maintenant')}</button>
      {message && <p className={message.ok ? 'info-verte' : 'alerte'}>{message.texte}</p>}
    </div>
  );
}
