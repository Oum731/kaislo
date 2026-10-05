'use client';
// ------------------------------------------------------------
// Tableaux de prix de la page « Tarifs » : uniquement ceux du pays du visiteur
// (deviné par l'appareil, modifiable). Même grille que le serveur (tarifs.js).
// ------------------------------------------------------------
import { FORMULES, REGLES_TARIFS, prixCatalogue, catalogueEnVigueur, remiseCodeParrain } from '@/lib/donnees/tarifs';
import { PAYS, typeCommerce } from '@/lib/donnees/modeles';
import { symbole } from '@/lib/utils/format';
import { useSelectionPays } from '@/lib/pays-visiteur';
import { tr, tt } from '@/lib/i18n';

// Prix d'abonnement en nombre entier : 149 DH, 9 000 FCFA
const formatPrix = (x, d) => Math.round(x).toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' ') + ' ' + symbole(d);
const FAMILLES = [...new Set(FORMULES.map((f) => f.famille))];

export function ChoixPays({ pays, changer, gps, erreur }) {
  return (
    <div className="petit" style={{ margin: '0 0 18px' }}>
      <p>{tr('Prix pour :')} <b>{tt(pays.nom)}</b> ·{' '}
        <label className="lien" style={{ cursor: 'pointer' }}>{tr('ce n’est pas votre pays ?')}<select value={pays.id} onChange={(e) => changer(e.target.value)} aria-label={tr('Changer de pays')} style={{ maxWidth: 220 }}>
            {PAYS.map((p) => <option key={p.id} value={p.id}>{tt(p.nom)}</option>)}
          </select>
        </label>{' '}
        <button type="button" className="lien" onClick={gps}>{tr('Utiliser ma position')}</button>
      </p>
      {erreur && <p className="muet" role="status">{erreur}</p>}
    </div>
  );
}

export default function TarifsPays() {
  const [pays, changer, { gps, erreur }] = useSelectionPays();
  const d = pays.devise;
  // Prix public = prix catalogue ; avec un code parrain, le client paie le prix de la grille (les tarifs actuels)
  const catalogue = catalogueEnVigueur();
  const public_ = (x) => (catalogue ? prixCatalogue(x, d) : x);
  const resto = FORMULES.find((f) => f.id === 'restaurant');
  return (
    <>
      <ChoixPays pays={pays} changer={changer} gps={gps} erreur={erreur} />
      {FAMILLES.map((famille) => {
        const formules = FORMULES.filter((f) => f.famille === famille);
        return (
          <div key={famille}>
            <h2 style={{ fontSize: 24 }}>{tt(famille)}</h2>
            <div className="tableau-tarifs">
              <table>
                <thead><tr><th>{tr('Métier')}</th><th>{tr('Par mois')}</th>{catalogue && <th>{tr('Avec un code parrain')}</th>}</tr></thead>
                <tbody>
                  {formules.flatMap((f) => f.types.filter((t) => t !== 'autre').map((t) => (
                    <tr key={t}><td>{tt(typeCommerce(t).nom)}</td><td><b>{formatPrix(public_(f.prix[d]), d)}</b></td>{catalogue && <td><b className="vert-texte">{formatPrix(f.prix[d], d)}</b> <span className="tres-petit muet">(−{remiseCodeParrain(f, d)} %)</span></td>}</tr>
                  )))}
                </tbody>
              </table>
            </div>
            <p className="petit muet" style={{ marginTop: 8 }}>{tr('Poste supplémentaire : +{0} par mois.', [formatPrix(public_(formules[0].prixPoste[d]), d)])}</p>
          </div>
        );
      })}
      <div className="carte pile">
        <h3>{tr('Pour toutes les formules')}</h3>
        <ul className="liste-points">
          {catalogue && <li><b>{tr('Code parrain')}</b> {tr(': un commercial Kaislo vous a présenté l’application ? Saisissez son code à la création de votre compte et payez le prix de la colonne « Avec un code parrain ».')}</li>}
          <li><b>{tr('Paiement annuel : {0} mois offerts.', [REGLES_TARIFS.moisOffertsAnnuel])}</b></li>
          <li><b>{tr('Premier mois gratuit')}</b> {tr('et')} <b>{tr('installation offerte')}</b> {tr('pendant le lancement.')}</li>
          <li><b>{tr('Tarif fondateur')}</b> {tr(': remise de {0} % à vie pour les {1} premiers clients.', [REGLES_TARIFS.remiseFondateur, REGLES_TARIFS.placesFondateur])}</li>
          <li>{tr('Matériel à part : imprimante vendue ou louée (facultative).')}</li>
        </ul>
      </div>
      <p className="petit muet" data-exemple-postes>{tr('Exemple : un restaurant avec 2 postes paie {0} + {1} = {2} par mois.', [formatPrix(public_(resto.prix[d]), d), formatPrix(public_(resto.prixPoste[d]), d), formatPrix(public_(resto.prix[d]) + public_(resto.prixPoste[d]), d)])}</p>
    </>
  );
}
