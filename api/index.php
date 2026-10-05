<?php
// ------------------------------------------------------------
// API KAISLO (PHP simple, sans framework) — point d'entrée unique.
// Toutes les adresses /api/... arrivent ici (voir api/.htaccess).
//
//   GET  /api/sante         l'API et la base répondent-elles ?
//   POST /api/inscription   créer un commerce et son gérant
//   POST /api/connexion     se connecter avec téléphone + code PIN
//   GET  /api/moi           utilisateur et commerce connectés
//   POST /api/deconnexion   déconnecter cet appareil
//   GET|POST /api/donnees   synchronisation des caisses (voir lib/donnees.php)
//   POST /api/utilisateurs  vendeurs (gérant) · POST /api/verifier-gerant (annulation)
//   POST /api/biometrie/... empreinte / Face ID (voir lib/biometrie.php)
//   GET|POST /api/messages  messagerie avec l'équipe Amorac (voir lib/messages.php)
//   POST /api/contact       message d'un visiteur du site (voir lib/contact.php)
//   GET  /api/tarifs        formules et règles en vigueur (voir lib/tarifs.php)
//   GET  /api/pays          pays du visiteur d'après son adresse IP (voir lib/pays.php)
//   /api/commercial/...     espace des commerciaux Kaislo (voir lib/commerciaux.php)
//   /api/admin/...          espace Amorac : commerces, abonnements, offres, équipe (voir lib/admin.php)
//
// Réponses en JSON : { ok: true, ... } ou { ok: false, erreur: "message" }.
// PHP 8.1 minimum (à choisir dans hPanel → Avancé → Configuration PHP).
// ------------------------------------------------------------
declare(strict_types=1);

require __DIR__ . '/lib/config.php';
require __DIR__ . '/lib/base.php';
require __DIR__ . '/lib/outils.php';
require __DIR__ . '/lib/telephone.php';
require __DIR__ . '/lib/donnees.php';
require __DIR__ . '/lib/equipe.php';
require __DIR__ . '/lib/biometrie.php';
require __DIR__ . '/lib/messages.php';
require __DIR__ . '/lib/admin.php';
require __DIR__ . '/lib/contact.php';
require __DIR__ . '/lib/tarifs.php';
require __DIR__ . '/lib/pays.php';
require __DIR__ . '/lib/commerciaux.php';

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
        'GET /donnees' => routeDonneesLire(),
        'POST /donnees' => routeDonneesEcrire(),
        'POST /utilisateurs' => routeUtilisateur(),
        'POST /verifier-gerant' => routeVerifierGerant(),
        'POST /biometrie/defi' => routeBiometrieDefi(),
        'POST /biometrie/enregistrer' => routeBiometrieEnregistrer(),
        'POST /biometrie/connexion' => routeBiometrieConnexion(),
        'GET /messages' => routeMessagesLire(),
        'POST /messages' => routeMessagesEcrire(),
        'POST /contact' => routeContact(),
        'GET /admin/contacts' => routeAdminContacts(),
        'POST /admin/contact' => routeAdminContact(),
        'GET /admin/etat' => routeAdminEtat(),
        'POST /admin/installer' => routeAdminInstaller(),
        'POST /admin/connexion' => routeAdminConnexion(),
        'POST /admin/deconnexion' => routeAdminDeconnexion(),
        'GET /admin/moi' => routeAdminMoi(),
        'GET /admin/commerces' => routeAdminCommerces(),
        'GET /admin/commerce' => routeAdminCommerce(),
        'POST /admin/commerce' => routeAdminActionCommerce(),
        'POST /admin/paiement' => routeAdminPaiement(),
        'POST /admin/tarifs' => routeAdminTarifs(),
        'GET /admin/commerciaux' => routeAdminCommerciaux(),
        'GET /admin/commercial' => routeAdminCommercial(),
        'POST /admin/commercial' => routeAdminCommercialEnregistrer(),
        'POST /admin/commissions' => routeAdminCommissions(),
        'POST /admin/programme' => routeAdminProgramme(),
        'GET /tarifs' => routeTarifs(),
        'GET /pays' => routePays(),
        'POST /commercial/inscription' => routeCommercialInscription(),
        'POST /admin/commercial-validation' => routeAdminCommercialValidation(),
        'POST /commercial/connexion' => routeCommercialConnexion(),
        'GET /commercial/moi' => routeCommercialMoi(),
        'POST /commercial/pin' => routeCommercialPin(),
        'POST /commercial/deconnexion' => routeCommercialDeconnexion(),
        'GET /admin/equipe' => routeAdminEquipe(),
        'POST /admin/equipe' => routeAdminEquipeEnregistrer(),
        'GET /admin/conversations' => routeAdminConversations(),
        'GET /admin/messages' => routeAdminMessagesLire(),
        'POST /admin/messages' => routeAdminMessagesEcrire(),
        default => throw new ErreurApi('Adresse inconnue', 404),
    };
} catch (ErreurApi $e) {
    repondre(['ok' => false, 'erreur' => $e->getMessage()], $e->statut);
} catch (Throwable $e) {
    // Détail dans le journal d'erreurs du serveur seulement
    error_log('[Kaislo API] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    $message = $e instanceof PDOException ? 'Base de données indisponible, réessayez dans un instant' : 'Erreur du serveur, réessayez dans un instant';
    repondre(['ok' => false, 'erreur' => $message], 500);
}

// Explique pourquoi la base ne répond (sans jamais montrer d'identifiant ni de mot de passe) : aide à la mise en route
function diagnostiquerBase(array $c, PDOException $e): never
{
    error_log('[Kaislo API] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    $code = (int) ($e->errorInfo[1] ?? 0);
    $manquantes = [];
    if ($c['driver'] === 'mysql') {
        foreach (['base' => 'Db', 'utilisateur' => 'User', 'motDePasse' => 'Password'] as $cle => $nom) if ($c[$cle] === '') $manquantes[] = $nom;
    }
    if ($manquantes) {
        $diagnostic = 'Clé(s) vide(s) ou absente(s) dans le .env : ' . implode(', ', $manquantes);
    } elseif (str_contains($e->getMessage(), 'could not find driver')) {
        $diagnostic = 'L’extension PHP MySQL (pdo_mysql) n’est pas activée : hPanel → Avancé → Configuration PHP → Extensions';
    } else {
        $diagnostic = match ($code) {
            1045 => 'Utilisateur ou mot de passe MySQL refusé : vérifiez User et Password du .env (noms exacts, avec le préfixe de Hostinger)',
            1044 => 'Cet utilisateur n’a pas accès à cette base : dans hPanel, rattachez l’utilisateur à la base',
            1049 => 'Base de données inconnue : vérifiez la clé Db du .env (nom exact, avec le préfixe de Hostinger)',
            2002, 2006 => 'Serveur MySQL injoignable : essayez DbHost=127.0.0.1 dans le .env, ou l’hôte indiqué dans hPanel → Bases de données',
            default => 'Connexion à la base impossible : détail dans le journal d’erreurs PHP (ligne « [Kaislo API] »)',
        };
    }
    repondre(['ok' => false, 'erreur' => 'Base de données indisponible', 'diagnostic' => $diagnostic, 'codeMysql' => $code ?: null], 500);
}

// ---------- GET /api/sante ----------
function routeSante(): never
{
    $c = config();
    if (!$c['trouve']) throw new ErreurApi('Fichier .env introuvable sur le serveur', 500);
    try {
        base(); // connexion + création des tables si besoin
    } catch (PDOException $e) {
        diagnostiquerBase($c, $e);
    }
    $version = (int) requete('SELECT MAX(version) AS v FROM kaislo_version')->fetch()['v'];
    $repere = @json_decode((string) @file_get_contents(dirname(__DIR__) . '/version.json'), true); // écrit à chaque publication du site
    repondre(['ok' => true, 'service' => 'Kaislo API', 'base' => $c['driver'], 'versionBase' => $version, 'versionSite' => $repere['version'] ?? null, 'heure' => maintenant()]);
}

// ---------- POST /api/inscription ----------
// { commerce: { nom, type, pays, ville, telephone }, gerant: { nom, telephone, pin }, codeParrain, conditionsAcceptees: true, appareil }
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
    if (!in_array($type, TYPES_COMMERCE_OFFERTS, true)) throw new ErreurApi('Type de commerce inconnu');
    $pays = strtoupper((string) ($commerce['pays'] ?? ''));
    if (!isset(PAYS[$pays])) throw new ErreurApi('Pays non pris en charge');
    $ville = texte($commerce, 'ville', 'la ville');
    // Numéros obligatoires, au format international du pays, uniques dans tout Kaislo
    $numCommerce = telephoneValide(texte($commerce, 'telephone', 'le téléphone du commerce', true, 40), $pays, 'téléphone du commerce');
    $nomGerant = texte($gerant, 'nom', 'votre nom');
    $numGerant = telephoneValide(texte($gerant, 'telephone', 'votre numéro de téléphone', true, 40), $pays, 'votre numéro');
    $cle = $numGerant['cle'];
    $telGerant = $numGerant['affichage'];
    $pin = (string) ($gerant['pin'] ?? '');
    if (!preg_match('/^\d{4}$/', $pin)) throw new ErreurApi('Le code PIN doit contenir 4 chiffres');
    if (($e['conditionsAcceptees'] ?? false) !== true) throw new ErreurApi('Merci d’accepter les conditions d’utilisation');
    // Code parrain du commercial Kaislo qui a présenté l'application (facultatif)
    $commercial = commercialParCode((string) ($e['codeParrain'] ?? ''));

    if (numeroPrisAilleurs($cle, null)) {
        noterEchec($cleIp, 20);
        throw new ErreurApi('Votre numéro est déjà utilisé par un compte Kaislo. Connectez-vous plutôt.', 409);
    }
    // Le numéro du commerce peut être celui du gérant, mais pas celui d'un autre compte ou commerce
    if ($numCommerce['cle'] !== $cle && numeroPrisAilleurs($numCommerce['cle'], null)) {
        noterEchec($cleIp, 20);
        throw new ErreurApi('Le numéro du commerce est déjà utilisé par un autre compte Kaislo.', 409);
    }

    $pdo = base();
    $pdo->beginTransaction();
    try {
        // Code du commerce : 6 chiffres, unique
        do { $code = (string) random_int(100000, 999999); } while (requete('SELECT 1 FROM commerces WHERE code = ?', [$code])->fetch());
        $idCommerce = nouvelId('com');
        requete('INSERT INTO commerces (id, code, nom, type, pays, devise, ville, telephone, cle_telephone, offre, statut, essai_fin, periode_fin, conditions_acceptees_le, cree_le, modifie_le, commercial_id, fondateur)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)', [
            $idCommerce, $code, $nom, $type, $pays, PAYS[$pays], $ville, $numCommerce['affichage'], $numCommerce['cle'],
            'essai', 'essai', maintenant(DUREE_ESSAI_JOURS * 86400), null, maintenant(), maintenant(), maintenant(), $commercial['id'] ?? null,
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
        journaliser($idCommerce, $utilisateur['id'], 'inscription', ['commerce' => $nom, 'pays' => $pays, 'parrain' => $commercial['code'] ?? null]);
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
// { telephone, pays, pin, appareil } — pays : celui choisi sur l'écran de connexion
function routeConnexion(): never
{
    $e = entree();
    $cle = cleConnexion((string) ($e['telephone'] ?? ''), strtoupper((string) ($e['pays'] ?? '')));
    $pin = (string) ($e['pin'] ?? '');
    if (!$cle) throw new ErreurApi('Numéro de téléphone incomplet : vérifiez le pays et le numéro');
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
