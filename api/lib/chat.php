<?php
// ------------------------------------------------------------
// DISCUSSION EN DIRECT entre les visiteurs d'une boutique et son commerçant.
//
//   Le visiteur n'a pas de compte : son navigateur garde un identifiant aléatoire (jamais affiché) dont seule l'empreinte est conservée ici.
//   Chaque visiteur a une conversation par boutique. Le commerçant répond depuis l'application (écran « Discussions »).
//   L'écran qui est ouvert interroge le serveur toutes les quelques secondes (« depuis » = reprise après le dernier message reçu).
//   Un nouveau message de client prévient le gérant par notification push (au plus une fois toutes les 5 minutes par conversation).
//
//   Visiteur (public) :
//     GET  /api/public/chat?b=slug&v=identifiant&depuis=…&lire=1   messages de la conversation (lire=1 : ceux du commerçant sont marqués lus)
//     POST /api/public/chat { b, v, nom?, texte }            message du visiteur
//   Commerçant (gérant) :
//     GET  /api/chats                                        conversations, non lues en premier
//     GET  /api/chats/messages?chat=…&depuis=…               messages (ceux du client sont marqués lus)
//     POST /api/chats/messages { chat, texte }               réponse du commerçant
//     POST /api/chats/bloquer { chat, bloque }               bloque ou débloque un visiteur
//
//   Kaislo ne modère pas ces échanges : le commerçant est seul responsable de ses réponses (voir les conditions d'utilisation).
// ------------------------------------------------------------

const CHAT_LONGUEUR_MAX = 1000;
const CHAT_MESSAGES_PAR_10_MIN = 20;
const CHAT_NOUVELLES_PAR_IP = 15;
const CHAT_DELAI_PUSH_SECONDES = 300;
const CHAT_MESSAGES_AFFICHES = 200;

function versMessageChat(array $m): array
{
    return ['id' => $m['id'], 'auteur' => $m['auteur'], 'texte' => $m['texte'], 'le' => $m['cree_le'], 'lu' => $m['lu_le'] !== null];
}

function messagesChat(string $chatId, string $depuis = ''): array
{
    // « >= » : deux messages dans la même seconde ne sont jamais perdus (l'application ignore ceux qu'elle a déjà)
    $lignes = $depuis !== ''
        ? requete('SELECT * FROM chats_messages WHERE chat_id = ? AND cree_le >= ? ORDER BY cree_le, id LIMIT ' . CHAT_MESSAGES_AFFICHES, [$chatId, $depuis])->fetchAll()
        : array_reverse(requete('SELECT * FROM chats_messages WHERE chat_id = ? ORDER BY cree_le DESC, id DESC LIMIT ' . CHAT_MESSAGES_AFFICHES, [$chatId])->fetchAll());
    return array_map('versMessageChat', $lignes);
}

// Identifiant qui se classe dans l'ordre d'écriture (microsecondes en tête) : deux messages de la même seconde restent dans le bon ordre
function idMessageChat(): string
{
    return sprintf('cm%014x', (int) (microtime(true) * 1000000)) . bin2hex(random_bytes(4));
}

function texteChat(array $e): string
{
    $texte = trim((string) ($e['texte'] ?? ''));
    if ($texte === '') throw new ErreurApi('Écrivez votre message');
    if (mb_strlen($texte) > CHAT_LONGUEUR_MAX) throw new ErreurApi('Message trop long (' . CHAT_LONGUEUR_MAX . ' caractères au maximum)');
    return $texte;
}

function jetonVisiteur(string $v): string
{
    if (!preg_match('/^[a-f0-9]{24,64}$/', $v)) throw new ErreurApi('Discussion indisponible : actualisez la page', 400);
    return hash('sha256', $v);
}

function chatAutorise(array $b): void
{
    if (!empty($b['chat_off'])) throw new ErreurApi('Cette boutique n’a pas activé la discussion', 404);
}

function chatsNonLus(string $commerceId): int
{
    return (int) requete("SELECT COUNT(*) AS n FROM chats_messages WHERE commerce_id = ? AND auteur = 'client' AND lu_le IS NULL", [$commerceId])->fetch()['n'];
}

// ---------- Visiteur ----------

function routeChatPublicLire(): never
{
    [$b, $c] = boutiqueParSlug(strtolower((string) ($_GET['b'] ?? '')));
    $hash = jetonVisiteur((string) ($_GET['v'] ?? ''));
    $chat = requete('SELECT * FROM chats_clients WHERE commerce_id = ? AND visiteur_hash = ?', [$c['id'], $hash])->fetch();
    if (!$chat) repondre(['ok' => true, 'actif' => empty($b['chat_off']), 'messages' => []]);
    // Marqués lus seulement quand la fenêtre de discussion est ouverte (lire=1) ; fermée, l'application ne fait que compter les nouveautés
    if (!empty($_GET['lire'])) requete("UPDATE chats_messages SET lu_le = ? WHERE chat_id = ? AND auteur = 'commerce' AND lu_le IS NULL", [maintenant(), $chat['id']]);
    repondre(['ok' => true, 'actif' => empty($b['chat_off']), 'nom' => (string) $chat['visiteur_nom'], 'messages' => messagesChat($chat['id'], (string) ($_GET['depuis'] ?? ''))]);
}

function routeChatPublicEcrire(): never
{
    $e = entree();
    if (trim((string) ($e['site'] ?? '')) !== '') repondre(['ok' => true]); // champ piège pour les robots
    [$b, $c] = boutiqueParSlug(strtolower((string) ($e['b'] ?? '')));
    chatAutorise($b);
    $hash = jetonVisiteur((string) ($e['v'] ?? ''));
    $texte = texteChat($e);
    $nom = mb_substr(trim((string) ($e['nom'] ?? '')), 0, 40);
    $chat = requete('SELECT * FROM chats_clients WHERE commerce_id = ? AND visiteur_hash = ?', [$c['id'], $hash])->fetch();
    if ($chat && $chat['bloque']) throw new ErreurApi('Vous ne pouvez plus écrire à cette boutique', 403);
    if (!$chat) {
        $cleIp = 'chat-nouveau:' . adresseIp();
        verifierBlocage($cleIp);
        if (noterEchec($cleIp, CHAT_NOUVELLES_PAR_IP)) throw new ErreurApi('Trop de discussions depuis cet appareil : réessayez plus tard', 429);
        $id = nouvelId('ch');
        requete('INSERT INTO chats_clients (id, commerce_id, visiteur_hash, visiteur_nom, bloque, cree_le, dernier_le, push_le) VALUES (?, ?, ?, ?, 0, ?, ?, NULL)', [$id, $c['id'], $hash, $nom, maintenant(), maintenant()]);
        $chat = requete('SELECT * FROM chats_clients WHERE id = ?', [$id])->fetch();
    } else {
        $recents = (int) requete("SELECT COUNT(*) AS n FROM chats_messages WHERE chat_id = ? AND auteur = 'client' AND cree_le > ?", [$chat['id'], maintenant(-600)])->fetch()['n'];
        if ($recents >= CHAT_MESSAGES_PAR_10_MIN) throw new ErreurApi('Beaucoup de messages en peu de temps : patientez quelques minutes', 429);
    }
    requete("INSERT INTO chats_messages (id, chat_id, commerce_id, auteur, texte, cree_le, lu_le) VALUES (?, ?, ?, 'client', ?, ?, NULL)", [idMessageChat(), $chat['id'], $c['id'], $texte, maintenant()]);
    requete('UPDATE chats_clients SET dernier_le = ?, visiteur_nom = ? WHERE id = ?', [maintenant(), $nom !== '' ? $nom : $chat['visiteur_nom'], $chat['id']]);
    prevenirChat($c, $chat, $nom !== '' ? $nom : (string) $chat['visiteur_nom'], $texte);
    repondre(['ok' => true, 'messages' => messagesChat($chat['id'], (string) ($e['depuis'] ?? ''))], 201);
}

// Notification push au gérant : au plus une toutes les 5 minutes par conversation
function prevenirChat(array $commerce, array $chat, string $nom, string $texte): void
{
    try {
        if ($chat['push_le'] && strtotime((string) $chat['push_le']) > time() - CHAT_DELAI_PUSH_SECONDES) return;
        if (!prefsNotifications(reglagesCommerce($commerce['id']))['push']) return;
        requete('UPDATE chats_clients SET push_le = ? WHERE id = ?', [maintenant(), $chat['id']]);
        $titre = ($nom !== '' ? $nom : 'Un client') . ' · ' . $commerce['nom'];
        apresReponse(fn () => envoyerPush($commerce['id'], 'chat', $titre, mb_substr($texte, 0, 140), '/app/?e=discussions'));
    } catch (Throwable $e) {
        error_log('[Kaislo chat] push : ' . $e->getMessage()); // une notification ratée n'empêche jamais le message
    }
}

// ---------- Commerçant ----------

function gerantChat(): array
{
    $u = utilisateurConnecte();
    if ($u['role'] !== 'gerant') throw new ErreurApi('Réservé au gérant', 403);
    return $u;
}

function chatDuCommerce(array $u, string $id): array
{
    $chat = requete('SELECT * FROM chats_clients WHERE id = ? AND commerce_id = ?', [$id, $u['commerce_id']])->fetch();
    if (!$chat) throw new ErreurApi('Discussion introuvable', 404);
    return $chat;
}

function routeChatsListe(): never
{
    $u = gerantChat();
    $lignes = requete("SELECT c.*, 
            (SELECT COUNT(*) FROM chats_messages m WHERE m.chat_id = c.id AND m.auteur = 'client' AND m.lu_le IS NULL) AS non_lus
        FROM chats_clients c WHERE c.commerce_id = ? ORDER BY non_lus DESC, c.dernier_le DESC LIMIT 100", [$u['commerce_id']])->fetchAll();
    $liste = [];
    foreach ($lignes as $l) {
        $dernier = requete('SELECT * FROM chats_messages WHERE chat_id = ? ORDER BY cree_le DESC, id DESC LIMIT 1', [$l['id']])->fetch();
        $liste[] = ['id' => $l['id'], 'nom' => (string) $l['visiteur_nom'], 'bloque' => (bool) $l['bloque'], 'nonLus' => (int) $l['non_lus'], 'dernierLe' => $l['dernier_le'], 'dernier' => $dernier ? versMessageChat($dernier) : null];
    }
    $b = requete('SELECT chat_off FROM boutiques WHERE commerce_id = ?', [$u['commerce_id']])->fetch();
    repondre(['ok' => true, 'chats' => $liste, 'nonLus' => chatsNonLus($u['commerce_id']), 'actif' => $b ? empty($b['chat_off']) : null]);
}

function routeChatsLire(): never
{
    $u = gerantChat();
    $chat = chatDuCommerce($u, (string) ($_GET['chat'] ?? ''));
    requete("UPDATE chats_messages SET lu_le = ? WHERE chat_id = ? AND auteur = 'client' AND lu_le IS NULL", [maintenant(), $chat['id']]);
    repondre(['ok' => true, 'nom' => (string) $chat['visiteur_nom'], 'bloque' => (bool) $chat['bloque'], 'messages' => messagesChat($chat['id'], (string) ($_GET['depuis'] ?? ''))]);
}

function routeChatsEcrire(): never
{
    $u = gerantChat();
    $e = entree();
    $chat = chatDuCommerce($u, (string) ($e['chat'] ?? ''));
    $texte = texteChat($e);
    $recents = (int) requete("SELECT COUNT(*) AS n FROM chats_messages WHERE commerce_id = ? AND auteur = 'commerce' AND cree_le > ?", [$u['commerce_id'], maintenant(-600)])->fetch()['n'];
    if ($recents >= 100) throw new ErreurApi('Beaucoup de messages en peu de temps : patientez quelques minutes', 429);
    requete("INSERT INTO chats_messages (id, chat_id, commerce_id, auteur, texte, cree_le, lu_le) VALUES (?, ?, ?, 'commerce', ?, ?, NULL)", [idMessageChat(), $chat['id'], $u['commerce_id'], $texte, maintenant()]);
    requete('UPDATE chats_clients SET dernier_le = ? WHERE id = ?', [maintenant(), $chat['id']]);
    repondre(['ok' => true, 'messages' => messagesChat($chat['id'], (string) ($e['depuis'] ?? ''))], 201);
}

function routeChatsBloquer(): never
{
    $u = gerantChat();
    $e = entree();
    $chat = chatDuCommerce($u, (string) ($e['chat'] ?? ''));
    requete('UPDATE chats_clients SET bloque = ? WHERE id = ?', [!empty($e['bloque']) ? 1 : 0, $chat['id']]);
    journaliser($u['commerce_id'], $u['id'], !empty($e['bloque']) ? 'chat-bloque' : 'chat-debloque', ['chat' => $chat['id']]);
    repondre(['ok' => true, 'bloque' => !empty($e['bloque'])]);
}
