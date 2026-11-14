'use client';
// ------------------------------------------------------------
// ABONNEMENT DU COMMERCE (Réglages → Profil) : formule du métier, postes,
// prix au mois et à l'année (2 mois offerts), tarif fondateur.
// Commerce en ligne : tarif calculé par le serveur. Démo / sans serveur : grille par défaut.
// ------------------------------------------------------------
import { useState } from 'react';
import { useKaislo } from '@/store/kaislo';
import { etatAbonnement, LIBELLES_STATUT, DUREE_ESSAI_JOURS } from '@/lib/donnees/abonnement';
import { FORMULES, formuleDuType, prixAbonnement, REGLES_TARIFS } from '@/lib/donnees/tarifs';
import { postesDe } from '@/lib/donnees/postes';
import { formatDate } from '@/lib/utils/format';
import { ListeFactures } from '../feuilles/FeuilleFactures';
import { estServeur } from '@/lib/donnees/synchro';
import { Icone } from '@/components/ui';
import { tr } from '@/lib/i18n';

// Tarif du commerce : { nom, postes, parMois, annuel, prixPoste, fondateur }
export function tarifDuCommerce(d) {
  if (d?.commerce?.tarif) return d.commerce.tarif;
  if (!d?.commerce) return null;
  const formule = FORMULES.find((f) => f.id === d.commerce.abonnement?.offre) || formuleDuType(d.commerce.type);
  const postes = postesDe(d).length;
  const devise = d.commerce.devise;
  const euro = devise !== 'EUR' && formule.prix.EUR > 0
    ? { parMois: prixAbonnement({ formule, devise: 'EUR', postes }).parMois, annuel: prixAbonnement({ formule, devise: 'EUR', postes, mois: 12 }).total }
    : null;
  return {
    nom: tr(formule.nom), postes, fondateur: false, devise,
    parMois: prixAbonnement({ formule, devise, postes }).parMois,
    annuel: prixAbonnement({ formule, devise, postes, mois: 12 }).total,
    prixPoste: formule.prixPoste[devise] ?? 0,
    ...(euro ? { euro } : {}),
  };
}

export default function AbonnementCommerce() {
  const s = useKaislo();
  const [attente, setAttente] = useState(false);
  const ab = s.d.commerce.abonnement;
  const etat = etatAbonnement(ab);
  const tarif = tarifDuCommerce(s.d);
  const gerant = s.estGerant() && estServeur(s.d) && !s.estDemoActuel();
  const signale = !!ab?.paiementDeclareLe;
  const expire = etat.statut === 'expire';
  const provisoire = !!ab?.provisoire;
  const classe = { essai: 'safran', actif: '', expire: 'rouge', suspendu: 'rouge' }[etat.statut];
  // Une seule action principale, selon l'état : activer (essai ou terminé), payer (délai en cours ou dépassé), payer à l'avance (abonnement en cours)
  const peutActiver = etat.statut === 'essai' || (expire && !provisoire);
  const activer = async () => {
    if (etat.statut === 'essai') return s.ouvrir('virement'); // l'essai est encore en cours : on paie directement, sans délai provisoire
    setAttente(true);
    const err = await s.activerAbonnement();
    setAttente(false);
    if (err) s.message(err, 'erreur');
  };
  let action = null;
  if (gerant && !signale && etat.statut !== 'suspendu') {
    if (peutActiver) action = [tr('Activer mon abonnement'), activer, attente];
    else if (provisoire) action = [tr('Payer maintenant'), () => s.ouvrir('virement'), false];
  }
  const parcours = etat.statut === 'essai' && etat.joursRestants != null ? Math.max(0, Math.min(100, (etat.joursRestants / DUREE_ESSAI_JOURS) * 100)) : null;
  return (
    <div className="pile">
      <div className="carte pile abo-etat">
        <div className="ligne espace">
          <div>
            <p className="petit muet">{tarif?.nom || 'Kaislo'}</p>
            <h3 style={{ marginTop: 2 }}>
              {etat.statut === 'essai' && tr('Essai gratuit : encore {0} jour{1}', [etat.joursRestants, etat.joursRestants > 1 ? 's' : ''])}
              {etat.statut === 'actif' && !provisoire && tr('Abonnement en cours')}
              {etat.statut === 'actif' && provisoire && tr('Abonnement activé, à payer')}
              {expire && tr('Abonnement terminé')}
              {etat.statut === 'suspendu' && tr('Abonnement suspendu')}
            </h3>
            {etat.fin && (
              <p className="petit muet">
                {expire ? tr('Terminé le ') : etat.statut === 'essai' ? tr('Essai gratuit jusqu’au ') : provisoire ? tr('À payer avant le ') : tr('Prochaine échéance le ')}
                {formatDate(etat.fin)}{etat.joursRestants > 0 && etat.statut !== 'essai' ? ' (' + etat.joursRestants + ' j)' : ''}
              </p>
            )}
          </div>
          <span className={`badge ${classe}`}>{tr(LIBELLES_STATUT[etat.statut])}</span>
        </div>
        {parcours !== null && <div className="jauge" role="img" aria-label={tr('Jours d’essai restants')}><div style={{ width: parcours + '%' }} /></div>}
        {signale && <p className="astuce petit">{tr('Paiement signalé le {0} : l’équipe Kaislo le vérifie. Votre abonnement est prolongé dès sa réception.', [formatDate(ab.paiementDeclareLe)])}</p>}
        {!signale && provisoire && etat.statut !== 'suspendu' && (
          <p className={expire ? 'alerte petit' : 'astuce petit'}>
            {expire
              ? tr('Abonnement non payé : rapports, exports, nouveaux articles et vendeurs et validation des commandes sont suspendus jusqu’au paiement. La caisse reste utilisable.')
              : tr('Activation provisoire : payez avant le {0}, sinon certaines fonctions seront suspendues.', [formatDate(etat.fin)])}
          </p>
        )}
        {!signale && expire && !provisoire && <p className="alerte petit">{tr('Votre essai est terminé. Activez votre abonnement : vous avez quelques jours pour payer, la caisse reste utilisable.')}</p>}
        {action && <button className="btn grand bloc" disabled={action[2]} onClick={action[1]}>{action[0]}</button>}
        {gerant && !action && !signale && etat.statut === 'actif' && !provisoire && (
          <button className="btn secondaire bloc" onClick={() => s.ouvrir('virement')}><Icone nom="billet" /> {tr('Payer à l’avance')}</button>
        )}
      </div>

      {tarif && (
        <div className="carte pile abo-prix">
          <p className="petit muet">{tr('Votre prix')}</p>
          <div className="grille-2">
            <div>
              <b className="abo-montant">{s.prix(tarif.parMois)}</b>
              <p className="tres-petit muet">{tr('par mois')}</p>
              {tarif.euro && <p className="tres-petit muet">{tr('ou {0} € en euros (virement)', [Math.round(tarif.euro.parMois)])}</p>}
            </div>
            <div>
              <b className="abo-montant">{s.prix(tarif.annuel)}</b>
              <p className="tres-petit muet">{tr('par an, {0} mois offerts', [REGLES_TARIFS.moisOffertsAnnuel])}</p>
              {tarif.euro && <p className="tres-petit muet">{tr('ou {0} € en euros (virement)', [Math.round(tarif.euro.annuel)])}</p>}
            </div>
          </div>
          <p className="tres-petit muet">{tr('{0} poste{1}{2}', [tarif.postes, tarif.postes > 1 ? 's' : '', tarif.postes > 1 ? ' (1 inclus + ' + (tarif.postes - 1) + ' × ' + s.prix(tarif.prixPoste) + ')' : ' inclus, 5 vendeurs'])}</p>
          {tarif.parrain && tarif.parMoisCatalogue > tarif.parMois && (
            <p className="info-verte petit">{tr('Code parrain : remise de {0} % sur l’abonnement (prix catalogue : {1} par mois).', [Math.round((1 - tarif.parMois / tarif.parMoisCatalogue) * 100), s.prix(tarif.parMoisCatalogue)])}</p>
          )}
          {tarif.fondateur && <p className="info-verte petit">{tr('Tarif fondateur : remise à vie déjà appliquée. Merci de faire partie des premiers !')}</p>}
          <p className="tres-petit muet">{tr('Paiement par Orange Money, Wave, MTN MoMo (selon votre pays) ou virement. Un reçu et une facture sont envoyés à chaque paiement.')}</p>
        </div>
      )}

      {(estServeur(s.d) || s.estDemoActuel()) && s.estGerant() && (
        <button className="btn secondaire bloc" onClick={() => s.ouvrir('commerces')}>{(s.estDemoActuel() ? s.commercesDemo.length + 1 : s.commercesGerant().length) > 1 ? tr('Mes {0} commerces et le total à payer', [s.estDemoActuel() ? s.commercesDemo.length + 1 : s.commercesGerant().length]) : tr('Ajouter un autre commerce (autre activité)')}</button>
      )}
      <p className="tres-petit muet">{tr('Une question sur votre abonnement ? Bouton « Discuter avec nous » ou écran Aide.')}</p>
      {gerant && <MesFactures />}
    </div>
  );
}

// Factures d'abonnement émises par Kaislo (une par paiement), en PDF
function MesFactures() {
  return (
    <div className="carte pile">
      <b>{tr('Mes factures')}</b>
      <ListeFactures />
    </div>
  );
}
