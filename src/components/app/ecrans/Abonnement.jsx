'use client';
// ------------------------------------------------------------
// ABONNEMENT DU COMMERCE (Réglages → Profil) : formule du métier, postes,
// prix au mois et à l'année (2 mois offerts), tarif fondateur.
// Commerce en ligne : tarif calculé par le serveur. Démo / sans serveur : grille par défaut.
// ------------------------------------------------------------
import { useKaislo } from '@/store/kaislo';
import { etatAbonnement, LIBELLES_STATUT } from '@/lib/donnees/abonnement';
import { FORMULES, formuleDuType, prixAbonnement, REGLES_TARIFS } from '@/lib/donnees/tarifs';
import { postesDe } from '@/lib/donnees/postes';
import { formatDate } from '@/lib/utils/format';
import { estServeur } from '@/lib/donnees/synchro';
import { tr } from '@/lib/i18n';

// Tarif du commerce : { nom, postes, parMois, annuel, prixPoste, fondateur }
export function tarifDuCommerce(d) {
  if (d?.commerce?.tarif) return d.commerce.tarif;
  if (!d?.commerce) return null;
  const formule = FORMULES.find((f) => f.id === d.commerce.abonnement?.offre) || formuleDuType(d.commerce.type);
  const postes = postesDe(d).length;
  const devise = d.commerce.devise;
  return {
    nom: tr(formule.nom), postes, fondateur: false, devise,
    parMois: prixAbonnement({ formule, devise, postes }).parMois,
    annuel: prixAbonnement({ formule, devise, postes, mois: 12 }).total,
    prixPoste: formule.prixPoste[devise] ?? 0,
  };
}

export default function AbonnementCommerce() {
  const s = useKaislo();
  const ab = s.d.commerce.abonnement;
  const etat = etatAbonnement(ab);
  const tarif = tarifDuCommerce(s.d);
  const classe = { essai: 'safran', actif: '', expire: 'rouge', suspendu: 'rouge' }[etat.statut];
  return (
    <div className="carte pile">
      <div className="ligne espace">
        <div>
          <p className="petit muet">{tr('Abonnement')}</p>
          <b>{tarif?.nom || 'Kaislo'}</b>
          {etat.fin && (
            <p className="tres-petit muet">
              {etat.statut === 'expire' ? tr('Terminé le ') : etat.statut === 'essai' ? tr('Essai gratuit jusqu’au ') : tr('Prochaine échéance le ')}
              {formatDate(etat.fin)}{etat.joursRestants > 0 ? ' (' + etat.joursRestants + ' j)' : ''}
            </p>
          )}
        </div>
        <span className={`badge ${classe}`}>{tr(LIBELLES_STATUT[etat.statut])}</span>
      </div>
      {tarif && (
        <div className="grille-2">
          <div>
            <p className="tres-petit muet">{tr('Par mois')}</p>
            <b>{s.prix(tarif.parMois)}</b>
            <p className="tres-petit muet">{tr('{0} poste{1}{2}', [tarif.postes, tarif.postes > 1 ? 's' : '', tarif.postes > 1 ? ' (1 inclus + ' + (tarif.postes - 1) + ' × ' + s.prix(tarif.prixPoste) + ')' : ' inclus, 5 vendeurs'])}</p>
          </div>
          <div>
            <p className="tres-petit muet">{tr('À l’année')}</p>
            <b>{s.prix(tarif.annuel)}</b>
            <p className="tres-petit muet">{tr('{0} mois offerts', [REGLES_TARIFS.moisOffertsAnnuel])}</p>
          </div>
        </div>
      )}
      {tarif?.parrain && tarif.parMoisCatalogue > tarif.parMois && (
        <p className="info-verte petit">{tr('Code parrain : remise de {0} % sur l’abonnement (prix catalogue : {1} par mois).', [Math.round((1 - tarif.parMois / tarif.parMoisCatalogue) * 100), s.prix(tarif.parMoisCatalogue)])}</p>
      )}
      {tarif?.fondateur && <p className="info-verte petit">{tr('Tarif fondateur : remise à vie déjà appliquée. Merci de faire partie des premiers !')}</p>}
      {estServeur(s.d) && s.estGerant() && (
        <button className="btn secondaire bloc" onClick={() => s.ouvrir('commerces')}>{s.commercesGerant().length > 1 ? tr('Mes {0} commerces et le total à payer', [s.commercesGerant().length]) : tr('Ajouter un autre commerce (autre activité)')}</button>
      )}
      <p className="tres-petit muet">{tr('Pour payer ou changer de formule : bouton « Discuter avec nous » ou écran Aide. Paiement par mobile money, virement ou espèces.')}</p>
    </div>
  );
}
