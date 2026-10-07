<?php
// ------------------------------------------------------------
// AVIS DES GÉRANTS SUR KAISLO
// Seul un vrai gérant connecté peut laisser un avis (un seul par commerce, modifiable). Il n'est montré sur le
// site qu'après validation par l'équipe Amorac, avec le prénom, la ville et l'activité (jamais le numéro).
//
//   GET  /api/avis         avis publiés (public) : { avis: [...], nombre, moyenne }
//   GET  /api/mon-avis     l'avis du commerce connecté (gérant)
//   POST /api/avis         { note: 1-5, texte, autorisation: true } (gérant)
//   GET  /api/admin/avis   tous les avis (en attente d'abord)
//   POST /api/admin/avis   { id, action: 'publier' | 'refuser' | 'attente' }
// ------------------------------------------------------------

const AVIS_TEXTE_MIN = 20;
const AVIS_TEXTE_MAX = 600;

// « Awa Koné » devient « Awa K. » : le prénom et l'initiale suffisent
function nomPourAvis(string $nom): string
{
    $mots = preg_split('/\s+/u', trim($nom)) ?: [];
    $prenom = mb_substr($mots[0] ?? '', 0, 30);
    $initiale = isset($mots[1]) && $mots[1] !== '' ? ' ' . mb_strtoupper(mb_substr($mots[1], 0, 1)) . '.' : '';
    return $prenom . $initiale;
}

function versAvisPublic(array $a): array
{
    return ['note' => (int) $a['note'], 'texte' => $a['texte'], 'nom' => $a['nom_affiche'], 'activite' => $a['activite'], 'ville' => $a['ville'], 'pays' => $a['pays'], 'le' => substr((string) $a['cree_le'], 0, 10)];
}

function routeAvisPublics(): never
{
    $lignes = requete("SELECT * FROM avis WHERE statut = 'publie' ORDER BY cree_le DESC LIMIT 30")->fetchAll();
    $stats = requete("SELECT COUNT(*) AS n, AVG(note) AS moyenne FROM avis WHERE statut = 'publie'")->fetch();
    repondre(['ok' => true, 'avis' => array_map('versAvisPublic', $lignes), 'nombre' => (int) $stats['n'], 'moyenne' => $stats['n'] ? round((float) $stats['moyenne'], 1) : null]);
}

function gerantPourAvis(): array
{
    $u = utilisateurConnecte();
    if ($u['role'] !== 'gerant') throw new ErreurApi('Seul le gérant peut donner l’avis du commerce', 403);
    return $u;
}

function routeMonAvis(): never
{
    $u = gerantPourAvis();
    $a = requete('SELECT * FROM avis WHERE commerce_id = ?', [$u['commerce_id']])->fetch();
    repondre(['ok' => true, 'avis' => $a ? ['note' => (int) $a['note'], 'texte' => $a['texte'], 'statut' => $a['statut'], 'le' => $a['modifie_le']] : null]);
}

function routeAvisEnvoyer(): never
{
    $u = gerantPourAvis();
    $e = entree();
    $note = (int) ($e['note'] ?? 0);
    if ($note < 1 || $note > 5) throw new ErreurApi('Choisissez une note de 1 à 5 étoiles');
    $texte = trim((string) ($e['texte'] ?? ''));
    if (mb_strlen($texte) < AVIS_TEXTE_MIN) throw new ErreurApi('Racontez-nous un peu plus : ' . AVIS_TEXTE_MIN . ' caractères au minimum');
    if (mb_strlen($texte) > AVIS_TEXTE_MAX) throw new ErreurApi('Votre avis est trop long : ' . AVIS_TEXTE_MAX . ' caractères au maximum');
    if (empty($e['autorisation'])) throw new ErreurApi('Il faut accepter l’affichage de votre avis sur le site pour l’envoyer');
    $c = requete('SELECT * FROM commerces WHERE id = ?', [$u['commerce_id']])->fetch();
    $existant = requete('SELECT id FROM avis WHERE commerce_id = ?', [$u['commerce_id']])->fetch();
    // Un avis modifié repart en validation
    if ($existant) {
        requete("UPDATE avis SET note = ?, texte = ?, nom_affiche = ?, activite = ?, ville = ?, pays = ?, statut = 'attente', modifie_le = ?, modere_le = NULL, modere_par = NULL WHERE id = ?",
            [$note, $texte, nomPourAvis($u['nom']), $c['type'], $c['ville'], $c['pays'], maintenant(), $existant['id']]);
    } else {
        requete("INSERT INTO avis (id, commerce_id, utilisateur_id, note, texte, nom_affiche, activite, ville, pays, statut, cree_le, modifie_le) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'attente', ?, ?)",
            [nouvelId('av'), $u['commerce_id'], $u['id'], $note, $texte, nomPourAvis($u['nom']), $c['type'], $c['ville'], $c['pays'], maintenant(), maintenant()]);
    }
    journaliser($u['commerce_id'], $u['id'], 'avis', ['note' => $note]);
    repondre(['ok' => true, 'etat' => 'attente'], 201);
}

function routeAdminAvis(): never
{
    adminConnecte();
    $lignes = requete("SELECT a.*, c.nom AS commerce_nom FROM avis a LEFT JOIN commerces c ON c.id = a.commerce_id ORDER BY CASE a.statut WHEN 'attente' THEN 0 ELSE 1 END, a.modifie_le DESC LIMIT 300")->fetchAll();
    repondre(['ok' => true, 'avis' => array_map(fn ($a) => versAvisPublic($a) + ['id' => $a['id'], 'statut' => $a['statut'], 'commerce' => $a['commerce_nom'], 'moderePar' => $a['modere_par']], $lignes), 'enAttente' => avisEnAttente()]);
}

function avisEnAttente(): int
{
    return (int) requete("SELECT COUNT(*) AS n FROM avis WHERE statut = 'attente'")->fetch()['n'];
}

function routeAdminAvisModerer(): never
{
    $admin = adminConnecte();
    $e = entree();
    $id = (string) ($e['id'] ?? '');
    $statut = ['publier' => 'publie', 'refuser' => 'refuse', 'attente' => 'attente'][(string) ($e['action'] ?? '')] ?? null;
    if (!$statut) throw new ErreurApi('Action inconnue');
    if (!requete('SELECT 1 FROM avis WHERE id = ?', [$id])->fetch()) throw new ErreurApi('Avis introuvable', 404);
    requete('UPDATE avis SET statut = ?, modere_le = ?, modere_par = ? WHERE id = ?', [$statut, $statut === 'attente' ? null : maintenant(), $statut === 'attente' ? null : $admin['nom'], $id]);
    repondre(['ok' => true]);
}
