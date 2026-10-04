'use client';
// ------------------------------------------------------------
// RÉGLAGES → POSTES (gérant)
// Un poste = un point d'impression (téléphone ou tablette relié(e) à l'imprimante),
// 5 vendeurs au maximum. Au-delà de 5 vendeurs, il faut un poste de plus.
// Sur l'appareil relié à l'imprimante, le gérant choisit « Cet appareil est le poste … » :
// les tickets des vendeurs de ce poste y sortent automatiquement.
// ------------------------------------------------------------
import { useState } from 'react';
import { useKaislo } from '@/store/kaislo';
import { postesDe, vendeursDuPoste } from '@/lib/donnees/postes';
import { VENDEURS_PAR_POSTE } from '@/lib/donnees/tarifs';
import { estServeur } from '@/lib/donnees/synchro';
import { Icone, Feuille } from '@/components/ui';
import { tarifDuCommerce } from './Abonnement';

export default function Postes() {
  const s = useKaislo();
  const { d, prefs } = s;
  const postes = postesDe(d);
  const [edition, setEdition] = useState(null); // { id?, nom }
  const tarif = tarifDuCommerce(d);
  const enregistrer = () => {
    const err = s.enregistrerPoste(edition);
    err ? s.message(err, 'erreur') : setEdition(null);
  };
  const supprimer = (p) => {
    if (!confirm('Supprimer le poste « ' + p.nom + ' » ?')) return;
    const err = s.supprimerPoste(p.id);
    if (err) s.message(err, 'erreur');
  };

  return (
    <div className="pile">
      <p className="astuce">
        Un <b>poste</b>, c’est le téléphone ou la tablette relié(e) à une imprimante. Il accueille <b>{VENDEURS_PAR_POSTE} vendeurs au maximum</b>,
        qui travaillent sur leur propre téléphone : leurs tickets s’impriment tous sur l’imprimante du poste. Vous, le gérant, vendez depuis
        n’importe quel poste et ne comptez pas dans la limite.
      </p>

      <div className="entete-section">
        <p className="section-titre" style={{ marginTop: 0 }}>Vos postes</p>
        <button className="btn petit" onClick={() => setEdition({ nom: '' })}><Icone nom="plus" taille="sm" /> Poste</button>
      </div>
      <div className="liste">
        {postes.map((p) => {
          const vendeurs = vendeursDuPoste(d, p.id);
          return (
            <div key={p.id} className="liste-item cliquable" onClick={() => setEdition({ ...p })}>
              <span className="mini-emoji teinte-vert"><Icone nom="imprimante" taille="sm" /></span>
              <span className="grandit">
                <span className="ligne" style={{ gap: 6, flexWrap: 'wrap' }}>
                  <b className="tronque">{p.nom}</b>
                  {prefs.posteAppareil === p.id && <span className="badge">cet appareil</span>}
                </span>
                <span className="tres-petit muet bloc-texte tronque">{vendeurs.length ? vendeurs.map((u) => u.nom).join(', ') : 'Aucun vendeur pour le moment'}</span>
              </span>
              <span className={`badge ${vendeurs.length >= VENDEURS_PAR_POSTE ? 'safran' : 'gris'}`}>{vendeurs.length}/{VENDEURS_PAR_POSTE} vendeurs</span>
            </div>
          );
        })}
      </div>
      {tarif && (
        <p className="tres-petit muet">
          Votre formule comprend 1 poste. {postes.length > 1 ? `${postes.length - 1} poste(s) supplémentaire(s) : +${s.prix(tarif.prixPoste)} par mois chacun.` : `Poste supplémentaire : +${s.prix(tarif.prixPoste)} par mois.`}
        </p>
      )}

      <p className="section-titre">Cet appareil</p>
      <div className="carte pile">
        <label className="champ"><span>Cet appareil imprime les tickets du poste…</span>
          <select value={prefs.posteAppareil || ''} onChange={(e) => s.definirPosteAppareil(e.target.value)}>
            <option value="">Aucun (appareil sans imprimante)</option>
            {postes.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
          </select>
        </label>
        <p className="tres-petit muet">
          {estServeur(d)
            ? 'À choisir sur le téléphone ou la tablette relié(e) à l’imprimante (Réglages → Imprimante). Gardez l’application ouverte : les tickets des vendeurs du poste s’impriment en quelques secondes.'
            : 'L’impression des tickets des vendeurs sur l’imprimante du poste fonctionne pour les commerces inscrits en ligne.'}
        </p>
        {prefs.posteAppareil && !s.imprimante.connectee && <p className="alerte petit">Aucune imprimante Bluetooth connectée sur cet appareil : connectez-la dans Réglages → Imprimante.</p>}
      </div>

      {edition && (
        <Feuille titre={edition.id ? edition.nom : 'Nouveau poste'} surFermer={() => setEdition(null)} pied={<button className="btn bloc" onClick={enregistrer}>Enregistrer</button>}>
          <div className="pile">
            <label className="champ"><span>Nom du poste</span><input value={edition.nom} onChange={(e) => setEdition({ ...edition, nom: e.target.value })} placeholder="Ex : Comptoir, Terrasse, Comptoir 2" autoFocus /></label>
            {!edition.id && tarif && <p className="tres-petit muet">Chaque poste au-delà du premier ajoute {s.prix(tarif.prixPoste)} par mois à votre abonnement.</p>}
            {edition.id && <button className="btn danger bloc" onClick={() => { supprimer(edition); setEdition(null); }}>Supprimer ce poste</button>}
          </div>
        </Feuille>
      )}
    </div>
  );
}
