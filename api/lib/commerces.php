<?php
// ------------------------------------------------------------
// PLUSIEURS COMMERCES POUR UN GÉRANT (une épicerie ET un restaurant, par exemple)
//
// Un gérant garde UN numéro et UN code PIN. Chaque activité est un commerce à part, avec son abonnement (au tarif
// de son métier), son stock, ses ventes, ses comptes du soir, ses postes et ses vendeurs : rien ne se mélange.
// Techniquement : une ligne « gérant » par commerce dans la table utilisateurs (même numéro, même code PIN).
//
//   GET  /api/mes-commerces      les commerces de ce gérant, leurs abonnements et le total à payer
//   POST /api/changer-commerce   { commerceId, appareil } : ouvre un autre de ses commerces
//   POST /api/ajouter-commerce   { commerce: { nom, type, ville, pays?, telephone? }, pin, conditionsAcceptees }
//
// Côté équipe Amorac : signauxActivite() repère les commerces dont le contenu ne correspond pas à l'activité déclarée
// (voir plus bas) et routeAdminCatalogue() permet de voir les produits d'un commerce SANS aucun chiffre.
// ------------------------------------------------------------

const MAX_COMMERCES_PAR_GERANT = 10;

// Les commerces d'un gérant (une ligne par commerce où il est gérant actif), le plus ancien d'abord
function commercesDuGerant(string $cle): array
{
    return requete("SELECT u.id AS utilisateur_id, c.* FROM utilisateurs u JOIN commerces c ON c.id = u.commerce_id
                    WHERE u.cle_telephone = ? AND u.role = 'gerant' AND u.actif = 1 ORDER BY c.cree_le, c.nom", [$cle])->fetchAll();
}

function versCommerceGerant(array $c): array
{
    $t = tarifCommerce($c);
    return [
        'commerceId' => $c['id'], 'utilisateurId' => $c['utilisateur_id'], 'nom' => $c['nom'], 'type' => $c['type'], 'pays' => $c['pays'],
        'devise' => $c['devise'], 'ville' => $c['ville'], 'abonnement' => ['offre' => $c['offre'], 'statut' => $c['statut'], 'essaiFin' => $c['essai_fin'], 'periodeFin' => $c['periode_fin']],
        'tarif' => ['formule' => $t['formule'], 'nom' => $t['nom'], 'postes' => $t['postes'], 'parMois' => $t['parMois'], 'annuel' => $t['annuel'], 'devise' => $t['devise']],
    ];
}

// Liste des commerces du gérant connecté (vide pour un vendeur)
function listeCommercesGerant(array $moi): array
{
    if ($moi['role'] !== 'gerant') return [];
    return array_map('versCommerceGerant', commercesDuGerant((string) $moi['cle_telephone']));
}

// Total mensuel de tous les abonnements, par devise (un gérant peut avoir des commerces dans deux pays)
function totauxParDevise(array $liste): array
{
    $totaux = [];
    foreach ($liste as $c) {
        $d = $c['tarif']['devise'];
        $totaux[$d] = ($totaux[$d] ?? 0) + (float) $c['tarif']['parMois'];
    }
    return $totaux;
}

// Ce numéro de commerce peut-il être utilisé par ce gérant ? Oui s'il n'appartient à personne d'autre.
function numeroLibrePourGerant(string $cle, array $commerceIdsDuGerant, string $cleGerant): bool
{
    if ($cle === $cleGerant) return true;
    foreach (requete('SELECT commerce_id FROM utilisateurs WHERE cle_telephone = ?', [$cle])->fetchAll() as $u) {
        if (!in_array($u['commerce_id'], $commerceIdsDuGerant, true)) return false;
    }
    foreach (requete('SELECT id FROM commerces WHERE cle_telephone = ?', [$cle])->fetchAll() as $c) {
        if (!in_array($c['id'], $commerceIdsDuGerant, true)) return false;
    }
    return true;
}

// ---------- GET /api/mes-commerces ----------
function routeMesCommerces(): never
{
    $moi = utilisateurConnecte();
    $liste = listeCommercesGerant($moi);
    repondre(['ok' => true, 'courant' => $moi['commerce_id'], 'commerces' => $liste, 'totaux' => totauxParDevise($liste)]);
}

// ---------- POST /api/changer-commerce ----------
// Le gérant est déjà identifié par son jeton : pas besoin de ressaisir le code PIN pour passer d'un de ses commerces à l'autre.
function routeChangerCommerce(): never
{
    $moi = utilisateurConnecte();
    if ($moi['role'] !== 'gerant') throw new ErreurApi('Réservé au gérant', 403);
    $e = entree();
    $cible = null;
    foreach (commercesDuGerant((string) $moi['cle_telephone']) as $c) if ($c['id'] === (string) ($e['commerceId'] ?? '')) $cible = $c;
    if (!$cible) throw new ErreurApi('Commerce introuvable', 404);
    if ($cible['statut'] === 'suspendu') throw new ErreurApi('Ce commerce est suspendu. Contactez Amorac.', 403);
    $u = requete('SELECT * FROM utilisateurs WHERE id = ?', [$cible['utilisateur_id']])->fetch();
    $jeton = creerJeton($u, (string) ($e['appareil'] ?? ''));
    journaliser($cible['id'], $u['id'], 'changement-commerce', ['depuis' => $moi['commerce_id']]);
    $commerce = requete('SELECT * FROM commerces WHERE id = ?', [$cible['id']])->fetch();
    repondre(['ok' => true, 'jeton' => $jeton, 'utilisateur' => versUtilisateur($u), 'commerce' => versCommerce($commerce), 'commerces' => listeCommercesGerant($u)]);
}

// ---------- POST /api/ajouter-commerce ----------
function routeAjouterCommerce(): never
{
    $moi = utilisateurConnecte();
    if ($moi['role'] !== 'gerant') throw new ErreurApi('Réservé au gérant', 403);
    $e = entree();
    $cleTel = 'tel:' . $moi['cle_telephone'];
    verifierBlocage($cleTel);
    // Un nouvel abonnement engage le gérant : on redemande son code PIN (téléphone prêté, session restée ouverte…)
    $pin = (string) ($e['pin'] ?? '');
    if (!preg_match('/^\d{4}$/', $pin)) throw new ErreurApi('Entrez votre code PIN à 4 chiffres pour confirmer');
    if (!password_verify($pin, (string) $moi['pin_hash'])) {
        if (noterEchec($cleTel)) throw new ErreurApi('Code incorrect. Trop d’essais : réessayez dans ' . MINUTES_BLOCAGE . ' minutes.', 429);
        throw new ErreurApi('Code PIN incorrect', 401);
    }
    effacerEchecs($cleTel);
    if (($e['conditionsAcceptees'] ?? false) !== true) throw new ErreurApi('Merci d’accepter les conditions d’utilisation');

    $existants = commercesDuGerant((string) $moi['cle_telephone']);
    if (count($existants) >= MAX_COMMERCES_PAR_GERANT) throw new ErreurApi('Vous avez atteint le nombre maximum de commerces (' . MAX_COMMERCES_PAR_GERANT . '). Contactez Amorac.', 409);
    $ids = array_column($existants, 'id');
    $actuel = requete('SELECT * FROM commerces WHERE id = ?', [$moi['commerce_id']])->fetch();

    $c = is_array($e['commerce'] ?? null) ? $e['commerce'] : [];
    $nom = texte($c, 'nom', 'le nom du commerce');
    $type = (string) ($c['type'] ?? '');
    if (!in_array($type, TYPES_COMMERCE_OFFERTS, true)) throw new ErreurApi('Type de commerce inconnu');
    $pays = strtoupper((string) ($c['pays'] ?? $actuel['pays']));
    if (!isset(PAYS[$pays])) throw new ErreurApi('Pays non pris en charge');
    $ville = texte($c, 'ville', 'la ville');
    // Numéro du commerce : le sien par défaut, ou un autre numéro qui n'appartient à personne d'autre
    $telSaisi = trim((string) ($c['telephone'] ?? ''));
    if ($telSaisi === '') {
        $numCommerce = ['affichage' => $moi['telephone'], 'cle' => $moi['cle_telephone']];
    } else {
        $numCommerce = telephoneValide($telSaisi, $pays, 'téléphone du commerce');
        if (!numeroLibrePourGerant($numCommerce['cle'], $ids, (string) $moi['cle_telephone'])) throw new ErreurApi('Le numéro du commerce est déjà utilisé par un autre compte Kaislo.', 409);
    }

    $pdo = base();
    $pdo->beginTransaction();
    try {
        do { $code = (string) random_int(100000, 999999); } while (requete('SELECT 1 FROM commerces WHERE code = ?', [$code])->fetch());
        $idCommerce = nouvelId('com');
        requete('INSERT INTO commerces (id, code, nom, type, pays, devise, ville, telephone, cle_telephone, offre, statut, essai_fin, periode_fin, conditions_acceptees_le, cree_le, modifie_le, commercial_id, fondateur)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)', [
            $idCommerce, $code, $nom, $type, $pays, PAYS[$pays], $ville, $numCommerce['affichage'], $numCommerce['cle'],
            'essai', 'essai', maintenant(DUREE_ESSAI_JOURS * 86400), null, maintenant(), maintenant(), maintenant(), null,
        ]);
        $idUtilisateur = nouvelId('u');
        // Même numéro et même code PIN que le premier compte du gérant
        requete('INSERT INTO utilisateurs (id, commerce_id, nom, telephone, cle_telephone, pin_hash, role, actif, peut_gerer_produits, peut_faire_remises, cree_le, modifie_le)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, 1, ?, ?)', [
            $idUtilisateur, $idCommerce, $moi['nom'], $moi['telephone'], $moi['cle_telephone'], $moi['pin_hash'], 'gerant', maintenant(), maintenant(),
        ]);
        journaliser($idCommerce, $idUtilisateur, 'commerce-ajoute', ['commerce' => $nom, 'type' => $type, 'depuis' => $moi['commerce_id']]);
        $pdo->commit();
    } catch (Throwable $err) {
        $pdo->rollBack();
        throw $err;
    }
    $u = requete('SELECT * FROM utilisateurs WHERE id = ?', [$idUtilisateur])->fetch();
    $jeton = creerJeton($u, (string) ($e['appareil'] ?? ''));
    $ligne = requete('SELECT * FROM commerces WHERE id = ?', [$idCommerce])->fetch();
    repondre(['ok' => true, 'jeton' => $jeton, 'utilisateur' => versUtilisateur($u), 'commerce' => versCommerce($ligne), 'commerces' => listeCommercesGerant($u)], 201);
}

// ------------------------------------------------------------
// DÉTECTION DES FAUSSES DÉCLARATIONS D'ACTIVITÉ (espace Amorac)
//
// Le prix de l'abonnement dépend de l'activité déclarée. Quand le contenu d'un commerce ressemble clairement à un
// autre métier plus cher (des plats et des tables dans une « épicerie », des cartons et des sacs dans une
// « boutique »…), on le signale à l'équipe, avec la formule probable et l'écart de prix par mois. Ce n'est jamais
// bloquant ni automatique : un signal est une raison de regarder, de poser la question au gérant, ou de lui proposer
// de créer un second commerce pour cette autre activité.
// ------------------------------------------------------------
const MOTS_PLATS = '/accompagn|suppl[ée]ment|portion|viande|garniture|sauce|cuisson|poisson|boisson au choix/iu';

function signauxActivite(array $c, array $produits, array $reglages): array
{
    $n = count($produits);
    if ($n < 3) return [];
    $declaree = formuleDuType((string) $c['type']);
    $portions = $plats = $gros = $metre = 0;
    foreach ($produits as $p) {
        $unite = (string) ($p['unite'] ?? '');
        if ($unite === 'portion') $portions++;
        if (in_array($unite, ['carton', 'sac', 'lot'], true)) $gros++;
        if ($unite === 'mètre') $metre++;
        foreach ((array) ($p['groupes'] ?? []) as $g) {
            if (!empty($g['obligatoire']) && preg_match(MOTS_PLATS, (string) ($g['nom'] ?? ''))) { $plats++; break; }
        }
    }
    $tables = is_array($reglages['tables'] ?? null) ? count($reglages['tables']) : 0;
    $candidats = [];
    $restauration = in_array($declaree['id'], ['proximite'], true)
        && ($tables >= 1 || ($n >= 5 && $portions >= 0.3 * $n) || ($plats >= 3 && $plats >= 0.25 * $n));
    if ($restauration) {
        $candidats[] = ['code' => 'restauration', 'formule' => $tables >= 1 ? 'restaurant' : 'maquis', 'gravite' => $tables >= 1 && $portions >= 0.3 * $n ? 'forte' : 'moyenne',
            'texte' => "Plats à la portion, accompagnements ou tables ($portions portions, $plats plats avec choix, $tables tables sur $n articles) : activité de restauration possible."];
    }
    if (!in_array($declaree['id'], ['pro', 'quincaillerie'], true) && $n >= 5 && $gros >= 0.4 * $n) {
        $candidats[] = ['code' => 'gros', 'formule' => 'pro', 'gravite' => 'moyenne',
            'texte' => "Beaucoup d’articles vendus au carton, au sac ou au lot ($gros sur $n) : vente en gros possible."];
    }
    if (in_array($declaree['id'], ['proximite', 'maquis', 'restaurant'], true) && $n >= 5 && $metre >= 0.3 * $n) {
        $candidats[] = ['code' => 'quincaillerie', 'formule' => 'quincaillerie', 'gravite' => 'moyenne',
            'texte' => "Beaucoup d’articles vendus au mètre ($metre sur $n) : activité de quincaillerie possible."];
    }
    $signaux = [];
    $postes = nombrePostes($c['id']);
    $actuel = prixAbonnement($declaree, $c['devise'], $postes, 1, (bool) ($c['fondateur'] ?? 0), modeTarif($c))['parMois'];
    foreach ($candidats as $s) {
        $f = formuleParId($s['formule']);
        if (!$f) continue;
        $ecart = prixAbonnement($f, $c['devise'], $postes, 1, (bool) ($c['fondateur'] ?? 0), modeTarif($c))['parMois'] - $actuel;
        if ($ecart <= 0) continue; // la formule déclarée est déjà aussi chère : rien n'est perdu
        $signaux[] = ['code' => $s['code'], 'gravite' => $s['gravite'], 'texte' => $s['texte'], 'formuleSuggeree' => ['id' => $f['id'], 'nom' => $f['nom']], 'ecartParMois' => $ecart, 'devise' => $c['devise']];
    }
    return $signaux;
}

// Produits décodés par commerce (tous, ou un seul)
function produitsParCommerce(?string $seulId = null): array
{
    $sql = "SELECT commerce_id, contenu FROM elements WHERE type = 'produits' AND supprime = 0" . ($seulId ? ' AND commerce_id = ?' : '');
    $par = [];
    foreach (requete($sql, $seulId ? [$seulId] : [])->fetchAll() as $l) $par[$l['commerce_id']][] = json_decode($l['contenu'], true) ?: [];
    return $par;
}

// ---------- GET /api/admin/catalogue?commerceId=… ----------
// Consultation des produits d'un commerce par l'équipe Amorac : noms, catégories, unités, choix. JAMAIS de prix, de
// stock, de ventes ni de chiffres. Chaque consultation est notée dans le journal.
function routeAdminCatalogue(): never
{
    $admin = adminConnecte();
    $id = (string) ($_GET['commerceId'] ?? '');
    $c = requete('SELECT * FROM commerces WHERE id = ?', [$id])->fetch();
    if (!$c) throw new ErreurApi('Commerce introuvable', 404);
    $categories = [];
    foreach (requete("SELECT contenu FROM elements WHERE commerce_id = ? AND type = 'categories' AND supprime = 0", [$id])->fetchAll() as $l) {
        $k = json_decode($l['contenu'], true) ?: [];
        if (isset($k['id'])) $categories[$k['id']] = (string) ($k['nom'] ?? '');
    }
    $produits = array_map(fn ($p) => [
        'nom' => (string) ($p['nom'] ?? ''), 'categorie' => $categories[$p['categorieId'] ?? ''] ?? '', 'unite' => (string) ($p['unite'] ?? ''),
        'emoji' => (string) ($p['emoji'] ?? ''),
        'groupes' => array_map(fn ($g) => ['nom' => (string) ($g['nom'] ?? ''), 'obligatoire' => !empty($g['obligatoire']),
            'options' => array_map(fn ($o) => (string) ($o['nom'] ?? ''), (array) ($g['options'] ?? []))], (array) ($p['groupes'] ?? [])),
    ], produitsParCommerce($id)[$id] ?? []);
    usort($produits, fn ($a, $b) => [$a['categorie'], $a['nom']] <=> [$b['categorie'], $b['nom']]);
    $reglages = reglagesCommerce($id);
    journaliser($id, $admin['id'], 'amorac-catalogue', ['par' => $admin['email']]);
    repondre(['ok' => true, 'commerce' => ['id' => $c['id'], 'nom' => $c['nom'], 'type' => $c['type']], 'produits' => $produits,
        'categories' => array_values(array_filter($categories)), 'nbTables' => is_array($reglages['tables'] ?? null) ? count($reglages['tables']) : 0]);
}
