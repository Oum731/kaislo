'use client';
// ------------------------------------------------------------
// Tableaux de prix de la page « Tarifs » : uniquement ceux du pays du visiteur
// (deviné par l'appareil, modifiable). Même grille que le serveur (tarifs.js).
// ------------------------------------------------------------
import { FORMULES, REGLES_TARIFS } from '@/lib/donnees/tarifs';
import { PAYS, typeCommerce } from '@/lib/donnees/modeles';
import { symbole } from '@/lib/utils/format';
import { useSelectionPays } from '@/lib/pays-visiteur';

// Prix d'abonnement en nombre entier : 149 DH, 9 000 FCFA
const formatPrix = (x, d) => Math.round(x).toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' ') + ' ' + symbole(d);
const FAMILLES = [...new Set(FORMULES.map((f) => f.famille))];

export function ChoixPays({ pays, changer, gps, erreur }) {
  return (
    <div className="petit" style={{ margin: '0 0 18px' }}>
      <p>
        Prix pour : <b>{pays.nom}</b> ·{' '}
        <label className="lien" style={{ cursor: 'pointer' }}>
          ce n’est pas votre pays ?{' '}
          <select value={pays.id} onChange={(e) => changer(e.target.value)} aria-label="Changer de pays" style={{ maxWidth: 220 }}>
            {PAYS.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
          </select>
        </label>{' '}
        <button type="button" className="lien" onClick={gps}>Utiliser ma position</button>
      </p>
      {erreur && <p className="muet" role="status">{erreur}</p>}
    </div>
  );
}

export default function TarifsPays() {
  const [pays, changer, { gps, erreur }] = useSelectionPays();
  const d = pays.devise;
  const resto = FORMULES.find((f) => f.id === 'restaurant');
  return (
    <>
      <ChoixPays pays={pays} changer={changer} gps={gps} erreur={erreur} />
      {FAMILLES.map((famille) => {
        const formules = FORMULES.filter((f) => f.famille === famille);
        return (
          <div key={famille}>
            <h2 style={{ fontSize: 24 }}>{famille}</h2>
            <div className="tableau-tarifs">
              <table>
                <thead><tr><th>Métier</th><th>Par mois</th></tr></thead>
                <tbody>
                  {formules.flatMap((f) => f.types.filter((t) => t !== 'autre').map((t) => (
                    <tr key={t}><td>{typeCommerce(t).nom}</td><td><b>{formatPrix(f.prix[d], d)}</b></td></tr>
                  )))}
                </tbody>
              </table>
            </div>
            <p className="petit muet" style={{ marginTop: 8 }}>Poste supplémentaire : +{formatPrix(formules[0].prixPoste[d], d)} par mois.</p>
          </div>
        );
      })}
      <div className="carte pile">
        <h3>Pour toutes les formules</h3>
        <ul className="liste-points">
          <li><b>Paiement annuel : {REGLES_TARIFS.moisOffertsAnnuel} mois offerts.</b></li>
          <li><b>Premier mois gratuit</b> et <b>installation offerte</b> pendant le lancement.</li>
          <li><b>Tarif fondateur</b> : remise de {REGLES_TARIFS.remiseFondateur} % à vie pour les {REGLES_TARIFS.placesFondateur} premiers clients.</li>
          <li>Matériel à part : imprimante vendue ou louée (facultative).</li>
        </ul>
      </div>
      <p className="petit muet" data-exemple-postes>
        Exemple : un restaurant avec 2 postes paie {formatPrix(resto.prix[d], d)} + {formatPrix(resto.prixPoste[d], d)} = {formatPrix(resto.prix[d] + resto.prixPoste[d], d)} par mois.
      </p>
    </>
  );
}
