<?php
// ------------------------------------------------------------
// PARRAINAGE ENTRE COMMERÇANTS
// Chaque commerce a un code de parrainage : « P » + son code à 6 chiffres (ex : P357459). Un commerçant qui le donne à un autre
// commerçant gagne avec lui :
//   - le nouveau commerce (le filleul) reçoit des jours d'essai en plus (JOURS_BONUS_FILLEUL) ;
//   - le commerce qui parraine (le parrain) reçoit des jours offerts (JOURS_BONUS_PARRAIN) quand le filleul fait son premier paiement.
// Règles contre les abus : le parrain et le filleul doivent avoir des gérants différents (numéros différents), une seule
// récompense par filleul, 12 récompenses au plus par commerce parrain. Le code d'un commercial Kaislo (lettres + chiffres,
// ex : AWA42) reste un autre système : remise sur l'abonnement et commission du commercial.
//
//   GET /api/parrainage   (gérant connecté)   { code, lien, joursFilleul, joursParrain, filleuls: [{ nom, creeLe, gagne }], recompenses, joursGagnes, maximum }
// ------------------------------------------------------------

// Jours offerts : pour changer le bonus, modifier ces deux nombres ET src/lib/donnees/parrainage.js (un test vérifie qu'ils sont identiques)
const JOURS_BONUS_FILLEUL = 15; // jours d'essai en plus pour le commerce parrainé
const JOURS_BONUS_PARRAIN = 15; // jours offerts au parrain quand le filleul fait son premier paiement
const RECOMPENSES_PARRAINAGE_MAX = 12;

function codeParrainageDuCommerce(array $c): string
{
    return 'P' . $c['code'];
}

// Le code saisi est-il un code de parrainage de commerce (P + 6 chiffres) ? Les codes de commerciaux n'ont jamais cette forme.
function estCodeParrainageCommerce(string $codePropre): bool
{
    return (bool) preg_match('/^P\d{6}$/', $codePropre);
}

// Commerce parrain correspondant au code saisi à l'inscription (ou erreur claire)
function commerceParCodeParrainage(string $codePropre): array
{
    $c = requete('SELECT * FROM commerces WHERE code = ?', [substr($codePropre, 1)])->fetch();
    if (!$c || $c['statut'] === 'suspendu') throw new ErreurApi('Code parrain inconnu : vérifiez-le, ou laissez la case vide');
    return $c;
}

// Numéros (clés) des gérants d'un commerce
function clesGerantsDuCommerce(string $commerceId): array
{
    return array_column(requete("SELECT cle_telephone FROM utilisateurs WHERE commerce_id = ? AND role = 'gerant'", [$commerceId])->fetchAll(), 'cle_telephone');
}

// Récompense du parrain, au premier paiement du filleul. Renvoie le parrain récompensé ou null.
function recompenserParrain(array $filleul): ?array
{
    if (empty($filleul['parrain_commerce_id']) || !empty($filleul['parrain_recompense_le'])) return null;
    $parrain = requete('SELECT * FROM commerces WHERE id = ?', [$filleul['parrain_commerce_id']])->fetch();
    if (!$parrain) return null;
    // Un gérant ne peut pas se parrainer lui-même avec un autre de ses commerces
    if (array_intersect(clesGerantsDuCommerce($parrain['id']), clesGerantsDuCommerce($filleul['id']))) return null;
    $dejaGagnes = (int) requete('SELECT COUNT(*) AS n FROM commerces WHERE parrain_commerce_id = ? AND parrain_recompense_le IS NOT NULL', [$parrain['id']])->fetch()['n'];
    if ($dejaGagnes >= RECOMPENSES_PARRAINAGE_MAX) return null;
    // Les jours offerts s'ajoutent à l'abonnement s'il en a un, sinon à l'essai ; un commerce suspendu reste suspendu
    if (!empty($parrain['periode_fin'])) {
        requete("UPDATE commerces SET jours_offerts = COALESCE(jours_offerts, 0) + ?, periode_fin = ?, statut = CASE WHEN statut = 'suspendu' THEN statut ELSE 'actif' END, modifie_le = ? WHERE id = ?", [JOURS_BONUS_PARRAIN, prolongerDate($parrain['periode_fin'], JOURS_BONUS_PARRAIN), maintenant(), $parrain['id']]);
    } else {
        requete("UPDATE commerces SET jours_offerts = COALESCE(jours_offerts, 0) + ?, essai_fin = ?, statut = CASE WHEN statut = 'suspendu' THEN statut ELSE 'essai' END, modifie_le = ? WHERE id = ?", [JOURS_BONUS_PARRAIN, prolongerDate($parrain['essai_fin'], JOURS_BONUS_PARRAIN), maintenant(), $parrain['id']]);
    }
    requete('UPDATE commerces SET parrain_recompense_le = ?, modifie_le = ? WHERE id = ?', [maintenant(), maintenant(), $filleul['id']]);
    journaliser($parrain['id'], null, 'parrainage-recompense', ['filleul' => $filleul['nom'], 'jours' => JOURS_BONUS_PARRAIN]);
    journaliser($filleul['id'], null, 'parrainage-premier-paiement', ['parrain' => $parrain['nom']]);
    return $parrain;
}

function routeParrainage(): never
{
    $u = utilisateurConnecte();
    if ($u['role'] !== 'gerant') throw new ErreurApi('Le parrainage est réservé au gérant', 403);
    $c = requete('SELECT * FROM commerces WHERE id = ?', [$u['commerce_id']])->fetch();
    $code = codeParrainageDuCommerce($c);
    $filleuls = requete('SELECT nom, cree_le, parrain_recompense_le FROM commerces WHERE parrain_commerce_id = ? ORDER BY cree_le DESC', [$c['id']])->fetchAll();
    $liste = array_map(fn ($f) => ['nom' => $f['nom'], 'creeLe' => $f['cree_le'], 'gagne' => !empty($f['parrain_recompense_le'])], $filleuls);
    $gagnes = count(array_filter($liste, fn ($f) => $f['gagne']));
    repondre([
        'ok' => true, 'code' => $code, 'lien' => 'https://' . (domaineSite() ?: 'kaislo.com') . '/app/?ref=' . $code,
        'joursFilleul' => JOURS_BONUS_FILLEUL, 'joursParrain' => JOURS_BONUS_PARRAIN, 'filleuls' => $liste,
        'recompenses' => $gagnes, 'joursGagnes' => $gagnes * JOURS_BONUS_PARRAIN, 'maximum' => RECOMPENSES_PARRAINAGE_MAX,
    ]);
}
