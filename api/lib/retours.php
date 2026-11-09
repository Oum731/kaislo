<?php
// ------------------------------------------------------------
// CARNET DES RETOURS UTILISATEURS (espace Kaislo)
//
// L'équipe y note ce que les commerçants lui disent (WhatsApp, appel, visite) : ce qui leur plaît, ce qui les bloque, ce qui leur manque.
// Une ligne = un retour, rattaché à un commerce (ou à une personne sans commerce encore), avec le canal, le type, la fonction demandée
// et un statut (reçu, prévu, fait, refusé). Le classement « fonctions les plus demandées » compte les commerces différents qui la demandent :
// quand plusieurs commerçants demandent la même chose, c'est elle qu'il faut construire en premier.
//
//   GET  /api/admin/retours[?commerceId=…]   la liste (récente d'abord) et le classement
//   POST /api/admin/retours                  { action: 'creer' | 'modifier' | 'supprimer', id, … } (supprimer : administrateurs seulement)
// ------------------------------------------------------------

const TYPES_RETOUR = ['manque', 'probleme', 'aime', 'autre'];     // fonction demandée, problème ou blocage, ce qui plaît, autre
const CANAUX_RETOUR = ['whatsapp', 'appel', 'visite', 'autre'];
const STATUTS_RETOUR = ['recu', 'prevu', 'fait', 'refuse'];
const RETOURS_MAX = 1000;

// Sans accents, sans majuscules, espaces simples : « Facture  PDF » et « facture pdf » sont la même fonction
function cleFonction(string $texte): string
{
    $t = mb_strtolower(trim($texte));
    $t = strtr($t, ['à' => 'a', 'â' => 'a', 'ä' => 'a', 'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e', 'î' => 'i', 'ï' => 'i', 'ô' => 'o', 'ö' => 'o', 'ù' => 'u', 'û' => 'u', 'ü' => 'u', 'ç' => 'c']);
    return preg_replace('/\s+/u', ' ', $t);
}

function versRetour(array $r): array
{
    return [
        'id' => $r['id'], 'commerceId' => $r['commerce_id'], 'commerce' => $r['commerce_nom'] ?? null, 'nom' => $r['nom_libre'], 'contact' => $r['contact'],
        'canal' => $r['canal'], 'type' => $r['type'], 'fonction' => $r['fonction'], 'texte' => $r['texte'], 'statut' => $r['statut'],
        'creePar' => $r['cree_par'], 'creeLe' => $r['cree_le'], 'modifieLe' => $r['modifie_le'],
    ];
}

// Classement des fonctions demandées : nombre de commerces (ou de personnes) différents, puis de demandes ; les refusées n'y sont plus
function classementFonctions(array $lignes): array
{
    $groupes = [];
    foreach ($lignes as $r) {
        if ($r['type'] !== 'manque' || trim((string) $r['fonction']) === '' || $r['statut'] === 'refuse') continue;
        $cle = cleFonction($r['fonction']);
        $g = &$groupes[$cle];
        $g ??= ['fonction' => $r['fonction'], 'demandes' => 0, 'demandeurs' => [], 'statuts' => []];
        $g['demandes']++;
        $g['demandeurs'][$r['commerce_id'] ?: 'libre:' . cleFonction((string) $r['nom_libre'])] = true;
        $g['statuts'][$r['statut']] = ($g['statuts'][$r['statut']] ?? 0) + 1;
        unset($g);
    }
    $liste = array_map(function ($g) {
        $s = $g['statuts'];
        // « fait » quand tout est fait ; « prévu » dès qu'un retour est prévu ; sinon « reçu »
        $statut = ($s['fait'] ?? 0) === $g['demandes'] ? 'fait' : (($s['prevu'] ?? 0) > 0 || ($s['fait'] ?? 0) > 0 ? 'prevu' : 'recu');
        return ['fonction' => $g['fonction'], 'demandeurs' => count($g['demandeurs']), 'demandes' => $g['demandes'], 'statut' => $statut];
    }, array_values($groupes));
    usort($liste, fn ($a, $b) => [$b['demandeurs'], $b['demandes'], $a['fonction']] <=> [$a['demandeurs'], $a['demandes'], $b['fonction']]);
    return $liste;
}

function routeAdminRetoursLire(): never
{
    adminConnecte();
    $commerceId = (string) ($_GET['commerceId'] ?? '');
    $sql = 'SELECT r.*, c.nom AS commerce_nom FROM retours r LEFT JOIN commerces c ON c.id = r.commerce_id' . ($commerceId !== '' ? ' WHERE r.commerce_id = ?' : '') . ' ORDER BY r.cree_le DESC LIMIT ' . RETOURS_MAX;
    $lignes = requete($sql, $commerceId !== '' ? [$commerceId] : [])->fetchAll();
    $comptes = array_fill_keys(STATUTS_RETOUR, 0);
    foreach ($lignes as $r) $comptes[$r['statut']] = ($comptes[$r['statut']] ?? 0) + 1;
    repondre(['ok' => true, 'retours' => array_map('versRetour', $lignes), 'comptes' => $comptes, 'classement' => $commerceId === '' ? classementFonctions($lignes) : []]);
}

function routeAdminRetoursEcrire(): never
{
    $e = entree();
    $action = (string) ($e['action'] ?? '');
    $admin = adminConnecte($action === 'supprimer'); // le support note et suit les retours ; seul un administrateur en supprime
    $id = (string) ($e['id'] ?? '');
    if ($action === 'supprimer') {
        if (!requete('SELECT 1 FROM retours WHERE id = ?', [$id])->fetch()) throw new ErreurApi('Retour introuvable', 404);
        requete('DELETE FROM retours WHERE id = ?', [$id]);
        repondre(['ok' => true]);
    }
    if (!in_array($action, ['creer', 'modifier'], true)) throw new ErreurApi('Action inconnue');
    $commerceId = trim((string) ($e['commerceId'] ?? ''));
    if ($commerceId !== '' && !requete('SELECT 1 FROM commerces WHERE id = ?', [$commerceId])->fetch()) throw new ErreurApi('Commerce introuvable', 404);
    $nom = texte($e, 'nom', 'le nom', false, 120);
    if ($commerceId === '' && $nom === '') throw new ErreurApi('Choisissez un commerce ou écrivez le nom de la personne');
    $type = (string) ($e['type'] ?? 'manque');
    $canal = (string) ($e['canal'] ?? 'whatsapp');
    $statut = (string) ($e['statut'] ?? 'recu');
    if (!in_array($type, TYPES_RETOUR, true)) throw new ErreurApi('Type de retour inconnu');
    if (!in_array($canal, CANAUX_RETOUR, true)) throw new ErreurApi('Canal inconnu');
    if (!in_array($statut, STATUTS_RETOUR, true)) throw new ErreurApi('Statut inconnu');
    $texte = texte($e, 'texte', 'ce que la personne a dit', true, 2000);
    if (mb_strlen($texte) < 3) throw new ErreurApi('Écrivez ce que la personne a dit');
    $fonction = texte($e, 'fonction', 'la fonction demandée', false, 80);
    $contact = texte($e, 'contact', 'le contact', false, 40);
    if ($action === 'creer') {
        if (((int) requete('SELECT COUNT(*) AS n FROM retours')->fetch()['n']) >= 20000) throw new ErreurApi('Carnet plein : supprimez d’anciens retours');
        $id = nouvelId('rt');
        requete('INSERT INTO retours (id, commerce_id, nom_libre, contact, canal, type, fonction, texte, statut, cree_par, cree_le, modifie_le) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [$id, $commerceId ?: null, $nom, $contact, $canal, $type, $fonction, $texte, $statut, $admin['nom'], maintenant(), maintenant()]);
    } else {
        if (!requete('SELECT 1 FROM retours WHERE id = ?', [$id])->fetch()) throw new ErreurApi('Retour introuvable', 404);
        requete('UPDATE retours SET commerce_id = ?, nom_libre = ?, contact = ?, canal = ?, type = ?, fonction = ?, texte = ?, statut = ?, modifie_le = ? WHERE id = ?',
            [$commerceId ?: null, $nom, $contact, $canal, $type, $fonction, $texte, $statut, maintenant(), $id]);
    }
    $r = requete('SELECT r.*, c.nom AS commerce_nom FROM retours r LEFT JOIN commerces c ON c.id = r.commerce_id WHERE r.id = ?', [$id])->fetch();
    repondre(['ok' => true, 'retour' => versRetour($r)], $action === 'creer' ? 201 : 200);
}
