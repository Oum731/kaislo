'use client';
// ------------------------------------------------------------
// Écran de verrouillage : empreinte / Face ID demandés pour rouvrir l'application après la première connexion.
// Le code PIN reste possible (vérifié dans le téléphone, même sans internet).
// ------------------------------------------------------------
import { useEffect, useRef, useState } from 'react';
import { useKaislo } from '@/store/kaislo';
import { Icone } from '@/components/ui';
import Marque from '@/components/Marque';
import { nomBiometrie } from '@/lib/biometrie';
import { tr } from '@/lib/i18n';

export default function VerrouApp() {
  const s = useKaislo();
  const [erreur, setErreur] = useState('');
  const [pin, setPin] = useState('');
  const [parPin, setParPin] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const deja = useRef(false);
  const nom = nomBiometrie();

  const biometrie = async () => {
    if (occupe) return;
    setOccupe(true);
    setErreur('');
    const err = await s.deverrouillerParBiometrie();
    setOccupe(false);
    if (err) setErreur(err);
  };
  // La demande d'empreinte s'ouvre toute seule ; si le navigateur la bloque, le bouton est là
  useEffect(() => {
    if (deja.current) return;
    deja.current = true;
    biometrie();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verifierPin = async (v) => {
    const err = await s.deverrouillerParPin(v);
    if (err) { setErreur(err); setPin(''); navigator.vibrate?.(200); }
  };

  return (
    <div className="verrou" role="dialog" aria-modal="true" aria-label={tr('Application verrouillée')}>
      <div className="verrou-boite">
        <Marque />
        <h1>{tr('Application verrouillée')}</h1>
        <p className="muet">{s.d?.commerce.nom} · {s.utilisateur?.nom}</p>
        <button className="btn grand bloc" onClick={biometrie} disabled={occupe}>
          <Icone nom="bouclier" /> {tr('Déverrouiller avec {0}', [nom])}
        </button>
        {parPin ? (
          <input
            className="pin-saisie" type="password" inputMode="numeric" autoComplete="off" maxLength={4} placeholder="••••" autoFocus
            value={pin} aria-label={tr('Code PIN (4 chiffres)')}
            onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 4); setPin(v); setErreur(''); if (v.length === 4) verifierPin(v); }}
          />
        ) : (
          <button className="btn secondaire bloc" onClick={() => { setParPin(true); setErreur(''); }}>{tr('Utiliser mon code PIN')}</button>
        )}
        {erreur && <p className="alerte">{erreur}</p>}
        <button className="btn fantome bloc" onClick={() => confirm(tr('Changer de compte ? Il faudra vous reconnecter.')) && s.seDeconnecter()}>{tr('Changer de compte')}</button>
      </div>
    </div>
  );
}
