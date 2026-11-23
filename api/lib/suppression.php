<?php
// ------------------------------------------------------------
// SUPPRESSION DU COMPTE (demandée par le gérant, dans l'application)
//
// Le gérant demande la suppression de son commerce (code PIN redemandé). Elle est effacée pour de bon 30 jours plus tard : pendant ce délai, il peut
// changer d'avis (« Annuler la suppression »). Une alerte part à l'équipe Kaislo. Le planificateur horaire (GET /api/cron/notifications) efface
// ensuite le commerce : articles, ventes, clients, personnes et leurs codes PIN, appareils, messages, boutique, sauvegardes, journaux.
// Ce que la loi oblige à garder reste : paiements d'abonnement, factures, avoirs et commissions (la ligne du commerce, rendue anonyme, les relie).
//
//   POST /api/compte/supprimer          { pin }   demande la suppression (gérant)
//   POST /api/compte/supprimer/annuler            annule la demande (gérant)
// ------------------------------------------------------------

const SUPPRESSION_DELAI_JOURS = 30;
const TABLES_CONSERVEES = ['commerces', 'paiements', 'factures', 'avoirs', 'commissions']; // comptabilité : durée imposée par la loi

/** Date prévue de l'effacement définitif (ISO), ou null s'il n'y a pas de demande. */
function suppressionPrevueLe(array $commerce): ?string
{
    $d = $commerce['suppression_demandee_le'] ?? null;
    if (!$d || !empty($commerce['supprime_le'])) return null;
    return gmdate('Y-m-d\TH:i:s\Z', strtotime($d) + SUPPRESSION_DELAI_JOURS * 86400);
}

function routeCompteSupprimer(): never
{
    $moi = utilisateurConnecte();
    if ($moi['role'] !== 'gerant') throw new ErreurApi('Seul le gérant peut demander la suppression du compte', 403);
    $pin = (string) (entree()['pin'] ?? '');
    $cle = 'gerant:' . $moi['commerce_id'];
    verifierBlocage($cle);
    if (!preg_match('/^\d{4}$/', $pin) || !password_verify($pin, $moi['pin_hash'])) {
        if (noterEchec($cle)) throw new ErreurApi('Trop d’essais : réessayez dans ' . MINUTES_BLOCAGE . ' minutes.', 429);
        throw new ErreurApi('Code PIN incorrect', 401);
    }
    effacerEchecs($cle);
    $c = requete('SELECT * FROM commerces WHERE id = ?', [$moi['commerce_id']])->fetch();
    if (!$c) throw new ErreurApi('Commerce introuvable', 404);
    if (empty($c['suppression_demandee_le'])) {
        requete('UPDATE commerces SET suppression_demandee_le = ?, modifie_le = ? WHERE id = ?', [maintenant(), maintenant(), $c['id']]);
        journaliser($c['id'], $moi['id'], 'suppression-demandee', []);
        alerterEquipe('suppression', 'Suppression demandée : ' . $c['nom'], 'Effacement prévu dans ' . SUPPRESSION_DELAI_JOURS . ' jours',
            'Kaislo — suppression de compte demandée : ' . $c['nom'],
            "{$moi['nom']} ({$moi['telephone']}) a demandé la suppression du commerce « {$c['nom']} » (code {$c['code']}, {$c['pays']}).\n\nLes données seront effacées dans " . SUPPRESSION_DELAI_JOURS . " jours ; le gérant peut annuler d'ici là. Les factures et paiements sont conservés (obligation légale).\n\nFiche : " . lienAdmin());
        $c = requete('SELECT * FROM commerces WHERE id = ?', [$c['id']])->fetch();
    }
    repondre(['ok' => true, 'suppressionPrevueLe' => suppressionPrevueLe($c)]);
}

function routeCompteSupprimerAnnuler(): never
{
    $moi = utilisateurConnecte();
    if ($moi['role'] !== 'gerant') throw new ErreurApi('Seul le gérant peut annuler la suppression du compte', 403);
    requete('UPDATE commerces SET suppression_demandee_le = NULL, modifie_le = ? WHERE id = ? AND supprime_le IS NULL', [maintenant(), $moi['commerce_id']]);
    journaliser($moi['commerce_id'], $moi['id'], 'suppression-annulee', []);
    repondre(['ok' => true, 'suppressionPrevueLe' => null]);
}

/** Efface les données d'un commerce (hors comptabilité) et rend sa ligne anonyme. */
function purgerCommerce(string $id): void
{
    $c = requete('SELECT * FROM commerces WHERE id = ?', [$id])->fetch();
    if (!$c || !empty($c['supprime_le'])) return;
    $pdo = base();
    $pdo->beginTransaction();
    try {
        requete('DELETE FROM push_messages WHERE abonnement_id IN (SELECT id FROM abonnements_push WHERE commerce_id = ?)', [$id]);
        requete('DELETE FROM chats_messages WHERE commerce_id = ?', [$id]);
        foreach (STRUCTURE as $table => $def) {
            if (in_array($table, TABLES_CONSERVEES, true) || $table === 'chats_messages') continue;
            if (!array_key_exists('commerce_id', $def['colonnes'])) continue;
            requete("DELETE FROM $table WHERE commerce_id = ?", [$id]);
        }
        requete("UPDATE commerces SET nom = 'Commerce supprimé', telephone = '', ville = '', quartier = '', statut = 'suspendu', supprime_le = ?, modifie_le = ? WHERE id = ?", [maintenant(), maintenant(), $id]);
        journaliser(null, null, 'compte-supprime', ['commerce' => $id, 'code' => $c['code']]);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

/** Efface les commerces dont le délai de 30 jours est passé (appelé par le planificateur). Renvoie leur nombre. */
function purgerCommercesAEffacer(): int
{
    $n = 0;
    foreach (requete('SELECT id FROM commerces WHERE suppression_demandee_le IS NOT NULL AND supprime_le IS NULL AND suppression_demandee_le < ?', [maintenant(-SUPPRESSION_DELAI_JOURS * 86400)])->fetchAll() as $l) {
        try { purgerCommerce($l['id']); $n++; } catch (Throwable $e) { error_log('[Kaislo suppression] ' . $l['id'] . ' : ' . $e->getMessage()); }
    }
    return $n;
}
