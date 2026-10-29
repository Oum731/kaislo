<?php
// ------------------------------------------------------------
// BOUTIQUE EN LIGNE : une vitrine par commerce (kaislo.com/boutique/nom-du-commerce/, ancienne forme /boutique/?b=nom-du-commerce toujours valable).
//
//   Le commerçant choisit les articles à publier (case « Vendre en ligne » de la fiche article) et active sa boutique.
//   Le client compose son panier, saisit son nom et son numéro, puis la commande part sur le WhatsApp du commerçant
//   (message prêt à envoyer). La commande est aussi gardée dans Kaislo : le commerçant la suit (nouvelle → confirmée →
//   prête → livrée) et peut la reporter dans sa caisse pour que ventes et stock restent justes.
//
//   Kaislo n'encaisse rien : le client paie le commerçant comme d'habitude. Les prix sont recalculés ici (jamais ceux du navigateur).
//
//   Commerçant (connecté) :
//     GET  /api/boutique                 réglages de la boutique et lien
//     POST /api/boutique                 { actif, slug, whatsapp, description, livraison } (gérant)
//     GET  /api/commandes-en-ligne       commandes reçues et nombre de nouvelles
//     POST /api/commandes-en-ligne       { id, statut }
//   Public :
//     GET  /api/public/boutiques?pays=CI annuaire : boutiques actives qui acceptent d'y figurer, avec quelques articles en exemple.
//                                        Seules les boutiques du pays du visiteur sont renvoyées (pays choisi, sinon déduit de l'adresse IP : voir pays.php).
//     GET  /api/public/boutique?b=slug   boutique, catégories et articles publiés
//     GET  /api/public/boutique-image?b=slug&i=img_…
//     POST /api/public/commande          { b, client: { nom, telephone, adresse? }, note?, lignes: [{ produitId, quantite, options? }] }
// ------------------------------------------------------------

const SLUGS_RESERVES = ['admin', 'app', 'api', 'commercial', 'boutique', 'kaislo', 'www', 'b', 'demo', 'en', 'pays', 'guides'];
const STATUTS_COMMANDE = ['nouvelle', 'confirmee', 'prete', 'livree', 'annulee'];
const LIGNES_COMMANDE_MAX = 40;
const BOUTIQUES_ANNUAIRE_MAX = 300; // boutiques affichées dans la liste d'un pays
const COMMANDES_AFFICHEES = 100;

function slugBoutique(string $texte): string
{
    $s = strtolower(preg_replace('/[^A-Za-z0-9]+/', '-', (string) iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $texte)));
    return trim(substr(trim($s, '-'), 0, 40), '-');
}

function slugValide(string $slug): bool
{
    return (bool) preg_match('/^[a-z0-9]+(-[a-z0-9]+)*$/', $slug) && strlen($slug) >= 3 && strlen($slug) <= 40 && !in_array($slug, SLUGS_RESERVES, true);
}

function lienBoutique(string $slug): string
{
    return 'https://' . (domaineSite() ?: 'kaislo.com') . '/boutique/' . $slug . '/';
}

// Pourquoi une boutique n'est (ou n'est pas) dans la liste kaislo.com/boutiques : '' = elle y est, sinon la raison (affichée au gérant)
function raisonAbsenceAnnuaire(?array $b, array $commerce, int $nbPublies): string
{
    if (!$b) return 'pasDeBoutique';
    if (!$b['actif']) return 'desactivee';
    if ($b['publique'] !== null && !(int) $b['publique']) return 'privee';
    if (($commerce['statut'] ?? '') === 'suspendu') return 'suspendu';
    if (abonnementExpire($commerce)) return 'abonnement';
    if ($nbPublies < 1) return 'aucunArticle';
    return '';
}

function versBoutique(?array $b, array $commerce): array
{
    $nbPublies = count(articlesPublies($commerce['id']));
    $raison = raisonAbsenceAnnuaire($b, $commerce, $nbPublies);
    return [
        'actif' => $b ? (bool) $b['actif'] : false,
        'slug' => $b['slug'] ?? '',
        'suggestion' => $b ? '' : slugBoutique($commerce['nom']),
        'whatsapp' => $b['whatsapp'] ?? '',
        'publique' => $b ? ($b['publique'] === null ? true : (bool) $b['publique']) : true,
        'conditionsAcceptees' => !empty($b['conditions_le']),
        'chat' => empty($b['chat_off']),
        'grosDisponible' => !in_array($commerce['type'], TYPES_RESTAURATION, true),
        'proActif' => !empty($b['pro_cle']),
        'lienPro' => !empty($b['pro_cle']) ? lienBoutique($b['slug']) . '?pro=' . $b['pro_cle'] : '',
        'articlesGros' => count(array_filter(articlesPublies($commerce['id']), fn ($p) => prixGrosValide($p) !== null)),
        'description' => $b['description'] ?? '',
        'livraison' => $b['livraison'] ?? '',
        'lien' => $b ? lienBoutique($b['slug']) : '',
        'articlesPublies' => $nbPublies,
        'dansAnnuaire' => $raison === '',
        'raisonAnnuaire' => $raison,
    ];
}

// Articles marqués « Vendre en ligne » (contenu des fiches article, tel que l'application les a envoyées)
function articlesPublies(string $commerceId): array
{
    $liste = [];
    foreach (requete("SELECT id, contenu FROM elements WHERE commerce_id = ? AND type = 'produits' AND supprime = 0", [$commerceId])->fetchAll() as $l) {
        $p = json_decode($l['contenu'], true);
        if (is_array($p) && !empty($p['enLigne']) && !empty($p['nom']) && isset($p['prix'])) $liste[$p['id'] ?? $l['id']] = $p;
    }
    return $liste;
}

// Prix de gros d'un article (au carton, sac…) : [prix, unite, contenance, minimum], ou null s'il n'en a pas (ou s'il a des options)
function prixGrosValide(array $p): ?array
{
    $g = $p['gros'] ?? null;
    if (!is_array($g) || !is_numeric($g['prix'] ?? null) || (float) $g['prix'] <= 0 || (float) ($g['contenance'] ?? 0) <= 0 || !empty($p['groupes'])) return null;
    $unites = ['carton', 'sac', 'colis', 'caisse', 'paquet'];
    return [
        'prix' => (float) $g['prix'], 'unite' => in_array($g['unite'] ?? '', $unites, true) ? $g['unite'] : 'carton',
        'contenance' => round((float) $g['contenance'], 3), 'minimum' => max(1, (int) ($g['minimum'] ?? 1)),
        'demi' => is_array($g['demi'] ?? null) && is_numeric($g['demi']['prix'] ?? null) && (float) $g['demi']['prix'] > 0 ? (float) $g['demi']['prix'] : null, // prix du demi-carton
    ];
}

// Les articles tels que les voit un grossiste : seulement ceux qui ont un prix de gros, à ce prix, au carton (jamais le prix de détail)
function articlesDeGros(array $articles): array
{
    $liste = [];
    foreach ($articles as $cle => $p) {
        $g = prixGrosValide($p);
        if (!$g) continue;
        $liste[$cle] = array_merge($p, ['prix' => $g['prix'], 'promo' => null, 'groupes' => [], 'nom' => $p['nom'] . ' (' . $g['unite'] . ' de ' . str_replace('.', ',', (string) $g['contenance']) . ')', '_gros' => $g]);
        // Le demi-carton est un article de plus (identifiant « …:demi »), au prix du demi-carton, à partir de 1
        if ($g['demi'] !== null) {
            $moitie = $g['contenance'] / 2;
            $liste[$cle . ':demi'] = array_merge($p, ['id' => $cle . ':demi', 'prix' => $g['demi'], 'promo' => null, 'groupes' => [], 'nom' => $p['nom'] . ' (demi-' . $g['unite'] . ' de ' . str_replace('.', ',', (string) round($moitie, 3)) . ')',
                '_gros' => ['prix' => $g['demi'], 'unite' => 'demi-' . $g['unite'], 'contenance' => $moitie, 'minimum' => 1, 'demi' => null]]);
        }
    }
    return $liste;
}

// La clé du lien privé de la boutique est-elle la bonne ? (comparaison à temps constant ; trop d'essais ratés : blocage)
function cleGrosValide(array $b, string $cle): bool
{
    if ($cle === '') return false;
    // Pas de vente en gros pour la restauration (restaurant, fast-food, snack, maquis, bar)
    $type = requete('SELECT type FROM commerces WHERE id = ?', [$b['commerce_id']])->fetch()['type'] ?? '';
    if (in_array($type, TYPES_RESTAURATION, true)) return false;
    $cleIp = 'cle-gros:' . adresseIp();
    verifierBlocage($cleIp);
    if (!empty($b['pro_cle']) && hash_equals((string) $b['pro_cle'], $cle)) return true;
    noterEchec($cleIp, 30);
    return false;
}

function boutiqueParSlug(string $slug): array
{
    if (!slugValide($slug)) throw new ErreurApi('Boutique introuvable', 404);
    $b = requete('SELECT * FROM boutiques WHERE slug = ?', [$slug])->fetch();
    if (!$b || !$b['actif']) throw new ErreurApi('Boutique introuvable', 404);
    $c = requete('SELECT * FROM commerces WHERE id = ?', [$b['commerce_id']])->fetch();
    if (!$c || $c['statut'] === 'suspendu' || abonnementExpire($c)) throw new ErreurApi('Cette boutique est momentanément fermée', 404);
    return [$b, $c];
}

function arrondirMontant(float $x, string $devise): float
{
    return in_array($devise, ['FCFA', 'GNF'], true) ? (float) round($x) : round($x, 2);
}

function prixArticle(array $p): float
{
    $promo = $p['promo'] ?? null;
    return ($promo !== null && $promo !== '' && (float) $promo > 0 && (float) $promo < (float) $p['prix']) ? (float) $promo : (float) $p['prix'];
}

// ---------- Commerçant ----------

function routeBoutiqueLire(): never
{
    $u = utilisateurConnecte();
    $c = requete('SELECT * FROM commerces WHERE id = ?', [$u['commerce_id']])->fetch();
    $b = requete('SELECT * FROM boutiques WHERE commerce_id = ?', [$u['commerce_id']])->fetch() ?: null;
    repondre(['ok' => true, 'boutique' => versBoutique($b, $c)]);
}

function routeBoutiqueEnregistrer(): never
{
    $u = utilisateurConnecte();
    if ($u['role'] !== 'gerant') throw new ErreurApi('Réservé au gérant', 403);
    $e = entree();
    $c = requete('SELECT * FROM commerces WHERE id = ?', [$u['commerce_id']])->fetch();
    $avant = requete('SELECT * FROM boutiques WHERE commerce_id = ?', [$c['id']])->fetch() ?: null;
    $slug = strtolower(trim((string) ($e['slug'] ?? '')));
    if (!slugValide($slug)) throw new ErreurApi('Adresse de la boutique : 3 à 40 lettres minuscules, chiffres ou tirets (ex : chez-awa)');
    $autre = requete('SELECT commerce_id FROM boutiques WHERE slug = ?', [$slug])->fetch();
    if ($autre && $autre['commerce_id'] !== $c['id']) throw new ErreurApi('Cette adresse est déjà prise : choisissez-en une autre', 409);
    $num = telephoneValide(texte($e, 'whatsapp', 'le numéro WhatsApp qui reçoit les commandes', true, 40), $c['pays'], 'numéro WhatsApp');
    $actif = !empty($e['actif']) ? 1 : 0;
    // Kaislo est un outil, un pont entre les boutiques et leurs clients : le commerçant est seul responsable de ses articles et de ses ventes
    $accepteLe = $avant['conditions_le'] ?? null;
    if ($actif && !$accepteLe) {
        if (empty($e['conditionsAcceptees'])) throw new ErreurApi('Pour activer votre boutique, acceptez les conditions : Kaislo est un outil, vous restez seul responsable de vos articles, de vos prix, de la livraison et de vos ventes.');
        $accepteLe = maintenant();
    }
    $publique = array_key_exists('publique', $e) ? (!empty($e['publique']) ? 1 : 0) : ($avant && $avant['publique'] !== null ? (int) $avant['publique'] : 1);
    // Lien privé des grossistes : activé par le gérant, clé secrète au hasard, changeable (l'ancien lien cesse alors de marcher)
    $proCle = $avant['pro_cle'] ?? null;
    if (array_key_exists('pro', $e)) $proCle = !empty($e['pro']) ? ($proCle ?: bin2hex(random_bytes(8))) : null;
    if (in_array($c['type'], TYPES_RESTAURATION, true)) $proCle = null; // pas de vente en gros pour la restauration
    if (!empty($e['regenererPro']) && $proCle) $proCle = bin2hex(random_bytes(8));
    $chatOff = array_key_exists('chat', $e) ? (!empty($e['chat']) ? 0 : 1) : (int) ($avant['chat_off'] ?? 0);
    $description = texte($e, 'description', 'la description', false, 300);
    $livraison = texte($e, 'livraison', 'la livraison', false, 300);
    if ($avant) {
        requete('UPDATE boutiques SET slug = ?, actif = ?, publique = ?, conditions_le = ?, chat_off = ?, pro_cle = ?, whatsapp = ?, whatsapp_cle = ?, description = ?, livraison = ?, modifie_le = ? WHERE commerce_id = ?',
            [$slug, $actif, $publique, $accepteLe, $chatOff, $proCle, $num['affichage'], $num['cle'], $description, $livraison, maintenant(), $c['id']]);
    } else {
        requete('INSERT INTO boutiques (commerce_id, slug, actif, publique, conditions_le, chat_off, pro_cle, whatsapp, whatsapp_cle, description, livraison, cree_le, modifie_le) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [$c['id'], $slug, $actif, $publique, $accepteLe, $chatOff, $proCle, $num['affichage'], $num['cle'], $description, $livraison, maintenant(), maintenant()]);
    }
    journaliser($c['id'], $u['id'], 'boutique-enregistree', ['slug' => $slug, 'actif' => (bool) $actif]);
    $b = requete('SELECT * FROM boutiques WHERE commerce_id = ?', [$c['id']])->fetch();
    repondre(['ok' => true, 'boutique' => versBoutique($b, $c)]);
}

function versCommandeLigne(array $c): array
{
    return [
        'id' => $c['id'], 'numero' => (int) $c['numero'], 'statut' => $c['statut'], 'creeLe' => $c['cree_le'],
        'client' => ['nom' => $c['client_nom'], 'telephone' => $c['client_telephone'], 'adresse' => $c['adresse']],
        'note' => $c['note'], 'lignes' => json_decode($c['lignes'], true) ?: [], 'total' => (float) $c['total'], 'devise' => $c['devise'],
        'gros' => !empty($c['gros']),
    ];
}

function routeCommandesEnLigneLire(): never
{
    $u = utilisateurConnecte();
    $liste = requete('SELECT * FROM commandes_en_ligne WHERE commerce_id = ? ORDER BY cree_le DESC LIMIT ' . COMMANDES_AFFICHEES, [$u['commerce_id']])->fetchAll();
    $nouvelles = (int) requete("SELECT COUNT(*) AS n FROM commandes_en_ligne WHERE commerce_id = ? AND statut = 'nouvelle'", [$u['commerce_id']])->fetch()['n'];
    repondre(['ok' => true, 'commandes' => array_map('versCommandeLigne', $liste), 'nouvelles' => $nouvelles]);
}

function routeCommandesEnLigneStatut(): never
{
    $u = utilisateurConnecte();
    $e = entree();
    $statut = (string) ($e['statut'] ?? '');
    if (!in_array($statut, STATUTS_COMMANDE, true)) throw new ErreurApi('Statut inconnu');
    $c = requete('SELECT * FROM commandes_en_ligne WHERE id = ? AND commerce_id = ?', [(string) ($e['id'] ?? ''), $u['commerce_id']])->fetch();
    if (!$c) throw new ErreurApi('Commande introuvable', 404);
    requete('UPDATE commandes_en_ligne SET statut = ?, modifie_le = ? WHERE id = ?', [$statut, maintenant(), $c['id']]);
    $c['statut'] = $statut;
    repondre(['ok' => true, 'commande' => versCommandeLigne($c)]);
}

// ---------- Public ----------

function imagePublique(string $ref): ?string
{
    return str_starts_with($ref, 'img_') ? $ref : null;
}

// Logo (ou photo de profil) du commerce, tel que le gérant l'a choisi dans ses réglages : référence d'image, ou null s'il n'y en a pas
// (ou si l'image n'est pas arrivée sur le serveur : on n'affiche pas un logo cassé)
function logoBoutique(string $commerceId): ?string
{
    $ref = imagePublique((string) (reglagesCommerce($commerceId)['logo'] ?? ''));
    if (!$ref || !preg_match('/^img_[A-Za-z0-9_.:-]{1,36}$/', $ref)) return null;
    $l = requete("SELECT 1 FROM elements WHERE commerce_id = ? AND type = 'images' AND id = ? AND supprime = 0", [$commerceId, $ref])->fetch();
    return $l ? $ref : null;
}

function routeBoutiquePublique(): never
{
    [$b, $c] = boutiqueParSlug(strtolower((string) ($_GET['b'] ?? '')));
    // Lien privé des grossistes (?pro=clé) : le catalogue de gros ; clé fausse = même réponse qu'une boutique inconnue
    $cle = trim((string) ($_GET['pro'] ?? ''));
    if ($cle !== '') {
        if (!cleGrosValide($b, $cle)) throw new ErreurApi('Boutique introuvable', 404);
        header('Cache-Control: private, no-store');
        repondre(['ok' => true, 'boutique' => donneesBoutiquePublique($b, $c, true)]);
    }
    repondre(['ok' => true, 'boutique' => donneesBoutiquePublique($b, $c)]);
}

// Ce que le public voit d'une boutique : réglages, catégories utilisées et articles publiés (API et page pour Google)
function donneesBoutiquePublique(array $b, array $c, bool $gros = false): array
{
    $articles = $gros ? articlesDeGros(articlesPublies($c['id'])) : articlesPublies($c['id']);
    $categories = [];
    foreach (requete("SELECT contenu FROM elements WHERE commerce_id = ? AND type = 'categories' AND supprime = 0", [$c['id']])->fetchAll() as $l) {
        $cat = json_decode($l['contenu'], true);
        if (is_array($cat) && isset($cat['id'], $cat['nom'])) $categories[$cat['id']] = ['id' => $cat['id'], 'nom' => (string) $cat['nom']];
    }
    $produits = [];
    $utilisees = [];
    foreach ($articles as $p) {
        $groupes = [];
        foreach ((array) ($p['groupes'] ?? []) as $g) {
            $options = [];
            foreach ((array) ($g['options'] ?? []) as $o) if (isset($o['id'], $o['nom'])) $options[] = ['id' => (string) $o['id'], 'nom' => (string) $o['nom'], 'prix' => (float) ($o['prix'] ?? 0)];
            if ($options && isset($g['id'])) $groupes[] = ['id' => (string) $g['id'], 'nom' => (string) ($g['nom'] ?? ''), 'type' => ($g['type'] ?? '') === 'unique' ? 'unique' : 'multiple', 'obligatoire' => !empty($g['obligatoire']), 'options' => $options];
        }
        $image = imagePublique((string) ($p['image'] ?? ''));
        $produits[] = [
            'id' => (string) $p['id'], 'nom' => (string) $p['nom'], 'prix' => (float) $p['prix'], 'promo' => prixArticle($p) < (float) $p['prix'] ? prixArticle($p) : null,
            'categorieId' => (string) ($p['categorieId'] ?? ''), 'emoji' => (string) ($p['emoji'] ?? ''), 'image' => $image, 'unite' => (string) ($p['unite'] ?? ''), 'groupes' => $groupes,
        ] + ($gros ? ['minimum' => $p['_gros']['minimum'], 'uniteGros' => $p['_gros']['unite']] : []);
        $utilisees[$p['categorieId'] ?? ''] = true;
    }
    return [
        'slug' => $b['slug'], 'nom' => $c['nom'], 'type' => $c['type'], 'ville' => $c['ville'], 'quartier' => $c['quartier'] ?? '', 'devise' => $c['devise'], 'pays' => $c['pays'],
        'description' => $b['description'], 'livraison' => $b['livraison'], 'whatsapp' => $b['whatsapp_cle'], 'chat' => empty($b['chat_off']), 'logo' => logoBoutique($c['id']),
        'categories' => array_values(array_filter($categories, fn ($x) => isset($utilisees[$x['id']]))), 'produits' => $produits,
    ] + ($gros ? ['gros' => true] : []);
}

// GET /api/public/boutiques : annuaire pour les clients (sans numéro WhatsApp : il n'apparaît que sur la page de la boutique)
function routeBoutiquesAnnuaire(): never
{
    $demande = codePaysValide($_GET['pays'] ?? null); // pays choisi par le visiteur
    $pays = $demande ?? paysDeLAdresse(adresseIp());
    $liste = [];
    $disponibles = [];
    // Pré-filtre SQL : boutiques actives et publiques qui ont au moins un article marqué « en ligne » (le détail est revérifié ci-dessous).
    // Toutes les boutiques sont parcourues (pas de plafond partagé entre pays : un pays très actif ne doit pas cacher les autres) ;
    // seul le pays du visiteur est détaillé, et la liste de ce pays est plafonnée.
    $lignes = requete("SELECT b.slug, b.description, c.* FROM boutiques b JOIN commerces c ON c.id = b.commerce_id
        WHERE b.actif = 1 AND (b.publique IS NULL OR b.publique = 1) AND c.statut <> 'suspendu'
        AND EXISTS (SELECT 1 FROM elements e WHERE e.commerce_id = c.id AND e.type = 'produits' AND e.supprime = 0 AND (e.contenu LIKE '%\"enLigne\":true%' OR e.contenu LIKE '%\"enLigne\":1%'))
        ORDER BY b.modifie_le DESC LIMIT 5000")->fetchAll();
    foreach ($lignes as $c) {
        if (abonnementExpire($c)) continue;
        if ($pays !== $c['pays']) { $disponibles[$c['pays']] = ($disponibles[$c['pays']] ?? 0) + 1; continue; } // un client ne voit que les boutiques de son pays
        $articles = array_values(articlesPublies($c['id']));
        if (!$articles) continue;
        $disponibles[$c['pays']] = ($disponibles[$c['pays']] ?? 0) + 1;
        if (count($liste) >= BOUTIQUES_ANNUAIRE_MAX) continue;
        // Exemples : les articles avec photo d'abord, quatre au plus
        usort($articles, fn ($x, $y) => (int) !empty($y['image']) <=> (int) !empty($x['image']));
        $exemples = array_map(fn ($p) => [
            'nom' => (string) $p['nom'], 'prix' => (float) $p['prix'], 'promo' => prixArticle($p) < (float) $p['prix'] ? prixArticle($p) : null,
            'emoji' => (string) ($p['emoji'] ?? ''), 'image' => imagePublique((string) ($p['image'] ?? '')),
        ], array_slice($articles, 0, 4));
        $liste[] = [
            'slug' => $c['slug'], 'nom' => $c['nom'], 'type' => $c['type'], 'pays' => $c['pays'], 'ville' => $c['ville'], 'quartier' => $c['quartier'] ?? '',
            'devise' => $c['devise'], 'description' => (string) $c['description'], 'nbArticles' => count($articles), 'exemples' => $exemples, 'logo' => logoBoutique($c['id']),
        ];
    }
    header('Cache-Control: private, max-age=60');
    repondre(['ok' => true, 'pays' => $pays, 'paysDisponibles' => $disponibles, 'boutiques' => $liste]);
}

function routeBoutiqueImage(): never
{
    [, $c] = boutiqueParSlug(strtolower((string) ($_GET['b'] ?? '')));
    $ref = (string) ($_GET['i'] ?? '');
    if (!preg_match('/^img_[A-Za-z0-9_.:-]{1,36}$/', $ref)) throw new ErreurApi('Image introuvable', 404);
    // Seules les photos des articles publiés et le logo de la boutique sont accessibles
    $autorisee = $ref === logoBoutique($c['id']);
    if (!$autorisee) foreach (articlesPublies($c['id']) as $p) if (($p['image'] ?? '') === $ref) { $autorisee = true; break; }
    if (!$autorisee) throw new ErreurApi('Image introuvable', 404);
    $l = requete("SELECT contenu FROM elements WHERE commerce_id = ? AND type = 'images' AND id = ? AND supprime = 0", [$c['id'], $ref])->fetch();
    $data = $l ? (json_decode($l['contenu'], true)['dataUrl'] ?? '') : '';
    if (!preg_match('#^data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$#', (string) $data, $m)) throw new ErreurApi('Image introuvable', 404);
    $octets = base64_decode($m[2]);
    header('Content-Type: image/' . $m[1]);
    header('Content-Length: ' . strlen($octets));
    header('Content-Disposition: inline; filename="article.' . ($m[1] === 'jpeg' ? 'jpg' : $m[1]) . '"');
    header('Cache-Control: public, max-age=86400');
    echo $octets;
    exit;
}

// POST /api/public/commande
function routeCommandePublique(): never
{
    $e = entree();
    if (trim((string) ($e['site'] ?? '')) !== '') repondre(['ok' => true]); // champ piège pour les robots : on fait semblant
    $cleIp = 'commande-en-ligne:' . adresseIp();
    verifierBlocage($cleIp);
    [$b, $c] = boutiqueParSlug(strtolower((string) ($e['b'] ?? '')));
    // Commande passée par le lien privé des grossistes : prix de gros, au carton (le serveur recalcule tout, comme pour le détail)
    $cleGros = trim((string) ($e['pro'] ?? ''));
    $gros = $cleGros !== '';
    if ($gros && !cleGrosValide($b, $cleGros)) throw new ErreurApi('Boutique introuvable', 404);
    $client = is_array($e['client'] ?? null) ? $e['client'] : [];
    $nom = texte($client, 'nom', 'votre nom', true, 60);
    $tel = telephoneValide(texte($client, 'telephone', 'votre numéro de téléphone', true, 40), $c['pays'], 'votre numéro');
    $adresse = texte($client, 'adresse', 'l’adresse de livraison', true, 200);
    if (mb_strlen($adresse) < 3) throw new ErreurApi('Indiquez votre adresse de livraison (quartier, rue ou repère)');
    if (mb_strlen($nom) < 2) throw new ErreurApi('Indiquez votre nom');
    $note = texte($e, 'note', 'la note', false, 300);
    $demandes = is_array($e['lignes'] ?? null) ? array_values($e['lignes']) : [];
    if (!$demandes) throw new ErreurApi('Votre panier est vide');
    if (count($demandes) > LIGNES_COMMANDE_MAX) throw new ErreurApi('Trop d’articles dans une seule commande');
    $articles = $gros ? articlesDeGros(articlesPublies($c['id'])) : articlesPublies($c['id']);
    $lignes = [];
    $total = 0.0;
    foreach ($demandes as $d) {
        $p = $articles[(string) ($d['produitId'] ?? '')] ?? null;
        if (!$p) throw new ErreurApi('Un article n’est plus en vente : actualisez la boutique');
        $quantite = (int) ($d['quantite'] ?? 0);
        if ($quantite < 1 || $quantite > 99) throw new ErreurApi('Quantité invalide');
        if ($gros && $quantite < $p['_gros']['minimum']) throw new ErreurApi('Minimum ' . $p['_gros']['minimum'] . ' ' . $p['_gros']['unite'] . ' pour « ' . $p['nom'] . ' » au prix de gros');
        $choisies = array_map('strval', (array) ($d['options'] ?? []));
        $prix = prixArticle($p);
        $details = [];
        $idsOptions = [];
        foreach ((array) ($p['groupes'] ?? []) as $g) {
            $parmi = array_values(array_filter((array) ($g['options'] ?? []), fn ($o) => in_array((string) ($o['id'] ?? ''), $choisies, true)));
            if (!empty($g['obligatoire']) && !$parmi) throw new ErreurApi('Choisissez une option pour « ' . $p['nom'] . ' » (' . ($g['nom'] ?? '') . ')');
            if (($g['type'] ?? '') === 'unique' && count($parmi) > 1) throw new ErreurApi('Une seule option possible pour « ' . $p['nom'] . ' »');
            foreach ($parmi as $o) { $prix += (float) ($o['prix'] ?? 0); $details[] = (string) $o['nom']; $idsOptions[] = (string) $o['id']; }
        }
        $prix = arrondirMontant($prix, $c['devise']);
        $ligneTotal = arrondirMontant($prix * $quantite, $c['devise']);
        $total += $ligneTotal;
        $image = imagePublique((string) ($p['image'] ?? ''));
        $photo = $image ? 'https://' . (domaineSite() ?: 'kaislo.com') . '/api/public/boutique-image?b=' . $b['slug'] . '&i=' . $image : null;
        $lignes[] = ['produitId' => (string) $p['id'], 'nom' => (string) $p['nom'], 'photo' => $photo, 'options' => $details, 'optionIds' => $idsOptions, 'quantite' => $quantite, 'prixUnitaire' => $prix, 'total' => $ligneTotal];
    }
    $total = arrondirMontant($total, $c['devise']);
    if (noterEchec($cleIp, 30)) throw new ErreurApi('Trop de commandes depuis cet appareil : réessayez plus tard.', 429);
    $pdo = base();
    $pdo->beginTransaction();
    try {
        $numero = 1 + (int) requete('SELECT COALESCE(MAX(numero), 0) AS n FROM commandes_en_ligne WHERE commerce_id = ?', [$c['id']])->fetch()['n'];
        $id = nouvelId('cl');
        requete('INSERT INTO commandes_en_ligne (id, commerce_id, numero, client_nom, client_telephone, adresse, note, lignes, total, devise, statut, cree_le, modifie_le, gros) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
            $id, $c['id'], $numero, $nom, $tel['affichage'], $adresse, $note, json_encode($lignes, JSON_UNESCAPED_UNICODE), $total, $c['devise'], 'nouvelle', maintenant(), maintenant(), $gros ? 1 : null,
        ]);
        $pdo->commit();
    } catch (Throwable $err) {
        $pdo->rollBack();
        throw $err;
    }
    journaliser($c['id'], null, 'commande-en-ligne', ['numero' => $numero, 'total' => $total]);
    $commande = [
        'numero' => $numero, 'total' => $total, 'devise' => $c['devise'], 'lignes' => $lignes,
        'client' => ['nom' => $nom, 'telephone' => $tel['affichage'], 'adresse' => $adresse], 'note' => $note,
        'whatsapp' => $b['whatsapp_cle'], 'boutique' => $c['nom'], 'gros' => $gros,
    ];
    notifierNouvelleCommande($c['id'], $commande); // e-mail et/ou WhatsApp au commerçant, après la réponse
    repondre(['ok' => true, 'commande' => $commande], 201);
}
