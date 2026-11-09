<?php
// ------------------------------------------------------------
// ACTIVATION PROVISOIRE DE L'ABONNEMENT
//
// Quand l'essai ou la période payée est terminé, le gérant clique sur « Activer l'abonnement » : l'abonnement est activé tout de suite pour quelques jours
// (réglage « jours pour payer », 5 par défaut, Espace Kaislo → Tarifs) ; si le paiement n'est pas enregistré avant la fin, il se désactive tout seul
// (la fin de période passe : pas de tâche planifiée). Une fois, puis seulement après un paiement : un nouveau droit n'existe qu'après un paiement
// enregistré depuis la dernière activation.
//
// Abonnement terminé (abonnementTermine) = fonctions limitées pour inciter à payer, la caisse et les données restent toujours accessibles :
//   · boutique en ligne fermée et commandes en ligne non validables ;  · pas de résumé du soir ni de notifications ;
//   · pas de nouveaux vendeurs, postes ni articles ;  · pas de rapports ni d'exports Excel/PDF (côté application, voir src/lib/donnees/abonnement.js).
// La synchronisation entre appareils se ferme 7 jours après (abonnementExpire, lib/donnees.php).
//
//   POST /api/abonnement/activer      (gérant)  active l'abonnement pour quelques jours
// ------------------------------------------------------------

/** L'essai ou la période payée est terminé (aujourd'hui, sans délai de grâce) ? Un commerce suspendu n'est pas concerné (il a son propre message). */
function abonnementTermine(array $commerce): bool
{
    if (($commerce['statut'] ?? '') === 'suspendu') return false;
    $fin = ($commerce['statut'] ?? '') === 'actif' ? ($commerce['periode_fin'] ?? null) : ($commerce['essai_fin'] ?? null);
    return $fin !== null && $fin !== '' && $fin < maintenant();
}

/** Nombre de jours laissés pour payer après l'activation (1 à 15). */
function joursPourPayer(): int
{
    return max(1, min(15, (int) (reglesTarifs()['joursActivationProvisoire'] ?? 5)));
}

/** Le commerce a-t-il droit à une activation provisoire ? Renvoie null, ou la raison du refus. */
function raisonRefusActivation(array $c): ?string
{
    if (($c['statut'] ?? '') === 'suspendu') return 'Ce commerce est suspendu. Contactez Kaislo.';
    if (!abonnementTermine($c)) {
        if (($c['statut'] ?? '') === 'actif' && !empty($c['periode_provisoire'])) return 'Votre abonnement est déjà activé jusqu’au ' . substr((string) $c['periode_fin'], 0, 10) . ' : payez avant cette date pour qu’il continue.';
        if (($c['statut'] ?? '') === 'actif') return 'Votre abonnement est déjà actif.';
        return 'Votre essai gratuit est encore en cours : vous pouvez déjà payer pour le prolonger.';
    }
    // Un seul droit tant qu'aucun paiement n'a été enregistré depuis la dernière activation
    $derniere = $c['activation_provisoire_le'] ?? null;
    if ($derniere && !requete('SELECT 1 FROM paiements WHERE commerce_id = ? AND date > ?', [$c['id'], $derniere])->fetch()) {
        return 'Vous avez déjà utilisé votre activation provisoire. Payez votre abonnement pour continuer : paiement mobile ou virement.';
    }
    return null;
}

function routeActiverAbonnement(): never
{
    $u = utilisateurConnecte();
    if ($u['role'] !== 'gerant') throw new ErreurApi('Réservé au gérant', 403);
    $c = requete('SELECT * FROM commerces WHERE id = ?', [$u['commerce_id']])->fetch();
    if (!$c) throw new ErreurApi('Commerce introuvable', 404);
    $raison = raisonRefusActivation($c);
    if ($raison !== null) throw new ErreurApi($raison, ($c['statut'] ?? '') === 'suspendu' ? 403 : 409);
    $jours = joursPourPayer();
    $fin = maintenant($jours * 86400);
    $date = maintenant();
    // Le « WHERE » reprend la condition : deux clics en même temps n'activent qu'une fois
    $n = requete("UPDATE commerces SET statut = 'actif', periode_fin = ?, periode_provisoire = 1, activation_provisoire_le = ?, modifie_le = ? WHERE id = ? AND (activation_provisoire_le IS NULL OR activation_provisoire_le = ?)",
        [$fin, $date, $date, $c['id'], $c['activation_provisoire_le'] ?? null])->rowCount();
    if ($n === 0 && $c['activation_provisoire_le']) {
        // Le droit vient d'une activation précédente suivie d'un paiement : on réécrit sans la condition sur l'ancienne date
        requete("UPDATE commerces SET statut = 'actif', periode_fin = ?, periode_provisoire = 1, activation_provisoire_le = ?, modifie_le = ? WHERE id = ?", [$fin, $date, $date, $c['id']]);
    }
    journaliser($c['id'], $u['id'], 'activation-provisoire', ['jours' => $jours, 'jusqua' => $fin]);
    alerterEquipe('activation', 'Activation provisoire : ' . $c['nom'], $jours . ' jours pour payer',
        'Kaislo — activation provisoire : ' . $c['nom'],
        "{$u['nom']} ({$u['telephone']}) a activé l'abonnement de « {$c['nom']} » (code {$c['code']}, {$c['pays']}).\n\nIl a $jours jours pour payer, jusqu'au " . substr($fin, 0, 10) . ".\nSans paiement enregistré avant cette date, l'abonnement se désactive tout seul.\n\nFiche : " . lienAdmin());
    $c = requete('SELECT * FROM commerces WHERE id = ?', [$c['id']])->fetch();
    repondre(['ok' => true, 'jours' => $jours, 'commerce' => versCommerce($c)]);
}

// Abonnement terminé et non payé : certaines actions utiles sont suspendues jusqu'au paiement (la caisse reste utilisable)
function exigerAbonnementPaye(string $commerceId, string $message): void
{
    $c = requete('SELECT * FROM commerces WHERE id = ?', [$commerceId])->fetch();
    if ($c && abonnementTermine($c)) throw new ErreurApi($message, 403);
}
