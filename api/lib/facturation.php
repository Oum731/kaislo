<?php
// ------------------------------------------------------------
// FACTURES D'ABONNEMENT (Amorac → ses abonnés)
//
// Chaque paiement d'abonnement enregistré par l'équipe donne une facture acquittée, numérotée sans trou : FAC-2026-0001, FAC-2026-0002…
// (une suite par année, tous pays confondus). Une facture ne se modifie ni ne se supprime : le numéro et les montants sont figés,
// avec une copie de l'identité de l'émetteur et du client à la date de la facture.
//
// TVA : par pays (regleTva). Au Maroc, le prix payé comprend la TVA de 20 % ; ailleurs, prestation de services à un client établi
// hors du Maroc (pas de TVA marocaine, mention sur la facture). À faire valider par le comptable de la société.
//
//   GET  /api/factures                          les factures du commerce (gérant)
//   GET  /api/admin/factures[?commerceId=…]     toutes les factures, ou celles d'un commerce (équipe Kaislo)
// ------------------------------------------------------------

// Émetteur (même contenu que SOCIETE dans src/config.js : un test le vérifie)
const EMETTEUR_FACTURE = [
    'nom' => 'AMORAC',
    'forme' => 'SARL', // sans le capital (comme SOCIETE.formeJuridique)
    'adresse' => '5 Rue Annoussour, RDC, 20250 Casablanca, Maroc',
    'identifiants' => ['RC' => '690767', 'ICE' => '003786356000083', 'IF' => '68391830', 'TP' => '34215251'],
    'email' => 'contact@kaislo.com',
    'site' => 'kaislo.com',
];

const TVA_MAROC = 20.0;
const MENTION_TVA_EXPORT = 'TVA non applicable : prestation de services fournie à un client établi hors du Maroc (exportation de services).';

/** Règle de TVA d'un pays : ['taux' => % compris dans le prix payé, 'mention' => texte à afficher]. */
function regleTva(string $pays): array
{
    if ($pays === 'MA') return ['taux' => TVA_MAROC, 'mention' => ''];
    return ['taux' => 0.0, 'mention' => MENTION_TVA_EXPORT];
}

function decimalesDevise(string $devise): int
{
    return in_array($devise, ['FCFA', 'GNF'], true) ? 0 : 2;
}

/** Montants d'une facture à partir du prix payé (TVA comprise) : ['ht', 'tva', 'ttc']. */
function montantsFacture(float $ttc, float $taux, string $devise): array
{
    $d = decimalesDevise($devise);
    $ht = round($ttc / (1 + $taux / 100), $d);
    return ['ht' => $ht, 'tva' => round($ttc - $ht, $d), 'ttc' => round($ttc, $d)];
}

function numeroFacture(int $annee, int $sequence): string
{
    return sprintf('FAC-%d-%04d', $annee, $sequence);
}

function versFacture(array $f): array
{
    $contenu = json_decode($f['contenu'] ?? '{}', true) ?: [];
    return [
        'id' => $f['id'], 'numero' => $f['numero'], 'date' => $f['date'], 'paiementId' => $f['paiement_id'], 'commerceId' => $f['commerce_id'],
        'devise' => $f['devise'], 'totalHt' => (float) $f['total_ht'], 'tvaTaux' => (float) $f['tva_taux'], 'tva' => (float) $f['tva'], 'totalTtc' => (float) $f['total_ttc'],
    ] + $contenu;
}

/**
 * Crée la facture d'un paiement (dans la transaction de l'appelant). Une seule facture par paiement : si elle existe, on la renvoie.
 * $periode : ['du' => ISO, 'au' => ISO] ; renvoie la facture sous forme de tableau.
 */
function creerFacturePaiement(array $commerce, array $paiement, array $details, ?array $periode, string $creePar): array
{
    $existante = requete('SELECT * FROM factures WHERE paiement_id = ?', [$paiement['id']])->fetch();
    if ($existante) return versFacture($existante);
    $devise = (string) $paiement['devise'];
    $regle = regleTva((string) $commerce['pays']);
    $m = montantsFacture((float) $paiement['montant'], $regle['taux'], $devise);
    $formule = formuleParId((string) ($details['formule'] ?? ''));
    $mois = (int) $paiement['mois'];
    $postes = max(1, (int) ($paiement['postes'] ?? 1));
    $reglages = reglagesCommerce($commerce['id']);
    $gerant = requete("SELECT nom, telephone FROM utilisateurs WHERE commerce_id = ? AND role = 'gerant' ORDER BY cree_le", [$commerce['id']])->fetch() ?: [];
    $pays = '';
    foreach (LISTE_PAYS as $p) if (($p['id'] ?? '') === $commerce['pays']) $pays = (string) $p['nom'];
    $designation = 'Abonnement Kaislo' . ($formule ? ' – formule ' . $formule['nom'] : '') . ' – ' . $mois . ' mois' . ($postes > 1 ? ' – ' . $postes . ' postes' : '');
    $contenu = [
        'emetteur' => EMETTEUR_FACTURE,
        'client' => [
            'nom' => $commerce['nom'], 'gerant' => $gerant['nom'] ?? '', 'telephone' => $gerant['telephone'] ?? ($commerce['telephone'] ?? ''),
            'adresse' => (string) ($reglages['adresse'] ?? ''), 'ville' => (string) ($commerce['ville'] ?? ''), 'pays' => $pays, 'paysId' => $commerce['pays'],
        ],
        'lignes' => [['designation' => $designation, 'quantite' => 1, 'montantTtc' => $m['ttc']]],
        'periode' => $periode,
        'reglement' => ['date' => $paiement['date'], 'moyen' => (string) ($paiement['moyen'] ?? '')],
        'mentionTva' => $regle['mention'],
        'creePar' => $creePar,
    ];
    $annee = (int) gmdate('Y');
    $id = nouvelId('fa');
    $date = maintenant();
    // Suite sans trou : le plus grand numéro de l'année + 1 ; deux créations au même instant se départagent sur l'index unique (on réessaie)
    for ($essai = 0; $essai < 5; $essai++) {
        $sequence = ((int) (requete('SELECT MAX(sequence) AS s FROM factures WHERE annee = ?', [$annee])->fetch()['s'] ?? 0)) + 1;
        try {
            requete('INSERT INTO factures (id, numero, annee, sequence, paiement_id, commerce_id, date, devise, total_ht, tva_taux, tva, total_ttc, contenu) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
                $id, numeroFacture($annee, $sequence), $annee, $sequence, $paiement['id'], $commerce['id'], $date, $devise, $m['ht'], $regle['taux'], $m['tva'], $m['ttc'],
                json_encode($contenu, JSON_UNESCAPED_UNICODE),
            ]);
            return versFacture(requete('SELECT * FROM factures WHERE id = ?', [$id])->fetch());
        } catch (PDOException $e) {
            if ($essai === 4) throw $e;
        }
    }
    throw new ErreurApi('Numéro de facture indisponible, réessayez', 503);
}

function routeFacturesCommerce(): never
{
    $u = utilisateurConnecte();
    if ($u['role'] !== 'gerant') throw new ErreurApi('Réservé au gérant', 403);
    $lignes = requete('SELECT * FROM factures WHERE commerce_id = ? ORDER BY sequence DESC, annee DESC, date DESC', [$u['commerce_id']])->fetchAll();
    repondre(['ok' => true, 'factures' => array_map('versFacture', $lignes)]);
}

function routeAdminFactures(): never
{
    adminConnecte();
    $commerceId = (string) ($_GET['commerceId'] ?? '');
    $lignes = requete('SELECT * FROM factures' . ($commerceId !== '' ? ' WHERE commerce_id = ?' : '') . ' ORDER BY date DESC LIMIT 1000', $commerceId !== '' ? [$commerceId] : [])->fetchAll();
    repondre(['ok' => true, 'factures' => array_map('versFacture', $lignes)]);
}
