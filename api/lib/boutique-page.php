<?php
// ------------------------------------------------------------
// PAGE DE BOUTIQUE POUR GOOGLE : kaislo.com/boutique/nom-du-commerce/
//
//   Le site est un export statique : la vitrine (public/boutique/index.html) est la même pour toutes les boutiques et se remplit
//   avec l'API une fois chargée. Pour que Google voie chaque boutique comme une vraie page (titre, description, adresse, articles et prix),
//   ce fichier reprend la vitrine et y ajoute, côté serveur, les informations de la boutique demandée :
//     · titre, description, adresse canonique et aperçu de partage propres à la boutique ;
//     · données structurées (commerce local + liste d'articles avec prix) ;
//     · le même contenu en HTML simple (retiré dès que l'application de la vitrine démarre).
//   Une boutique n'est indexable que si le commerçant l'a rendue publique (annuaire), si elle est ouverte et si elle a au moins un
//   article publié. Sinon la page reste en « noindex » (la vitrine fonctionne quand même), ou renvoie 404 si la boutique n'existe pas.
//
//   GET /boutique/{slug}/          (réécrit par .htaccess vers /api/page-boutique?b={slug})
//   GET /sitemap-boutiques.xml     (réécrit vers /api/plan-boutiques) : les boutiques indexables
// ------------------------------------------------------------

const ARTICLES_DANS_LA_PAGE = 60;

const NOMS_TYPES_BOUTIQUE = [
    'restaurant' => 'Restaurant', 'maquis' => 'Maquis', 'bar' => 'Bar', 'boulangerie' => 'Boulangerie', 'epicerie' => 'Épicerie', 'grossiste' => 'Grossiste',
    'boutique' => 'Boutique', 'quincaillerie' => 'Quincaillerie', 'beaute' => 'Boutique beauté', 'telephonie' => 'Boutique de téléphonie', 'librairie' => 'Librairie', 'autre' => 'Commerce',
];
const TYPES_SCHEMA_BOUTIQUE = [
    'restaurant' => 'Restaurant', 'maquis' => 'Restaurant', 'bar' => 'BarOrPub', 'boulangerie' => 'Bakery', 'epicerie' => 'GroceryStore',
    'quincaillerie' => 'HardwareStore', 'telephonie' => 'ElectronicsStore', 'librairie' => 'BookStore',
];
const DEVISES_ISO_BOUTIQUE = ['MAD' => 'MAD', 'DH' => 'MAD', 'EUR' => 'EUR', '€' => 'EUR', 'CAD' => 'CAD', 'USD' => 'USD', 'GNF' => 'GNF'];

function echapper(string $t): string
{
    return htmlspecialchars($t, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

// Code monétaire international (Schema.org) : le franc CFA a deux codes selon la zone
function codeDevise(string $devise, string $pays): string
{
    if ($devise === 'FCFA') return in_array($pays, ['CM', 'GA', 'CG'], true) ? 'XAF' : 'XOF';
    return DEVISES_ISO_BOUTIQUE[$devise] ?? 'XOF';
}

function couper(string $t, int $max): string
{
    return mb_strlen($t) <= $max ? $t : rtrim(mb_substr($t, 0, $max - 1)) . '…';
}

function montantPage(float $x, string $devise): string
{
    $nombre = number_format($x, in_array($devise, ['FCFA', 'GNF'], true) ? 0 : 2, ',', "\u{202F}");
    return $nombre . "\u{00A0}" . $devise;
}

function racineSite(): string
{
    return rtrim(lireFichierEnvCle('DossierSite') ?? dirname(__DIR__, 2), '/');
}

// Indexable : publique (annuaire), ouverte et avec au moins un article
function boutiqueIndexable(array $b, array $c, int $nbArticles): bool
{
    return $nbArticles > 0 && ($b['publique'] === null || (int) $b['publique'] === 1);
}

function repondreHtml(string $html, int $statut = 200, string $cache = 'public, max-age=300'): never
{
    http_response_code($statut);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: ' . $cache);
    header('X-LiteSpeed-Cache-Control: no-cache'); // la page change quand le commerçant modifie ses articles : pas de cache serveur à purger
    echo $html;
    exit;
}

function coqueVitrine(): string
{
    $coque = @file_get_contents(racineSite() . '/boutique/index.html');
    if ($coque === false || !str_contains($coque, '</body>')) throw new ErreurApi('Page de la vitrine introuvable sur le serveur', 500);
    return $coque;
}

// GET /api/page-boutique?b=slug
function routePageBoutique(): never
{
    $slug = strtolower((string) ($_GET['b'] ?? ''));
    $coque = coqueVitrine();
    // Lien privé des grossistes (?pro=…) : jamais indexé, jamais mis en cache, jamais dans la page écrite pour Google
    if (trim((string) ($_GET['pro'] ?? '')) !== '') {
        header('X-Robots-Tag: noindex, nofollow');
        repondreHtml($coque, 200, 'private, no-store');
    }
    try {
        [$b, $c] = boutiqueParSlug($slug);
    } catch (ErreurApi $e) {
        // Boutique inconnue, fermée ou suspendue : la vitrine s'affiche avec son message, mais Google reçoit une vraie erreur 404
        repondreHtml($coque, 404, 'no-store');
    }
    $d = donneesBoutiquePublique($b, $c);
    if (!boutiqueIndexable($b, $c, count($d['produits']))) repondreHtml($coque, 200, 'public, max-age=300'); // reste en « noindex »

    $site = 'https://' . DOMAINE_OFFICIEL; // toujours l'adresse officielle (jamais l'hôte de la requête : l'adresse canonique ne doit pas dépendre du visiteur)
    $adresse = $site . '/boutique/' . $d['slug'] . '/';
    $genre = NOMS_TYPES_BOUTIQUE[$d['type']] ?? 'Commerce';
    $lieu = trim(($d['quartier'] !== '' ? $d['quartier'] . ', ' : '') . $d['ville']);
    $titre = couper($d['nom'] . ' · ' . $genre . ' à ' . $d['ville'], 52) . ' | Kaislo';
    $exemples = implode(', ', array_map(fn ($p) => $p['nom'], array_slice($d['produits'], 0, 4)));
    $description = couper(
        ($d['description'] !== '' ? $d['description'] . ' ' : '') . $genre . ' à ' . $lieu . ' : ' . count($d['produits']) . ' article' . (count($d['produits']) > 1 ? 's' : '') . ' (' . $exemples . '). Commandez en ligne et payez le commerçant directement.',
        158
    );
    $devise = $d['devise'];
    $iso = codeDevise($devise, $d['pays']);
    $urlImage = fn (string $ref) => $site . '/api/public/boutique-image?b=' . rawurlencode($d['slug']) . '&i=' . rawurlencode($ref);
    $premiereImage = null;
    foreach ($d['produits'] as $p) if ($p['image']) { $premiereImage = $urlImage($p['image']); break; }

    // Données structurées : commerce local et liste d'articles avec prix
    $elements = [];
    foreach (array_slice($d['produits'], 0, ARTICLES_DANS_LA_PAGE) as $i => $p) {
        $prix = $p['promo'] ?? $p['prix'];
        $article = ['@type' => 'Product', 'name' => $p['nom'], 'offers' => ['@type' => 'Offer', 'price' => (string) $prix, 'priceCurrency' => $iso, 'availability' => 'https://schema.org/InStock', 'url' => $adresse]];
        if ($p['image']) $article['image'] = $urlImage($p['image']);
        $elements[] = ['@type' => 'ListItem', 'position' => $i + 1, 'item' => $article];
    }
    $commerce = [
        '@context' => 'https://schema.org', '@type' => TYPES_SCHEMA_BOUTIQUE[$d['type']] ?? 'Store', '@id' => $adresse . '#boutique',
        'name' => $d['nom'], 'url' => $adresse, 'description' => $d['description'] !== '' ? $d['description'] : $genre . ' à ' . $lieu,
        'address' => ['@type' => 'PostalAddress', 'addressLocality' => $d['ville'], 'streetAddress' => $d['quartier'], 'addressCountry' => $d['pays']],
        'currenciesAccepted' => $iso, 'areaServed' => $d['ville'],
    ];
    if ($premiereImage) $commerce['image'] = $premiereImage;
    $fil = ['@context' => 'https://schema.org', '@type' => 'BreadcrumbList', 'itemListElement' => [
        ['@type' => 'ListItem', 'position' => 1, 'name' => 'Kaislo', 'item' => $site . '/'],
        ['@type' => 'ListItem', 'position' => 2, 'name' => 'Boutiques', 'item' => $site . '/boutiques/'],
        ['@type' => 'ListItem', 'position' => 3, 'name' => $d['nom'], 'item' => $adresse],
    ]];
    $liste = ['@context' => 'https://schema.org', '@type' => 'ItemList', 'name' => 'Articles de ' . $d['nom'], 'itemListElement' => $elements];
    $json = fn (array $x) => '<script type="application/ld+json">' . str_replace('</', '<\/', json_encode($x, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) . '</script>';

    // Même contenu en HTML simple (retiré par la vitrine dès qu'elle démarre : voir Boutique.jsx)
    $noms = [];
    foreach ($d['categories'] as $cat) $noms[$cat['id']] = $cat['nom'];
    $parCategorie = [];
    foreach (array_slice($d['produits'], 0, ARTICLES_DANS_LA_PAGE) as $p) $parCategorie[$noms[$p['categorieId']] ?? 'Articles'][] = $p;
    $html = '<div id="seo-boutique" style="max-width:760px;margin:0 auto;padding:16px;font-family:system-ui,sans-serif">'
        . '<nav aria-label="Fil d’Ariane"><a href="/">Kaislo</a> › <a href="/boutiques/">Boutiques</a> › ' . echapper($d['nom']) . '</nav>'
        . '<h1>' . echapper($d['nom']) . '</h1><p>' . echapper($genre) . ' · ' . echapper($lieu) . '</p>'
        . ($d['description'] !== '' ? '<p>' . echapper($d['description']) . '</p>' : '')
        . ($d['livraison'] !== '' ? '<p><b>Livraison :</b> ' . echapper($d['livraison']) . '</p>' : '');
    foreach ($parCategorie as $nomCategorie => $articles) {
        $html .= '<h2>' . echapper((string) $nomCategorie) . '</h2><ul>';
        foreach ($articles as $p) {
            $prix = $p['promo'] ?? $p['prix'];
            $html .= '<li>' . ($p['image'] ? '<img src="' . echapper($urlImage($p['image'])) . '" alt="' . echapper($p['nom']) . '" width="64" height="64" loading="lazy"> ' : '')
                . '<b>' . echapper($p['nom']) . '</b> — ' . echapper(montantPage((float) $prix, $devise)) . '</li>';
        }
        $html .= '</ul>';
    }
    $html .= '<p>Pour commander, activez JavaScript : choisissez vos articles et envoyez la commande sur WhatsApp. Le paiement se fait directement avec le commerçant. '
        . 'Kaislo est un outil qui relie les boutiques et leurs clients ; la boutique est seule responsable de ses articles, de ses prix et de ses ventes.</p></div>';

    // Remplacements dans la vitrine
    $t = echapper($titre);
    $dsc = echapper($description);
    $motifs = [
        '#<title>.*?</title>#s' => '<title>' . $t . '</title>',
        '#<meta name="description" content="[^"]*"\s*/?>#' => '<meta name="description" content="' . $dsc . '">',
        '#<meta name="robots" content="[^"]*"\s*/?>#' => '<meta name="robots" content="index, follow, max-image-preview:large">',
        '#<link rel="canonical" href="[^"]*"\s*/?>#' => '<link rel="canonical" href="' . echapper($adresse) . '">',
        '#<meta property="og:title" content="[^"]*"\s*/?>#' => '<meta property="og:title" content="' . $t . '">',
        '#<meta property="og:description" content="[^"]*"\s*/?>#' => '<meta property="og:description" content="' . $dsc . '">',
        '#<meta property="og:url" content="[^"]*"\s*/?>#' => '<meta property="og:url" content="' . echapper($adresse) . '">',
    ];
    $page = $coque;
    foreach ($motifs as $motif => $remplacement) $page = preg_replace_callback($motif, fn () => $remplacement, $page, 1);
    if ($premiereImage) $page = preg_replace_callback('#<meta property="og:image" content="[^"]*"\s*/?>#', fn () => '<meta property="og:image" content="' . echapper($premiereImage) . '">', $page, 1);
    $page = preg_replace_callback('#</body>#', fn () => $html . $json($commerce) . $json($fil) . $json($liste) . '</body>', $page, 1);
    repondreHtml($page);
}

// GET /api/plan-boutiques : plan du site des boutiques indexables (même règle que ci-dessus)
function routePlanBoutiques(): never
{
    $site = 'https://' . DOMAINE_OFFICIEL; // toujours l'adresse officielle (jamais l'hôte de la requête : l'adresse canonique ne doit pas dépendre du visiteur)
    $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n" . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
    // Google refuse un plan sans aucune adresse (« balise url manquante ») : l'annuaire y figure toujours, même sans boutique indexable
    $xml .= '<url><loc>' . echapper($site . '/boutiques/') . "</loc></url>\n";
    $lignes = requete("SELECT b.slug, b.publique, c.* FROM boutiques b JOIN commerces c ON c.id = b.commerce_id WHERE b.actif = 1 AND (b.publique IS NULL OR b.publique = 1) AND c.statut <> 'suspendu' ORDER BY b.slug LIMIT 5000")->fetchAll();
    foreach ($lignes as $c) {
        if (abonnementExpire($c) || !articlesPublies($c['id'])) continue;
        $xml .= '<url><loc>' . echapper($site . '/boutique/' . $c['slug'] . '/') . "</loc></url>\n";
    }
    http_response_code(200);
    header('Content-Type: application/xml; charset=utf-8');
    header('Cache-Control: public, max-age=3600');
    header('X-LiteSpeed-Cache-Control: no-cache');
    echo $xml . '</urlset>';
    exit;
}
