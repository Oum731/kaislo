<?php
// ------------------------------------------------------------
// NOTIFICATIONS AUX COMMERÇANTS : résumé du soir automatique et nouvelles commandes en ligne,
// par e-mail et/ou WhatsApp selon ce qui est disponible sur le compte.
//
//   GET  /api/notifications            état : canaux disponibles, réglages, derniers envois (gérant)
//   POST /api/notifications/tester     envoie le résumé du jour tout de suite, pour essayer (gérant)
//   GET|POST /api/cron/notifications?cle=…   envoie les résumés dont l'heure est venue (appelé chaque heure par le planificateur)
//
// Réglages du commerçant : élément « reglages » → notifications { resume, heure, email, whatsapp, commandes }.
// Par défaut : résumé à 21 h, par e-mail si le commerce a une adresse ; WhatsApp seulement si le gérant l'a activé (son accord).
//
// Canaux :
//   e-mail   : adresse du commerce (Réglages → Commerce), envoi par la fonction mail() de l'hébergement ;
//   WhatsApp : numéro du commerce, via l'API WhatsApp Business (Meta) : lignes WhatsAppToken, WhatsAppNumeroId et, si besoin,
//              WhatsAppModeleResume / WhatsAppModeleCommande dans le .env. Sans ces lignes, WhatsApp n'est pas proposé.
// Mode d'essai : « NotificationsMode=test » dans le .env n'envoie rien, mais note chaque message dans la table notifications.
// ------------------------------------------------------------

const HEURE_RESUME_DEFAUT = 21;
const DEPUIS_ANCIENS_STOCK = '2026-10-05T00:00:00.000Z'; // même valeur que src/lib/donnees/stock.js
const VENTES_MAX_STOCK = 30000; // au-delà, pas d'alerte de stock dans le résumé (calcul trop long)

// ---------- Réglages et canaux ----------

function prefsNotifications(array $reglages): array
{
    $n = is_array($reglages['notifications'] ?? null) ? $reglages['notifications'] : [];
    $heure = (int) ($n['heure'] ?? HEURE_RESUME_DEFAUT);
    return [
        'resume' => ($n['resume'] ?? true) !== false,
        'heure' => $heure >= 0 && $heure <= 23 ? $heure : HEURE_RESUME_DEFAUT,
        'email' => ($n['email'] ?? true) !== false,
        'whatsapp' => ($n['whatsapp'] ?? false) === true, // jamais sans l'accord du gérant
        'commandes' => ($n['commandes'] ?? true) !== false,
        'push' => ($n['push'] ?? true) !== false, // notification sur les appareils où le gérant l'a autorisée
    ];
}

function whatsappConfigure(): bool
{
    return (lireFichierEnvCle('WhatsAppToken') ?? '') !== '' && (lireFichierEnvCle('WhatsAppNumeroId') ?? '') !== '';
}

function modeEssaiNotifications(): bool
{
    return lireFichierEnvCle('NotificationsMode') === 'test';
}

// Adresse e-mail et numéro WhatsApp (chiffres, avec l'indicatif) disponibles sur le compte, ou null
function canauxDuCompte(array $commerce, array $reglages): array
{
    $email = trim((string) ($reglages['email'] ?? ''));
    $numero = preg_replace('/\D/', '', (string) ($commerce['telephone'] ?? ''));
    return [
        'email' => filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : null,
        'whatsapp' => strlen($numero) >= 8 ? $numero : null,
    ];
}

function langueNotifications(array $commerce, array $reglages): string
{
    $l = (string) ($reglages['langue'] ?? '');
    if ($l === 'fr' || $l === 'en') return $l;
    return ($commerce['pays'] ?? '') === 'XX' ? 'en' : 'fr';
}

// ---------- Mise en forme ----------

function fuseauDuCommerce(array $commerce): DateTimeZone
{
    foreach (LISTE_PAYS as $p) {
        if (($p['id'] ?? '') === ($commerce['pays'] ?? '') && !empty($p['fuseaux'][0])) {
            try { return new DateTimeZone($p['fuseaux'][0]); } catch (Throwable) { break; }
        }
    }
    return new DateTimeZone('UTC');
}

function montantTexte(float $x, string $devise): string
{
    $decimales = in_array($devise, ['FCFA', 'GNF'], true) ? 0 : 2;
    $n = number_format(round($x, $decimales), $decimales, ',', ' ');
    return match ($devise) { 'EUR' => "$n €", 'MAD' => "$n DH", 'USD' => "$$n", 'CAD' => "$n $ CA", default => "$n $devise" };
}

function dateTexte(DateTimeImmutable $j, string $langue): string
{
    $jours = $langue === 'en' ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] : ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    $mois = $langue === 'en'
        ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        : ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    return $jours[(int) $j->format('w')] . ' ' . $j->format('j') . ' ' . $mois[(int) $j->format('n') - 1];
}

// ---------- Calcul du résumé d'une journée ----------

/**
 * Chiffres du jour local du commerce (le jour contenant $maintenant).
 * Renvoie : nb, total, panier, marge (null si inconnue), paiements [[mode, total, nb]], top [[nom, quantite]], depenses, credit,
 *           stockBas [[nom, stock]], commandesEnAttente, ventesRecentes (7 jours avant), jour (DateTimeImmutable)
 */
function calculerResume(array $commerce, array $reglages, ?DateTimeImmutable $maintenant = null): array
{
    $fuseau = fuseauDuCommerce($commerce);
    $maintenant ??= new DateTimeImmutable('now', $fuseau);
    $maintenant = $maintenant->setTimezone($fuseau);
    $debutLocal = $maintenant->setTime(0, 0, 0);
    $format = fn (DateTimeImmutable $t) => $t->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s.000\Z');
    $debut = $format($debutLocal);
    $fin = $format($debutLocal->modify('+1 day'));
    $debutSemaine = $format($debutLocal->modify('-7 days'));
    $id = $commerce['id'];
    $devise = (string) $commerce['devise'];

    // Produits dont le stock est suivi (pour l'alerte de stock bas)
    $produits = [];
    foreach (requete("SELECT contenu FROM elements WHERE commerce_id = ? AND type = 'produits' AND supprime = 0", [$id]) as $l) {
        $p = json_decode($l['contenu'], true);
        if (is_array($p) && !empty($p['suiviStock']) && ($p['actif'] ?? true) !== false) $produits[(string) ($p['id'] ?? '')] = $p;
    }
    $delta = array_fill_keys(array_keys($produits), 0.0);
    $depuisDe = fn (array $p) => (string) ($p['stockDepuis'] ?? DEPUIS_ANCIENS_STOCK);

    $nb = 0; $total = 0.0; $marge = null; $paiements = []; $articles = []; $credit = []; $recentes = 0; $lues = 0;
    foreach (requete("SELECT contenu FROM elements WHERE commerce_id = ? AND type = 'ventes' AND supprime = 0", [$id]) as $l) {
        $v = json_decode($l['contenu'], true);
        if (!is_array($v) || !empty($v['annulee'])) continue;
        $date = (string) ($v['date'] ?? '');
        $lues++;
        $lignes = is_array($v['lignes'] ?? null) ? $v['lignes'] : [];
        foreach ($lignes as $ligne) {
            $pid = (string) ($ligne['produitId'] ?? '');
            if (isset($produits[$pid]) && $date >= $depuisDe($produits[$pid])) $delta[$pid] -= (float) ($ligne['quantite'] ?? 0);
        }
        if (($v['paiement'] ?? '') === 'Crédit' && !empty($v['clientId'])) $credit[$v['clientId']] = ($credit[$v['clientId']] ?? 0) + (float) ($v['total'] ?? 0);
        if ($date >= $debutSemaine && $date < $debut) $recentes++;
        if ($date < $debut || $date >= $fin) continue;
        $nb++;
        $t = (float) ($v['total'] ?? 0);
        $total += $t;
        $mode = (string) ($v['paiement'] ?? '');
        $paiements[$mode] = [($paiements[$mode][0] ?? 0) + $t, ($paiements[$mode][1] ?? 0) + 1];
        $cout = null;
        foreach ($lignes as $ligne) {
            $nom = (string) ($ligne['nom'] ?? '');
            if ($nom !== '') $articles[$nom] = ($articles[$nom] ?? 0) + (float) ($ligne['quantite'] ?? 0);
            if (isset($ligne['coutUnitaire']) && is_numeric($ligne['coutUnitaire'])) $cout = ($cout ?? 0) + (float) $ligne['coutUnitaire'] * (float) ($ligne['quantite'] ?? 0);
        }
        if ($cout !== null) $marge = ($marge ?? 0) + $t - $cout;
    }

    foreach (requete("SELECT contenu FROM elements WHERE commerce_id = ? AND type = 'mouvements' AND supprime = 0", [$id]) as $l) {
        $m = json_decode($l['contenu'], true);
        $pid = is_array($m) ? (string) ($m['produitId'] ?? '') : '';
        if ($pid !== '' && isset($produits[$pid]) && (string) ($m['date'] ?? '') >= $depuisDe($produits[$pid])) $delta[$pid] += (float) ($m['quantite'] ?? 0);
    }
    foreach (requete("SELECT contenu FROM elements WHERE commerce_id = ? AND type = 'remboursements' AND supprime = 0", [$id]) as $l) {
        $r = json_decode($l['contenu'], true);
        if (is_array($r) && !empty($r['clientId'])) $credit[$r['clientId']] = ($credit[$r['clientId']] ?? 0) - (float) ($r['montant'] ?? 0);
    }
    $creditTotal = 0.0;
    foreach ($credit as $solde) $creditTotal += max(0.0, $solde);

    $depenses = 0.0;
    foreach (requete("SELECT contenu FROM elements WHERE commerce_id = ? AND type = 'depenses' AND supprime = 0", [$id]) as $l) {
        $x = json_decode($l['contenu'], true);
        $d = is_array($x) ? (string) ($x['date'] ?? '') : '';
        if ($d >= $debut && $d < $fin) $depenses += (float) ($x['montant'] ?? 0);
    }

    $stockBas = [];
    if ($lues <= VENTES_MAX_STOCK) {
        foreach ($produits as $pid => $p) {
            $stock = (float) ($p['stockBase'] ?? $p['stock'] ?? 0) + $delta[$pid];
            if ($stock <= (float) ($p['seuilAlerte'] ?? 5)) $stockBas[] = [(string) ($p['nom'] ?? ''), $stock];
        }
        usort($stockBas, fn ($a, $b) => $a[1] <=> $b[1]);
    }

    arsort($articles);
    $top = [];
    foreach (array_slice($articles, 0, 3, true) as $nom => $q) $top[] = [$nom, $q];
    uasort($paiements, fn ($a, $b) => $b[0] <=> $a[0]);
    $modes = [];
    foreach ($paiements as $mode => [$t, $n]) $modes[] = [$mode, $t, $n];

    $commandes = (int) requete("SELECT COUNT(*) AS n FROM commandes_en_ligne WHERE commerce_id = ? AND statut = 'nouvelle'", [$id])->fetch()['n'];
    return [
        'jour' => $debutLocal, 'devise' => $devise, 'nb' => $nb, 'total' => $total, 'panier' => $nb ? $total / $nb : 0.0, 'marge' => $marge,
        'paiements' => $modes, 'top' => $top, 'depenses' => $depenses, 'credit' => $creditTotal, 'stockBas' => array_slice($stockBas, 0, 5), 'nbStockBas' => count($stockBas),
        'commandesEnAttente' => $commandes, 'ventesRecentes' => $recentes,
    ];
}

/**
 * Texte du résumé : sujet et corps (e-mail), et la ligne courte pour WhatsApp (variables du modèle approuvé par Meta).
 * Renvoie [sujet, corps, variables].
 */
function composerResume(array $commerce, array $r, string $langue): array
{
    $en = $langue === 'en';
    $dev = $r['devise'];
    $nom = (string) $commerce['nom'];
    $date = dateTexte($r['jour'], $langue);
    $m = fn (float $x) => montantTexte($x, $dev);
    $L = [];
    if ($r['nb'] === 0) {
        $L[] = $en ? 'No sales recorded today.' : 'Aucune vente enregistrée aujourd’hui.';
    } else {
        $L[] = ($en ? 'Sales: ' : 'Ventes : ') . $m($r['total']) . ' (' . $r['nb'] . ($en ? ' tickets' : ' tickets') . ')';
        $L[] = ($en ? 'Average ticket: ' : 'Panier moyen : ') . $m($r['panier']);
        if ($r['marge'] !== null) $L[] = ($en ? 'Margin: ' : 'Marge : ') . $m($r['marge']);
        foreach ($r['paiements'] as [$mode, $t, $n]) $L[] = "  · $mode : " . $m($t) . " ($n)";
        if ($r['top']) $L[] = ($en ? 'Best sellers: ' : 'Les plus vendus : ') . implode(', ', array_map(fn ($a) => $a[0] . ' (' . rtrim(rtrim(number_format($a[1], 2, '.', ''), '0'), '.') . ')', $r['top']));
    }
    if ($r['depenses'] > 0) $L[] = ($en ? 'Expenses: ' : 'Dépenses : ') . $m($r['depenses']);
    if ($r['credit'] > 0) $L[] = ($en ? 'Customer credit to collect: ' : 'Crédits à récupérer : ') . $m($r['credit']);
    if ($r['commandesEnAttente'] > 0) $L[] = ($en ? 'Online orders to handle: ' : 'Commandes en ligne à traiter : ') . $r['commandesEnAttente'];
    if ($r['stockBas']) {
        $L[] = $en ? 'Low stock:' : 'Stock bas :';
        foreach ($r['stockBas'] as [$n, $s]) $L[] = '  · ' . $n . ' : ' . ($s <= 0 ? ($en ? 'out of stock' : 'rupture') : rtrim(rtrim(number_format($s, 2, '.', ''), '0'), '.'));
        if ($r['nbStockBas'] > count($r['stockBas'])) $L[] = '  · ' . ($en ? '… and ' : '… et ') . ($r['nbStockBas'] - count($r['stockBas'])) . ($en ? ' more' : ' autres');
    }
    $url = 'https://' . (domaineSite() ?: 'kaislo.com') . '/app/';
    $sujet = ($en ? 'Kaislo: your evening summary, ' : 'Kaislo : votre résumé du soir, ') . $nom;
    $corps = ($en ? "Hello,\n\nHere is the summary for $nom, $date.\n\n" : "Bonjour,\n\nVoici le résumé de $nom pour $date.\n\n") . implode("\n", $L)
        . "\n\n" . ($en ? "Open Kaislo: $url\nTo change or stop this message: Account → Notifications.\n" : "Ouvrir Kaislo : $url\nPour modifier ou arrêter ce message : Compte → Notifications.\n") . "\nKaislo · kaislo.com";
    // Variables du modèle WhatsApp : courtes, sans retour à la ligne (règle de Meta)
    $variables = [
        $nom,
        $date,
        $r['nb'] ? $m($r['total']) . ' (' . $r['nb'] . ' tickets)' : ($en ? 'no sales' : 'aucune vente'),
        $r['depenses'] > 0 ? $m($r['depenses']) : '0',
        $r['credit'] > 0 ? $m($r['credit']) : '0',
        $r['nbStockBas'] > 0 ? ($en ? $r['nbStockBas'] . ' item(s) low' : $r['nbStockBas'] . ' article(s) bas') : ($en ? 'stock OK' : 'stock correct'),
    ];
    return [$sujet, $corps, $variables];
}

// ---------- Envoi ----------

function noterNotification(string $commerceId, string $type, string $canal, string $statut, string $detail = ''): void
{
    requete('INSERT INTO notifications (id, commerce_id, type, canal, statut, detail, cree_le) VALUES (?, ?, ?, ?, ?, ?, ?)', [
        nouvelId('nt'), $commerceId, $type, $canal, $statut, mb_substr($detail, 0, 4000), maintenant(),
    ]);
}

function envoyerEmailMaintenant(string $a, string $sujet, string $texte): bool
{
    $expediteur = lireFichierEnvCle('EmailExpediteur') ?? ('no-reply@' . (domaineSite() ?: 'kaislo.com'));
    $entetes = "From: Kaislo <$expediteur>\r\nReply-To: $expediteur\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: 8bit";
    return (bool) @mail($a, '=?UTF-8?B?' . base64_encode($sujet) . '?=', $texte, $entetes);
}

/** Corps de la demande à l'API WhatsApp (message « modèle » : seul type autorisé pour écrire le premier). */
function chargeWhatsAppModele(string $numero, string $modele, string $langue, array $variables): array
{
    return [
        'messaging_product' => 'whatsapp', 'to' => $numero, 'type' => 'template',
        'template' => [
            'name' => $modele, 'language' => ['code' => $langue],
            'components' => [['type' => 'body', 'parameters' => array_map(fn ($v) => ['type' => 'text', 'text' => preg_replace('/\s+/', ' ', trim((string) $v))], $variables)]],
        ],
    ];
}

function envoyerWhatsAppModele(string $numero, string $modele, string $langue, array $variables): array
{
    $charge = chargeWhatsAppModele($numero, $modele, $langue, $variables);
    if (modeEssaiNotifications()) return [true, 'essai : ' . json_encode($charge, JSON_UNESCAPED_UNICODE)];
    $jeton = (string) lireFichierEnvCle('WhatsAppToken');
    $idNumero = preg_replace('/\D/', '', (string) lireFichierEnvCle('WhatsAppNumeroId'));
    $ctx = stream_context_create(['http' => [
        'method' => 'POST', 'timeout' => 10, 'ignore_errors' => true,
        'header' => "Content-Type: application/json\r\nAuthorization: Bearer $jeton\r\n",
        'content' => json_encode($charge, JSON_UNESCAPED_UNICODE),
    ]]);
    $reponse = @file_get_contents("https://graph.facebook.com/v21.0/$idNumero/messages", false, $ctx);
    $json = $reponse ? json_decode($reponse, true) : null;
    if (is_array($json) && !empty($json['messages'][0]['id'])) return [true, 'accepté par WhatsApp'];
    $raison = is_array($json) ? (string) ($json['error']['message'] ?? 'réponse inattendue') : 'pas de réponse de WhatsApp';
    return [false, mb_substr($raison, 0, 300)];
}

/**
 * Envoie un message sur les canaux choisis par le gérant et disponibles sur le compte.
 * $contenu : sujet et corps (e-mail), variables et modele (WhatsApp).
 * Renvoie la liste des résultats : [canal, statut ('envoye'|'echec'|'indisponible'), détail]. Vide : aucun canal choisi.
 */
function envoyerNotification(array $commerce, array $reglages, string $type, array $contenu, string $langue): array
{
    $prefs = prefsNotifications($reglages);
    $canaux = canauxDuCompte($commerce, $reglages);
    $resultats = [];
    $id = $commerce['id'];

    if ($prefs['email'] && $canaux['email']) {
        $ok = modeEssaiNotifications() ? true : envoyerEmailMaintenant($canaux['email'], $contenu['sujet'], $contenu['corps']);
        $detail = modeEssaiNotifications() ? "essai : à {$canaux['email']}\n{$contenu['sujet']}\n\n{$contenu['corps']}" : $canaux['email'];
        noterNotification($id, $type, 'email', $ok ? 'envoye' : 'echec', $detail);
        $resultats[] = ['email', $ok ? 'envoye' : 'echec', $canaux['email']];
    }
    if ($prefs['push'] && !empty($contenu['push'])) {
        $r = envoyerPush($id, $type === 'essai' ? 'essai' : $type, $contenu['push'][0], $contenu['push'][1]);
        if ($r) $resultats[] = ['push', $r[0] > 0 ? 'envoye' : 'echec', $r[0] . '/' . $r[1]];
    }
    if ($prefs['whatsapp']) {
        if (!whatsappConfigure() && !modeEssaiNotifications()) {
            $resultats[] = ['whatsapp', 'indisponible', 'WhatsApp n’est pas encore activé sur Kaislo'];
        } elseif (!$canaux['whatsapp']) {
            $resultats[] = ['whatsapp', 'indisponible', 'Aucun numéro sur le compte'];
        } else {
            [$ok, $detail] = envoyerWhatsAppModele($canaux['whatsapp'], $contenu['modele'], $langue, $contenu['variables']);
            noterNotification($id, $type, 'whatsapp', $ok ? 'envoye' : 'echec', $detail);
            $resultats[] = ['whatsapp', $ok ? 'envoye' : 'echec', $ok ? $canaux['whatsapp'] : $detail];
        }
    }
    return $resultats;
}

function modeleWhatsApp(string $cle, string $defaut, string $langue): string
{
    $nom = lireFichierEnvCle($cle) ?? $defaut;
    return $langue === 'en' ? ($nom . '_en') : $nom;
}

// ---------- Résumé du soir ----------

function envoyerResume(array $commerce, array $reglages): array
{
    $langue = langueNotifications($commerce, $reglages);
    $r = calculerResume($commerce, $reglages);
    [$sujet, $corps, $variables] = composerResume($commerce, $r, $langue);
    return envoyerNotification($commerce, $reglages, 'resume', [
        'sujet' => $sujet, 'corps' => $corps, 'variables' => $variables, 'push' => pushResume($commerce, $r, $langue),
        'modele' => modeleWhatsApp('WhatsAppModeleResume', 'kaislo_resume_soir', $langue),
    ], $langue);
}

// Texte court du résumé pour une notification push : titre et une ligne
function pushResume(array $commerce, array $r, string $langue): array
{
    $en = $langue === 'en';
    $m = fn (float $x) => montantTexte($x, $r['devise']);
    $ligne = $r['nb'] ? $m($r['total']) . ' · ' . $r['nb'] . ' tickets' : ($en ? 'No sales today' : 'Aucune vente aujourd’hui');
    if ($r['depenses'] > 0) $ligne .= ' · ' . ($en ? 'expenses ' : 'dépenses ') . $m($r['depenses']);
    if ($r['nbStockBas'] > 0) $ligne .= ' · ' . ($en ? $r['nbStockBas'] . ' low stock' : $r['nbStockBas'] . ' stock bas');
    return [($en ? 'Evening summary · ' : 'Résumé du soir · ') . $commerce['nom'], $ligne];
}

// Un commerce reçoit-il son résumé maintenant ? (heure locale choisie, pas déjà envoyé aujourd'hui, abonnement en cours)
function resumeDu(array $commerce, array $reglages, DateTimeImmutable $maintenantUtc): bool
{
    if (($commerce['statut'] ?? '') === 'suspendu' || abonnementExpire($commerce)) return false;
    $prefs = prefsNotifications($reglages);
    if (!$prefs['resume']) return false;
    $canaux = canauxDuCompte($commerce, $reglages);
    $aUnCanal = ($prefs['push'] && abonnementsPush($commerce['id'])) || ($prefs['email'] && $canaux['email']) || ($prefs['whatsapp'] && $canaux['whatsapp'] && (whatsappConfigure() || modeEssaiNotifications()));
    if (!$aUnCanal) return false;
    $local = $maintenantUtc->setTimezone(fuseauDuCommerce($commerce));
    if ((int) $local->format('G') < $prefs['heure']) return false; // pas encore l'heure
    return ($commerce['resume_envoye_le'] ?? '') !== $local->format('Y-m-d');
}

function routeCronNotifications(): never
{
    $cle = (string) (lireFichierEnvCle('CleCron') ?? '');
    if (strlen($cle) < 12) throw new ErreurApi('Ajoutez une ligne « CleCron=… » (12 caractères ou plus) dans le fichier .env du serveur', 503);
    $recue = (string) ($_GET['cle'] ?? $_SERVER['HTTP_X_CLE_CRON'] ?? '');
    if (!hash_equals($cle, $recue)) throw new ErreurApi('Clé incorrecte', 403);

    $maintenantUtc = new DateTimeImmutable('now', new DateTimeZone('UTC'));
    $envoyes = 0; $ignores = 0; $echecs = 0;
    foreach (requete("SELECT * FROM commerces WHERE statut <> 'suspendu'")->fetchAll() as $commerce) {
        try {
            $reglages = reglagesCommerce($commerce['id']);
            if (!resumeDu($commerce, $reglages, $maintenantUtc)) { $ignores++; continue; }
            $local = $maintenantUtc->setTimezone(fuseauDuCommerce($commerce));
            // Marqué avant l'envoi : un commerce n'est jamais servi deux fois le même jour, même si l'envoi échoue
            requete('UPDATE commerces SET resume_envoye_le = ? WHERE id = ?', [$local->format('Y-m-d'), $commerce['id']]);
            $r = calculerResume($commerce, $reglages, $maintenantUtc);
            if ($r['nb'] === 0 && $r['ventesRecentes'] === 0 && !$r['stockBas'] && !$r['commandesEnAttente']) { $ignores++; continue; } // commerce inactif : pas de message vide
            $resultats = envoyerResume($commerce, $reglages);
            if (array_filter($resultats, fn ($x) => $x[1] === 'envoye')) $envoyes++; else $echecs++;
        } catch (Throwable $e) {
            $echecs++;
            error_log('[Kaislo notifications] ' . $commerce['id'] . ' : ' . $e->getMessage());
        }
    }
    repondre(['ok' => true, 'envoyes' => $envoyes, 'ignores' => $ignores, 'echecs' => $echecs]);
}

// ---------- Nouvelle commande en ligne ----------

function notifierNouvelleCommande(string $commerceId, array $commande): void
{
    try {
        $commerce = requete('SELECT * FROM commerces WHERE id = ?', [$commerceId])->fetch();
        if (!$commerce) return;
        $reglages = reglagesCommerce($commerceId);
        if (!prefsNotifications($reglages)['commandes']) return;
        $langue = langueNotifications($commerce, $reglages);
        $en = $langue === 'en';
        $dev = (string) $commerce['devise'];
        $total = montantTexte((float) $commande['total'], $dev);
        $lignes = array_map(fn ($l) => '  · ' . $l['quantite'] . ' × ' . $l['nom'] . (empty($l['options']) ? '' : ' (' . implode(', ', $l['options']) . ')'), $commande['lignes']);
        $url = 'https://' . (domaineSite() ?: 'kaislo.com') . '/app/';
        $sujet = ($en ? 'Kaislo: new online order no. ' : 'Kaislo : nouvelle commande en ligne n° ') . $commande['numero'] . ' — ' . $total;
        $corps = ($en ? "Hello,\n\nNew online order no. {$commande['numero']} for {$commande['boutique']}.\n\n" : "Bonjour,\n\nNouvelle commande en ligne n° {$commande['numero']} pour {$commande['boutique']}.\n\n")
            . ($en ? 'Customer: ' : 'Client : ') . $commande['client']['nom'] . ' · ' . $commande['client']['telephone'] . "\n"
            . ($en ? 'Address: ' : 'Adresse : ') . $commande['client']['adresse'] . "\n\n" . implode("\n", $lignes) . "\n\nTotal : $total\n"
            . ($commande['note'] !== '' ? ($en ? 'Note: ' : 'Note : ') . $commande['note'] . "\n" : '')
            . "\n" . ($en ? "Handle it in Kaislo: $url (Account → Online orders)\n" : "À traiter dans Kaislo : $url (Compte → Commandes en ligne)\n") . "\nKaislo · kaislo.com";
        $variables = [(string) $commande['numero'], $commande['client']['nom'], $total, mb_substr($commande['client']['adresse'], 0, 80)];
        $push = [($en ? 'New online order no. ' : 'Nouvelle commande n° ') . $commande['numero'], $commande['client']['nom'] . ' · ' . $total];
        apresReponse(function () use ($commerce, $reglages, $sujet, $corps, $variables, $push, $langue) {
            envoyerNotification($commerce, $reglages, 'commande', [
                'sujet' => $sujet, 'corps' => $corps, 'variables' => $variables, 'push' => $push, 'modele' => modeleWhatsApp('WhatsAppModeleCommande', 'kaislo_nouvelle_commande', $langue),
            ], $langue);
        });
    } catch (Throwable $e) {
        error_log('[Kaislo notifications] commande : ' . $e->getMessage()); // une notification ratée ne bloque jamais la commande
    }
}

// ---------- Côté application (gérant) ----------

function gerantConnecteNotifications(): array
{
    $u = utilisateurConnecte();
    if ($u['role'] !== 'gerant') throw new ErreurApi('Réservé au gérant', 403);
    return $u;
}

function masquerEmail(string $e): string
{
    [$nom, $domaine] = explode('@', $e, 2) + ['', ''];
    return mb_substr($nom, 0, 2) . '***@' . $domaine;
}

function routeNotificationsEtat(): never
{
    $u = gerantConnecteNotifications();
    $commerce = requete('SELECT * FROM commerces WHERE id = ?', [$u['commerce_id']])->fetch();
    $reglages = reglagesCommerce($u['commerce_id']);
    $canaux = canauxDuCompte($commerce, $reglages);
    $derniers = requete('SELECT type, canal, statut, cree_le FROM notifications WHERE commerce_id = ? ORDER BY cree_le DESC LIMIT 5', [$u['commerce_id']])->fetchAll();
    repondre(['ok' => true,
        'reglages' => prefsNotifications($reglages),
        'email' => ['disponible' => (bool) $canaux['email'], 'adresse' => $canaux['email'] ? masquerEmail($canaux['email']) : null],
        'whatsapp' => ['plateforme' => whatsappConfigure(), 'disponible' => whatsappConfigure() && (bool) $canaux['whatsapp'], 'numero' => $canaux['whatsapp'] ? ((string) $commerce['telephone'] ?: '+' . $canaux['whatsapp']) : null],
        'push' => ['clePublique' => (function () { try { return cleVapid()['publique']; } catch (Throwable) { return null; } })(), 'appareils' => count(abonnementsPush($u['commerce_id']))],
        'derniers' => array_map(fn ($d) => ['type' => $d['type'], 'canal' => $d['canal'], 'statut' => $d['statut'], 'le' => $d['cree_le']], $derniers),
    ]);
}

function routeNotificationsTester(): never
{
    $u = gerantConnecteNotifications();
    // Au plus un essai toutes les 30 secondes et 10 par heure : ce n'est pas un moyen d'envoyer des messages en masse
    $recents = (int) requete("SELECT COUNT(*) AS n FROM notifications WHERE commerce_id = ? AND type = 'essai' AND cree_le > ?", [$u['commerce_id'], maintenant(-3600)])->fetch()['n'];
    if ($recents >= 10) throw new ErreurApi('Beaucoup d’essais en peu de temps : réessayez plus tard', 429);
    $commerce = requete('SELECT * FROM commerces WHERE id = ?', [$u['commerce_id']])->fetch();
    $reglages = reglagesCommerce($u['commerce_id']);
    $langue = langueNotifications($commerce, $reglages);
    $r = calculerResume($commerce, $reglages);
    [$sujet, $corps, $variables] = composerResume($commerce, $r, $langue);
    $essai = ['sujet' => ($langue === 'en' ? '[Test] ' : '[Essai] ') . $sujet, 'corps' => $corps, 'variables' => $variables, 'push' => pushResume($commerce, $r, $langue), 'modele' => modeleWhatsApp('WhatsAppModeleResume', 'kaislo_resume_soir', $langue)];
    // L'essai part sur les canaux choisis par le gérant (e-mail par défaut) : jamais vers une autre adresse que celle du compte
    $resultats = envoyerNotification($commerce, $reglages, 'essai', $essai, $langue);
    if (!$resultats) {
        $canaux = canauxDuCompte($commerce, $reglages);
        if (!$canaux['email'] && !$canaux['whatsapp']) throw new ErreurApi('Ajoutez d’abord une adresse e-mail (Réglages → Commerce)', 400);
        throw new ErreurApi('Aucun canal choisi : activez l’e-mail ou WhatsApp', 400);
    }
    repondre(['ok' => true, 'resultats' => array_map(fn ($x) => ['canal' => $x[0], 'statut' => $x[1]], $resultats)]);
}
