<?php
// ------------------------------------------------------------
// TARIFS : une formule par métier, 1 poste inclus (5 vendeurs au maximum par poste),
// postes supplémentaires, paiement annuel (2 mois offerts), tarif fondateur.
// Mêmes valeurs par défaut que src/lib/donnees/tarifs.js (à garder identiques).
// L'équipe Amorac peut les modifier : elles sont alors gardées dans reglages_amorac.
//
//   GET  /api/tarifs         formules et règles en vigueur (public)
//   POST /api/admin/tarifs   { formules, regles } (administrateurs)
// ------------------------------------------------------------

const VENDEURS_PAR_POSTE = 5;

const FORMULES_DEFAUT = [
    ['id' => 'proximite', 'nom' => 'Commerce de proximité', 'famille' => 'Commerce de proximité',
        'types' => ['epicerie', 'boutique', 'telephonie', 'librairie', 'beaute', 'autre'],
        'prix' => ['MAD' => 149, 'FCFA' => 9000, 'EUR' => 14, 'CAD' => 21, 'USD' => 15, 'GNF' => 135000],
        'prixPoste' => ['MAD' => 49, 'FCFA' => 3000, 'EUR' => 5, 'CAD' => 7, 'USD' => 5, 'GNF' => 45000]],
    ['id' => 'maquis', 'nom' => 'Maquis et boulangerie', 'famille' => 'Restauration et boissons',
        'types' => ['maquis', 'boulangerie'],
        'prix' => ['MAD' => 169, 'FCFA' => 10000, 'EUR' => 16, 'CAD' => 24, 'USD' => 17, 'GNF' => 150000],
        'prixPoste' => ['MAD' => 69, 'FCFA' => 4000, 'EUR' => 6, 'CAD' => 9, 'USD' => 7, 'GNF' => 60000]],
    ['id' => 'restaurant', 'nom' => 'Restaurant et bar', 'famille' => 'Restauration et boissons',
        'types' => ['restaurant', 'bar'],
        'prix' => ['MAD' => 199, 'FCFA' => 12000, 'EUR' => 18, 'CAD' => 27, 'USD' => 20, 'GNF' => 180000],
        'prixPoste' => ['MAD' => 69, 'FCFA' => 4000, 'EUR' => 6, 'CAD' => 9, 'USD' => 7, 'GNF' => 60000]],
    ['id' => 'quincaillerie', 'nom' => 'Quincaillerie', 'famille' => 'Commerces professionnels',
        'types' => ['quincaillerie'],
        'prix' => ['MAD' => 269, 'FCFA' => 16000, 'EUR' => 25, 'CAD' => 37, 'USD' => 27, 'GNF' => 240000],
        'prixPoste' => ['MAD' => 89, 'FCFA' => 5000, 'EUR' => 8, 'CAD' => 12, 'USD' => 9, 'GNF' => 75000]],
    ['id' => 'pro', 'nom' => 'Pharmacie et commerce de gros', 'famille' => 'Commerces professionnels',
        'types' => ['pharmacie', 'grossiste'],
        'prix' => ['MAD' => 319, 'FCFA' => 19000, 'EUR' => 29, 'CAD' => 44, 'USD' => 32, 'GNF' => 285000],
        'prixPoste' => ['MAD' => 89, 'FCFA' => 5000, 'EUR' => 8, 'CAD' => 12, 'USD' => 9, 'GNF' => 75000]],
];

// Prix catalogue et code parrain : les prix saisis dans la grille (FORMULES) sont ceux des clients qui s'inscrivent AVEC un code parrain
// (donc les tarifs actuels, inchangés). Les nouveaux clients SANS code paient le prix catalogue = prix de la grille ÷ (1 − remise),
// arrondi au pas supérieur : le code donne alors une vraie remise sans jamais baisser les tarifs actuels.
// Les commerces inscrits avant « catalogueDepuis » gardent leur prix actuel.
const REGLES_DEFAUT = [
    'moisOffertsAnnuel' => 2, 'remiseFondateur' => 20, 'placesFondateur' => 20,
    'remiseParrain' => 10, 'catalogueActif' => true, 'catalogueDepuis' => '2026-10-06',
];

// Valeur JSON gardée dans reglages_amorac (ou la valeur par défaut)
function reglageAmorac(string $cle, array $defaut): array
{
    $l = requete('SELECT valeur FROM reglages_amorac WHERE cle = ?', [$cle])->fetch();
    return $l ? (json_decode($l['valeur'], true) ?: $defaut) : $defaut;
}

function enregistrerReglageAmorac(string $cle, array $valeur): void
{
    $existe = requete('SELECT 1 FROM reglages_amorac WHERE cle = ?', [$cle])->fetch();
    requete($existe ? 'UPDATE reglages_amorac SET valeur = ?, modifie_le = ? WHERE cle = ?' : 'INSERT INTO reglages_amorac (valeur, modifie_le, cle) VALUES (?, ?, ?)',
        [json_encode($valeur, JSON_UNESCAPED_UNICODE), maintenant(), $cle]);
}

function formules(): array { return reglageAmorac('formules', FORMULES_DEFAUT); }
function reglesTarifs(): array { return reglageAmorac('regles', REGLES_DEFAUT) + REGLES_DEFAUT; }

function formuleParId(string $id): ?array
{
    foreach (formules() as $f) if ($f['id'] === $id) return $f;
    return null;
}

function formuleDuType(string $type): array
{
    $liste = formules();
    foreach ($liste as $f) if (in_array($type, $f['types'] ?? [], true)) return $f;
    return formuleParId('proximite') ?? $liste[0];
}

// Prix catalogue d'un montant de la grille : montant ÷ (1 − remise parrain), arrondi au pas supérieur
function prixCatalogue(float $montant, string $devise, float $remise): float
{
    if ($montant <= 0 || $remise <= 0) return $montant;
    $pas = ['GNF' => 5000, 'FCFA' => 500, 'MAD' => 5][$devise] ?? 1;
    return ceil(($montant / (1 - $remise / 100)) / $pas - 1e-9) * $pas;
}

// « catalogue » (nouveau client sans code parrain) ou « base » (avec code, ou inscrit avant la date de début)
function modeTarif(array $commerce): string
{
    $r = reglesTarifs();
    if (empty($r['catalogueActif']) || !empty($commerce['commercial_id'])) return 'base';
    return substr((string) ($commerce['cree_le'] ?? ''), 0, 10) >= (string) $r['catalogueDepuis'] ? 'catalogue' : 'base';
}

// Même calcul que prixAbonnement() de tarifs.js
function prixAbonnement(array $formule, string $devise, int $postes, int $mois, bool $fondateur, string $mode = 'base'): array
{
    $r = reglesTarifs();
    $remiseParrain = (float) $r['remiseParrain'];
    $catalogue = $mode === 'catalogue';
    $base = (float) ($formule['prix'][$devise] ?? 0);
    $prixPoste = (float) ($formule['prixPoste'][$devise] ?? 0);
    if ($catalogue) { $base = prixCatalogue($base, $devise, $remiseParrain); $prixPoste = prixCatalogue($prixPoste, $devise, $remiseParrain); }
    $supplement = max(0, $postes - 1) * $prixPoste;
    $coef = $fondateur ? 1 - ((float) $r['remiseFondateur']) / 100 : 1;
    $pas = $devise === 'GNF' ? 1000 : ($devise === 'FCFA' ? 100 : 1);
    $parMois = round(($base + $supplement) * $coef / $pas) * $pas;
    $moisFactures = $mois === 12 ? 12 - (int) $r['moisOffertsAnnuel'] : $mois;
    return ['base' => $base, 'supplement' => $supplement, 'remise' => $fondateur ? (float) $r['remiseFondateur'] : 0, 'parMois' => $parMois, 'total' => round($parMois * $moisFactures / $pas) * $pas];
}

// Nombre de postes d'un commerce (postes créés par le gérant, au moins 1)
function nombrePostes(string $commerceId): int
{
    $n = (int) requete("SELECT COUNT(*) AS n FROM elements WHERE commerce_id = ? AND type = 'postes' AND supprime = 0", [$commerceId])->fetch()['n'];
    return max(1, $n);
}

// Tarif actuel d'un commerce (affiché dans ses réglages et dans l'espace Amorac)
function tarifCommerce(array $c): array
{
    $formule = $c['offre'] && formuleParId((string) $c['offre']) ? formuleParId((string) $c['offre']) : formuleDuType((string) $c['type']);
    $postes = nombrePostes($c['id']);
    $mode = modeTarif($c);
    $prix = prixAbonnement($formule, $c['devise'], $postes, 1, (bool) ($c['fondateur'] ?? 0), $mode);
    $prixPoste = (float) ($formule['prixPoste'][$c['devise']] ?? 0);
    return ['formule' => $formule['id'], 'nom' => $formule['nom'], 'postes' => $postes, 'fondateur' => (bool) ($c['fondateur'] ?? 0),
        'mode' => $mode, 'parrain' => !empty($c['commercial_id']),
        'parMoisCatalogue' => prixAbonnement($formule, $c['devise'], $postes, 1, (bool) ($c['fondateur'] ?? 0), 'catalogue')['parMois'],
        'parMois' => $prix['parMois'], 'annuel' => prixAbonnement($formule, $c['devise'], $postes, 12, (bool) ($c['fondateur'] ?? 0), $mode)['total'],
        'prixPoste' => $mode === 'catalogue' ? prixCatalogue($prixPoste, $c['devise'], (float) reglesTarifs()['remiseParrain']) : $prixPoste, 'devise' => $c['devise']];
}

function routeTarifs(): never
{
    repondre(['ok' => true, 'formules' => formules(), 'regles' => reglesTarifs()]);
}

function routeAdminTarifs(): never
{
    $admin = adminConnecte(true);
    $e = entree();
    $propres = [];
    foreach ((array) ($e['formules'] ?? []) as $f) {
        $id = (string) ($f['id'] ?? '');
        if (!preg_match('/^[a-z0-9-]{2,20}$/', $id)) throw new ErreurApi('Identifiant de formule invalide');
        $nettoyer = function ($liste) {
            $r = [];
            foreach ((array) $liste as $devise => $p) if (is_numeric($p) && $p >= 0) $r[substr((string) $devise, 0, 6)] = (float) $p;
            return $r;
        };
        $types = array_values(array_filter((array) ($f['types'] ?? []), fn ($t) => in_array($t, TYPES_COMMERCE, true)));
        $propres[] = ['id' => $id, 'nom' => mb_substr((string) ($f['nom'] ?? $id), 0, 60), 'famille' => mb_substr((string) ($f['famille'] ?? ''), 0, 60),
            'types' => $types, 'prix' => $nettoyer($f['prix'] ?? []), 'prixPoste' => $nettoyer($f['prixPoste'] ?? [])];
    }
    if (!$propres) throw new ErreurApi('Liste de formules attendue');
    $r = (array) ($e['regles'] ?? []);
    $regles = [
        'moisOffertsAnnuel' => max(0, min(6, (int) ($r['moisOffertsAnnuel'] ?? 2))),
        'remiseFondateur' => max(0, min(90, (float) ($r['remiseFondateur'] ?? 20))),
        'placesFondateur' => max(0, min(1000, (int) ($r['placesFondateur'] ?? 20))),
        'remiseParrain' => max(0, min(40, (float) ($r['remiseParrain'] ?? 10))),
        'catalogueActif' => !empty($r['catalogueActif']),
        'catalogueDepuis' => preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) ($r['catalogueDepuis'] ?? '')) ? (string) $r['catalogueDepuis'] : REGLES_DEFAUT['catalogueDepuis'],
    ];
    enregistrerReglageAmorac('formules', $propres);
    enregistrerReglageAmorac('regles', $regles);
    journaliser(null, $admin['id'], 'amorac-tarifs', ['par' => $admin['email']]);
    repondre(['ok' => true, 'formules' => $propres, 'regles' => $regles]);
}
