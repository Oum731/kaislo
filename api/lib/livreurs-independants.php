<?php
// ------------------------------------------------------------
// LIVREURS INDÉPENDANTS (lot L5) : des livreurs qui ne dépendent d'aucune boutique, validés par l'équipe Kaislo, à qui un commerçant peut proposer une course.
// Activer : « LivraisonOptions=independants » dans le .env ; « CommissionLivreur=20 » (en %, de la course) et « LivreursRayonKm=8 » (facultatifs).
//
// Règles de l'argent : Kaislo ne touche pas l'argent des courses. Le commerçant fixe le prix de la course et paie le livreur lui-même, comme convenu ;
// Kaislo retient sa commission sur ce prix : elle est tenue à jour dans les comptes de la course (« commission due »), et réglée par le livreur à l'équipe.
// Les livreurs ont un accès par lien personnel secret (pas de mot de passe) : il ne montre que leurs courses, leurs gains et les offres autour d'eux.
//
//   POST /api/public/livreur/inscription   { nom, telephone, pays, ville, vehicule, conditionsAcceptees }   (défi anti-robot)
//   GET  /api/public/livreur?k=…           profil, offres autour de lui, course en cours, gains
//   POST /api/public/livreur/etat          { k, disponible, lat?, lng? }
//   POST /api/public/livreur/accepter      { k, offre }
//   POST /api/commandes-en-ligne/offrir    { id, prix } ou { id, annuler: true }   (commerçant)
//   GET/POST /api/admin/livreurs           équipe Kaislo : valider, refuser, suspendre, régler les commissions
// ------------------------------------------------------------

const VEHICULES_LIVREUR = ['moto', 'velo', 'voiture', 'autre'];
const OFFRE_DUREE_SECONDES = 1800; // une offre sans réponse expire au bout de 30 minutes
const POSITION_LIVREUR_SECONDES = 900; // la position d'un livreur disponible reste valable 15 minutes

function commissionLivreur(float $prix, string $devise): float
{
    $pourcent = max(0.0, min(50.0, (float) str_replace(',', '.', (string) (lireFichierEnvCle('CommissionLivreur') ?? '20'))));
    return arrondirMontant($prix * $pourcent / 100, $devise);
}

function lienEspaceLivreur(string $cle): string
{
    return 'https://' . (domaineSite() ?: 'kaislo.com') . '/espace-livreur/?k=' . $cle;
}

function estLivreurIndependant(?string $livreurId): bool
{
    return is_string($livreurId) && str_starts_with($livreurId, 'lp');
}

// POST /api/public/livreur/inscription
function routeLivreurInscription(): never
{
    exigerOptionLivraison('independants');
    $e = entree();
    $cleIp = 'inscription-livreur:' . adresseIp();
    verifierBlocage($cleIp);
    if (empty($e['conditionsAcceptees'])) throw new ErreurApi('Acceptez les conditions pour continuer');
    $pays = codePaysValide($e['pays'] ?? null) ?? throw new ErreurApi('Choisissez votre pays');
    $nom = texte($e, 'nom', 'votre nom', true, 60, 'personne');
    $ville = texte($e, 'ville', 'votre ville', true, 80, 'lieu');
    $tel = telephoneValide(texte($e, 'telephone', 'votre numéro', true, 40), $pays, 'votre numéro');
    $vehicule = in_array($e['vehicule'] ?? '', VEHICULES_LIVREUR, true) ? $e['vehicule'] : throw new ErreurApi('Choisissez votre moyen de transport');
    if (noterEchec($cleIp, 10)) throw new ErreurApi('Trop de demandes depuis cet appareil : réessayez plus tard.', 429);
    if (requete('SELECT 1 FROM livreurs_pool WHERE cle_telephone = ?', [$tel['cle']])->fetch()) throw new ErreurApi('Ce numéro est déjà inscrit : l’équipe Kaislo vous répondra', 409);
    $id = nouvelId('lp');
    requete("INSERT INTO livreurs_pool (id, nom, telephone, cle_telephone, pays, ville, vehicule, statut, disponible, cree_le) VALUES (?, ?, ?, ?, ?, ?, ?, 'attente', 0, ?)", [$id, $nom, $tel['affichage'], $tel['cle'], $pays, $ville, $vehicule, maintenant()]);
    alerterEquipe('livreur', 'Nouveau livreur : ' . $nom, "$vehicule · $ville ($pays) · à valider dans l’espace Kaislo → Livreurs");
    repondre(['ok' => true], 201);
}

function livreurParAcces(string $cle): array
{
    $cleIp = 'acces-livreur:' . adresseIp();
    verifierBlocage($cleIp);
    $l = preg_match('/^[a-f0-9]{20}$/', $cle) ? requete("SELECT * FROM livreurs_pool WHERE acces_cle = ? AND statut = 'valide'", [$cle])->fetch() : false;
    if (!$l) { noterEchec($cleIp, 30); throw new ErreurApi('Accès introuvable : demandez un nouveau lien à l’équipe Kaislo', 404); }
    return $l;
}

/** Gains d'un livreur : courses livrées, prix total, commission due à Kaislo, et net. */
function gainsLivreur(string $livreurId): array
{
    $l = requete("SELECT offre_prix, gain_livreur, commission_livraison, commission_reglee_le, devise FROM commandes_en_ligne WHERE livreur_id = ? AND statut = 'livree'", [$livreurId])->fetchAll();
    $brut = 0.0; $net = 0.0; $due = 0.0;
    foreach ($l as $x) { $brut += (float) $x['offre_prix']; $net += (float) $x['gain_livreur']; if (empty($x['commission_reglee_le'])) $due += (float) $x['commission_livraison']; }
    return ['courses' => count($l), 'brut' => $brut, 'net' => $net, 'commissionDue' => $due, 'devise' => $l[0]['devise'] ?? ''];
}

/** Offres que ce livreur peut voir : course proposée il y a moins de 30 min, boutique à moins de LivreursRayonKm de lui (ou même ville sans position). */
function offresPourLivreur(array $livreur): array
{
    if (!$livreur['disponible']) return [];
    $depuis = maintenant(-OFFRE_DUREE_SECONDES);
    $lignes = requete("SELECT o.id, o.numero, o.offre_prix, o.devise, o.lignes, o.offre_le, c.nom AS boutique, c.quartier, c.ville, c.pays, b.lat, b.lng
        FROM commandes_en_ligne o JOIN commerces c ON c.id = o.commerce_id LEFT JOIN boutiques b ON b.commerce_id = o.commerce_id
        WHERE o.offre_le IS NOT NULL AND o.offre_le >= ? AND (o.livreur_id IS NULL OR o.livreur_id = '') AND o.statut IN ('confirmee', 'prete') ORDER BY o.offre_le DESC LIMIT 50", [$depuis])->fetchAll();
    $rayon = max(1.0, (float) (lireFichierEnvCle('LivreursRayonKm') ?? 8));
    $positionFraiche = $livreur['lat'] !== null && $livreur['position_le'] && strtotime((string) $livreur['position_le']) >= time() - POSITION_LIVREUR_SECONDES;
    $offres = [];
    foreach ($lignes as $o) {
        if ($o['pays'] !== $livreur['pays']) continue;
        $km = null;
        if ($positionFraiche && $o['lat'] !== null) {
            $km = distanceKm((float) $livreur['lat'], (float) $livreur['lng'], (float) $o['lat'], (float) $o['lng']);
            if ($km > $rayon) continue;
        } elseif (mb_strtolower(trim((string) $o['ville'])) !== mb_strtolower(trim((string) $livreur['ville']))) {
            continue; // sans position, seulement dans sa ville
        }
        $offres[] = ['offre' => $o['id'], 'numero' => (int) $o['numero'], 'boutique' => $o['boutique'], 'lieu' => trim(($o['quartier'] ?? '') . ', ' . $o['ville'], ', '), 'distanceKm' => $km === null ? null : round($km, 1),
            'prix' => (float) $o['offre_prix'], 'commission' => commissionLivreur((float) $o['offre_prix'], $o['devise']), 'devise' => $o['devise'], 'articles' => array_sum(array_map(fn ($x) => (int) ($x['quantite'] ?? 0), json_decode($o['lignes'], true) ?: []))];
    }
    return $offres;
}

function courseEnCoursLivreur(string $livreurId): ?array
{
    $c = requete("SELECT numero, course_cle, statut FROM commandes_en_ligne WHERE livreur_id = ? AND statut IN ('confirmee', 'prete', 'en_route') ORDER BY modifie_le DESC LIMIT 1", [$livreurId])->fetch();
    return $c ? ['numero' => (int) $c['numero'], 'statut' => $c['statut'], 'lien' => lienCourse((string) $c['course_cle'])] : null;
}

// GET /api/public/livreur?k=…
function routeLivreurLire(): never
{
    exigerOptionLivraison('independants');
    $l = livreurParAcces((string) ($_GET['k'] ?? ''));
    header('Cache-Control: private, no-store');
    $enCours = courseEnCoursLivreur($l['id']);
    repondre(['ok' => true, 'livreur' => ['nom' => $l['nom'], 'disponible' => (bool) $l['disponible'], 'vehicule' => $l['vehicule']], 'gains' => gainsLivreur($l['id']), 'courseEnCours' => $enCours,
        'offres' => $enCours ? [] : offresPourLivreur($l), 'commissionPourcent' => (float) str_replace(',', '.', (string) (lireFichierEnvCle('CommissionLivreur') ?? '20'))]);
}

// POST /api/public/livreur/etat { k, disponible, lat?, lng? }
function routeLivreurEtat(): never
{
    exigerOptionLivraison('independants');
    $e = entree();
    $l = livreurParAcces((string) ($e['k'] ?? ''));
    $dispo = !empty($e['disponible']) ? 1 : 0;
    $lat = null; $lng = null;
    if ($dispo && is_numeric($e['lat'] ?? null) && is_numeric($e['lng'] ?? null)) {
        [$lat, $lng] = positionValide(['lat' => $e['lat'], 'lng' => $e['lng']]);
    }
    if ($dispo && $lat !== null) requete('UPDATE livreurs_pool SET disponible = 1, lat = ?, lng = ?, position_le = ? WHERE id = ?', [$lat, $lng, maintenant(), $l['id']]);
    elseif ($dispo) requete('UPDATE livreurs_pool SET disponible = 1 WHERE id = ?', [$l['id']]);
    else requete('UPDATE livreurs_pool SET disponible = 0, lat = NULL, lng = NULL, position_le = NULL WHERE id = ?', [$l['id']]); // plus disponible : la position est effacée
    repondre(['ok' => true, 'disponible' => (bool) $dispo]);
}

// POST /api/public/livreur/accepter { k, offre } : le premier livreur qui accepte prend la course
function routeLivreurAccepter(): never
{
    exigerOptionLivraison('independants');
    $e = entree();
    $l = livreurParAcces((string) ($e['k'] ?? ''));
    if (courseEnCoursLivreur($l['id'])) throw new ErreurApi('Terminez d’abord votre course en cours', 400);
    $offre = (string) ($e['offre'] ?? '');
    if (!in_array($offre, array_column(offresPourLivreur($l), 'offre'), true)) throw new ErreurApi('Cette course n’est plus disponible', 409);
    $cle = bin2hex(random_bytes(10));
    $code = (string) random_int(1000, 9999);
    // Une seule mise à jour gagne : si un autre livreur a accepté entre-temps, aucune ligne ne change
    $q = requete("UPDATE commandes_en_ligne SET livreur_id = ?, livreur_nom = ?, course_cle = ?, code_livraison = COALESCE(NULLIF(code_livraison, ''), ?), offre_le = NULL, modifie_le = ?
        WHERE id = ? AND offre_le IS NOT NULL AND (livreur_id IS NULL OR livreur_id = '') AND statut IN ('confirmee', 'prete')", [$l['id'], $l['nom'], $cle, $code, maintenant(), $offre]);
    if ($q->rowCount() !== 1) throw new ErreurApi('Un autre livreur vient de prendre cette course', 409);
    $c = requete('SELECT * FROM commandes_en_ligne WHERE id = ?', [$offre])->fetch();
    journaliser($c['commerce_id'], null, 'course-acceptee', ['numero' => (int) $c['numero'], 'livreur' => $l['id']]);
    try { envoyerPush($c['commerce_id'], 'commande', 'Livreur trouvé', $l['nom'] . ' livre la commande n° ' . $c['numero'] . '.', '/app/'); } catch (Throwable) { /* le gérant le verra dans l'application */ }
    repondre(['ok' => true, 'lienCourse' => lienCourse($cle)]);
}

// POST /api/commandes-en-ligne/offrir { id, prix } | { id, annuler: true } : le commerçant propose la course aux livreurs Kaislo
function routeCommandeOffrir(): never
{
    exigerOptionLivraison('independants');
    $u = utilisateurConnecte();
    $e = entree();
    $c = requete('SELECT * FROM commandes_en_ligne WHERE id = ? AND commerce_id = ?', [(string) ($e['id'] ?? ''), $u['commerce_id']])->fetch();
    if (!$c) throw new ErreurApi('Commande introuvable', 404);
    if (!empty($e['annuler'])) {
        requete("UPDATE commandes_en_ligne SET offre_le = NULL, modifie_le = ? WHERE id = ? AND (livreur_id IS NULL OR livreur_id = '')", [maintenant(), $c['id']]);
    } else {
        if (($c['mode'] ?: 'livraison') !== 'livraison') throw new ErreurApi('Cette commande est à retirer en boutique : pas de livreur');
        if (!in_array($c['statut'], ['confirmee', 'prete'], true)) throw new ErreurApi('Acceptez d’abord la commande, avant de chercher un livreur');
        if (!empty($c['livreur_id'])) throw new ErreurApi('Cette commande a déjà un livreur');
        if (!is_numeric($e['prix'] ?? null) || (float) $e['prix'] <= 0 || (float) $e['prix'] > 1000000) throw new ErreurApi('Indiquez le prix de la course');
        requete('UPDATE commandes_en_ligne SET offre_le = ?, offre_prix = ?, modifie_le = ? WHERE id = ?', [maintenant(), arrondirMontant((float) $e['prix'], $c['devise']), maintenant(), $c['id']]);
    }
    repondre(['ok' => true, 'commande' => versCommandeLigne(requete('SELECT * FROM commandes_en_ligne WHERE id = ?', [$c['id']])->fetch())]);
}

// GET/POST /api/admin/livreurs : l'équipe valide les livreurs, suit leurs gains et règle leurs commissions
function versLivreurAdmin(array $l): array
{
    return ['id' => $l['id'], 'nom' => $l['nom'], 'telephone' => $l['telephone'], 'pays' => $l['pays'], 'ville' => $l['ville'], 'vehicule' => $l['vehicule'], 'statut' => $l['statut'], 'disponible' => (bool) $l['disponible'],
        'creeLe' => $l['cree_le'], 'gains' => gainsLivreur($l['id']), 'lien' => $l['statut'] === 'valide' && $l['acces_cle'] ? lienEspaceLivreur($l['acces_cle']) : null];
}

function routeAdminLivreurs(): never
{
    adminConnecte();
    $liste = requete("SELECT * FROM livreurs_pool ORDER BY CASE statut WHEN 'attente' THEN 0 WHEN 'valide' THEN 1 ELSE 2 END, cree_le DESC LIMIT 300")->fetchAll();
    repondre(['ok' => true, 'livreurs' => array_map('versLivreurAdmin', $liste), 'enAttente' => (int) requete("SELECT COUNT(*) AS n FROM livreurs_pool WHERE statut = 'attente'")->fetch()['n']]);
}

function routeAdminLivreurAgir(): never
{
    $admin = adminConnecte();
    $e = entree();
    $l = requete('SELECT * FROM livreurs_pool WHERE id = ?', [(string) ($e['id'] ?? '')])->fetch();
    if (!$l) throw new ErreurApi('Livreur introuvable', 404);
    $action = (string) ($e['action'] ?? '');
    if ($action === 'valider') {
        $cle = $l['acces_cle'] ?: bin2hex(random_bytes(10));
        requete("UPDATE livreurs_pool SET statut = 'valide', acces_cle = ?, valide_le = ?, valide_par = ? WHERE id = ?", [$cle, maintenant(), $admin['nom'], $l['id']]);
    } elseif ($action === 'refuser' || $action === 'suspendre') {
        requete('UPDATE livreurs_pool SET statut = ?, disponible = 0, lat = NULL, lng = NULL, position_le = NULL WHERE id = ?', [$action === 'refuser' ? 'refuse' : 'suspendu', $l['id']]);
    } elseif ($action === 'nouveau-lien') {
        if ($l['statut'] !== 'valide') throw new ErreurApi('Seul un livreur validé a un lien');
        requete('UPDATE livreurs_pool SET acces_cle = ? WHERE id = ?', [bin2hex(random_bytes(10)), $l['id']]); // l'ancien lien cesse de marcher
    } elseif ($action === 'regler') {
        requete("UPDATE commandes_en_ligne SET commission_reglee_le = ? WHERE livreur_id = ? AND statut = 'livree' AND commission_reglee_le IS NULL", [maintenant(), $l['id']]);
    } else {
        throw new ErreurApi('Action inconnue');
    }
    journaliser('amorac', null, 'livreur-' . $action, ['livreur' => $l['id'], 'par' => $admin['nom']]);
    repondre(['ok' => true, 'livreur' => versLivreurAdmin(requete('SELECT * FROM livreurs_pool WHERE id = ?', [$l['id']])->fetch())]);
}
