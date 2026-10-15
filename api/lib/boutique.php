<?php
// ------------------------------------------------------------
// BOUTIQUE EN LIGNE : une vitrine par commerce (kaislo.com/boutique/?b=nom-du-commerce).
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
//     GET  /api/public/boutique?b=slug   boutique, catégories et articles publiés
//     GET  /api/public/boutique-image?b=slug&i=img_…
//     POST /api/public/commande          { b, client: { nom, telephone, adresse? }, note?, lignes: [{ produitId, quantite, options? }] }
// ------------------------------------------------------------

const SLUGS_RESERVES = ['admin', 'app', 'api', 'commercial', 'boutique', 'kaislo', 'www', 'b', 'demo', 'en', 'pays', 'guides'];
const STATUTS_COMMANDE = ['nouvelle', 'confirmee', 'prete', 'livree', 'annulee'];
const LIGNES_COMMANDE_MAX = 40;
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
    return 'https://' . (domaineSite() ?: 'kaislo.com') . '/boutique/?b=' . $slug;
}

function versBoutique(?array $b, array $commerce): array
{
    $nbPublies = count(articlesPublies($commerce['id']));
    return [
        'actif' => $b ? (bool) $b['actif'] : false,
        'slug' => $b['slug'] ?? '',
        'suggestion' => $b ? '' : slugBoutique($commerce['nom']),
        'whatsapp' => $b['whatsapp'] ?? '',
        'description' => $b['description'] ?? '',
        'livraison' => $b['livraison'] ?? '',
        'lien' => $b ? lienBoutique($b['slug']) : '',
        'articlesPublies' => $nbPublies,
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
    $description = texte($e, 'description', 'la description', false, 300);
    $livraison = texte($e, 'livraison', 'la livraison', false, 300);
    if ($avant) {
        requete('UPDATE boutiques SET slug = ?, actif = ?, whatsapp = ?, whatsapp_cle = ?, description = ?, livraison = ?, modifie_le = ? WHERE commerce_id = ?',
            [$slug, $actif, $num['affichage'], $num['cle'], $description, $livraison, maintenant(), $c['id']]);
    } else {
        requete('INSERT INTO boutiques (commerce_id, slug, actif, whatsapp, whatsapp_cle, description, livraison, cree_le, modifie_le) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [$c['id'], $slug, $actif, $num['affichage'], $num['cle'], $description, $livraison, maintenant(), maintenant()]);
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

function routeBoutiquePublique(): never
{
    [$b, $c] = boutiqueParSlug(strtolower((string) ($_GET['b'] ?? '')));
    $articles = articlesPublies($c['id']);
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
        ];
        $utilisees[$p['categorieId'] ?? ''] = true;
    }
    repondre(['ok' => true, 'boutique' => [
        'slug' => $b['slug'], 'nom' => $c['nom'], 'ville' => $c['ville'], 'quartier' => $c['quartier'] ?? '', 'devise' => $c['devise'], 'pays' => $c['pays'],
        'description' => $b['description'], 'livraison' => $b['livraison'], 'whatsapp' => $b['whatsapp_cle'],
        'categories' => array_values(array_filter($categories, fn ($x) => isset($utilisees[$x['id']]))), 'produits' => $produits,
    ]]);
}

function routeBoutiqueImage(): never
{
    [, $c] = boutiqueParSlug(strtolower((string) ($_GET['b'] ?? '')));
    $ref = (string) ($_GET['i'] ?? '');
    if (!preg_match('/^img_[A-Za-z0-9_.:-]{1,36}$/', $ref)) throw new ErreurApi('Image introuvable', 404);
    // Seules les photos des articles publiés sont accessibles
    $autorisee = false;
    foreach (articlesPublies($c['id']) as $p) if (($p['image'] ?? '') === $ref) { $autorisee = true; break; }
    if (!$autorisee) throw new ErreurApi('Image introuvable', 404);
    $l = requete("SELECT contenu FROM elements WHERE commerce_id = ? AND type = 'images' AND id = ? AND supprime = 0", [$c['id'], $ref])->fetch();
    $data = $l ? (json_decode($l['contenu'], true)['dataUrl'] ?? '') : '';
    if (!preg_match('#^data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$#', (string) $data, $m)) throw new ErreurApi('Image introuvable', 404);
    header('Content-Type: image/' . $m[1]);
    header('Cache-Control: public, max-age=3600');
    echo base64_decode($m[2]);
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
    $articles = articlesPublies($c['id']);
    $lignes = [];
    $total = 0.0;
    foreach ($demandes as $d) {
        $p = $articles[(string) ($d['produitId'] ?? '')] ?? null;
        if (!$p) throw new ErreurApi('Un article n’est plus en vente : actualisez la boutique');
        $quantite = (int) ($d['quantite'] ?? 0);
        if ($quantite < 1 || $quantite > 99) throw new ErreurApi('Quantité invalide');
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
        requete('INSERT INTO commandes_en_ligne (id, commerce_id, numero, client_nom, client_telephone, adresse, note, lignes, total, devise, statut, cree_le, modifie_le) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
            $id, $c['id'], $numero, $nom, $tel['affichage'], $adresse, $note, json_encode($lignes, JSON_UNESCAPED_UNICODE), $total, $c['devise'], 'nouvelle', maintenant(), maintenant(),
        ]);
        $pdo->commit();
    } catch (Throwable $err) {
        $pdo->rollBack();
        throw $err;
    }
    journaliser($c['id'], null, 'commande-en-ligne', ['numero' => $numero, 'total' => $total]);
    repondre(['ok' => true, 'commande' => [
        'numero' => $numero, 'total' => $total, 'devise' => $c['devise'], 'lignes' => $lignes,
        'client' => ['nom' => $nom, 'telephone' => $tel['affichage'], 'adresse' => $adresse], 'note' => $note,
        'whatsapp' => $b['whatsapp_cle'], 'boutique' => $c['nom'],
    ]], 201);
}
