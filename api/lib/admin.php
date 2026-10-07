<?php
// ------------------------------------------------------------
// ESPACE AMORAC (/admin) : comptes de l'équipe, commerces, abonnements,
// paiements, offres. Toutes les adresses commencent par /api/admin/.
//
// Premier compte : POST /api/admin/installer avec la clé « CleAdmin » du .env
// du serveur (aucun compte n'existe encore). Ensuite, les comptes se créent
// depuis l'espace Amorac (rôle « admin » seulement).
//   admin   : tout (abonnements, paiements, tarifs, commerciaux, équipe)
//   support : consultation et messagerie
// ------------------------------------------------------------

const DUREE_SESSION_ADMIN = 8 * 3600; // une session de l'espace Amorac dure 8 heures sans activité
const MOT_DE_PASSE_MIN = 10;

// ---------- Session ----------

function adminConnecte(bool $adminSeulement = false): array
{
    $jeton = jetonRecu();
    if (!$jeton) throw new ErreurApi('Connexion à l’espace Amorac nécessaire', 401);
    $empreinte = hash('sha256', $jeton);
    $a = requete('SELECT j.expire_le, a.* FROM jetons_admin j JOIN admins a ON a.id = j.admin_id WHERE j.jeton_hash = ?', [$empreinte])->fetch();
    if (!$a || $a['expire_le'] < maintenant()) throw new ErreurApi('Session expirée : reconnectez-vous', 401);
    if (!$a['actif']) throw new ErreurApi('Compte désactivé', 403);
    if ($adminSeulement && $a['role'] !== 'admin') throw new ErreurApi('Réservé aux administrateurs Amorac', 403);
    requete('UPDATE jetons_admin SET expire_le = ? WHERE jeton_hash = ?', [maintenant(DUREE_SESSION_ADMIN), $empreinte]);
    unset($a['expire_le'], $a['mdp_hash']);
    return $a;
}

function versAdmin(array $a): array
{
    return ['id' => $a['id'], 'email' => $a['email'], 'nom' => $a['nom'], 'role' => $a['role'], 'actif' => (bool) $a['actif'], 'vuLe' => $a['vu_le'] ?? null];
}

function ouvrirSessionAdmin(array $a): array
{
    $jeton = bin2hex(random_bytes(32));
    requete('INSERT INTO jetons_admin (jeton_hash, admin_id, cree_le, expire_le, appareil) VALUES (?, ?, ?, ?, ?)', [
        hash('sha256', $jeton), $a['id'], maintenant(), maintenant(DUREE_SESSION_ADMIN), mb_substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 200),
    ]);
    requete('UPDATE admins SET vu_le = ? WHERE id = ?', [maintenant(), $a['id']]);
    requete('DELETE FROM jetons_admin WHERE expire_le < ?', [maintenant()]);
    return ['ok' => true, 'jeton' => $jeton, 'admin' => versAdmin($a)];
}

function verifierMotDePasse(string $mdp): void
{
    if (mb_strlen($mdp) < MOT_DE_PASSE_MIN) throw new ErreurApi('Mot de passe : ' . MOT_DE_PASSE_MIN . ' caractères au minimum');
    if (!preg_match('/\d/', $mdp) || !preg_match('/\p{L}/u', $mdp)) throw new ErreurApi('Mot de passe : au moins une lettre et un chiffre');
}

// ---------- POST /api/admin/installer : premier compte ----------
function routeAdminInstaller(): never
{
    $e = entree();
    if ((int) requete('SELECT COUNT(*) AS n FROM admins')->fetch()['n'] > 0) throw new ErreurApi('L’espace Amorac est déjà installé : connectez-vous', 409);
    $cle = (string) (lireFichierEnvCle('CleAdmin') ?? '');
    if (strlen($cle) < 12) throw new ErreurApi('Ajoutez une ligne « CleAdmin=… » (12 caractères ou plus) dans le fichier .env du serveur', 400);
    verifierBlocage('installation:' . adresseIp());
    if (!hash_equals($cle, (string) ($e['cle'] ?? ''))) {
        noterEchec('installation:' . adresseIp());
        throw new ErreurApi('Clé d’installation incorrecte', 401);
    }
    $email = strtolower(texte($e, 'email', 'votre e-mail', true, 190));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) throw new ErreurApi('Adresse e-mail invalide');
    $mdp = (string) ($e['motDePasse'] ?? '');
    verifierMotDePasse($mdp);
    $a = ['id' => nouvelId('a'), 'email' => $email, 'nom' => texte($e, 'nom', 'votre nom'), 'role' => 'admin', 'actif' => 1];
    requete('INSERT INTO admins (id, email, nom, mdp_hash, cree_le, role, actif) VALUES (?, ?, ?, ?, ?, ?, 1)', [$a['id'], $email, $a['nom'], password_hash($mdp, PASSWORD_DEFAULT), maintenant(), 'admin']);
    journaliser(null, $a['id'], 'admin-installation', ['email' => $email]);
    repondre(ouvrirSessionAdmin($a), 201);
}

// L'installation est-elle faite ? (l'écran de connexion propose alors le formulaire adapté)
function routeAdminEtat(): never
{
    repondre(['ok' => true, 'installe' => (int) requete('SELECT COUNT(*) AS n FROM admins')->fetch()['n'] > 0]);
}

// ---------- POST /api/admin/connexion ----------
function routeAdminConnexion(): never
{
    $e = entree();
    $email = strtolower(trim((string) ($e['email'] ?? '')));
    $mdp = (string) ($e['motDePasse'] ?? '');
    $cleEmail = 'admin:' . hash('sha256', $email);
    $cleIp = 'ip-admin:' . adresseIp();
    verifierBlocage($cleEmail);
    verifierBlocage($cleIp);
    $a = requete('SELECT * FROM admins WHERE email = ?', [$email])->fetch();
    $valide = password_verify($mdp, $a ? $a['mdp_hash'] : password_hash('leurre', PASSWORD_DEFAULT));
    if (!$a || !$valide || !$a['actif']) {
        $bloque = noterEchec($cleEmail);
        $bloque = noterEchec($cleIp, 20) || $bloque;
        throw new ErreurApi($bloque ? 'Trop d’essais : réessayez dans ' . MINUTES_BLOCAGE . ' minutes.' : 'E-mail ou mot de passe incorrect', $bloque ? 429 : 401);
    }
    effacerEchecs($cleEmail);
    journaliser(null, $a['id'], 'admin-connexion');
    repondre(ouvrirSessionAdmin($a));
}

function routeAdminDeconnexion(): never
{
    $jeton = jetonRecu();
    if ($jeton) requete('DELETE FROM jetons_admin WHERE jeton_hash = ?', [hash('sha256', $jeton)]);
    repondre(['ok' => true]);
}

function routeAdminMoi(): never
{
    repondre(['ok' => true, 'admin' => versAdmin(adminConnecte())]);
}

// ---------- Commerces ----------

// Résumé de chaque commerce pour l'équipe (activité des 30 derniers jours, équipe, paiements)
function resumesCommerces(?string $seulId = null): array
{
    $filtre = $seulId ? ' WHERE id = ?' : '';
    $commerces = requete('SELECT * FROM commerces' . $filtre . ' ORDER BY cree_le DESC', $seulId ? [$seulId] : [])->fetchAll();
    $par = fn (string $sql, array $p = []) => requete($sql . ($seulId ? (str_contains($sql, 'WHERE') ? ' AND ' : ' WHERE ') . 'commerce_id = ?' : '') . ' GROUP BY commerce_id', $seulId ? [...$p, $seulId] : $p)->fetchAll(PDO::FETCH_KEY_PAIR);
    $nbProduits = $par("SELECT commerce_id, COUNT(*) FROM elements WHERE type = 'produits' AND supprime = 0");
    $derniere = $par('SELECT commerce_id, MAX(recu_le) FROM elements');
    $nbVendeurs = $par("SELECT commerce_id, COUNT(*) FROM utilisateurs WHERE role = 'vendeur' AND actif = 1");
    $nonLus = $par("SELECT commerce_id, COUNT(*) FROM messages WHERE auteur = 'commerce' AND lu_le IS NULL");
    // Ventes des 30 derniers jours (chiffre d'affaires et nombre de tickets)
    $ca = [];
    $depuis = maintenant(-30 * 86400);
    $sqlVentes = "SELECT commerce_id, contenu FROM elements WHERE type = 'ventes' AND supprime = 0 AND modifie_le >= ?" . ($seulId ? ' AND commerce_id = ?' : '');
    foreach (requete($sqlVentes, $seulId ? [$depuis, $seulId] : [$depuis])->fetchAll() as $l) {
        $v = json_decode($l['contenu'], true) ?: [];
        if (!empty($v['annulee']) || ($v['date'] ?? '') < $depuis) continue;
        $ca[$l['commerce_id']]['ca'] = ($ca[$l['commerce_id']]['ca'] ?? 0) + (float) ($v['total'] ?? 0);
        $ca[$l['commerce_id']]['tickets'] = ($ca[$l['commerce_id']]['tickets'] ?? 0) + 1;
    }
    $paiements = [];
    foreach (requete('SELECT * FROM paiements' . ($seulId ? ' WHERE commerce_id = ?' : '') . ' ORDER BY date', $seulId ? [$seulId] : [])->fetchAll() as $p) {
        $paiements[$p['commerce_id']][] = ['id' => $p['id'], 'date' => $p['date'], 'montant' => (float) $p['montant'], 'devise' => $p['devise'], 'mois' => (int) $p['mois'], 'moyen' => $p['moyen'], 'note' => $p['note'], 'creePar' => $p['cree_par'], 'postes' => (int) ($p['postes'] ?? 1), 'details' => json_decode($p['details'] ?? '{}', true) ?: []];
    }
    $gerants = [];
    $groupes = []; // numéro du gérant -> commerces qu'il gère
    foreach (requete("SELECT commerce_id, nom, telephone, cle_telephone FROM utilisateurs WHERE role = 'gerant' ORDER BY cree_le")->fetchAll() as $g) {
        $gerants[$g['commerce_id']] ??= $g;
        $groupes[$g['cle_telephone']][] = $g['commerce_id'];
    }
    $identite = [];
    foreach (requete('SELECT * FROM commerces')->fetchAll() as $x) $identite[$x['id']] = $x;
    $produitsDe = produitsParCommerce($seulId);

    return array_map(function ($c) use ($nbProduits, $derniere, $nbVendeurs, $nonLus, $ca, $paiements, $gerants, $groupes, $identite, $produitsDe) {
        $id = $c['id'];
        $reglages = reglagesCommerce($id);
        $commerce = versCommerce($c);
        $commerce['adresse'] = $reglages['adresse'] ?? '';
        $commerce['notes'] = $c['notes'] ?? '';
        $commerce['abonnement']['paiements'] = $paiements[$id] ?? [];
        $commerce['fondateur'] = (bool) ($c['fondateur'] ?? 0);
        $commerce['commercialId'] = $c['commercial_id'] ?? null;
        $commerce['commissionValideeLe'] = $c['commission_validee_le'] ?? null;
        return [
            'tarif' => tarifCommerce($c),
            'id' => $id, 'commerce' => $commerce,
            'gerant' => $gerants[$id]['nom'] ?? '—', 'gerantTelephone' => $gerants[$id]['telephone'] ?? '',
            'ca30' => round($ca[$id]['ca'] ?? 0, 2), 'tickets30' => $ca[$id]['tickets'] ?? 0,
            'derniereActivite' => $derniere[$id] ?? $c['cree_le'], 'nbProduits' => (int) ($nbProduits[$id] ?? 0),
            'nbVendeurs' => (int) ($nbVendeurs[$id] ?? 0), 'messagesNonLus' => (int) ($nonLus[$id] ?? 0),
            // Autres commerces du même gérant (paiement groupé) et activité à vérifier (voir signauxActivite)
            'autresCommerces' => array_values(array_map(fn ($autre) => ['id' => $autre, 'nom' => $identite[$autre]['nom'], 'type' => $identite[$autre]['type'], 'statut' => $identite[$autre]['statut'], 'devise' => $identite[$autre]['devise'], 'tarif' => tarifCommerce($identite[$autre])], array_filter($groupes[$gerants[$id]['cle_telephone'] ?? ''] ?? [], fn ($autre) => $autre !== $id && isset($identite[$autre])))),
            'signaux' => signauxActivite($c, $produitsDe[$id] ?? [], $reglages),
        ];
    }, $commerces);
}

// Les chiffres de vente d'un commerce sont réservés aux administrateurs ; le support voit les commerces et leurs produits, sans chiffres
function sansChiffres(array $resume, array $admin): array
{
    if ($admin['role'] === 'admin') return $resume;
    $resume['ca30'] = null;
    $resume['tickets30'] = null;
    return $resume;
}

function routeAdminCommerces(): never
{
    $admin = adminConnecte();
    repondre(['ok' => true, 'commerces' => array_map(fn ($r) => sansChiffres($r, $admin), resumesCommerces()), 'formules' => formules(), 'regles' => reglesTarifs(),
        'fondateurs' => (int) requete('SELECT COUNT(*) AS n FROM commerces WHERE fondateur = 1')->fetch()['n'], 'contactsNonTraites' => contactsNonTraites(), 'avisEnAttente' => avisEnAttente(),
        'commerciauxEnAttente' => (int) requete('SELECT COUNT(*) AS n FROM commerciaux WHERE actif = 0 AND valide_le IS NULL')->fetch()['n']]);
}

// Détail d'un commerce : résumé + équipe + journal récent
function routeAdminCommerce(): never
{
    $admin = adminConnecte();
    $id = (string) ($_GET['id'] ?? '');
    $resume = resumesCommerces($id)[0] ?? null;
    if (!$resume) throw new ErreurApi('Commerce introuvable', 404);
    $resume = sansChiffres($resume, $admin);
    $journal = requete('SELECT action, details, cree_le FROM journal WHERE commerce_id = ? ORDER BY cree_le DESC LIMIT 30', [$id])->fetchAll();
    repondre(['ok' => true, 'commerce' => $resume, 'equipe' => equipe($id), 'journal' => array_map(fn ($j) => ['action' => $j['action'], 'le' => $j['cree_le'], 'details' => json_decode($j['details'] ?? '{}', true)], $journal)]);
}

// Ajoute des jours à une date (à partir d'aujourd'hui si elle est passée)
function prolongerDate(?string $date, int $jours): string
{
    $depart = $date && $date > maintenant() ? strtotime($date) : time();
    return gmdate('Y-m-d\TH:i:s\Z', $depart + $jours * 86400);
}

// ---------- POST /api/admin/commerce : actions sur un commerce ----------
// { id, action: 'suspendre' | 'reactiver' | 'prolonger-essai' | 'notes' | 'telephone', ... }
function routeAdminActionCommerce(): never
{
    $e = entree();
    $action = (string) ($e['action'] ?? '');
    $admin = adminConnecte($action !== 'notes'); // le support peut écrire des notes, le reste est réservé aux administrateurs
    $c = requete('SELECT * FROM commerces WHERE id = ?', [(string) ($e['id'] ?? '')])->fetch();
    if (!$c) throw new ErreurApi('Commerce introuvable', 404);
    $id = $c['id'];
    switch ($action) {
        case 'suspendre':
            requete("UPDATE commerces SET statut = 'suspendu', modifie_le = ? WHERE id = ?", [maintenant(), $id]);
            break;
        case 'reactiver':
            // Retour à l'abonnement s'il en a payé un, sinon à l'essai (l'application affiche « expiré » si la date est passée)
            requete('UPDATE commerces SET statut = ?, modifie_le = ? WHERE id = ?', [$c['periode_fin'] ? 'actif' : 'essai', maintenant(), $id]);
            break;
        case 'prolonger-essai':
            $jours = max(1, min(90, (int) ($e['jours'] ?? 15)));
            requete("UPDATE commerces SET essai_fin = ?, statut = CASE WHEN statut = 'actif' THEN 'actif' ELSE 'essai' END, modifie_le = ? WHERE id = ?", [prolongerDate($c['essai_fin'], $jours), maintenant(), $id]);
            break;
        case 'notes':
            requete('UPDATE commerces SET notes = ?, modifie_le = ? WHERE id = ?', [mb_substr((string) ($e['notes'] ?? ''), 0, 5000), maintenant(), $id]);
            break;
        case 'telephone':
            // Le numéro identifie le commerce : unique dans tout Kaislo
            $n = telephoneValide((string) ($e['telephone'] ?? ''), $c['pays'], 'numéro du commerce');
            if (numeroPrisAilleurs($n['cle'], $id)) throw new ErreurApi('Ce numéro est déjà utilisé par un autre compte Kaislo', 409);
            requete('UPDATE commerces SET telephone = ?, cle_telephone = ?, modifie_le = ? WHERE id = ?', [$n['affichage'], $n['cle'], maintenant(), $id]);
            break;
        case 'fondateur':
            // Tarif fondateur : remise à vie, pour un nombre limité de commerces
            $oui = (bool) ($e['valeur'] ?? false);
            if ($oui && !$c['fondateur']) {
                $places = (int) reglesTarifs()['placesFondateur'];
                $pris = (int) requete('SELECT COUNT(*) AS n FROM commerces WHERE fondateur = 1')->fetch()['n'];
                if ($pris >= $places) throw new ErreurApi("Les $places places au tarif fondateur sont déjà attribuées");
            }
            requete('UPDATE commerces SET fondateur = ?, modifie_le = ? WHERE id = ?', [$oui ? 1 : 0, maintenant(), $id]);
            break;
        case 'commercial':
            // Commercial qui a apporté le commerce (ou aucun)
            $cid = (string) ($e['commercialId'] ?? '');
            if ($cid !== '' && !requete('SELECT 1 FROM commerciaux WHERE id = ?', [$cid])->fetch()) throw new ErreurApi('Commercial introuvable', 404);
            if ($cid !== (string) ($c['commercial_id'] ?? '') && requete("SELECT 1 FROM commissions WHERE commerce_id = ? AND statut = 'payee'", [$id])->fetch()) {
                throw new ErreurApi('Des commissions ont déjà été versées pour ce commerce : le commercial ne peut plus changer');
            }
            requete('UPDATE commerces SET commercial_id = ?, modifie_le = ? WHERE id = ?', [$cid ?: null, maintenant(), $id]);
            if ($cid === '') requete("DELETE FROM commissions WHERE commerce_id = ? AND statut <> 'payee'", [$id]);
            else requete("UPDATE commissions SET commercial_id = ? WHERE commerce_id = ? AND statut <> 'payee'", [$cid, $id]);
            break;
        default:
            throw new ErreurApi('Action inconnue');
    }
    journaliser($id, $admin['id'], 'amorac-' . $action, ['par' => $admin['email']]);
    repondre(['ok' => true, 'commerce' => resumesCommerces($id)[0]]);
}

// ---------- POST /api/admin/paiement : abonnement payé ----------
// { commerceId, formule, postes, mois, montant, moyen, note }
// Le montant proposé est calculé (formule + postes supplémentaires, 12 mois = 2 offerts, tarif fondateur) ;
// l'équipe saisit le montant réellement reçu.
// Enregistre un paiement d'abonnement (sans gérer la transaction : l'appelant s'en occupe). Renvoie les informations utiles.
function enregistrerPaiement(array $admin, array $e): array
{
    $c = requete('SELECT * FROM commerces WHERE id = ?', [(string) ($e['commerceId'] ?? '')])->fetch();
    if (!$c) throw new ErreurApi('Commerce introuvable', 404);
    $mois = (int) ($e['mois'] ?? 1);
    if (!in_array($mois, [1, 3, 6, 12], true)) throw new ErreurApi('Durée invalide');
    $montant = (float) ($e['montant'] ?? 0);
    if ($montant <= 0) throw new ErreurApi('Indiquez le montant reçu');
    $formule = formuleParId((string) ($e['formule'] ?? '')) ?? formuleDuType($c['type']);
    $postes = max(1, min(50, (int) ($e['postes'] ?? nombrePostes($c['id']))));
    $multi = rangCommerceDuGerant($c) > 0;
    $calcul = prixAbonnement($formule, $c['devise'], $postes, $mois, (bool) $c['fondateur'], modeTarif($c), $multi);
    $moyen = mb_substr((string) ($e['moyen'] ?? 'Espèces'), 0, 30);
    $idPaiement = nouvelId('pa');
    $details = ['formule' => $formule['id'], 'prixCalcule' => $calcul['total'], 'parMois' => $calcul['parMois'], 'fondateur' => (bool) $c['fondateur'], 'mode' => modeTarif($c), 'multiCommerce' => $multi];
    if (!empty($e['groupe'])) $details['groupe'] = (string) $e['groupe'];
    requete('INSERT INTO paiements (id, commerce_id, date, montant, devise, mois, moyen, note, cree_par, postes, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        $idPaiement, $c['id'], maintenant(), $montant, $c['devise'], $mois, $moyen, mb_substr((string) ($e['note'] ?? ''), 0, 200), $admin['email'], $postes,
        json_encode($details, JSON_UNESCAPED_UNICODE),
    ]);
    // L'échéance avance de 30 jours par mois payé, à partir de la fin de la période en cours
    requete("UPDATE commerces SET offre = ?, statut = 'actif', periode_fin = ?, modifie_le = ? WHERE id = ?", [
        $formule['id'], prolongerDate($c['statut'] === 'actif' ? $c['periode_fin'] : null, $mois * 30), maintenant(), $c['id'],
    ]);
    // Commissions du commercial qui a apporté ce commerce
    if (!empty($c['commercial_id'])) creerCommissions($c, $idPaiement, $montant, $mois);
    return ['commerce' => $c, 'montant' => $montant, 'mois' => $mois, 'postes' => $postes, 'formule' => $formule];
}

function journaliserPaiement(array $admin, array $r): void
{
    $c = $r['commerce'];
    journaliser($c['id'], $admin['id'], 'amorac-paiement', ['montant' => $r['montant'], 'devise' => $c['devise'], 'mois' => $r['mois'], 'postes' => $r['postes'], 'formule' => $r['formule']['id'], 'par' => $admin['email']]);
}

function routeAdminPaiement(): never
{
    $admin = adminConnecte(true);
    $e = entree();
    $pdo = base();
    $pdo->beginTransaction();
    try {
        $r = enregistrerPaiement($admin, $e);
        $pdo->commit();
    } catch (Throwable $err) {
        $pdo->rollBack();
        throw $err;
    }
    journaliserPaiement($admin, $r);
    repondre(['ok' => true, 'commerce' => resumesCommerces($r['commerce']['id'])[0]]);
}

// ---------- POST /api/admin/paiement-groupe ----------
// Un gérant qui a plusieurs commerces paie tout en une fois : { lignes: [{ commerceId, montant, mois, postes?, formule? }], moyen, note }
// Tout est enregistré ensemble (ou rien), chaque commerce reçoit son propre paiement, repéré par le même numéro de groupe.
// Les commerces doivent avoir le même gérant : on ne peut pas grouper des commerces de personnes différentes.
function routeAdminPaiementGroupe(): never
{
    $admin = adminConnecte(true);
    $e = entree();
    $lignes = is_array($e['lignes'] ?? null) ? array_values($e['lignes']) : [];
    if (count($lignes) < 2 || count($lignes) > MAX_COMMERCES_PAR_GERANT) throw new ErreurApi('Choisissez au moins deux commerces du même gérant');
    $ids = array_map(fn ($l) => (string) ($l['commerceId'] ?? ''), $lignes);
    if (count(array_unique($ids)) !== count($ids)) throw new ErreurApi('Un commerce est indiqué deux fois');
    $cles = [];
    foreach ($ids as $id) {
        $g = requete("SELECT cle_telephone FROM utilisateurs WHERE commerce_id = ? AND role = 'gerant' ORDER BY cree_le", [$id])->fetch();
        if (!$g) throw new ErreurApi('Commerce introuvable', 404);
        $cles[$g['cle_telephone']] = true;
    }
    if (count($cles) !== 1) throw new ErreurApi('Ces commerces n’ont pas le même gérant : enregistrez un paiement séparé pour chacun');
    $groupe = nouvelId('gr');
    $pdo = base();
    $pdo->beginTransaction();
    $resultats = [];
    try {
        foreach ($lignes as $l) {
            $resultats[] = enregistrerPaiement($admin, [...$l, 'moyen' => $e['moyen'] ?? 'Espèces', 'groupe' => $groupe,
                'note' => trim('Paiement groupé ' . count($lignes) . ' commerces. ' . (string) ($e['note'] ?? ''))]);
        }
        $pdo->commit();
    } catch (Throwable $err) {
        $pdo->rollBack();
        throw $err;
    }
    foreach ($resultats as $r) journaliserPaiement($admin, $r);
    repondre(['ok' => true, 'groupe' => $groupe, 'commerces' => array_map(fn ($r) => resumesCommerces($r['commerce']['id'])[0], $resultats)]);
}

// ---------- Équipe Amorac ----------

function routeAdminEquipe(): never
{
    adminConnecte(true);
    $lignes = requete('SELECT * FROM admins ORDER BY cree_le')->fetchAll();
    repondre(['ok' => true, 'equipe' => array_map('versAdmin', $lignes)]);
}

// { id?, email, nom, role, actif, motDePasse? }
function routeAdminEquipeEnregistrer(): never
{
    $moi = adminConnecte(true);
    $e = entree();
    $id = (string) ($e['id'] ?? '');
    $role = in_array($e['role'] ?? '', ['admin', 'support'], true) ? $e['role'] : 'support';
    $actif = array_key_exists('actif', $e) ? (bool) $e['actif'] : true;
    $nom = texte($e, 'nom', 'le nom');
    $email = strtolower(texte($e, 'email', 'l’e-mail', true, 190));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) throw new ErreurApi('Adresse e-mail invalide');
    $mdp = (string) ($e['motDePasse'] ?? '');
    $autre = requete('SELECT id FROM admins WHERE email = ?', [$email])->fetch();
    if ($autre && $autre['id'] !== $id) throw new ErreurApi('Cet e-mail a déjà un compte', 409);
    if ($id === $moi['id'] && (!$actif || $role !== 'admin')) throw new ErreurApi('Vous ne pouvez pas retirer vos propres droits');
    if ($id) {
        requete('UPDATE admins SET email = ?, nom = ?, role = ?, actif = ? WHERE id = ?', [$email, $nom, $role, $actif ? 1 : 0, $id]);
        if ($mdp !== '') { verifierMotDePasse($mdp); requete('UPDATE admins SET mdp_hash = ? WHERE id = ?', [password_hash($mdp, PASSWORD_DEFAULT), $id]); }
        if (!$actif || $mdp !== '') requete('DELETE FROM jetons_admin WHERE admin_id = ?', [$id]);
    } else {
        verifierMotDePasse($mdp);
        $id = nouvelId('a');
        requete('INSERT INTO admins (id, email, nom, mdp_hash, cree_le, role, actif) VALUES (?, ?, ?, ?, ?, ?, ?)', [$id, $email, $nom, password_hash($mdp, PASSWORD_DEFAULT), maintenant(), $role, $actif ? 1 : 0]);
    }
    journaliser(null, $moi['id'], 'amorac-equipe', ['compte' => $email, 'role' => $role, 'actif' => $actif]);
    repondre(['ok' => true, 'equipe' => array_map('versAdmin', requete('SELECT * FROM admins ORDER BY cree_le')->fetchAll())]);
}
