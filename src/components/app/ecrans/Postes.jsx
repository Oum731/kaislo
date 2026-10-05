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
import { tr } from '@/lib/i18n';

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
    if (!confirm(tr('Supprimer le poste « {0} » ?', [p.nom]))) return;
    const err = s.supprimerPoste(p.id);
    if (err) s.message(err, 'erreur');
  };

  return (
    <div className="pile">
      <p className="astuce">{tr('Un')} <b>{tr('poste')}</b>{tr(', c’est le téléphone ou la tablette relié(e) à une imprimante. Il accueille')} <b>{tr('{0} vendeurs au maximum', [VENDEURS_PAR_POSTE])}</b>{tr(', qui travaillent sur leur propre téléphone : leurs tickets s’impriment tous sur l’imprimante du poste. Vous, le gérant, vendez depuis n’importe quel poste et ne comptez pas dans la limite.')}</p>

      <div className="entete-section">
        <p className="section-titre" style={{ marginTop: 0 }}>{tr('Vos postes')}</p>
        <button className="btn petit" onClick={() => setEdition({ nom: '' })}><Icone nom="plus" taille="sm" /> {tr('Poste')}</button>
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
                  {prefs.posteAppareil === p.id && <span className="badge">{tr('cet appareil')}</span>}
                </span>
                <span className="tres-petit muet bloc-texte tronque">{vendeurs.length ? vendeurs.map((u) => u.nom).join(', ') : tr('Aucun vendeur pour le moment')}</span>
              </span>
              <span className={`badge ${vendeurs.length >= VENDEURS_PAR_POSTE ? 'safran' : 'gris'}`}>{tr('{0}/{1} vendeurs', [vendeurs.length, VENDEURS_PAR_POSTE])}</span>
            </div>
          );
        })}
      </div>
      {tarif && (
        <p className="tres-petit muet">{tr('Votre formule comprend 1 poste. {0}', [postes.length > 1 ? tr('{0} poste(s) supplémentaire(s) : +{1} par mois chacun.', [postes.length - 1, s.prix(tarif.prixPoste)]) : tr('Poste supplémentaire : +{0} par mois.', [s.prix(tarif.prixPoste)])])}</p>
      )}

      <p className="section-titre">{tr('Cet appareil')}</p>
      <div className="carte pile">
        <label className="champ"><span>{tr('Cet appareil imprime les tickets du poste…')}</span>
          <select value={prefs.posteAppareil || ''} onChange={(e) => s.definirPosteAppareil(e.target.value)}>
            <option value="">{tr('Aucun (appareil sans imprimante)')}</option>
            {postes.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
          </select>
        </label>
        <p className="tres-petit muet">
          {estServeur(d)
            ? tr('À choisir sur le téléphone ou la tablette relié(e) à l’imprimante (Réglages → Imprimante). Gardez l’application ouverte : les tickets des vendeurs du poste s’impriment en quelques secondes.')
            : tr('L’impression des tickets des vendeurs sur l’imprimante du poste fonctionne pour les commerces inscrits en ligne.')}
        </p>
        {prefs.posteAppareil && !s.imprimante.connectee && <p className="alerte petit">{tr('Aucune imprimante Bluetooth connectée sur cet appareil : connectez-la dans Réglages → Imprimante.')}</p>}
      </div>

      {edition && (
        <Feuille titre={edition.id ? edition.nom : tr('Nouveau poste')} surFermer={() => setEdition(null)} pied={<button className="btn bloc" onClick={enregistrer}>{tr('Enregistrer')}</button>}>
          <div className="pile">
            <label className="champ"><span>{tr('Nom du poste')}</span><input value={edition.nom} onChange={(e) => setEdition({ ...edition, nom: e.target.value })} placeholder={tr('Ex : Comptoir, Terrasse, Comptoir 2')} autoFocus /></label>
            {!edition.id && tarif && <p className="tres-petit muet">{tr('Chaque poste au-delà du premier ajoute {0} par mois à votre abonnement.', [s.prix(tarif.prixPoste)])}</p>}
            {edition.id && <button className="btn danger bloc" onClick={() => { supprimer(edition); setEdition(null); }}>{tr('Supprimer ce poste')}</button>}
          </div>
        </Feuille>
      )}
    </div>
  );
}
