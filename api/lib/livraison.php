<?php
// ------------------------------------------------------------
// COMMANDE ET LIVRAISON : interrupteur général (chantier préparé, pas encore activé : voir docs/chantier-livraison.md)
//   GET /api/livraison/etat   { ok, actif } : l'application et le site s'y réfèrent avant d'afficher quoi que ce soit de la livraison
// Activer : ajouter « LivraisonActive=oui » dans le fichier .env du serveur (et vider le cache). Désactiver : retirer la ligne.
// Les routes du chantier appellent exigerLivraison() : tant que l'interrupteur est coupé, elles répondent 404 comme si elles n'existaient pas.
// ------------------------------------------------------------

function livraisonActive(): bool
{
    return in_array(strtolower(trim((string) (lireFichierEnvCle('LivraisonActive') ?? ''))), ['oui', '1', 'true'], true);
}

function exigerLivraison(): void
{
    if (!livraisonActive()) throw new ErreurApi('Introuvable', 404);
}

function routeLivraisonEtat(): never
{
    repondre(['ok' => true, 'actif' => livraisonActive()]);
}

// ---------- Notification du client quand le statut de sa commande change (lot L1) ----------
// Le client n'a pas de compte : son appareil s'abonne avec la clé de suivi de sa commande (utilisateur « cl:<clé> »).

function textesStatutClient(string $statut, string $mode, string $langue): ?array
{
    $retrait = $mode === 'retrait';
    $fr = ['confirmee' => 'Votre commande n° {n} est acceptée.', 'en_route' => 'Votre commande n° {n} est en route : tenez votre code de livraison prêt.', 'prete' => $retrait ? 'Votre commande n° {n} est prête à être retirée.' : 'Votre commande n° {n} est prête : la livraison se prépare.',
        'livree' => $retrait ? 'Votre commande n° {n} est retirée. Merci !' : 'Votre commande n° {n} est livrée. Merci !', 'annulee' => 'Votre commande n° {n} a été annulée par la boutique.'];
    $en = ['confirmee' => 'Your order no. {n} has been accepted.', 'en_route' => 'Your order no. {n} is on its way: have your delivery code ready.', 'prete' => $retrait ? 'Your order no. {n} is ready to pick up.' : 'Your order no. {n} is ready: delivery is being prepared.',
        'livree' => $retrait ? 'Your order no. {n} has been picked up. Thank you!' : 'Your order no. {n} has been delivered. Thank you!', 'annulee' => 'Your order no. {n} was cancelled by the shop.'];
    $t = ($langue === 'en' ? $en : $fr)[$statut] ?? null;
    return $t === null ? null : [$t];
}

/** Prévient les appareils du client que la commande a changé de statut. Sans abonnement ou sans clé : rien. */
function notifierClientCommande(array $commande, string $statut): void
{
    if (!livraisonActive() || empty($commande['suivi_cle'])) return;
    $abos = requete('SELECT * FROM abonnements_push WHERE utilisateur_id = ?', ['cl:' . $commande['suivi_cle']])->fetchAll();
    if (!$abos) return;
    $boutique = requete('SELECT nom FROM commerces WHERE id = ?', [$commande['commerce_id']])->fetch()['nom'] ?? 'Kaislo';
    foreach (['fr', 'en'] as $langue) {
        $groupe = array_values(array_filter($abos, fn ($a) => ($a['langue'] ?: 'fr') === $langue));
        $t = textesStatutClient($statut, (string) ($commande['mode'] ?: 'livraison'), $langue);
        if ($groupe && $t) diffuserPush($groupe, $commande['commerce_id'], 'commande', $boutique, str_replace('{n}', (string) $commande['numero'], $t[0]), '/');
    }
}

// POST /api/public/commande-suivi/notifier { cle, endpoint, appareil, langue } : le client autorise les notifications pour cette commande
function routeSuiviNotifier(): never
{
    exigerLivraison();
    $e = entree();
    $cle = (string) ($e['cle'] ?? '');
    $cleIp = 'suivi-notifier:' . adresseIp();
    verifierBlocage($cleIp);
    $c = preg_match('/^[a-f0-9]{20}$/', $cle) ? requete('SELECT commerce_id FROM commandes_en_ligne WHERE suivi_cle = ?', [$cle])->fetch() : false;
    if (!$c) { noterEchec($cleIp, 60); throw new ErreurApi('Commande introuvable', 404); }
    $endpoint = (string) ($e['endpoint'] ?? '');
    if (!adressePushAutorisee($endpoint)) throw new ErreurApi('Ce navigateur n’est pas pris en charge pour les notifications');
    $hash = hash('sha256', $endpoint);
    $appareil = mb_substr((string) ($e['appareil'] ?? ''), 0, 200);
    $langue = ($e['langue'] ?? '') === 'en' ? 'en' : 'fr';
    $utilisateur = 'cl:' . $cle;
    $existant = requete('SELECT id FROM abonnements_push WHERE endpoint_hash = ?', [$hash])->fetch();
    if ($existant) {
        requete('UPDATE abonnements_push SET commerce_id = ?, utilisateur_id = ?, appareil = ?, langue = ?, vu_le = ?, echecs = 0 WHERE id = ?', [$c['commerce_id'], $utilisateur, $appareil, $langue, maintenant(), $existant['id']]);
    } else {
        if ((int) requete('SELECT COUNT(*) AS n FROM abonnements_push WHERE utilisateur_id = ?', [$utilisateur])->fetch()['n'] >= 3) throw new ErreurApi('Trop d’appareils pour cette commande', 400);
        requete('INSERT INTO abonnements_push (id, commerce_id, utilisateur_id, endpoint_hash, endpoint, appareil, langue, cree_le, vu_le, echecs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)', [
            nouvelId('ap'), $c['commerce_id'], $utilisateur, $hash, $endpoint, $appareil, $langue, maintenant(), maintenant(),
        ]);
    }
    repondre(['ok' => true]);
}

// ---------- Lot L2 : livraison par le commerçant ----------
// Le livreur est une simple fiche (nom, téléphone) : pas de compte, donc aucun accès aux données du commerce. Chaque course a son propre lien,
// que le commerçant lui envoie ; le client donne un code à quatre chiffres à la remise, qui termine la course.

function lienCourse(string $cle): string
{
    return 'https://' . (domaineSite() ?: 'kaislo.com') . '/livraison/?c=' . $cle;
}

function versLivreur(array $l): array
{
    return ['id' => $l['id'], 'nom' => $l['nom'], 'telephone' => $l['telephone'], 'actif' => (bool) $l['actif']];
}

// GET /api/livreurs
function routeLivreursLire(): never
{
    exigerLivraison();
    $u = utilisateurConnecte();
    if ($u['role'] !== 'gerant') throw new ErreurApi('Réservé au gérant', 403);
    repondre(['ok' => true, 'livreurs' => array_map('versLivreur', requete('SELECT * FROM livreurs WHERE commerce_id = ? ORDER BY nom', [$u['commerce_id']])->fetchAll())]);
}

// POST /api/livreurs { id?, nom, telephone, actif? } : crée ou modifie un livreur (actif = false : il n'apparaît plus dans les choix)
function routeLivreursEcrire(): never
{
    exigerLivraison();
    $u = utilisateurConnecte();
    if ($u['role'] !== 'gerant') throw new ErreurApi('Réservé au gérant', 403);
    $e = entree();
    $c = requete('SELECT pays FROM commerces WHERE id = ?', [$u['commerce_id']])->fetch();
    $nom = texte($e, 'nom', 'le nom du livreur', true, 60, 'personne');
    $tel = telephoneValide(texte($e, 'telephone', 'le numéro du livreur', true, 40), $c['pays'], 'numéro du livreur');
    $actif = array_key_exists('actif', $e) ? (!empty($e['actif']) ? 1 : 0) : 1;
    $id = (string) ($e['id'] ?? '');
    if ($id !== '') {
        if (!requete('SELECT 1 FROM livreurs WHERE id = ? AND commerce_id = ?', [$id, $u['commerce_id']])->fetch()) throw new ErreurApi('Livreur introuvable', 404);
        requete('UPDATE livreurs SET nom = ?, telephone = ?, actif = ? WHERE id = ?', [$nom, $tel['affichage'], $actif, $id]);
    } else {
        if ((int) requete('SELECT COUNT(*) AS n FROM livreurs WHERE commerce_id = ?', [$u['commerce_id']])->fetch()['n'] >= 30) throw new ErreurApi('Trente livreurs au plus : désactivez ceux qui ne livrent plus');
        $id = nouvelId('lv');
        requete('INSERT INTO livreurs (id, commerce_id, nom, telephone, actif, cree_le) VALUES (?, ?, ?, ?, ?, ?)', [$id, $u['commerce_id'], $nom, $tel['affichage'], $actif, maintenant()]);
    }
    journaliser($u['commerce_id'], $u['id'], 'livreur-enregistre', ['livreur' => $id, 'actif' => (bool) $actif]);
    repondre(['ok' => true, 'livreur' => versLivreur(requete('SELECT * FROM livreurs WHERE id = ?', [$id])->fetch())]);
}

// POST /api/commandes-en-ligne/assigner { id, livreurId } : donne la course à un livreur ; renvoie le lien à lui envoyer
function routeCommandeAssigner(): never
{
    exigerLivraison();
    $u = utilisateurConnecte();
    $e = entree();
    $c = requete('SELECT * FROM commandes_en_ligne WHERE id = ? AND commerce_id = ?', [(string) ($e['id'] ?? ''), $u['commerce_id']])->fetch();
    if (!$c) throw new ErreurApi('Commande introuvable', 404);
    if (($c['mode'] ?: 'livraison') !== 'livraison') throw new ErreurApi('Cette commande est à retirer en boutique : pas de livreur');
    if (!in_array($c['statut'], ['confirmee', 'prete', 'en_route'], true)) throw new ErreurApi('Acceptez d’abord la commande, avant de la confier à un livreur');
    $l = requete('SELECT * FROM livreurs WHERE id = ? AND commerce_id = ? AND actif = 1', [(string) ($e['livreurId'] ?? ''), $u['commerce_id']])->fetch();
    if (!$l) throw new ErreurApi('Livreur introuvable', 404);
    // Nouveau lien à chaque attribution : l'ancien livreur ne peut plus rien faire. Le code de remise, lui, reste celui que le client connaît.
    $cle = bin2hex(random_bytes(10));
    $code = $c['code_livraison'] ?: (string) random_int(1000, 9999);
    requete('UPDATE commandes_en_ligne SET livreur_id = ?, livreur_nom = ?, course_cle = ?, code_livraison = ?, modifie_le = ? WHERE id = ?', [$l['id'], $l['nom'], $cle, $code, maintenant(), $c['id']]);
    journaliser($u['commerce_id'], $u['id'], 'commande-assignee', ['numero' => (int) $c['numero'], 'livreur' => $l['id']]);
    $c = requete('SELECT * FROM commandes_en_ligne WHERE id = ?', [$c['id']])->fetch();
    repondre(['ok' => true, 'commande' => versCommandeLigne($c), 'livreur' => versLivreur($l)]);
}

function courseParCle(string $cle): array
{
    $cleIp = 'course:' . adresseIp();
    verifierBlocage($cleIp);
    $c = preg_match('/^[a-f0-9]{20}$/', $cle) ? requete('SELECT * FROM commandes_en_ligne WHERE course_cle = ?', [$cle])->fetch() : false;
    if (!$c) { noterEchec($cleIp, 60); throw new ErreurApi('Course introuvable', 404); }
    return $c;
}

// GET /api/public/course?cle=… : ce que voit le livreur (seulement cette commande)
function routeCourseLire(): never
{
    exigerLivraison();
    $c = courseParCle((string) ($_GET['cle'] ?? ''));
    $commerce = requete('SELECT nom, quartier, ville FROM commerces WHERE id = ?', [$c['commerce_id']])->fetch();
    $b = requete('SELECT whatsapp_cle FROM boutiques WHERE commerce_id = ?', [$c['commerce_id']])->fetch();
    $lignes = array_map(fn ($x) => ['nom' => (string) ($x['nom'] ?? ''), 'quantite' => (int) ($x['quantite'] ?? 0)], json_decode($c['lignes'], true) ?: []);
    header('Cache-Control: private, no-store');
    repondre(['ok' => true, 'course' => [
        'numero' => (int) $c['numero'], 'statut' => $c['statut'], 'boutique' => $commerce['nom'], 'lieuBoutique' => trim(($commerce['quartier'] ?? '') . ', ' . ($commerce['ville'] ?? ''), ', '), 'whatsappBoutique' => $b['whatsapp_cle'] ?? '',
        'client' => ['nom' => $c['client_nom'], 'telephone' => $c['client_telephone'], 'adresse' => $c['adresse']], 'note' => $c['note'], 'lignes' => $lignes,
        'total' => (float) $c['total'], 'devise' => $c['devise'], 'livreur' => $c['livreur_nom'],
    ]]);
}

// POST /api/public/course/statut { cle, action: 'recupere' | 'livre', code? }
//   recupere : le livreur a pris la commande, elle passe « en route » (le client est prévenu et voit son code)
//   livre    : le client a donné son code, la commande passe « livrée »
function routeCourseStatut(): never
{
    exigerLivraison();
    $e = entree();
    $c = courseParCle((string) ($e['cle'] ?? ''));
    $action = (string) ($e['action'] ?? '');
    if ($action === 'recupere') {
        if (!in_array($c['statut'], ['confirmee', 'prete'], true)) throw new ErreurApi($c['statut'] === 'en_route' ? 'La course est déjà en route' : 'Cette commande ne peut plus être récupérée', 400);
        $nouveau = 'en_route';
    } elseif ($action === 'livre') {
        if ($c['statut'] !== 'en_route') throw new ErreurApi('Récupérez d’abord la commande', 400);
        $cleIp = 'course-code:' . $c['id'];
        verifierBlocage($cleIp);
        if (!hash_equals((string) $c['code_livraison'], trim((string) ($e['code'] ?? '')))) {
            if (noterEchec($cleIp, 5)) throw new ErreurApi('Trop d’essais : appelez la boutique', 429); // cinq codes faux au plus
            throw new ErreurApi('Ce code n’est pas le bon : demandez-le au client', 400);
        }
        $nouveau = 'livree';
    } else {
        throw new ErreurApi('Action inconnue');
    }
    requete('UPDATE commandes_en_ligne SET statut = ?, modifie_le = ? WHERE id = ?', [$nouveau, maintenant(), $c['id']]);
    journaliser($c['commerce_id'], null, 'course-' . $action, ['numero' => (int) $c['numero']]);
    $c['statut'] = $nouveau;
    notifierClientCommande($c, $nouveau);
    // Le gérant est prévenu sur ses appareils
    $texte = $nouveau === 'livree' ? 'La commande n° ' . $c['numero'] . ' est livrée à ' . $c['client_nom'] . '.' : $c['livreur_nom'] . ' a récupéré la commande n° ' . $c['numero'] . ' : elle est en route.';
    try { envoyerPush($c['commerce_id'], 'commande', 'Livraison', $texte, '/app/'); } catch (Throwable) { /* le gérant verra le statut dans l'application */ }
    repondre(['ok' => true, 'etat' => $nouveau]);
}
