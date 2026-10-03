<?php
// ------------------------------------------------------------
// MESSAGERIE entre chaque commerce et l'équipe Amorac.
// Chaque commerce a une seule conversation avec l'équipe.
// À chaque message d'un commerce, un e-mail prévient l'équipe (EmailEquipe du .env).
//
//   GET  /api/messages                   conversation du commerce (messages de l'équipe marqués lus)
//   POST /api/messages                   { texte } : message du commerce
//   GET  /api/admin/conversations        liste des conversations (non lus en premier)
//   GET  /api/admin/messages?commerce=…  conversation d'un commerce (messages du commerce marqués lus)
//   POST /api/admin/messages             { commerceId, texte } : réponse de l'équipe
// ------------------------------------------------------------

const LONGUEUR_MESSAGE_MAX = 2000;
const MESSAGES_PAR_ENVOI_MAX = 30; // par heure et par commerce (évite les abus)

function versMessage(array $m): array
{
    return ['id' => $m['id'], 'auteur' => $m['auteur'], 'auteurNom' => $m['auteur_nom'], 'texte' => $m['texte'], 'le' => $m['cree_le'], 'luLe' => $m['lu_le']];
}

function conversation(string $commerceId): array
{
    $lignes = requete('SELECT * FROM messages WHERE commerce_id = ? ORDER BY cree_le DESC LIMIT 200', [$commerceId])->fetchAll();
    return array_map('versMessage', array_reverse($lignes));
}

function texteMessage(array $e): string
{
    $texte = trim((string) ($e['texte'] ?? ''));
    if ($texte === '') throw new ErreurApi('Écrivez votre message');
    if (mb_strlen($texte) > LONGUEUR_MESSAGE_MAX) throw new ErreurApi('Message trop long (' . LONGUEUR_MESSAGE_MAX . ' caractères au maximum)');
    return $texte;
}

// E-mail simple (fonction mail() de l'hébergement), envoyé après la réponse pour ne pas faire attendre.
// Un échec n'empêche jamais l'envoi du message.
function envoyerEmail(string $a, string $sujet, string $texte): void
{
    $expediteur = lireFichierEnvCle('EmailExpediteur') ?? ('no-reply@' . (domaineSite() ?: 'kaislo.com'));
    $entetes = "From: Kaislo <$expediteur>\r\nReply-To: $expediteur\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: 8bit";
    apresReponse(fn () => @mail($a, '=?UTF-8?B?' . base64_encode($sujet) . '?=', $texte, $entetes));
}

// ---------- Côté commerce ----------

function routeMessagesLire(): never
{
    $u = utilisateurConnecte();
    requete("UPDATE messages SET lu_le = ? WHERE commerce_id = ? AND auteur = 'amorac' AND lu_le IS NULL", [maintenant(), $u['commerce_id']]);
    repondre(['ok' => true, 'messages' => conversation($u['commerce_id'])]);
}

function routeMessagesEcrire(): never
{
    $u = utilisateurConnecte();
    $texte = texteMessage(entree());
    $recents = (int) requete("SELECT COUNT(*) AS n FROM messages WHERE commerce_id = ? AND auteur = 'commerce' AND cree_le > ?", [$u['commerce_id'], maintenant(-3600)])->fetch()['n'];
    if ($recents >= MESSAGES_PAR_ENVOI_MAX) throw new ErreurApi('Beaucoup de messages en peu de temps : réessayez dans un moment', 429);
    requete('INSERT INTO messages (id, commerce_id, auteur, auteur_id, auteur_nom, texte, cree_le, lu_le) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)', [
        nouvelId('m'), $u['commerce_id'], 'commerce', $u['id'], $u['nom'], $texte, maintenant(),
    ]);
    // Prévient l'équipe Amorac par e-mail
    $c = requete('SELECT nom, telephone, code FROM commerces WHERE id = ?', [$u['commerce_id']])->fetch();
    envoyerEmail(
        lireFichierEnvCle('EmailEquipe') ?? 'contact@amorac.com',
        'Kaislo — message de ' . $c['nom'],
        "Nouveau message dans l'espace Amorac.\n\nCommerce : {$c['nom']} (code {$c['code']}, {$c['telephone']})\nDe : {$u['nom']} ({$u['telephone']})\n\n$texte\n\nRépondre : https://" . (domaineSite() ?: 'kaislo.com') . "/admin/"
    );
    repondre(['ok' => true, 'messages' => conversation($u['commerce_id'])], 201);
}

// Nombre de réponses de l'équipe pas encore lues (affiché dans l'application)
function messagesNonLus(string $commerceId): int
{
    return (int) requete("SELECT COUNT(*) AS n FROM messages WHERE commerce_id = ? AND auteur = 'amorac' AND lu_le IS NULL", [$commerceId])->fetch()['n'];
}

// ---------- Côté équipe Amorac ----------

function routeAdminConversations(): never
{
    adminConnecte();
    $lignes = requete("SELECT m.commerce_id, c.nom, c.telephone, c.pays,
            MAX(m.cree_le) AS dernier,
            SUM(CASE WHEN m.auteur = 'commerce' AND m.lu_le IS NULL THEN 1 ELSE 0 END) AS non_lus,
            COUNT(*) AS total
        FROM messages m JOIN commerces c ON c.id = m.commerce_id
        GROUP BY m.commerce_id, c.nom, c.telephone, c.pays
        ORDER BY non_lus DESC, dernier DESC")->fetchAll();
    $conversations = [];
    foreach ($lignes as $l) {
        $dernier = requete('SELECT * FROM messages WHERE commerce_id = ? ORDER BY cree_le DESC LIMIT 1', [$l['commerce_id']])->fetch();
        $conversations[] = [
            'commerceId' => $l['commerce_id'], 'nom' => $l['nom'], 'telephone' => $l['telephone'], 'pays' => $l['pays'],
            'nonLus' => (int) $l['non_lus'], 'total' => (int) $l['total'], 'dernier' => versMessage($dernier),
        ];
    }
    repondre(['ok' => true, 'conversations' => $conversations]);
}

function routeAdminMessagesLire(): never
{
    adminConnecte();
    $id = (string) ($_GET['commerce'] ?? '');
    requete("UPDATE messages SET lu_le = ? WHERE commerce_id = ? AND auteur = 'commerce' AND lu_le IS NULL", [maintenant(), $id]);
    repondre(['ok' => true, 'messages' => conversation($id)]);
}

function routeAdminMessagesEcrire(): never
{
    $admin = adminConnecte();
    $e = entree();
    $id = (string) ($e['commerceId'] ?? '');
    if (!requete('SELECT 1 FROM commerces WHERE id = ?', [$id])->fetch()) throw new ErreurApi('Commerce introuvable', 404);
    requete('INSERT INTO messages (id, commerce_id, auteur, auteur_id, auteur_nom, texte, cree_le, lu_le) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)', [
        nouvelId('m'), $id, 'amorac', $admin['id'], 'Équipe Kaislo', texteMessage($e), maintenant(),
    ]);
    repondre(['ok' => true, 'messages' => conversation($id)], 201);
}
