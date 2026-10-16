<?php
// ------------------------------------------------------------
// NOTIFICATIONS PUSH (Web Push) : le téléphone affiche une notification même quand Kaislo est fermé.
//
//   POST /api/push/abonner      { endpoint, appareil }   le gérant autorise cet appareil (permission demandée par le navigateur)
//   POST /api/push/desabonner   { endpoint }
//   POST /api/push/message      { endpoint }             appelé par le service worker quand une notification arrive : donne son texte
//
// Principe « sans contenu » : le serveur envoie au service de notification du navigateur (Google, Mozilla, Apple, Microsoft) un signal
// vide, signé avec la clé VAPID de Kaislo ; le texte de la notification reste chez nous et c'est l'appareil qui vient le lire
// (POST /push/message). Aucune donnée du commerce ne transite donc par ces services.
// La clé VAPID (paire de clés ECDSA P-256) est créée automatiquement au premier usage et gardée dans reglages_amorac (clé « vapid »).
// ------------------------------------------------------------

// Seuls les services de notification des navigateurs sont appelés (jamais une adresse choisie par un visiteur)
function adressePushAutorisee(string $adresse): bool
{
    $p = parse_url($adresse);
    if (!is_array($p) || ($p['scheme'] ?? '') !== 'https' || empty($p['host']) || strlen($adresse) > 1000 || isset($p['user']) || isset($p['port'])) return false;
    $h = strtolower($p['host']);
    foreach (['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com'] as $ok) if ($h === $ok) return true;
    foreach (['.push.services.mozilla.com', '.push.apple.com', '.notify.windows.com'] as $fin) if (str_ends_with($h, $fin)) return true;
    return false;
}

function base64url(string $octets): string
{
    return rtrim(strtr(base64_encode($octets), '+/', '-_'), '=');
}

// ---------- Clé VAPID ----------

/** Paire de clés du serveur : ['publique' => point non compressé en base64url, 'privee' => PEM] */
function cleVapid(): array
{
    $ligne = requete("SELECT valeur FROM reglages_amorac WHERE cle = 'vapid'")->fetch();
    if ($ligne) {
        $v = json_decode($ligne['valeur'], true);
        if (is_array($v) && !empty($v['publique']) && !empty($v['privee'])) return $v;
    }
    $cle = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
    if (!$cle) throw new ErreurApi('Notifications push indisponibles sur ce serveur (OpenSSL)', 503);
    openssl_pkey_export($cle, $pem);
    $ec = openssl_pkey_get_details($cle)['ec'];
    $v = ['publique' => base64url("\x04" . str_pad($ec['x'], 32, "\0", STR_PAD_LEFT) . str_pad($ec['y'], 32, "\0", STR_PAD_LEFT)), 'privee' => $pem];
    try {
        requete("INSERT INTO reglages_amorac (cle, valeur, modifie_le) VALUES ('vapid', ?, ?)", [json_encode($v), maintenant()]);
    } catch (Throwable) {
        // Deux demandes en même temps : l'autre a créé la clé, c'est elle qui compte
        $ligne = requete("SELECT valeur FROM reglages_amorac WHERE cle = 'vapid'")->fetch();
        if ($ligne) return json_decode($ligne['valeur'], true);
    }
    return $v;
}

/** Signature ECDSA au format JWT (R puis S, 32 octets chacun) à partir de la signature DER d'OpenSSL */
function signatureJwt(string $der): string
{
    $i = 2; // 0x30, longueur
    if (ord($der[1]) & 0x80) $i += ord($der[1]) & 0x7f;
    $morceaux = [];
    for ($k = 0; $k < 2; $k++) {
        $longueur = ord($der[$i + 1]);
        $morceaux[] = substr($der, $i + 2, $longueur);
        $i += 2 + $longueur;
    }
    return implode('', array_map(fn ($n) => str_pad(ltrim($n, "\0"), 32, "\0", STR_PAD_LEFT), $morceaux));
}

/** En-tête Authorization (VAPID) pour un service de notification donné */
function enteteVapid(string $adresse): string
{
    $p = parse_url($adresse);
    $audience = $p['scheme'] . '://' . $p['host'];
    $sujet = 'mailto:' . (lireFichierEnvCle('EmailEquipe') ?? 'contact@kaislo.com');
    $cle = cleVapid();
    $donnees = base64url(json_encode(['typ' => 'JWT', 'alg' => 'ES256'])) . '.' . base64url(json_encode(['aud' => $audience, 'exp' => time() + 12 * 3600, 'sub' => $sujet]));
    openssl_sign($donnees, $der, $cle['privee'], OPENSSL_ALGO_SHA256);
    return 'vapid t=' . $donnees . '.' . base64url(signatureJwt($der)) . ', k=' . $cle['publique'];
}

// ---------- Envoi ----------

function abonnementsPush(string $commerceId): array
{
    return requete("SELECT a.* FROM abonnements_push a JOIN utilisateurs u ON u.id = a.utilisateur_id WHERE a.commerce_id = ? AND u.role = 'gerant' AND u.actif = 1", [$commerceId])->fetchAll();
}

/** Signal vide au service de notification : [ok, détail]. 404 et 410 : l'appareil s'est désabonné, on l'oublie. */
function signalerPush(array $abo): array
{
    $entete = enteteVapid($abo['endpoint']);
    if (modeEssaiNotifications()) return [true, "essai : Authorization: $entete"];
    $ctx = stream_context_create(['http' => [
        'method' => 'POST', 'timeout' => 8, 'ignore_errors' => true, 'content' => '',
        'header' => "Authorization: $entete\r\nTTL: 86400\r\nUrgency: high\r\nContent-Length: 0\r\n",
    ]]);
    @file_get_contents($abo['endpoint'], false, $ctx);
    $statut = isset($http_response_header[0]) && preg_match('#\s(\d{3})\s#', $http_response_header[0], $m) ? (int) $m[1] : 0;
    if ($statut === 404 || $statut === 410) {
        requete('DELETE FROM abonnements_push WHERE id = ?', [$abo['id']]);
        return [false, "appareil désabonné ($statut)"];
    }
    if ($statut >= 200 && $statut < 300) return [true, "accepté ($statut)"];
    requete('UPDATE abonnements_push SET echecs = COALESCE(echecs, 0) + 1 WHERE id = ?', [$abo['id']]);
    return [false, 'refusé par le service de notification (' . ($statut ?: 'sans réponse') . ')'];
}

/**
 * Notification push à tous les appareils du gérant. Renvoie [nombre d'appareils joints, nombre d'appareils], ou null si aucun appareil.
 * Le texte est gardé ici (push_messages) : l'appareil le lira à l'arrivée du signal.
 */
function envoyerPush(string $commerceId, string $type, string $titre, string $texte, string $url = '/app/'): ?array
{
    $abos = abonnementsPush($commerceId);
    if (!$abos) return null;
    $joints = 0;
    foreach ($abos as $abo) {
        requete('INSERT INTO push_messages (id, abonnement_id, titre, texte, url, tag, cree_le) VALUES (?, ?, ?, ?, ?, ?, ?)', [
            nouvelId('pm'), $abo['id'], mb_substr($titre, 0, 120), mb_substr($texte, 0, 400), $url, $type, maintenant(),
        ]);
        [$ok, $detail] = signalerPush($abo);
        noterNotification($commerceId, $type, 'push', $ok ? 'envoye' : 'echec', $detail . "\n" . $titre . ' — ' . $texte);
        if ($ok) $joints++;
    }
    // Nettoyage : messages livrés ou vieux de plus de 3 jours
    requete('DELETE FROM push_messages WHERE cree_le < ?', [maintenant(-3 * 86400)]);
    return [$joints, count($abos)];
}

// ---------- Routes ----------

function routePushAbonner(): never
{
    $u = utilisateurConnecte();
    if ($u['role'] !== 'gerant') throw new ErreurApi('Réservé au gérant', 403);
    $e = entree();
    $endpoint = (string) ($e['endpoint'] ?? '');
    if (!adressePushAutorisee($endpoint)) throw new ErreurApi('Ce navigateur n’est pas pris en charge pour les notifications');
    $hash = hash('sha256', $endpoint);
    $appareil = mb_substr((string) ($e['appareil'] ?? ''), 0, 200);
    $existant = requete('SELECT id FROM abonnements_push WHERE endpoint_hash = ?', [$hash])->fetch();
    if ($existant) {
        requete('UPDATE abonnements_push SET commerce_id = ?, utilisateur_id = ?, appareil = ?, vu_le = ?, echecs = 0 WHERE id = ?', [$u['commerce_id'], $u['id'], $appareil, maintenant(), $existant['id']]);
    } else {
        $nb = (int) requete('SELECT COUNT(*) AS n FROM abonnements_push WHERE utilisateur_id = ?', [$u['id']])->fetch()['n'];
        if ($nb >= 10) throw new ErreurApi('Trop d’appareils : désactivez les notifications sur un ancien appareil', 400);
        requete('INSERT INTO abonnements_push (id, commerce_id, utilisateur_id, endpoint_hash, endpoint, appareil, cree_le, vu_le, echecs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)', [
            nouvelId('ap'), $u['commerce_id'], $u['id'], $hash, $endpoint, $appareil, maintenant(), maintenant(),
        ]);
    }
    repondre(['ok' => true]);
}

function routePushDesabonner(): never
{
    $u = utilisateurConnecte();
    $e = entree();
    $endpoint = (string) ($e['endpoint'] ?? '');
    requete('DELETE FROM abonnements_push WHERE endpoint_hash = ? AND utilisateur_id = ?', [hash('sha256', $endpoint), $u['id']]);
    repondre(['ok' => true]);
}

// Appelé par le service worker de l'appareil à l'arrivée d'un signal : l'adresse de l'abonnement (secrète) identifie l'appareil
function routePushMessage(): never
{
    $e = entree();
    $endpoint = (string) ($e['endpoint'] ?? '');
    $cleIp = 'push:' . hash('sha256', adresseIp());
    $abo = adressePushAutorisee($endpoint) ? requete('SELECT id FROM abonnements_push WHERE endpoint_hash = ?', [hash('sha256', $endpoint)])->fetch() : false;
    if (!$abo) {
        if (noterEchec($cleIp, 60)) throw new ErreurApi('Trop de demandes', 429);
        throw new ErreurApi('Appareil inconnu', 404);
    }
    $lignes = requete('SELECT id, titre, texte, url, tag FROM push_messages WHERE abonnement_id = ? AND livre_le IS NULL ORDER BY cree_le LIMIT 5', [$abo['id']])->fetchAll();
    foreach ($lignes as $l) requete('UPDATE push_messages SET livre_le = ? WHERE id = ?', [maintenant(), $l['id']]);
    // Un signal sans texte (déjà lu, ou perdu) affiche quand même une notification discrète : les navigateurs l'exigent
    $messages = $lignes ? array_map(fn ($l) => ['titre' => $l['titre'], 'texte' => $l['texte'], 'url' => $l['url'], 'tag' => $l['tag']], $lignes)
        : [['titre' => 'Kaislo', 'texte' => 'Ouvrez Kaislo pour voir les nouveautés.', 'url' => '/app/', 'tag' => 'kaislo']];
    repondre(['ok' => true, 'messages' => $messages]);
}
