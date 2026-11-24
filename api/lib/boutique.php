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
    if (abonnementTermine($commerce)) return 'abonnement'; // abonnement terminé : boutique fermée tout de suite (lib/activation.php)
    if ($nbPublies < 1) return 'aucunArticle';
    return '';
}

/** Position reçue de l'application : [lat, lng] arrondis à 5 décimales (environ 1 m), ou [null, null] pour l'effacer. */
function positionValide(mixed $p): array
{
    if ($p === null || $p === false || $p === []) return [null, null];
    if (!is_array($p) || !is_numeric($p['lat'] ?? null) || !is_numeric($p['lng'] ?? null)) throw new ErreurApi('Position de la boutique invalide');
    $lat = (float) $p['lat'];
    $lng = (float) $p['lng'];
    if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180 || ($lat == 0.0 && $lng == 0.0)) throw new ErreurApi('Position de la boutique invalide');
    return [round($lat, 5), round($lng, 5)];
}

/** Distance à vol d'oiseau en kilomètres entre deux points (formule de haversine). */
function distanceKm(float $lat1, float $lng1, float $lat2, float $lng2): float
{
    $r = 6371.0;
    $a = sin(deg2rad($lat2 - $lat1) / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin(deg2rad($lng2 - $lng1) / 2) ** 2;
    return 2 * $r * asin(min(1.0, sqrt($a)));
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
        'commande' => ['fraisLivraison' => isset($b['frais_livraison']) ? (float) $b['frais_livraison'] : null, 'minimumCommande' => isset($b['minimum_commande']) ? (float) $b['minimum_commande'] : null, 'livre' => empty($b['livraison_off']), 'retrait' => empty($b['retrait_off'])],
        'localisation' => isset($b['lat'], $b['lng']) ? ['lat' => (float) $b['lat'], 'lng' => (float) $b['lng']] : null,
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
    if (!$c || $c['statut'] === 'suspendu' || abonnementTermine($c)) throw new ErreurApi('Cette boutique est momentanément fermée', 404);
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
    // Position : { lat, lng } pour la placer, null pour l'effacer ; absente = on garde l'ancienne
    $lat = $avant['lat'] ?? null;
    $lng = $avant['lng'] ?? null;
    if (array_key_exists('localisation', $e)) [$lat, $lng] = positionValide($e['localisation']);
    if ($avant) {
        requete('UPDATE boutiques SET slug = ?, actif = ?, publique = ?, conditions_le = ?, chat_off = ?, pro_cle = ?, whatsapp = ?, whatsapp_cle = ?, description = ?, livraison = ?, lat = ?, lng = ?, modifie_le = ? WHERE commerce_id = ?',
            [$slug, $actif, $publique, $accepteLe, $chatOff, $proCle, $num['affichage'], $num['cle'], $description, $livraison, $lat, $lng, maintenant(), $c['id']]);
    } else {
        requete('INSERT INTO boutiques (commerce_id, slug, actif, publique, conditions_le, chat_off, pro_cle, whatsapp, whatsapp_cle, description, livraison, lat, lng, cree_le, modifie_le) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [$c['id'], $slug, $actif, $publique, $accepteLe, $chatOff, $proCle, $num['affichage'], $num['cle'], $description, $livraison, $lat, $lng, maintenant(), maintenant()]);
    }
    // Commande dans Kaislo (lot L1) : retrait, livraison, frais et minimum ; enregistrés seulement quand le chantier est activé
    if (livraisonActive() && (array_key_exists('fraisLivraison', $e) || array_key_exists('minimumCommande', $e) || array_key_exists('livre', $e) || array_key_exists('retrait', $e))) {
        $montantOuNul = fn ($v) => $v === null || $v === '' ? null : (is_numeric($v) && (float) $v >= 0 && (float) $v <= 1000000 ? round((float) $v, 2) : throw new ErreurApi('Montant invalide'));
        $livre = array_key_exists('livre', $e) ? (!empty($e['livre']) ? 0 : 1) : (int) ($avant['livraison_off'] ?? 0);
        $retrait = array_key_exists('retrait', $e) ? (!empty($e['retrait']) ? 0 : 1) : (int) ($avant['retrait_off'] ?? 0);
        if ($livre && $retrait) throw new ErreurApi('Proposez au moins la livraison ou le retrait');
        requete('UPDATE boutiques SET frais_livraison = ?, minimum_commande = ?, livraison_off = ?, retrait_off = ? WHERE commerce_id = ?',
            [$montantOuNul($e['fraisLivraison'] ?? ($avant['frais_livraison'] ?? null)), $montantOuNul($e['minimumCommande'] ?? ($avant['minimum_commande'] ?? null)), $livre, $retrait, $c['id']]);
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
        'mode' => $c['mode'] ?: 'livraison', 'frais' => (float) ($c['frais'] ?? 0),
    ];
}

function routeCommandesEnLigneLire(): never
{
    $u = utilisateurConnecte();
    $liste = requete('SELECT * FROM commandes_en_ligne WHERE commerce_id = ? ORDER BY cree_le DESC LIMIT ' . COMMANDES_AFFICHEES, [$u['commerce_id']])->fetchAll();
    $nouvelles = (int) requete("SELECT COUNT(*) AS n FROM commandes_en_ligne WHERE commerce_id = ? AND statut = 'nouvelle'", [$u['commerce_id']])->fetch()['n'];
    repondre(['ok' => true, 'commandes' => array_map('versCommandeLigne', $liste), 'nouvelles' => $nouvelles]);
}

// POST /api/commandes-en-ligne
//   { id, statut }                                          : change le statut (dont « annulee »)
//   { id, client: {nom, telephone, adresse}, note, lignes: [{ index, quantite }], ajouts: [{ produitId, quantite }] } : modifie une commande déjà validée
// Le serveur recalcule le total : les articles déjà commandés gardent le prix du moment de la commande (quantité 0 = retiré), les articles ajoutés
// prennent le prix du jour du catalogue.
function routeCommandesEnLigneStatut(): never
{
    $u = utilisateurConnecte();
    $e = entree();
    $c = requete('SELECT * FROM commandes_en_ligne WHERE id = ? AND commerce_id = ?', [(string) ($e['id'] ?? ''), $u['commerce_id']])->fetch();
    if (!$c) throw new ErreurApi('Commande introuvable', 404);
    if (array_key_exists('lignes', $e) || array_key_exists('client', $e)) {
        exigerAbonnementPaye($u['commerce_id'], 'Abonnement non payé : activez-le pour modifier vos commandes.');
        if (in_array($c['statut'], ['livree', 'annulee'], true)) throw new ErreurApi('Une commande livrée ou annulée ne se modifie plus : changez d’abord son statut');
        $commerce = requete('SELECT * FROM commerces WHERE id = ?', [$u['commerce_id']])->fetch();
        $client = is_array($e['client'] ?? null) ? $e['client'] : [];
        $nom = texte($client, 'nom', 'le nom du client', true, 60);
        if (mb_strlen($nom) < 2) throw new ErreurApi('Indiquez le nom du client');
        $tel = telephoneValide(texte($client, 'telephone', 'le numéro du client', true, 40), $commerce['pays'], 'numéro du client');
        $adresse = texte($client, 'adresse', 'l’adresse de livraison', false, 200);
        $note = texte($e, 'note', 'la note', false, 300);
        $lignes = json_decode($c['lignes'], true) ?: [];
        $quantites = [];
        foreach ((array) ($e['lignes'] ?? []) as $d) $quantites[(int) ($d['index'] ?? -1)] = (int) ($d['quantite'] ?? 0);
        $nouvelles = [];
        $total = 0.0;
        foreach ($lignes as $i => $l) {
            $q = $quantites[$i] ?? (int) $l['quantite'];
            if ($q < 0 || $q > 99) throw new ErreurApi('Quantité invalide');
            if ($q === 0) continue;
            $l['quantite'] = $q;
            $l['total'] = arrondirMontant((float) $l['prixUnitaire'] * $q, $c['devise']);
            $total += $l['total'];
            $nouvelles[] = $l;
        }
        // Articles ajoutés par le commerçant : pris dans son catalogue, au prix du jour (promotion comprise), sans option à choisir
        $ajouts = array_values(array_filter((array) ($e['ajouts'] ?? []), 'is_array'));
        if ($ajouts) {
            if (!empty($c['gros'])) throw new ErreurApi('Ajout impossible sur une commande de gros : les prix de gros ne se recalculent pas ici');
            if (count($nouvelles) + count($ajouts) > LIGNES_COMMANDE_MAX) throw new ErreurApi('Trop d’articles dans une seule commande');
            $catalogue = [];
            foreach (requete("SELECT id, contenu FROM elements WHERE commerce_id = ? AND type = 'produits' AND supprime = 0", [$u['commerce_id']])->fetchAll() as $l) {
                $p = json_decode($l['contenu'], true);
                if (is_array($p) && !empty($p['nom']) && isset($p['prix'])) $catalogue[(string) ($p['id'] ?? $l['id'])] = $p;
            }
            $slug = requete('SELECT slug FROM boutiques WHERE commerce_id = ?', [$u['commerce_id']])->fetch()['slug'] ?? '';
            foreach ($ajouts as $a) {
                $p = $catalogue[(string) ($a['produitId'] ?? '')] ?? null;
                if (!$p || ($p['actif'] ?? true) === false) throw new ErreurApi('Un article ajouté n’existe plus dans votre catalogue');
                foreach ((array) ($p['groupes'] ?? []) as $g) if (!empty($g['obligatoire'])) throw new ErreurApi('« ' . $p['nom'] . ' » demande un choix d’options : ajoutez-le depuis la caisse');
                $q = (int) ($a['quantite'] ?? 0);
                if ($q < 1 || $q > 99) throw new ErreurApi('Quantité invalide');
                $prix = arrondirMontant(prixArticle($p), $c['devise']);
                $image = imagePublique((string) ($p['image'] ?? ''));
                $ligneTotal = arrondirMontant($prix * $q, $c['devise']);
                $total += $ligneTotal;
                $nouvelles[] = ['produitId' => (string) ($p['id'] ?? ''), 'nom' => (string) $p['nom'], 'photo' => $image && $slug ? 'https://' . (domaineSite() ?: 'kaislo.com') . '/api/public/boutique-image?b=' . $slug . '&i=' . $image : null,
                    'options' => [], 'optionIds' => [], 'quantite' => $q, 'prixUnitaire' => $prix, 'total' => $ligneTotal];
            }
        }
        if (!$nouvelles) throw new ErreurApi('Il doit rester au moins un article : pour tout retirer, annulez la commande');
        $total = arrondirMontant($total, $c['devise']);
        requete('UPDATE commandes_en_ligne SET client_nom = ?, client_telephone = ?, adresse = ?, note = ?, lignes = ?, total = ?, modifie_le = ? WHERE id = ?',
            [$nom, $tel['affichage'], $adresse, $note, json_encode($nouvelles, JSON_UNESCAPED_UNICODE), $total, maintenant(), $c['id']]);
        journaliser($u['commerce_id'], $u['id'], 'commande-en-ligne-modifiee', ['numero' => (int) $c['numero'], 'ancienTotal' => (float) $c['total'], 'total' => $total]);
        $c = requete('SELECT * FROM commandes_en_ligne WHERE id = ?', [$c['id']])->fetch();
        repondre(['ok' => true, 'commande' => versCommandeLigne($c)]);
    }
    $statut = (string) ($e['statut'] ?? '');
    if (!in_array($statut, STATUTS_COMMANDE, true)) throw new ErreurApi('Statut inconnu');
    // Abonnement non payé : on peut encore refuser (annuler) une commande, mais plus la valider
    if ($statut !== 'annulee' && $statut !== 'nouvelle') exigerAbonnementPaye($u['commerce_id'], 'Abonnement non payé : activez-le pour valider vos commandes.');
    requete('UPDATE commandes_en_ligne SET statut = ?, modifie_le = ? WHERE id = ?', [$statut, maintenant(), $c['id']]);
    if ($statut !== $c['statut']) notifierClientCommande($c, $statut); // le client qui suit sa commande est prévenu (lot L1)
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

// Ce que le client peut choisir à la commande dans Kaislo (lot L1)
function reglagesCommande(array $b): array
{
    return ['livre' => empty($b['livraison_off']), 'retrait' => empty($b['retrait_off']), 'frais' => (float) ($b['frais_livraison'] ?? 0), 'minimum' => (float) ($b['minimum_commande'] ?? 0)];
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
    ] + ($gros ? ['gros' => true] : []) + (livraisonActive() && !$gros ? ['commande' => reglagesCommande($b)] : []);
}

// GET /api/public/boutiques : annuaire pour les clients (sans numéro WhatsApp : il n'apparaît que sur la page de la boutique)
function routeBoutiquesAnnuaire(): never
{
    $src = ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST' ? entree() : $_GET; // POST : position du visiteur dans le corps de la demande
    $demande = codePaysValide($src['pays'] ?? null); // pays choisi par le visiteur
    $pays = $demande ?? paysDeLAdresse(adresseIp());
    $liste = [];
    $disponibles = [];
    // Position du visiteur (facultative) : sert seulement à classer les boutiques de la plus proche à la plus lointaine, elle n'est pas gardée
    $vLat = is_numeric($src['lat'] ?? null) ? (float) $src['lat'] : null;
    $vLng = is_numeric($src['lng'] ?? null) ? (float) $src['lng'] : null;
    if ($vLat !== null && ($vLat < -90 || $vLat > 90 || $vLng === null || $vLng < -180 || $vLng > 180)) $vLat = $vLng = null;
    // Pré-filtre SQL : boutiques actives et publiques qui ont au moins un article marqué « en ligne » (le détail est revérifié ci-dessous).
    // Toutes les boutiques sont parcourues (pas de plafond partagé entre pays : un pays très actif ne doit pas cacher les autres) ;
    // seul le pays du visiteur est détaillé, et la liste de ce pays est plafonnée.
    $lignes = requete("SELECT b.slug, b.description, b.lat, b.lng, c.* FROM boutiques b JOIN commerces c ON c.id = b.commerce_id
        WHERE b.actif = 1 AND (b.publique IS NULL OR b.publique = 1) AND c.statut <> 'suspendu'
        AND EXISTS (SELECT 1 FROM elements e WHERE e.commerce_id = c.id AND e.type = 'produits' AND e.supprime = 0 AND (e.contenu LIKE '%\"enLigne\":true%' OR e.contenu LIKE '%\"enLigne\":1%'))
        ORDER BY b.modifie_le DESC LIMIT 5000")->fetchAll();
    foreach ($lignes as $c) {
        if (abonnementTermine($c)) continue;
        if ($pays !== $c['pays']) { $disponibles[$c['pays']] = ($disponibles[$c['pays']] ?? 0) + 1; continue; } // un client ne voit que les boutiques de son pays
        $articles = array_values(articlesPublies($c['id']));
        if (!$articles) continue;
        $disponibles[$c['pays']] = ($disponibles[$c['pays']] ?? 0) + 1;
        if (count($liste) >= BOUTIQUES_ANNUAIRE_MAX && $vLat === null) continue;
        $km = $vLat !== null && $c['lat'] !== null && $c['lng'] !== null ? distanceKm($vLat, $vLng, (float) $c['lat'], (float) $c['lng']) : null;
        // Exemples : les articles avec photo d'abord, quatre au plus
        usort($articles, fn ($x, $y) => (int) !empty($y['image']) <=> (int) !empty($x['image']));
        $exemples = array_map(fn ($p) => [
            'nom' => (string) $p['nom'], 'prix' => (float) $p['prix'], 'promo' => prixArticle($p) < (float) $p['prix'] ? prixArticle($p) : null,
            'emoji' => (string) ($p['emoji'] ?? ''), 'image' => imagePublique((string) ($p['image'] ?? '')),
        ], array_slice($articles, 0, 4));
        $liste[] = [
            'slug' => $c['slug'], 'nom' => $c['nom'], 'type' => $c['type'], 'pays' => $c['pays'], 'ville' => $c['ville'], 'quartier' => $c['quartier'] ?? '',
            'devise' => $c['devise'], 'description' => (string) $c['description'], 'nbArticles' => count($articles), 'exemples' => $exemples, 'logo' => logoBoutique($c['id']),
            'distanceKm' => $km === null ? null : round($km, 1), // distance arrondie : la position exacte de la boutique n'est jamais envoyée
        ];
    }
    // Les plus proches d'abord ; les boutiques sans position (ou sans position du visiteur) restent dans l'ordre habituel, après
    if ($vLat !== null) {
        usort($liste, fn ($x, $y) => ($x['distanceKm'] ?? INF) <=> ($y['distanceKm'] ?? INF));
        $liste = array_slice($liste, 0, BOUTIQUES_ANNUAIRE_MAX);
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

// Carnet de clients : un client qui commande en ligne pour la première fois (numéro encore inconnu du commerce) y est ajouté tout seul.
// L'élément arrive sur les appareils du commerce par la synchronisation habituelle. Une erreur ici ne bloque jamais la commande.
function ajouterClientDeCommande(string $commerceId, string $nom, string $telephone, string $adresse): void
{
    try {
        $fin = fn (string $t) => substr(preg_replace('/\D+/', '', $t), -8);
        $cle = $fin($telephone);
        if (strlen($cle) < 6) return;
        foreach (requete("SELECT contenu FROM elements WHERE commerce_id = ? AND type = 'clients' AND supprime = 0", [$commerceId])->fetchAll() as $l) {
            $k = json_decode($l['contenu'], true);
            if (is_array($k) && $fin((string) ($k['telephone'] ?? '')) === $cle) return;
        }
        $id = nouvelId('kl');
        $contenu = ['id' => $id, 'nom' => $nom, 'telephone' => $telephone, 'adresse' => $adresse, 'note' => 'Client de la boutique en ligne', 'source' => 'boutique'];
        requete('INSERT INTO elements (contenu, modifie_le, supprime, recu_le, commerce_id, type, id) VALUES (?, ?, 0, ?, ?, ?, ?)',
            [json_encode($contenu, JSON_UNESCAPED_UNICODE), maintenant(), maintenantPrecis(), $commerceId, 'clients', $id]);
    } catch (Throwable $err) {
        // le carnet est un plus : la commande, elle, est déjà enregistrée
    }
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
    // Commande dans Kaislo (lot L1) : retrait en boutique ou livraison ; sans le chantier, tout reste une livraison à une adresse
    $l1 = livraisonActive() && !$gros;
    $mode = $l1 && ($e['mode'] ?? '') === 'retrait' ? 'retrait' : 'livraison';
    if ($l1) {
        if ($mode === 'livraison' && !empty($b['livraison_off'])) throw new ErreurApi('Cette boutique ne livre pas : choisissez le retrait');
        if ($mode === 'retrait' && !empty($b['retrait_off'])) throw new ErreurApi('Cette boutique ne propose pas le retrait : choisissez la livraison');
    }
    $adresse = texte($client, 'adresse', 'l’adresse de livraison', $mode === 'livraison', 200);
    if ($mode === 'livraison' && mb_strlen($adresse) < 3) throw new ErreurApi('Indiquez votre adresse de livraison (quartier, rue ou repère)');
    if ($mode === 'retrait' && $adresse === '') $adresse = 'Retrait en boutique';
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
    $frais = 0.0;
    $suivi = null;
    if ($l1) {
        $minimum = (float) ($b['minimum_commande'] ?? 0);
        if ($minimum > 0 && $total < $minimum) throw new ErreurApi('Commande minimum : ' . rtrim(rtrim(number_format($minimum, 2, ',', ' '), '0'), ',') . ' ' . $c['devise']);
        $frais = $mode === 'livraison' ? arrondirMontant((float) ($b['frais_livraison'] ?? 0), $c['devise']) : 0.0;
        $total = arrondirMontant($total + $frais, $c['devise']);
        $suivi = bin2hex(random_bytes(10));
    }
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
    if ($l1) requete('UPDATE commandes_en_ligne SET mode = ?, frais = ?, suivi_cle = ? WHERE id = ?', [$mode, $frais, $suivi, $id]);
    journaliser($c['id'], null, 'commande-en-ligne', ['numero' => $numero, 'total' => $total]);
    ajouterClientDeCommande($c['id'], $nom, $tel['affichage'], $adresse);
    $commande = [
        'numero' => $numero, 'total' => $total, 'devise' => $c['devise'], 'lignes' => $lignes,
        'client' => ['nom' => $nom, 'telephone' => $tel['affichage'], 'adresse' => $adresse], 'note' => $note,
        'whatsapp' => $b['whatsapp_cle'], 'boutique' => $c['nom'], 'gros' => $gros,
    ] + ($l1 ? ['mode' => $mode, 'frais' => $frais, 'suivi' => $suivi] : []);
    notifierNouvelleCommande($c['id'], $commande); // e-mail et/ou WhatsApp au commerçant, après la réponse
    repondre(['ok' => true, 'commande' => $commande], 201);
}


// GET /api/public/commande-suivi?cle=… : le client suit sa commande (lot L1). La clé, au hasard, n'est connue que de son appareil.
function routeCommandeSuivi(): never
{
    exigerLivraison();
    $cle = (string) ($_GET['cle'] ?? '');
    $cleIp = 'suivi-commande:' . adresseIp();
    verifierBlocage($cleIp);
    $l = preg_match('/^[a-f0-9]{20}$/', $cle) ? requete('SELECT * FROM commandes_en_ligne WHERE suivi_cle = ?', [$cle])->fetch() : false;
    if (!$l) { noterEchec($cleIp, 60); throw new ErreurApi('Commande introuvable', 404); }
    $c = requete('SELECT nom FROM commerces WHERE id = ?', [$l['commerce_id']])->fetch();
    $b = requete('SELECT whatsapp_cle FROM boutiques WHERE commerce_id = ?', [$l['commerce_id']])->fetch();
    $lignes = array_map(fn ($x) => ['nom' => (string) ($x['nom'] ?? ''), 'quantite' => (int) ($x['quantite'] ?? 0)], json_decode($l['lignes'], true) ?: []);
    header('Cache-Control: private, no-store');
    repondre(['ok' => true, 'commande' => [
        'numero' => (int) $l['numero'], 'statut' => $l['statut'], 'mode' => $l['mode'] ?: 'livraison', 'boutique' => $c['nom'] ?? '', 'whatsapp' => $b['whatsapp_cle'] ?? '',
        'adresse' => $l['adresse'], 'total' => (float) $l['total'], 'frais' => (float) ($l['frais'] ?? 0), 'devise' => $l['devise'], 'creeLe' => $l['cree_le'], 'modifieLe' => $l['modifie_le'], 'lignes' => $lignes,
    ], 'clePublique' => (function () { try { return cleVapid()['publique']; } catch (Throwable) { return null; } })()]);
}
