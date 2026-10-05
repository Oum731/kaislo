<?php
// ------------------------------------------------------------
// SYNCHRONISATION des données des caisses.
//
// Chaque « élément » (un article, une vente, un client…) est rangé en JSON
// dans la table elements, avec :
//   modifie_le : heure de la modification sur l'appareil (la plus récente gagne)
//   recu_le    : heure d'arrivée sur le serveur (pour envoyer les nouveautés aux autres appareils)
//
//   GET  /api/donnees?depuis=…   nouveautés depuis le dernier passage (+ commerce et équipe)
//   POST /api/donnees            { elements: [{ type, id, contenu, modifieLe, supprime }] }
// ------------------------------------------------------------

// Types acceptés. « reglages » = réglages du commerce (un seul élément, id « commerce »).
const TYPES_ELEMENTS = ['reglages', 'postes', 'categories', 'produits', 'ventes', 'commandes', 'clients', 'remboursements', 'sessionsCaisse', 'depenses', 'mouvements', 'images'];
const TAILLE_MAX_ELEMENT = 400000; // octets (une photo réduite fait environ 40 à 80 Ko)
const ELEMENTS_PAR_ENVOI = 500;
const ELEMENTS_PAR_PAGE = 2000;

// Heure précise à la microseconde (deux éléments n'ont jamais la même heure d'arrivée)
function maintenantPrecis(): string
{
    $t = microtime(true);
    return gmdate('Y-m-d\TH:i:s', (int) $t) . sprintf('.%06dZ', (int) (($t - floor($t)) * 1e6));
}

// Réglages du commerce enregistrés par le gérant (nom, adresse, tables, ticket…)
function reglagesCommerce(string $commerceId): array
{
    $ligne = requete("SELECT contenu FROM elements WHERE commerce_id = ? AND type = 'reglages' AND id = 'commerce'", [$commerceId])->fetch();
    return $ligne ? (json_decode($ligne['contenu'], true) ?: []) : [];
}

function equipe(string $commerceId): array
{
    $lignes = requete('SELECT * FROM utilisateurs WHERE commerce_id = ? ORDER BY role, cree_le', [$commerceId])->fetchAll();
    return array_map('versUtilisateur', $lignes);
}

// ---------- GET /api/donnees ----------
function routeDonneesLire(): never
{
    $u = utilisateurConnecte();
    $depuis = (string) ($_GET['depuis'] ?? '');
    if ($depuis !== '' && !preg_match('/^\d{4}-\d\d-\d\dT[\d:.]+Z$/', $depuis)) throw new ErreurApi('Paramètre « depuis » invalide');
    $heure = maintenantPrecis();
    $lignes = requete(
        'SELECT type, id, contenu, modifie_le, supprime, recu_le FROM elements WHERE commerce_id = ? AND recu_le > ? ORDER BY recu_le LIMIT ' . ELEMENTS_PAR_PAGE,
        [$u['commerce_id'], $depuis ?: '0']
    )->fetchAll();
    $suite = count($lignes) === ELEMENTS_PAR_PAGE;
    if ($suite) $heure = end($lignes)['recu_le']; // la page suivante reprendra après le dernier élément
    $elements = array_map(fn ($l) => [
        'type' => $l['type'], 'id' => $l['id'], 'contenu' => json_decode($l['contenu'], true),
        'modifieLe' => $l['modifie_le'], 'supprime' => (bool) $l['supprime'],
    ], $lignes);

    $commerce = requete('SELECT * FROM commerces WHERE id = ?', [$u['commerce_id']])->fetch();
    repondre([
        'ok' => true, 'heure' => $heure, 'suite' => $suite, 'elements' => $elements,
        'commerce' => versCommerce($commerce), 'utilisateurs' => equipe($u['commerce_id']), 'moi' => versUtilisateur($u),
        'messagesNonLus' => messagesNonLus($u['commerce_id']), // réponses de l'équipe Amorac pas encore lues
        'tarif' => tarifCommerce($commerce), // formule, postes et prix de l'abonnement
    ]);
}

// ---------- POST /api/donnees ----------
function routeDonneesEcrire(): never
{
    $u = utilisateurConnecte();
    $commerce = requete('SELECT statut, essai_fin, periode_fin FROM commerces WHERE id = ?', [$u['commerce_id']])->fetch();
    if (($commerce['statut'] ?? '') === 'suspendu') throw new ErreurApi('Ce commerce est suspendu. Contactez Amorac.', 403);
    // Abonnement non payé : la lecture reste possible, mais plus l'enregistrement de nouvelles données
    // (elles restent dans la file d'attente de l'appareil et partent dès que l'abonnement est réglé)
    if (abonnementExpire($commerce)) throw new ErreurApi('Abonnement expiré : réglez-le pour synchroniser de nouveau (vos données restent sur cet appareil). Contactez Amorac.', 403);
    $elements = entree()['elements'] ?? null;
    if (!is_array($elements)) throw new ErreurApi('Liste « elements » attendue');
    if (count($elements) > ELEMENTS_PAR_ENVOI) throw new ErreurApi('Trop d’éléments en une fois (' . ELEMENTS_PAR_ENVOI . ' au maximum)');

    $acceptes = [];
    $refuses = [];
    $pdo = base();
    $pdo->beginTransaction();
    try {
        foreach ($elements as $e) {
            $cle = ($e['type'] ?? '?') . ':' . ($e['id'] ?? '?');
            $raison = enregistrerElement($u, is_array($e) ? $e : []);
            if ($raison === null) $acceptes[] = $cle;
            else $refuses[] = ['cle' => $cle, 'raison' => $raison];
        }
        $pdo->commit();
    } catch (Throwable $err) {
        $pdo->rollBack();
        throw $err;
    }
    repondre(['ok' => true, 'acceptes' => $acceptes, 'refuses' => $refuses]);
}

// Abonnement expiré depuis plus de JOURS_DE_GRACE jours (essai terminé ou période payée terminée)
const JOURS_DE_GRACE = 7;
function abonnementExpire(array $commerce): bool
{
    $fin = ($commerce['statut'] ?? '') === 'actif' ? ($commerce['periode_fin'] ?? null) : ($commerce['essai_fin'] ?? null);
    if (!$fin) return false;
    return substr((string) $fin, 0, 10) < gmdate('Y-m-d', time() - JOURS_DE_GRACE * 86400);
}

// Enregistre un élément ; renvoie null si accepté, sinon la raison du refus
function enregistrerElement(array $u, array $e): ?string
{
    $type = (string) ($e['type'] ?? '');
    $id = (string) ($e['id'] ?? '');
    $modifieLe = (string) ($e['modifieLe'] ?? '');
    $supprime = !empty($e['supprime']);
    if (!in_array($type, TYPES_ELEMENTS, true)) return 'type inconnu';
    if (!preg_match('/^[A-Za-z0-9_.:-]{1,40}$/', $id)) return 'identifiant invalide';
    if (!preg_match('/^\d{4}-\d\d-\d\dT[\d:.]+Z$/', $modifieLe)) return 'date invalide';
    if ($modifieLe > maintenant(600)) $modifieLe = maintenant(); // horloge de l'appareil en avance : on corrige
    $contenu = $supprime ? null : ($e['contenu'] ?? null);
    if (!$supprime && !is_array($contenu)) return 'contenu manquant';
    $json = $supprime ? '{}' : json_encode($contenu, JSON_UNESCAPED_UNICODE);
    if (strlen($json) > TAILLE_MAX_ELEMENT) return 'élément trop volumineux';

    $existant = requete('SELECT contenu, modifie_le FROM elements WHERE commerce_id = ? AND type = ? AND id = ?', [$u['commerce_id'], $type, $id])->fetch() ?: null;
    $raison = droitManquant($u, $type, $supprime, $existant, $contenu);
    if ($raison) return $raison;
    if ($type === 'ventes' && !$supprime) {
        $raison = controlerVente($u, $existant, $contenu);
        if ($raison) return $raison;
    }
    // Une modification plus ancienne que celle déjà enregistrée est ignorée (la plus récente gagne)
    if ($existant && $existant['modifie_le'] > $modifieLe) return null;

    if ($type === 'reglages') {
        if ($id !== 'commerce') return 'identifiant invalide';
        // Champs gérés uniquement par le serveur (abonnement, code…) : jamais pris de l'appareil
        foreach (['id', 'code', 'abonnement', 'creeLe', 'conditionsAccepteesLe', 'serveur', 'telephone'] as $champ) unset($contenu[$champ]);
        $json = json_encode($contenu, JSON_UNESCAPED_UNICODE);
        $nom = trim((string) ($contenu['nom'] ?? ''));
        if ($nom !== '') {
            // Le numéro du commerce (son identifiant) n'est changé que par l'équipe Amorac
            requete('UPDATE commerces SET nom = ?, ville = ?, modifie_le = ? WHERE id = ?', [
                mb_substr($nom, 0, 120), mb_substr((string) ($contenu['ville'] ?? ''), 0, 120), maintenant(), $u['commerce_id'],
            ]);
        }
    }

    $valeurs = [$json, $modifieLe, $supprime ? 1 : 0, maintenantPrecis()];
    if ($existant) requete('UPDATE elements SET contenu = ?, modifie_le = ?, supprime = ?, recu_le = ? WHERE commerce_id = ? AND type = ? AND id = ?', [...$valeurs, $u['commerce_id'], $type, $id]);
    else requete('INSERT INTO elements (contenu, modifie_le, supprime, recu_le, commerce_id, type, id) VALUES (?, ?, ?, ?, ?, ?, ?)', [...$valeurs, $u['commerce_id'], $type, $id]);
    return null;
}

// Droits : le gérant peut tout faire. Un vendeur :
//   - vend, encaisse, gère les tables, le crédit, les dépenses et sa journée de vente
//   - ne touche aux articles et catégories que si le gérant l'y autorise
//     (sinon il ne peut que faire baisser le stock en vendant)
//   - ne supprime jamais une vente, un client… (seulement les commandes de table terminées)
//   - ne modifie jamais les réglages du commerce
function droitManquant(array $u, string $type, bool $supprime, ?array $existant, ?array $contenu): ?string
{
    if ($u['role'] === 'gerant') return null;
    if ($type === 'reglages' || $type === 'postes') return 'réservé au gérant';
    $produits = in_array($type, ['produits', 'categories'], true);
    if ($produits && $u['peut_gerer_produits']) return null;
    if ($supprime) return $type === 'commandes' ? null : 'suppression réservée au gérant';
    if ($type === 'categories') return 'réservé au gérant';
    if ($type === 'produits') {
        // Sans le droit « produits » : seul le stock peut changer (effet d'une vente)
        if (!$existant) return 'réservé au gérant';
        $avant = json_decode($existant['contenu'], true) ?: [];
        unset($avant['stock'], $contenu['stock']);
        return $avant == $contenu ? null : 'réservé au gérant';
    }
    return null;
}

// ------------------------------------------------------------
// CONTRÔLE DES VENTES (le serveur ne fait pas confiance à l'appareil)
//   - une vente enregistrée ne change plus : seule son annulation est possible, avec le code du gérant
//     saisi sur l'appareil (le gérant, lui, peut corriger)
//   - un vendeur ne crée des ventes qu'à son nom
//   - lignes, quantités et montants doivent être valides ; un total qui ne correspond pas aux lignes
//     est accepté mais signalé dans le journal (vérification par l'équipe, sans perdre la vente)
// ------------------------------------------------------------
function controlerVente(array $u, ?array $existant, array $vente): ?string
{
    $nombre = fn ($v) => is_int($v) || is_float($v);
    $lignes = $vente['lignes'] ?? null;
    if (!is_array($lignes) || !$lignes || count($lignes) > 200) return 'vente invalide : lignes manquantes';
    $somme = 0.0;
    foreach ($lignes as $l) {
        if (!is_array($l) || !$nombre($l['quantite'] ?? null) || !$nombre($l['prixUnitaire'] ?? null) || !$nombre($l['total'] ?? null)) return 'vente invalide : ligne incorrecte';
        if ($l['quantite'] <= 0 || $l['prixUnitaire'] < 0 || $l['total'] < 0) return 'vente invalide : montant négatif';
        $somme += $l['total'];
    }
    foreach (['total', 'sousTotal'] as $champ) {
        if (!$nombre($vente[$champ] ?? null) || $vente[$champ] < 0) return 'vente invalide : ' . $champ;
    }
    $remise = $vente['remise'] ?? 0;
    if (!$nombre($remise) || $remise < 0) return 'vente invalide : remise';

    if ($u['role'] !== 'gerant') {
        if (!$existant) {
            if (($vente['vendeurId'] ?? null) !== $u['id']) return 'vente au nom d’un autre vendeur';
        } else {
            $avant = json_decode($existant['contenu'], true) ?: [];
            if ($vente == $avant) return null; // même vente renvoyée : rien ne change
            if (!empty($avant['annulee'])) return 'vente déjà annulée';
            // Champs sans effet sur les comptes, modifiables par tous : demande d'impression, numéro du client
            $libres = ['impressionDemandee', 'telephoneClient'];
            $changes = [];
            foreach (array_unique([...array_keys($avant), ...array_keys($vente)]) as $k) {
                if (($avant[$k] ?? null) != ($vente[$k] ?? null)) $changes[] = $k;
            }
            if (!array_diff($changes, $libres)) return null;
            if ($changes !== ['annulee'] || empty($vente['annulee'])) return 'une vente enregistrée ne peut pas être modifiée';
            if (!autorisationValide($u)) return 'annulation : code du gérant requis';
            journaliser($u['commerce_id'], $u['id'], 'vente-annulee', ['vente' => $vente['id'] ?? null, 'numero' => $vente['numero'] ?? null]);
        }
    }
    // Total cohérent avec les lignes ? (écart toléré : arrondis)
    if (!$existant && (abs($somme - $vente['sousTotal']) > 1 || abs($vente['sousTotal'] - $remise - $vente['total']) > 1)) {
        journaliser($u['commerce_id'], $u['id'], 'vente-incoherente', ['vente' => $vente['id'] ?? null, 'lignes' => $somme, 'sousTotal' => $vente['sousTotal'], 'remise' => $remise, 'total' => $vente['total']]);
    }
    return null;
}
