'use client';
// ------------------------------------------------------------
// SAUVEGARDES (Réglages → Profil → Vos données) : copies automatiques de l'appareil, sauvegarde en fichier, restauration.
// Voir lib/donnees/sauvegarde.js.
// ------------------------------------------------------------
import { useState } from 'react';
import { useKaislo } from '@/store/kaislo';
import { listerCopies, lireCopie, verifierSauvegarde } from '@/lib/donnees/sauvegarde';
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
  );
}
