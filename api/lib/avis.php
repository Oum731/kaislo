<?php
// ------------------------------------------------------------
// AVIS DES GÉRANTS SUR KAISLO
// Seul un vrai gérant connecté peut laisser un avis (un seul par commerce, modifiable). Il n'est montré sur le
// site qu'après validation par l'équipe Kaislo, avec le prénom, la ville et l'activité (jamais le numéro).
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

/**
 * Traduction automatique en anglais (DeepL), si la ligne « CleDeepL=… » est dans le fichier .env du serveur
 * (clé gratuite : se termine par « :fx »). Renvoie null sans clé ou si le service ne répond pas : l'avis garde
 * alors son texte d'origine et l'équipe peut saisir la traduction à la main.
 */
function traduireEnAnglais(string $texte): ?string
{
    $texte = trim($texte);
    if ($texte === '') return null;
    if (modeEssaiNotifications()) return '[EN] ' . $texte; // tests : pas d'appel réseau
    $cle = lireFichierEnvCle('CleDeepL');
    if (!$cle) return null;
    $hote = str_ends_with($cle, ':fx') ? 'api-free.deepl.com' : 'api.deepl.com';
    $ctx = stream_context_create(['http' => [
        'method' => 'POST', 'timeout' => 8, 'ignore_errors' => true,
        'header' => "Authorization: DeepL-Auth-Key $cle\r\nContent-Type: application/x-www-form-urlencoded\r\n",
        'content' => http_build_query(['text' => $texte, 'target_lang' => 'EN-GB']),
    ]]);
    $rep = @file_get_contents("https://$hote/v2/translate", false, $ctx);
    $statut = isset($http_response_header[0]) && preg_match('#\s(\d{3})\s#', $http_response_header[0], $m) ? (int) $m[1] : 0;
    if ($rep === false || $statut !== 200) return null;
    $json = json_decode($rep, true);
    $t = trim((string) ($json['translations'][0]['text'] ?? ''));
    return $t === '' ? null : $t;
}

/** Traduit les avis publiés qui n'ont pas encore de traduction (quelques-uns à la fois). */
function traduireAvisManquants(int $max = 5): void
{
    foreach (requete("SELECT id, texte FROM avis WHERE statut = 'publie' AND (texte_en IS NULL OR texte_en = '') ORDER BY cree_le DESC LIMIT " . (int) $max)->fetchAll() as $a) {
        $en = traduireEnAnglais($a['texte']);
        if ($en === null) return; // service indisponible ou pas de clé : on réessaiera plus tard
        requete('UPDATE avis SET texte_en = ? WHERE id = ?', [$en, $a['id']]);
    }
}

function versAvisPublic(array $a): array
{
    return ['note' => (int) $a['note'], 'texte' => $a['texte'], 'texteEn' => $a['texte_en'] ?? null, 'nom' => $a['nom_affiche'], 'activite' => $a['activite'], 'ville' => $a['ville'], 'pays' => $a['pays'], 'le' => substr((string) $a['cree_le'], 0, 10)];
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
        requete("UPDATE avis SET note = ?, texte = ?, nom_affiche = ?, activite = ?, ville = ?, pays = ?, texte_en = NULL, statut = 'attente', modifie_le = ?, modere_le = NULL, modere_par = NULL WHERE id = ?",
            [$note, $texte, nomPourAvis($u['nom']), $c['type'], $c['ville'], $c['pays'], maintenant(), $existant['id']]);
    } else {
        requete("INSERT INTO avis (id, commerce_id, utilisateur_id, note, texte, nom_affiche, activite, ville, pays, statut, cree_le, modifie_le) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'attente', ?, ?)",
            [nouvelId('av'), $u['commerce_id'], $u['id'], $note, $texte, nomPourAvis($u['nom']), $c['type'], $c['ville'], $c['pays'], maintenant(), maintenant()]);
    }
    journaliser($u['commerce_id'], $u['id'], 'avis', ['note' => $note]);
    // L'équipe est prévenue par e-mail (comme pour les messages des visiteurs) : l'avis est à relire dans l'espace Kaislo Équipe → Avis
    alerterEquipe('avis', 'Nouvel avis ' . $note . '/5 : ' . $c['nom'], mb_substr($texte, 0, 140),
        'Kaislo — nouvel avis (' . $note . '/5) : ' . $c['nom'],
        "Avis de " . nomPourAvis($u['nom']) . " ({$c['nom']}, {$c['ville']}) : $note/5\n\n$texte\n\nÀ relire et publier dans l'espace Kaislo Équipe → Avis : " . lienAdmin());
    repondre(['ok' => true, 'etat' => 'attente'], 201);
}

function routeAdminAvis(): never
{
    adminConnecte();
    traduireAvisManquants();
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
    $action = (string) ($e['action'] ?? '');
    if (!requete('SELECT 1 FROM avis WHERE id = ?', [$id])->fetch()) throw new ErreurApi('Avis introuvable', 404);
    // Traduction anglaise : saisie par l'équipe (vide = pas de traduction, le site montre le texte d'origine)
    if (array_key_exists('texteEn', $e)) {
        $en = trim((string) $e['texteEn']);
        if (mb_strlen($en) > AVIS_TEXTE_MAX * 2) throw new ErreurApi('Traduction trop longue');
        requete('UPDATE avis SET texte_en = ? WHERE id = ?', [$en === '' ? null : $en, $id]);
    }
    if ($action === 'traduire') repondre(['ok' => true]);
    $statut = ['publier' => 'publie', 'refuser' => 'refuse', 'attente' => 'attente'][$action] ?? null;
    if (!$statut) throw new ErreurApi('Action inconnue');
    requete('UPDATE avis SET statut = ?, modere_le = ?, modere_par = ? WHERE id = ?', [$statut, $statut === 'attente' ? null : maintenant(), $statut === 'attente' ? null : $admin['nom'], $id]);
    if ($statut === 'publie') traduireAvisManquants(); // la traduction automatique se fait à la publication (sauf si l'équipe en a saisi une)
    repondre(['ok' => true]);
}
