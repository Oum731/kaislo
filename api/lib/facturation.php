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
    $avoirs = requete('SELECT * FROM avoirs WHERE commerce_id = ? ORDER BY date DESC', [$u['commerce_id']])->fetchAll();
    repondre(['ok' => true, 'factures' => array_map('versFacture', $lignes), 'avoirs' => array_map('versAvoir', $avoirs)]);
}

function routeAdminFactures(): never
{
    adminConnecte();
    $commerceId = (string) ($_GET['commerceId'] ?? '');
    $filtre = $commerceId !== '' ? ' WHERE commerce_id = ?' : '';
    $lignes = requete('SELECT * FROM factures' . $filtre . ' ORDER BY date DESC LIMIT 1000', $commerceId !== '' ? [$commerceId] : [])->fetchAll();
    $avoirs = requete('SELECT * FROM avoirs' . $filtre . ' ORDER BY date DESC LIMIT 1000', $commerceId !== '' ? [$commerceId] : [])->fetchAll();
    repondre(['ok' => true, 'factures' => array_map('versFacture', $lignes), 'avoirs' => array_map('versAvoir', $avoirs)]);
}

// ---------- Factures d'avoir ----------

function numeroAvoir(int $annee, int $sequence): string
{
    return sprintf('AV-%d-%04d', $annee, $sequence);
}

function versAvoir(array $a): array
{
    $contenu = json_decode($a['contenu'] ?? '{}', true) ?: [];
    return [
        'id' => $a['id'], 'type' => 'avoir', 'numero' => $a['numero'], 'date' => $a['date'], 'factureId' => $a['facture_id'], 'commerceId' => $a['commerce_id'],
        'devise' => $a['devise'], 'totalHt' => (float) $a['total_ht'], 'tvaTaux' => (float) $a['tva_taux'], 'tva' => (float) $a['tva'], 'totalTtc' => (float) $a['total_ttc'],
    ] + $contenu;
}

/** Ce qui reste à créditer sur une facture (TTC) : son total moins les avoirs déjà émis. */
function resteACrediter(array $facture): float
{
    $deja = (float) (requete('SELECT COALESCE(SUM(total_ttc), 0) AS t FROM avoirs WHERE facture_id = ?', [$facture['id']])->fetch()['t'] ?? 0);
    // total_ttc d'un avoir est négatif : le reste est le total de la facture + la somme des avoirs
    return round((float) $facture['total_ttc'] + $deja, decimalesDevise((string) $facture['devise']));
}

/**
 * Émet un avoir sur une facture (dans la transaction de l'appelant). $montantTtc : montant à créditer, positif (au plus le reste à créditer).
 * Les montants de l'avoir sont négatifs ; la TVA suit celle de la facture.
 */
function creerAvoir(array $facture, float $montantTtc, string $motif, string $creePar): array
{
    $devise = (string) $facture['devise'];
    $d = decimalesDevise($devise);
    $montantTtc = round($montantTtc, $d);
    if ($montantTtc <= 0) throw new ErreurApi('Indiquez le montant à créditer');
    $reste = resteACrediter($facture);
    if ($montantTtc > $reste + 1e-9) throw new ErreurApi($reste > 0 ? 'Le montant dépasse ce qui reste à créditer sur cette facture (' . $reste . ' ' . $devise . ')' : 'Cette facture est déjà entièrement créditée');
    $motif = trim($motif);
    if (mb_strlen($motif) < 3) throw new ErreurApi('Indiquez le motif de l’avoir');
    $m = montantsFacture($montantTtc, (float) $facture['tva_taux'], $devise);
    $origine = json_decode($facture['contenu'] ?? '{}', true) ?: [];
    $contenu = [
        'emetteur' => EMETTEUR_FACTURE,
        'client' => $origine['client'] ?? [],
        'lignes' => [['designation' => 'Avoir sur la facture ' . $facture['numero'] . ' – ' . mb_substr($motif, 0, 120), 'quantite' => 1, 'montantTtc' => -$m['ttc']]],
        'reference' => ['factureNumero' => $facture['numero'], 'factureDate' => $facture['date']],
        'motif' => mb_substr($motif, 0, 200),
        'mentionTva' => $origine['mentionTva'] ?? '',
        'creePar' => $creePar,
    ];
    $annee = (int) gmdate('Y');
    $id = nouvelId('av');
    $date = maintenant();
    for ($essai = 0; $essai < 5; $essai++) {
        $sequence = ((int) (requete('SELECT MAX(sequence) AS s FROM avoirs WHERE annee = ?', [$annee])->fetch()['s'] ?? 0)) + 1;
        try {
            requete('INSERT INTO avoirs (id, numero, annee, sequence, facture_id, commerce_id, date, devise, total_ht, tva_taux, tva, total_ttc, contenu) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
                $id, numeroAvoir($annee, $sequence), $annee, $sequence, $facture['id'], $facture['commerce_id'], $date, $devise, -$m['ht'], $facture['tva_taux'], -$m['tva'], -$m['ttc'],
                json_encode($contenu, JSON_UNESCAPED_UNICODE),
            ]);
            return versAvoir(requete('SELECT * FROM avoirs WHERE id = ?', [$id])->fetch());
        } catch (PDOException $e) {
            if ($essai === 4) throw $e;
        }
    }
    throw new ErreurApi('Numéro d’avoir indisponible, réessayez', 503);
}

function routeAdminCreerAvoir(): never
{
    $admin = adminConnecte(true);
    $e = entree();
    $facture = requete('SELECT * FROM factures WHERE id = ?', [(string) ($e['factureId'] ?? '')])->fetch();
    if (!$facture) throw new ErreurApi('Facture introuvable', 404);
    // Sans montant : on crédite tout ce qui reste
    $montant = isset($e['montant']) && $e['montant'] !== '' && $e['montant'] !== null ? (float) $e['montant'] : resteACrediter($facture);
    $pdo = base();
    $pdo->beginTransaction();
    try {
        $a = creerAvoir($facture, $montant, (string) ($e['motif'] ?? ''), $admin['email']);
        $pdo->commit();
    } catch (Throwable $err) {
        $pdo->rollBack();
        throw $err;
    }
    $commerce = requete('SELECT * FROM commerces WHERE id = ?', [$facture['commerce_id']])->fetch();
    if ($commerce) notifierDocumentFacture($commerce, $a);
    journaliser($facture['commerce_id'], $admin['id'], 'amorac-avoir', ['numero' => $a['numero'], 'facture' => $facture['numero'], 'montant' => $a['totalTtc'], 'par' => $admin['email']]);
    repondre(['ok' => true, 'avoir' => $a], 201);
}

// ---------- Prévenir le gérant ----------

/** Le dernier document (facture ou avoir) émis pour ce commerce depuis moins de 30 jours, ou null : { numero, type, date, totalTtc, devise }. */
function derniereFactureDe(string $commerceId): ?array
{
    $depuis = maintenant(-30 * 86400);
    $f = requete('SELECT numero, date, total_ttc, devise FROM factures WHERE commerce_id = ? AND date >= ? ORDER BY date DESC LIMIT 1', [$commerceId, $depuis])->fetch() ?: null;
    $a = requete('SELECT numero, date, total_ttc, devise FROM avoirs WHERE commerce_id = ? AND date >= ? ORDER BY date DESC LIMIT 1', [$commerceId, $depuis])->fetch() ?: null;
    // Un avoir vient toujours après sa facture : à la même seconde, c'est l'avoir le plus récent
    $dernier = $a && (!$f || $a['date'] >= $f['date']) ? $a + ['type' => 'avoir'] : ($f ? $f + ['type' => 'facture'] : null);
    return $dernier ? ['numero' => $dernier['numero'], 'type' => $dernier['type'], 'date' => $dernier['date'], 'totalTtc' => (float) $dernier['total_ttc'], 'devise' => $dernier['devise']] : null;
}

/**
 * Prévient le gérant qu'une facture (ou un avoir) est prête : e-mail et notification sur ses appareils, selon ses réglages (pas de WhatsApp).
 * Envoyé après la réponse ; un échec ne gêne jamais le paiement ni l'avoir.
 */
function notifierDocumentFacture(array $commerce, array $doc): void
{
    try {
        $reglages = reglagesCommerce($commerce['id']);
        $langue = langueNotifications($commerce, $reglages);
        $en = $langue === 'en';
        $avoir = ($doc['type'] ?? 'facture') === 'avoir';
        $montant = montantTexte(abs((float) $doc['totalTtc']), (string) $doc['devise']);
        $chemin = $en ? 'Settings → Profile → Subscription → “My invoices”' : 'Réglages → Profil → Abonnement → « Mes factures »';
        $url = 'https://' . (domaineSite() ?: 'kaislo.com') . '/app/';
        $sujet = $avoir
            ? ($en ? 'Kaislo: your credit note ' : 'Kaislo : votre avoir ') . $doc['numero']
            : ($en ? 'Kaislo: your invoice ' : 'Kaislo : votre facture ') . $doc['numero'];
        $corps = ($en ? "Hello,\n\n" : "Bonjour,\n\n")
            . ($avoir
                ? ($en ? "A credit note of $montant ({$doc['numero']}) has been issued for {$commerce['nom']}.\n\n" : "Un avoir de $montant ({$doc['numero']}) a été émis pour {$commerce['nom']}.\n\n")
                : ($en ? "Your invoice {$doc['numero']} ($montant) for {$commerce['nom']} is ready.\n\n" : "Votre facture {$doc['numero']} ($montant) pour {$commerce['nom']} est disponible.\n\n"))
            . ($en ? "Download the PDF in Kaislo: $url\n($chemin)\n" : "Téléchargez le PDF dans Kaislo : $url\n($chemin)\n")
            . "\nKaislo · kaislo.com";
        $push = [$avoir ? ($en ? 'Your credit note is ready' : 'Votre avoir est disponible') : ($en ? 'Your invoice is ready' : 'Votre facture est disponible'), $doc['numero'] . ' · ' . $montant];
        apresReponse(function () use ($commerce, $reglages, $sujet, $corps, $push, $langue, $avoir) {
            try {
                envoyerNotification($commerce, $reglages, $avoir ? 'avoir' : 'facture', ['sujet' => $sujet, 'corps' => $corps, 'variables' => [], 'push' => $push], $langue);
            } catch (Throwable $e) {
                error_log('[Kaislo notifications] facture : ' . $e->getMessage());
            }
        });
    } catch (Throwable $e) {
        error_log('[Kaislo notifications] facture : ' . $e->getMessage());
    }
}
