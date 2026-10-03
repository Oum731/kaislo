<?php
// ------------------------------------------------------------
// API KAISLY (PHP simple, sans framework) — point d'entrée unique.
// Toutes les adresses /api/... arrivent ici (voir api/.htaccess).
//
//   GET  /api/sante         l'API et la base répondent-elles ?
//   POST /api/inscription   créer un commerce et son gérant
//   POST /api/connexion     se connecter avec téléphone + code PIN
//   GET  /api/moi           utilisateur et commerce connectés
//   POST /api/deconnexion   déconnecter cet appareil
//
// Réponses en JSON : { ok: true, ... } ou { ok: false, erreur: "message" }.
// PHP 8.1 minimum (à choisir dans hPanel → Avancé → Configuration PHP).
// ------------------------------------------------------------
declare(strict_types=1);

require __DIR__ . '/lib/config.php';
require __DIR__ . '/lib/base.php';
require __DIR__ . '/lib/outils.php';

ini_set('display_errors', '0'); // jamais de détail technique affiché au visiteur
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

// Chemin demandé, sans le préfixe /api (fonctionne aussi dans un sous-dossier)
$chemin = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$chemin = '/' . trim((string) preg_replace('#^.*?/api(?=/|$)#', '', $chemin), '/');
$methode = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    $route = "$methode $chemin";
    match ($route) {
        'GET /sante', 'GET /' => routeSante(),
        'POST /inscription' => routeInscription(),
        'POST /connexion' => routeConnexion(),
        'GET /moi' => routeMoi(),
        'POST /deconnexion' => routeDeconnexion(),
        default => throw new ErreurApi('Adresse inconnue', 404),
    };
} catch (ErreurApi $e) {
    repondre(['ok' => false, 'erreur' => $e->getMessage()], $e->statut);
} catch (Throwable $e) {
    // Détail dans le journal d'erreurs du serveur seulement
    error_log('[Kaisly API] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    $message = $e instanceof PDOException ? 'Base de données indisponible, réessayez dans un instant' : 'Erreur du serveur, réessayez dans un instant';
    repondre(['ok' => false, 'erreur' => $message], 500);
}

// ---------- GET /api/sante ----------
function routeSante(): never
{
    $c = config();
    if (!$c['trouve']) throw new ErreurApi('Fichier .env introuvable sur le serveur', 500);
    base(); // connexion + création des tables si besoin
    $version = (int) requete('SELECT MAX(version) AS v FROM kaisly_version')->fetch()['v'];
    repondre(['ok' => true, 'service' => 'Kaisly API', 'base' => $c['driver'], 'versionBase' => $version, 'heure' => maintenant()]);
}

// ---------- POST /api/inscription ----------
// { commerce: { nom, type, pays, ville, telephone }, gerant: { nom, telephone, pin }, conditionsAcceptees: true, appareil }
function routeInscription(): never
{
    $e = entree();
    $commerce = is_array($e['commerce'] ?? null) ? $e['commerce'] : [];
    $gerant = is_array($e['gerant'] ?? null) ? $e['gerant'] : [];

    // Limite les inscriptions en série depuis une même adresse
    $cleIp = 'inscription:' . adresseIp();
    verifierBlocage($cleIp);

    $nom = texte($commerce, 'nom', 'le nom du commerce');
    $type = (string) ($commerce['type'] ?? '');
    if (!in_array($type, TYPES_COMMERCE, true)) throw new ErreurApi('Type de commerce inconnu');
    $pays = strtoupper((string) ($commerce['pays'] ?? ''));
    if (!isset(PAYS[$pays])) throw new ErreurApi('Pays non pris en charge');
    $ville = texte($commerce, 'ville', 'la ville');
    $telCommerce = texte($commerce, 'telephone', 'le téléphone du commerce', false, 40);

    $nomGerant = texte($gerant, 'nom', 'votre nom');
    $telGerant = texte($gerant, 'telephone', 'votre numéro de téléphone', true, 40);
    $cle = cleTelephone($telGerant);
    if (!$cle) throw new ErreurApi('Numéro de téléphone incomplet');
    $pin = (string) ($gerant['pin'] ?? '');
    if (!preg_match('/^\d{4}$/', $pin)) throw new ErreurApi('Le code PIN doit contenir 4 chiffres');
    if (($e['conditionsAcceptees'] ?? false) !== true) throw new ErreurApi('Merci d’accepter les conditions d’utilisation');

    if (requete('SELECT 1 FROM utilisateurs WHERE cle_telephone = ?', [$cle])->fetch()) {
        noterEchec($cleIp, 20);
        throw new ErreurApi('Ce numéro est déjà utilisé par un compte Kaisly. Connectez-vous plutôt.', 409);
    }

    $pdo = base();
    $pdo->beginTransaction();
    try {
        // Code du commerce : 6 chiffres, unique
        do { $code = (string) random_int(100000, 999999); } while (requete('SELECT 1 FROM commerces WHERE code = ?', [$code])->fetch());
        $idCommerce = nouvelId('com');
        requete('INSERT INTO commerces (id, code, nom, type, pays, devise, ville, telephone, offre, statut, essai_fin, periode_fin, conditions_acceptees_le, cree_le, modifie_le)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
            $idCommerce, $code, $nom, $type, $pays, PAYS[$pays], $ville, $telCommerce ?: $telGerant,
            'essai', 'essai', maintenant(DUREE_ESSAI_JOURS * 86400), null, maintenant(), maintenant(), maintenant(),
        ]);
        $utilisateur = [
            'id' => nouvelId('u'), 'commerce_id' => $idCommerce, 'nom' => $nomGerant, 'telephone' => $telGerant,
            'cle_telephone' => $cle, 'role' => 'gerant', 'actif' => 1, 'peut_gerer_produits' => 1, 'peut_faire_remises' => 1,
        ];
        requete('INSERT INTO utilisateurs (id, commerce_id, nom, telephone, cle_telephone, pin_hash, role, actif, peut_gerer_produits, peut_faire_remises, cree_le, modifie_le)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, 1, ?, ?)', [
            $utilisateur['id'], $idCommerce, $nomGerant, $telGerant, $cle, password_hash($pin, PASSWORD_DEFAULT), 'gerant', maintenant(), maintenant(),
        ]);
        $jeton = creerJeton($utilisateur, (string) ($e['appareil'] ?? ''));
        journaliser($idCommerce, $utilisateur['id'], 'inscription', ['commerce' => $nom, 'pays' => $pays]);
        $pdo->commit();
        noterEchec($cleIp, 10); // au-delà de 10 inscriptions d'affilée depuis la même adresse : pause de 15 min
    } catch (Throwable $err) {
        $pdo->rollBack();
        throw $err;
    }
    $ligneCommerce = requete('SELECT * FROM commerces WHERE id = ?', [$idCommerce])->fetch();
    repondre(['ok' => true, 'jeton' => $jeton, 'utilisateur' => versUtilisateur($utilisateur), 'commerce' => versCommerce($ligneCommerce)], 201);
}

// ---------- POST /api/connexion ----------
// { telephone, pin, appareil }
function routeConnexion(): never
{
    $e = entree();
    $cle = cleTelephone((string) ($e['telephone'] ?? ''));
    $pin = (string) ($e['pin'] ?? '');
    if (!$cle) throw new ErreurApi('Indiquez votre numéro de téléphone');
    if (!preg_match('/^\d{4}$/', $pin)) throw new ErreurApi('Le code PIN contient 4 chiffres');

    // Blocage par numéro (5 codes faux) et par adresse (30 codes faux, tous numéros confondus)
    $cleTel = 'tel:' . $cle;
    $cleIp = 'ip:' . adresseIp();
    verifierBlocage($cleTel);
    verifierBlocage($cleIp);

    $u = requete('SELECT * FROM utilisateurs WHERE cle_telephone = ?', [$cle])->fetch();
    // Même temps de calcul que le numéro existe ou non (ne révèle pas les numéros inscrits)
    $valide = password_verify($pin, $u ? $u['pin_hash'] : password_hash('leurre', PASSWORD_DEFAULT));
    if (!$u || !$valide) {
        $bloque = noterEchec($cleTel);
        $bloque = noterEchec($cleIp, 30) || $bloque;
        if ($bloque) throw new ErreurApi('Code incorrect. Trop d’essais : réessayez dans ' . MINUTES_BLOCAGE . ' minutes.', 429);
        throw new ErreurApi('Numéro ou code PIN incorrect', 401);
    }
    if (!$u['actif']) throw new ErreurApi('Ce compte a été désactivé par le gérant', 403);
    $commerce = requete('SELECT * FROM commerces WHERE id = ?', [$u['commerce_id']])->fetch();
    if (!$commerce) throw new ErreurApi('Commerce introuvable', 404);
    if ($commerce['statut'] === 'suspendu') throw new ErreurApi('Ce commerce est suspendu. Contactez Amorac.', 403);

    effacerEchecs($cleTel);
    // Le hachage du PIN est mis à jour si PHP recommande un réglage plus fort
    if (password_needs_rehash($u['pin_hash'], PASSWORD_DEFAULT)) {
        requete('UPDATE utilisateurs SET pin_hash = ? WHERE id = ?', [password_hash($pin, PASSWORD_DEFAULT), $u['id']]);
    }
    $jeton = creerJeton($u, (string) ($e['appareil'] ?? ''));
    journaliser($u['commerce_id'], $u['id'], 'connexion');
    repondre(['ok' => true, 'jeton' => $jeton, 'utilisateur' => versUtilisateur($u), 'commerce' => versCommerce($commerce)]);
}

// ---------- GET /api/moi ----------
function routeMoi(): never
{
    $u = utilisateurConnecte();
    $commerce = requete('SELECT * FROM commerces WHERE id = ?', [$u['commerce_id']])->fetch();
    repondre(['ok' => true, 'utilisateur' => versUtilisateur($u), 'commerce' => versCommerce($commerce)]);
}

// ---------- POST /api/deconnexion ----------
function routeDeconnexion(): never
{
    $jeton = jetonRecu();
    if ($jeton) requete('DELETE FROM jetons WHERE jeton_hash = ?', [hash('sha256', $jeton)]);
    repondre(['ok' => true]);
}
