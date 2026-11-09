<?php
// ------------------------------------------------------------
// SAUVEGARDES SUR LE SERVEUR (commerces en ligne)
//
// Les données d'un commerce en ligne sont déjà sur le serveur, mais « la modification la plus récente gagne » : une suppression ou un
// mauvais import se propage à tous les appareils. Le serveur garde donc des copies datées de toutes les données du commerce
// (articles, ventes, clients, dépenses, stock, achats, réglages…, sans les photos) pour revenir en arrière :
//   - une copie automatique par jour, prise avant la première écriture de la journée (14 jours gardés) ;
//   - « Sauvegarder maintenant » (gérant) ; une copie « avant restauration » à chaque restauration (la dernière gardée).
// Restaurer remet les données du commerce comme dans la copie : ce qui n'y était pas est supprimé, tout est renvoyé aux appareils à la
// prochaine synchronisation. Le code PIN du gérant est redemandé. L'abonnement, les personnes et leurs codes ne changent pas.
//
//   GET  /api/sauvegardes                                  la liste des copies (gérant)
//   POST /api/sauvegardes           { action: 'creer' }    copie immédiate
//   POST /api/sauvegardes/restaurer { id, pin }            restauration
// ------------------------------------------------------------

const SAUVEGARDES_JOURS = 14;        // copies automatiques gardées
const SAUVEGARDES_MANUELLES = 5;     // copies manuelles gardées
const SAUVEGARDE_TAILLE_MAX = 12000000; // octets (copie compressée) : au-delà, pas de copie (limite de la colonne)

/** Les éléments à sauvegarder : tout sauf les photos (elles ne changent pas avec une restauration des données). */
function typesSauvegardes(): array
{
    return array_values(array_filter(TYPES_ELEMENTS, fn ($t) => $t !== 'images'));
}

/** Prend une copie des données du commerce. raison : 'auto' | 'manuelle' | 'avant-restauration'. Renvoie la ligne résumée, ou null s'il n'y a rien à copier. */
function creerSauvegarde(string $commerceId, string $raison, string $creePar = ''): ?array
{
    $types = typesSauvegardes();
    $marques = implode(',', array_fill(0, count($types), '?'));
    $lignes = requete("SELECT type, id, contenu, modifie_le FROM elements WHERE commerce_id = ? AND supprime = 0 AND type IN ($marques)", [$commerceId, ...$types])->fetchAll(PDO::FETCH_NUM);
    if (!$lignes) return null;
    $compte = [];
    foreach ($lignes as $l) $compte[$l[0]] = ($compte[$l[0]] ?? 0) + 1;
    $octets = gzencode(json_encode($lignes, JSON_UNESCAPED_UNICODE), 6);
    if ($octets === false || strlen($octets) > SAUVEGARDE_TAILLE_MAX) {
        error_log("[Kaislo sauvegardes] copie trop grosse pour $commerceId");
        return null;
    }
    $id = nouvelId('sv');
    $date = maintenant();
    requete('INSERT INTO sauvegardes (id, commerce_id, jour, raison, cree_le, cree_par, nb_elements, taille, details, contenu) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        $id, $commerceId, substr($date, 0, 10), $raison, $date, $creePar, count($lignes), strlen($octets), json_encode($compte), base64_encode($octets),
    ]);
    nettoyerSauvegardes($commerceId);
    return requete('SELECT * FROM sauvegardes WHERE id = ?', [$id])->fetch() ?: null;
}

/** Retire les copies trop anciennes ou en trop. */
function nettoyerSauvegardes(string $commerceId): void
{
    requete("DELETE FROM sauvegardes WHERE commerce_id = ? AND raison = 'auto' AND cree_le < ?", [$commerceId, maintenant(-SAUVEGARDES_JOURS * 86400)]);
    foreach (['manuelle' => SAUVEGARDES_MANUELLES, 'avant-restauration' => 1] as $raison => $max) {
        $ids = requete('SELECT id FROM sauvegardes WHERE commerce_id = ? AND raison = ? ORDER BY cree_le DESC', [$commerceId, $raison])->fetchAll(PDO::FETCH_COLUMN);
        foreach (array_slice($ids, $max) as $id) requete('DELETE FROM sauvegardes WHERE id = ?', [$id]);
    }
}

/** Copie automatique du jour (avant la première écriture de la journée) : jamais d'erreur visible, une écriture ne doit pas échouer à cause d'elle. */
function sauvegardeDuJour(string $commerceId): void
{
    try {
        $deja = requete("SELECT 1 FROM sauvegardes WHERE commerce_id = ? AND raison = 'auto' AND jour = ?", [$commerceId, gmdate('Y-m-d')])->fetch();
        if (!$deja) creerSauvegarde($commerceId, 'auto');
    } catch (Throwable $e) {
        error_log('[Kaislo sauvegardes] ' . $e->getMessage());
    }
}

function versSauvegarde(array $s): array
{
    return ['id' => $s['id'], 'jour' => $s['jour'], 'raison' => $s['raison'], 'creeLe' => $s['cree_le'], 'creePar' => $s['cree_par'], 'nbElements' => (int) $s['nb_elements'], 'taille' => (int) $s['taille'], 'details' => json_decode($s['details'] ?? '{}', true) ?: []];
}

function gerantSauvegardes(): array
{
    $u = utilisateurConnecte();
    if ($u['role'] !== 'gerant') throw new ErreurApi('Réservé au gérant', 403);
    return $u;
}

function routeSauvegardesLire(): never
{
    $u = gerantSauvegardes();
    $lignes = requete('SELECT id, jour, raison, cree_le, cree_par, nb_elements, taille, details FROM sauvegardes WHERE commerce_id = ? ORDER BY cree_le DESC', [$u['commerce_id']])->fetchAll();
    repondre(['ok' => true, 'sauvegardes' => array_map('versSauvegarde', $lignes), 'joursGardes' => SAUVEGARDES_JOURS]);
}

function routeSauvegardesCreer(): never
{
    $u = gerantSauvegardes();
    if (((string) (entree()['action'] ?? 'creer')) !== 'creer') throw new ErreurApi('Action inconnue');
    // Pas plus d'une copie manuelle par minute
    if (requete("SELECT 1 FROM sauvegardes WHERE commerce_id = ? AND raison = 'manuelle' AND cree_le > ?", [$u['commerce_id'], maintenant(-60)])->fetch()) throw new ErreurApi('Une copie vient d’être faite : réessayez dans une minute', 429);
    $s = creerSauvegarde($u['commerce_id'], 'manuelle', (string) $u['nom']);
    if (!$s) throw new ErreurApi('Rien à sauvegarder pour l’instant', 400);
    repondre(['ok' => true, 'sauvegarde' => versSauvegarde($s)], 201);
}

function routeSauvegardesRestaurer(): never
{
    $u = gerantSauvegardes();
    $e = entree();
    // Restaurer remplace les données de tous les appareils : on redemande le code PIN du gérant
    $cleTel = 'tel:' . $u['cle_telephone'];
    verifierBlocage($cleTel);
    $pin = (string) ($e['pin'] ?? '');
    if (!preg_match('/^\d{4}$/', $pin)) throw new ErreurApi('Entrez votre code PIN à 4 chiffres pour confirmer');
    if (!password_verify($pin, (string) $u['pin_hash'])) {
        if (noterEchec($cleTel)) throw new ErreurApi('Code incorrect. Trop d’essais : réessayez dans ' . MINUTES_BLOCAGE . ' minutes.', 429);
        throw new ErreurApi('Code PIN incorrect', 401);
    }
    effacerEchecs($cleTel);
    $commerce = requete('SELECT statut, essai_fin, periode_fin FROM commerces WHERE id = ?', [$u['commerce_id']])->fetch();
    if (($commerce['statut'] ?? '') === 'suspendu') throw new ErreurApi('Ce commerce est suspendu. Contactez Kaislo.', 403);
    $copie = requete('SELECT * FROM sauvegardes WHERE id = ? AND commerce_id = ?', [(string) ($e['id'] ?? ''), $u['commerce_id']])->fetch();
    if (!$copie) throw new ErreurApi('Copie introuvable', 404);
    $lignes = json_decode((string) gzdecode((string) base64_decode($copie['contenu'], true)), true);
    if (!is_array($lignes)) throw new ErreurApi('Cette copie est abîmée', 500);
    // L'état actuel est mis de côté d'abord : on peut revenir en arrière
    creerSauvegarde($u['commerce_id'], 'avant-restauration', (string) $u['nom']);
    $stats = restaurerElements($u['commerce_id'], $lignes);
    journaliser($u['commerce_id'], $u['id'], 'sauvegarde-restauree', ['copie' => $copie['id'], 'jour' => $copie['jour'], 'raison' => $copie['raison']] + $stats);
    repondre(['ok' => true, 'restaures' => $stats['restaures'], 'supprimes' => $stats['supprimes']]);
}

/**
 * Remet les éléments du commerce comme dans la copie ($lignes : [type, id, contenu JSON, modifie_le]) : ceux qui n'y sont pas sont supprimés,
 * les autres écrits avec la date du jour (la restauration l'emporte sur les modifications plus anciennes des appareils) et renvoyés aux appareils.
 */
function restaurerElements(string $commerceId, array $lignes): array
{
    $types = typesSauvegardes();
    $dansCopie = [];
    foreach ($lignes as $l) if (in_array($l[0], $types, true)) $dansCopie[$l[0] . "\0" . $l[1]] = $l;
    $marques = implode(',', array_fill(0, count($types), '?'));
    $actuels = [];
    foreach (requete("SELECT type, id, supprime FROM elements WHERE commerce_id = ? AND type IN ($marques)", [$commerceId, ...$types])->fetchAll() as $a) $actuels[$a['type'] . "\0" . $a['id']] = (int) $a['supprime'];
    $pdo = base();
    $pdo->beginTransaction();
    try {
        $maintenant = maintenant();
        $supprimes = 0; $restaures = 0;
        foreach ($actuels as $cle => $supprime) {
            if ($supprime === 0 && !isset($dansCopie[$cle])) {
                [$type, $id] = explode("\0", $cle);
                requete("UPDATE elements SET contenu = '{}', modifie_le = ?, supprime = 1, recu_le = ? WHERE commerce_id = ? AND type = ? AND id = ?", [$maintenant, maintenantPrecis(), $commerceId, $type, $id]);
                $supprimes++;
            }
        }
        foreach ($dansCopie as $cle => $l) {
            [$type, $id, $contenu] = [$l[0], $l[1], $l[2]];
            if (array_key_exists($cle, $actuels)) requete('UPDATE elements SET contenu = ?, modifie_le = ?, supprime = 0, recu_le = ? WHERE commerce_id = ? AND type = ? AND id = ?', [$contenu, $maintenant, maintenantPrecis(), $commerceId, $type, $id]);
            else requete('INSERT INTO elements (contenu, modifie_le, supprime, recu_le, commerce_id, type, id) VALUES (?, ?, 0, ?, ?, ?, ?)', [$contenu, $maintenant, maintenantPrecis(), $commerceId, $type, $id]);
            $restaures++;
        }
        $pdo->commit();
    } catch (Throwable $err) {
        $pdo->rollBack();
        throw $err;
    }
    return ['restaures' => $restaures, 'supprimes' => $supprimes];
}
