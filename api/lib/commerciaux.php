<?php
// ------------------------------------------------------------
// PROGRAMME DES COMMERCIAUX KAISLO
//
// Chaque commercial a un code parrain, saisi à la création du compte d'un commerce
// (ou dans le lien kaislo.com/app/?ref=CODE).
// Règle (modifiable dans l'espace Amorac → Commerciaux → Règles) :
//  - 25 % de tout ce que paie le client pendant ses 12 premiers mois payés
//    (formule et postes supplémentaires compris) ;
//  - rien n'est payable avant la validation : 6 mois payés ET des ventes chaque semaine ;
//  - à la validation, les mois 1 à 6 deviennent payables d'un coup, puis chaque mois
//    du 7e au 12e devient payable dès que le client le paie ;
//  - si le client arrête avant 6 mois, aucune commission (lignes annulées par l'équipe) ;
//  - primes par palier de clients validés (10 et 25 par défaut, montants à définir) ;
//  - bonus hebdomadaire : une somme fixe la semaine où le commercial envoie au moins 5 clients qui ont vraiment démarré
//    (3 articles et 1 vente dans les 7 jours après l'inscription). Semaine = du lundi au dimanche, selon la date d'inscription.
//
// Une ligne de commission par mois payé : statut attente → a_payer → payee (ou annulee).
//
//   Espace Amorac (administrateurs) :
//     GET  /api/admin/commerciaux                 liste, totaux, règles du programme
//     GET  /api/admin/commercial?id=…             clients, contrôle de validation, commissions, primes
//     POST /api/admin/commercial                  créer / modifier un commercial
//     POST /api/admin/commissions                 { action: valider | annuler | payer | prime, … }
//     POST /api/admin/programme                   règles du programme
//     POST /api/admin/commercial-validation       { id, action: valider | refuser } : inscription faite par le commercial lui-même
//     POST /api/admin/commercial-contrat          { id } : met le contrat à disposition du commercial (numéro, règles figées)
//   Espace commercial (/commercial/) :
//     POST /api/commercial/inscription            { nom, telephone, pays, email?, pin, conditionsAcceptees } : compte « en attente », code parrain automatique
//     POST /api/commercial/connexion              { telephone, pays, pin }
//     GET  /api/commercial/moi                    son code, ses clients, ses commissions, ses primes
//     POST /api/commercial/pin                    { ancien, nouveau }
//     POST /api/commercial/contrat-accepter       : « lu et approuvé » (date enregistrée)
//     POST /api/commercial/deconnexion
// ------------------------------------------------------------

const DUREE_SESSION_COMMERCIAL = 30 * 86400;

const PROGRAMME_DEFAUT = [
    'taux' => 25,             // % de ce que paie le client
    'dureeMois' => 12,        // mois payés pris en compte
    'moisValidation' => 6,    // mois payés avant validation
    'primes' => [             // paliers de clients validés ; montants par devise (0 = à définir)
        ['clients' => 10, 'montant' => ['MAD' => 0, 'FCFA' => 0]],
        ['clients' => 25, 'montant' => ['MAD' => 0, 'FCFA' => 0]],
    ],
    'bonusHebdo' => ['clients' => 5, 'montant' => ['MAD' => 0, 'FCFA' => 10000]], // 5 clients démarrés dans la semaine → 10 000 FCFA
];

const CLIENT_DEMARRE_ARTICLES = 3; // un client « démarré » a au moins 3 articles et 1 vente dans les 7 jours qui suivent son inscription
const SEMAINES_BONUS = 8;          // nombre de semaines affichées

function programme(): array { return reglageAmorac('programme', PROGRAMME_DEFAUT) + PROGRAMME_DEFAUT; }

// ---------- Commissions créées à chaque paiement d'un client apporté ----------
// Le montant payé est réparti sur ses mois (12 mois payés en annuel = montant / 12 par mois).
function creerCommissions(array $commerce, string $paiementId, float $montant, int $mois): void
{
    $commercial = requete('SELECT * FROM commerciaux WHERE id = ?', [$commerce['commercial_id']])->fetch();
    if (!$commercial) return;
    $p = programme();
    $deja = (int) requete("SELECT COUNT(*) AS n FROM commissions WHERE commerce_id = ? AND statut <> 'annulee'", [$commerce['id']])->fetch()['n'];
    $parMois = round($montant / $mois * ((float) $commercial['taux'] ?: (float) $p['taux']) / 100, 2);
    $valide = !empty($commerce['commission_validee_le']);
    for ($k = 1; $k <= $mois; $k++) {
        $rang = $deja + $k;
        if ($rang > (int) $p['dureeMois']) break;
        requete('INSERT INTO commissions (id, commercial_id, commerce_id, paiement_id, rang, montant, devise, statut, cree_le) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
            nouvelId('cm'), $commercial['id'], $commerce['id'], $paiementId, $rang, $parMois, $commerce['devise'], $valide ? 'a_payer' : 'attente', maintenant(),
        ]);
    }
}

// Contrôle de validation d'un client : mois payés et semaines avec des ventes depuis le premier paiement
function controleValidation(array $commerce): array
{
    $p = programme();
    $premier = requete('SELECT MIN(date) AS d FROM paiements WHERE commerce_id = ?', [$commerce['id']])->fetch()['d'];
    $moisPayes = (int) requete("SELECT COUNT(*) AS n FROM commissions WHERE commerce_id = ? AND statut <> 'annulee'", [$commerce['id']])->fetch()['n'];
    $semaines = 0;
    $actives = 0;
    if ($premier) {
        // Période contrôlée : du premier paiement jusqu'à la fin des 6 mois (ou aujourd'hui si plus tôt)
        $debut = strtotime($premier);
        $fin = min(time(), $debut + (int) $p['moisValidation'] * 30 * 86400);
        $semaines = max(1, (int) ceil(($fin - $debut) / (7 * 86400)));
        $avecVentes = [];
        $lignes = requete("SELECT contenu FROM elements WHERE commerce_id = ? AND type = 'ventes' AND supprime = 0 AND modifie_le >= ?", [$commerce['id'], $premier])->fetchAll();
        foreach ($lignes as $l) {
            $v = json_decode($l['contenu'], true) ?: [];
            $t = strtotime((string) ($v['date'] ?? ''));
            if (!$t || $t < $debut || $t > $fin || !empty($v['annulee'])) continue;
            $avecVentes[(int) floor(($t - $debut) / (7 * 86400))] = true;
        }
        $actives = count($avecVentes);
    }
    $assezDeMois = $moisPayes >= (int) $p['moisValidation'];
    return [
        'premierPaiement' => $premier, 'moisPayes' => $moisPayes, 'moisRequis' => (int) $p['moisValidation'],
        'semaines' => $semaines, 'semainesActives' => $actives,
        'pret' => $assezDeMois && $actives >= $semaines, // toutes les conditions remplies
        'valideLe' => $commerce['commission_validee_le'] ?? null,
    ];
}

// Totaux d'un commercial, par statut et par devise : ['attente' => ['FCFA' => 21000], ...]
function totauxCommissions(string $commercialId): array
{
    $t = ['attente' => [], 'a_payer' => [], 'payee' => []];
    foreach (requete('SELECT statut, devise, SUM(montant) AS m FROM commissions WHERE commercial_id = ? GROUP BY statut, devise', [$commercialId])->fetchAll() as $l) {
        if (isset($t[$l['statut']])) $t[$l['statut']][$l['devise']] = round((float) $l['m'], 2);
    }
    return $t;
}

// Clients d'un commercial (vue commune à l'équipe et au commercial)
function clientsCommercial(string $commercialId, bool $pourEquipe): array
{
    $clients = [];
    foreach (requete('SELECT * FROM commerces WHERE commercial_id = ? ORDER BY cree_le DESC', [$commercialId])->fetchAll() as $c) {
        $controle = controleValidation($c);
        $abonnement = versCommerce($c)['abonnement'];
        $ligne = [
            'id' => $c['id'], 'nom' => $c['nom'], 'type' => $c['type'], 'ville' => $c['ville'], 'quartier' => $c['quartier'] ?? '', 'pays' => $c['pays'], 'devise' => $c['devise'],
            'inscritLe' => $c['cree_le'], 'statut' => $abonnement['statut'], 'essaiFin' => $abonnement['essaiFin'], 'periodeFin' => $abonnement['periodeFin'],
            'controle' => $controle,
            'commissions' => array_map(fn ($m) => ['id' => $m['id'], 'rang' => (int) $m['rang'], 'montant' => (float) $m['montant'], 'devise' => $m['devise'], 'statut' => $m['statut'], 'payeLe' => $m['paye_le']],
                requete('SELECT * FROM commissions WHERE commerce_id = ? AND commercial_id = ? ORDER BY rang', [$c['id'], $commercialId])->fetchAll()),
        ];
        if ($pourEquipe) $ligne['telephone'] = $c['telephone'];
        $clients[] = $ligne;
    }
    return $clients;
}

// Lundi (date AAAA-MM-JJ) de la semaine qui contient l'instant donné
function lundiDeLaSemaine(int $t): string
{
    return gmdate('Y-m-d', $t - ((int) gmdate('N', $t) - 1) * 86400);
}

// Un client a « démarré » s'il a au moins 3 articles et une vente (non annulée) dans les 7 jours après son inscription
function clientDemarre(array $commerce): bool
{
    $articles = (int) requete("SELECT COUNT(*) AS n FROM elements WHERE commerce_id = ? AND type = 'produits' AND supprime = 0", [$commerce['id']])->fetch()['n'];
    if ($articles < CLIENT_DEMARRE_ARTICLES) return false;
    $debut = strtotime((string) $commerce['cree_le']);
    foreach (requete("SELECT contenu FROM elements WHERE commerce_id = ? AND type = 'ventes' AND supprime = 0", [$commerce['id']])->fetchAll() as $l) {
        $v = json_decode($l['contenu'], true) ?: [];
        $t = strtotime((string) ($v['date'] ?? ''));
        if ($t && $t >= $debut && $t <= $debut + 7 * 86400 && empty($v['annulee'])) return true;
    }
    return false;
}

// Bonus hebdomadaire : les dernières semaines, du lundi au dimanche (la plus récente d'abord).
// Une semaine est « payable » quand elle est terminée, que le nombre de clients démarrés est atteint et qu'elle n'est pas déjà versée.
function bonusHebdoCommercial(array $commercial): array
{
    $regle = programme()['bonusHebdo'];
    $devise = PAYS[$commercial['pays']] ?? 'FCFA';
    $montant = (float) ($regle['montant'][$devise] ?? 0);
    $lundi = strtotime(lundiDeLaSemaine(time()) . ' 00:00:00 UTC');
    $depuis = gmdate('Y-m-d', $lundi - (SEMAINES_BONUS - 1) * 7 * 86400);
    $parSemaine = [];
    foreach (requete('SELECT * FROM commerces WHERE commercial_id = ? AND cree_le >= ?', [$commercial['id'], $depuis])->fetchAll() as $c) {
        $s = lundiDeLaSemaine(strtotime((string) $c['cree_le']));
        $parSemaine[$s]['inscrits'] = ($parSemaine[$s]['inscrits'] ?? 0) + 1;
        if (clientDemarre($c)) $parSemaine[$s]['demarres'] = ($parSemaine[$s]['demarres'] ?? 0) + 1;
    }
    $versees = [];
    foreach (requete('SELECT * FROM bonus_hebdo WHERE commercial_id = ?', [$commercial['id']])->fetchAll() as $b) $versees[$b['semaine']] = $b;
    $semaines = [];
    for ($i = 0; $i < SEMAINES_BONUS; $i++) {
        $debut = gmdate('Y-m-d', $lundi - $i * 7 * 86400);
        $fin = gmdate('Y-m-d', $lundi - $i * 7 * 86400 + 6 * 86400);
        $demarres = (int) ($parSemaine[$debut]['demarres'] ?? 0);
        $atteint = $demarres >= (int) $regle['clients'] && $montant > 0;
        $terminee = $i > 0;
        $b = $versees[$debut] ?? null;
        $semaines[] = [
            'semaine' => $debut, 'fin' => $fin, 'inscrits' => (int) ($parSemaine[$debut]['inscrits'] ?? 0), 'clients' => $demarres,
            'requis' => (int) $regle['clients'], 'atteint' => $atteint, 'terminee' => $terminee, 'montant' => $montant, 'devise' => $devise,
            'payable' => $atteint && $terminee && !$b, 'payeLe' => $b['paye_le'] ?? null,
            'montantVerse' => $b ? ['montant' => (float) $b['montant'], 'devise' => $b['devise']] : null,
        ];
    }
    return $semaines;
}

// Primes : paliers atteints (clients validés) et primes déjà versées
function primesCommercial(string $commercialId): array
{
    $valides = (int) requete('SELECT COUNT(*) AS n FROM commerces WHERE commercial_id = ? AND commission_validee_le IS NOT NULL', [$commercialId])->fetch()['n'];
    $versees = [];
    foreach (requete('SELECT * FROM primes WHERE commercial_id = ?', [$commercialId])->fetchAll() as $pr) $versees[(int) $pr['palier']] = $pr;
    return array_map(fn ($palier) => [
        'clients' => (int) $palier['clients'], 'montant' => $palier['montant'] ?? [], 'atteint' => $valides >= (int) $palier['clients'],
        'payeeLe' => $versees[(int) $palier['clients']]['paye_le'] ?? null,
        'montantVerse' => isset($versees[(int) $palier['clients']]) ? ['montant' => (float) $versees[(int) $palier['clients']]['montant'], 'devise' => $versees[(int) $palier['clients']]['devise']] : null,
    ], programme()['primes']);
}

// Contrat du commercial : numéro, dates et règles figées au moment de l'envoi (le PDF est fabriqué dans l'application)
function contratCommercial(array $c): ?array
{
    if (empty($c['contrat_envoye_le'])) return null;
    return [
        'numero' => $c['contrat_numero'], 'envoyeLe' => $c['contrat_envoye_le'], 'accepteLe' => $c['contrat_accepte_le'] ?: null,
        'conditions' => json_decode((string) ($c['contrat_conditions'] ?? ''), true) ?: [],
    ];
}

function versCommercial(array $c): array
{
    $nb = requete("SELECT COUNT(*) AS n, SUM(CASE WHEN commission_validee_le IS NOT NULL THEN 1 ELSE 0 END) AS v, SUM(CASE WHEN statut = 'actif' THEN 1 ELSE 0 END) AS a FROM commerces WHERE commercial_id = ?", [$c['id']])->fetch();
    return [
        'id' => $c['id'], 'nom' => $c['nom'], 'telephone' => $c['telephone'], 'email' => $c['email'], 'pays' => $c['pays'], 'ville' => $c['ville'] ?? '', 'quartier' => $c['quartier'] ?? '', 'code' => $c['code'],
        'contratEnvoyeLe' => $c['contrat_envoye_le'] ?: null, 'contratAccepteLe' => $c['contrat_accepte_le'] ?: null,
        'taux' => (float) $c['taux'], 'actif' => (bool) $c['actif'], 'enAttente' => empty($c['valide_le']) && !$c['actif'], 'valideLe' => $c['valide_le'] ?? null,
        'notes' => $c['notes'], 'creeLe' => $c['cree_le'], 'vuLe' => $c['vu_le'],
        'clients' => (int) $nb['n'], 'clientsAbonnes' => (int) $nb['a'], 'clientsValides' => (int) $nb['v'], 'totaux' => totauxCommissions($c['id']),
    ];
}

// Code parrain : lettres et chiffres, 4 à 12 caractères, en majuscules
function codeParrainPropre(string $code): string
{
    return strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $code));
}

// Code parrain automatique : début du nom (sans accents) + 2 chiffres, unique. Ex : « Awa Traoré » → AWA42
function genererCodeParrain(string $nom): string
{
    $lettres = strtoupper(preg_replace('/[^A-Za-z]/', '', (string) iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $nom)));
    $debut = substr($lettres . 'KAISLO', 0, 3);
    for ($essai = 0; $essai < 200; $essai++) {
        $code = $debut . ($essai < 90 ? sprintf('%02d', random_int(10, 99)) : (string) random_int(1000, 9999));
        if (!requete('SELECT 1 FROM commerciaux WHERE code = ?', [$code])->fetch()) return $code;
    }
    return $debut . strtoupper(bin2hex(random_bytes(3)));
}

// Commercial correspondant au code saisi à l'inscription (ou erreur claire)
function commercialParCode(string $saisie): ?array
{
    $code = codeParrainPropre($saisie);
    if ($code === '') return null;
    $c = requete('SELECT * FROM commerciaux WHERE code = ? AND actif = 1', [$code])->fetch();
    if (!$c) throw new ErreurApi('Code parrain inconnu : vérifiez-le, ou laissez la case vide');
    return $c;
}

// ---------- Espace Amorac ----------

function routeAdminCommerciaux(): never
{
    adminConnecte(true);
    $liste = array_map('versCommercial', requete('SELECT * FROM commerciaux ORDER BY cree_le DESC')->fetchAll());
    repondre(['ok' => true, 'commerciaux' => $liste, 'programme' => programme()]);
}

function routeAdminCommercial(): never
{
    adminConnecte(true);
    $c = requete('SELECT * FROM commerciaux WHERE id = ?', [(string) ($_GET['id'] ?? '')])->fetch();
    if (!$c) throw new ErreurApi('Commercial introuvable', 404);
    repondre(['ok' => true, 'commercial' => versCommercial($c), 'clients' => clientsCommercial($c['id'], true), 'primes' => primesCommercial($c['id']), 'bonusHebdo' => bonusHebdoCommercial($c), 'contrat' => contratCommercial($c)]);
}

// { id?, nom, telephone, pays, ville?, quartier?, email, code, taux, actif, notes, pin? }
function routeAdminCommercialEnregistrer(): never
{
    $admin = adminConnecte(true);
    $e = entree();
    $id = (string) ($e['id'] ?? '');
    $avant = $id ? requete('SELECT * FROM commerciaux WHERE id = ?', [$id])->fetch() : null;
    if ($id && !$avant) throw new ErreurApi('Commercial introuvable', 404);
    $nom = texte($e, 'nom', 'le nom');
    $pays = strtoupper((string) ($e['pays'] ?? 'MA'));
    if (!isset(PAYS[$pays])) throw new ErreurApi('Pays non pris en charge');
    $num = telephoneValide(texte($e, 'telephone', 'le téléphone', true, 40), $pays, 'téléphone du commercial');
    $autre = requete('SELECT id FROM commerciaux WHERE cle_telephone = ?', [$num['cle']])->fetch();
    if ($autre && $autre['id'] !== $id) throw new ErreurApi('Ce numéro est déjà celui d’un autre commercial', 409);
    $code = codeParrainPropre((string) ($e['code'] ?? ''));
    if ($code === '' && !$id) $code = genererCodeParrain($nom); // nouveau commercial : code automatique si on n'en saisit pas
    if ($code === '' && $id) $code = (string) $avant['code'];
    if (strlen($code) < 4 || strlen($code) > 12) throw new ErreurApi('Code parrain : 4 à 12 lettres ou chiffres');
    if (preg_match('/^P\d{6}$/', $code)) throw new ErreurApi('Ce code ressemble à un code de parrainage de commerce : choisissez-en un autre');
    $autre = requete('SELECT id FROM commerciaux WHERE code = ?', [$code])->fetch();
    if ($autre && $autre['id'] !== $id) throw new ErreurApi('Ce code parrain est déjà pris', 409);
    $taux = (float) ($e['taux'] ?? programme()['taux']);
    if ($taux < 0 || $taux > 60) throw new ErreurApi('Taux de commission entre 0 et 60 %');
    $email = trim((string) ($e['email'] ?? ''));
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) throw new ErreurApi('Adresse e-mail invalide');
    $pin = (string) ($e['pin'] ?? '');
    if ((!$id || $pin !== '') && !preg_match('/^\d{6}$/', $pin)) throw new ErreurApi('Code PIN du commercial : 6 chiffres');
    $actif = array_key_exists('actif', $e) ? ((bool) $e['actif'] ? 1 : 0) : 1;
    $notes = mb_substr((string) ($e['notes'] ?? ''), 0, 2000);
    $ville = texte($e, 'ville', 'la ville', false, 80);
    $quartier = texte($e, 'quartier', 'le quartier', false, 80);
    if ($id) {
        requete('UPDATE commerciaux SET nom = ?, telephone = ?, cle_telephone = ?, email = ?, pays = ?, ville = ?, quartier = ?, code = ?, taux = ?, actif = ?, notes = ? WHERE id = ?',
            [$nom, $num['affichage'], $num['cle'], $email, $pays, $ville, $quartier, $code, $taux, $actif, $notes, $id]);
        if ($pin !== '') requete('UPDATE commerciaux SET pin_hash = ? WHERE id = ?', [password_hash($pin, PASSWORD_DEFAULT), $id]);
        if ($pin !== '' || !$actif) requete('DELETE FROM jetons_commerciaux WHERE commercial_id = ?', [$id]);
    } else {
        $id = nouvelId('co');
        requete('INSERT INTO commerciaux (id, nom, telephone, cle_telephone, email, pays, ville, quartier, code, pin_hash, taux, actif, notes, cree_le, valide_le) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [$id, $nom, $num['affichage'], $num['cle'], $email, $pays, $ville, $quartier, $code, password_hash($pin, PASSWORD_DEFAULT), $taux, $actif, $notes, maintenant(), maintenant()]);
    }
    journaliser(null, $admin['id'], 'amorac-commercial', ['commercial' => $nom, 'code' => $code, 'par' => $admin['email']]);
    repondre(['ok' => true, 'commercial' => versCommercial(requete('SELECT * FROM commerciaux WHERE id = ?', [$id])->fetch())]);
}

// { action: 'valider' | 'annuler', commerceId } · { action: 'payer', ids: [...], moyen } · { action: 'prime', commercialId, palier, montant, devise, moyen }
function routeAdminCommissions(): never
{
    $admin = adminConnecte(true);
    $e = entree();
    $action = (string) ($e['action'] ?? '');
    switch ($action) {
        case 'valider':
            // 6 mois payés et utilisés : les commissions en attente deviennent payables
            $c = requete('SELECT * FROM commerces WHERE id = ?', [(string) ($e['commerceId'] ?? '')])->fetch();
            if (!$c || !$c['commercial_id']) throw new ErreurApi('Client introuvable', 404);
            $controle = controleValidation($c);
            if ($controle['moisPayes'] < $controle['moisRequis']) throw new ErreurApi('Le client n’a pas encore payé ' . $controle['moisRequis'] . ' mois');
            // L'activité chaque semaine est vérifiée par le système ; l'équipe peut passer outre en le précisant
            if (!$controle['pret'] && empty($e['forcer'])) throw new ErreurApi('Ventes enregistrées ' . $controle['semainesActives'] . ' semaines sur ' . $controle['semaines'] . ' : confirmez pour valider quand même');
            requete('UPDATE commerces SET commission_validee_le = ? WHERE id = ?', [maintenant(), $c['id']]);
            requete("UPDATE commissions SET statut = 'a_payer' WHERE commerce_id = ? AND statut = 'attente'", [$c['id']]);
            journaliser($c['id'], $admin['id'], 'amorac-commission-validee', ['par' => $admin['email'], 'forcee' => !$controle['pret']]);
            break;
        case 'annuler':
            // Le client a arrêté avant la validation : aucune commission due
            $c = requete('SELECT * FROM commerces WHERE id = ?', [(string) ($e['commerceId'] ?? '')])->fetch();
            if (!$c) throw new ErreurApi('Client introuvable', 404);
            requete("UPDATE commissions SET statut = 'annulee' WHERE commerce_id = ? AND statut = 'attente'", [$c['id']]);
            journaliser($c['id'], $admin['id'], 'amorac-commission-annulee', ['par' => $admin['email']]);
            break;
        case 'payer':
            // Versement au commercial (mobile money, virement…)
            $ids = array_values(array_filter(array_map('strval', (array) ($e['ids'] ?? []))));
            if (!$ids) throw new ErreurApi('Aucune commission choisie');
            $moyen = mb_substr((string) ($e['moyen'] ?? 'Mobile money'), 0, 30);
            foreach ($ids as $idc) {
                requete("UPDATE commissions SET statut = 'payee', paye_le = ?, paye_par = ?, moyen = ? WHERE id = ? AND statut = 'a_payer'", [maintenant(), $admin['email'], $moyen, $idc]);
            }
            journaliser(null, $admin['id'], 'amorac-commissions-payees', ['nombre' => count($ids), 'par' => $admin['email']]);
            break;
        case 'prime':
            $cid = (string) ($e['commercialId'] ?? '');
            $palier = (int) ($e['palier'] ?? 0);
            $montant = (float) ($e['montant'] ?? 0);
            if (!requete('SELECT 1 FROM commerciaux WHERE id = ?', [$cid])->fetch()) throw new ErreurApi('Commercial introuvable', 404);
            $p = array_values(array_filter(primesCommercial($cid), fn ($x) => $x['clients'] === $palier))[0] ?? null;
            if (!$p || !$p['atteint']) throw new ErreurApi('Palier pas encore atteint');
            if ($p['payeeLe']) throw new ErreurApi('Prime déjà versée');
            if ($montant <= 0) throw new ErreurApi('Indiquez le montant de la prime');
            requete('INSERT INTO primes (id, commercial_id, palier, montant, devise, paye_le, paye_par, moyen) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
                nouvelId('pr'), $cid, $palier, $montant, substr((string) ($e['devise'] ?? 'FCFA'), 0, 6), maintenant(), $admin['email'], mb_substr((string) ($e['moyen'] ?? 'Mobile money'), 0, 30),
            ]);
            break;
        case 'bonus':
            // Versement du bonus d'une semaine terminée : { commercialId, semaine, moyen }
            $c = requete('SELECT * FROM commerciaux WHERE id = ?', [(string) ($e['commercialId'] ?? '')])->fetch();
            if (!$c) throw new ErreurApi('Commercial introuvable', 404);
            $s = array_values(array_filter(bonusHebdoCommercial($c), fn ($x) => $x['semaine'] === (string) ($e['semaine'] ?? '')))[0] ?? null;
            if (!$s) throw new ErreurApi('Semaine introuvable');
            if ($s['payeLe']) throw new ErreurApi('Bonus déjà versé pour cette semaine');
            if (!$s['terminee']) throw new ErreurApi('La semaine n’est pas terminée');
            if (!$s['atteint']) throw new ErreurApi('Il faut ' . $s['requis'] . ' clients démarrés (' . $s['clients'] . ' pour le moment)');
            requete('INSERT INTO bonus_hebdo (id, commercial_id, semaine, clients, montant, devise, paye_le, paye_par, moyen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
                nouvelId('bh'), $c['id'], $s['semaine'], $s['clients'], $s['montant'], $s['devise'], maintenant(), $admin['email'], mb_substr((string) ($e['moyen'] ?? 'Mobile money'), 0, 30),
            ]);
            journaliser(null, $admin['id'], 'amorac-bonus-hebdo', ['commercial' => $c['nom'], 'semaine' => $s['semaine'], 'par' => $admin['email']]);
            break;
        default:
            throw new ErreurApi('Action inconnue');
    }
    repondre(['ok' => true]);
}

function routeAdminProgramme(): never
{
    $admin = adminConnecte(true);
    $e = entree();
    $primes = [];
    foreach ((array) ($e['primes'] ?? []) as $pr) {
        $montants = [];
        foreach ((array) ($pr['montant'] ?? []) as $dev => $m) if (is_numeric($m) && $m >= 0) $montants[substr((string) $dev, 0, 6)] = (float) $m;
        if ((int) ($pr['clients'] ?? 0) > 0) $primes[] = ['clients' => (int) $pr['clients'], 'montant' => $montants];
    }
    $programme = [
        'taux' => max(0, min(60, (float) ($e['taux'] ?? 25))),
        'dureeMois' => max(1, min(36, (int) ($e['dureeMois'] ?? 12))),
        'moisValidation' => max(1, min(12, (int) ($e['moisValidation'] ?? 6))),
        'primes' => $primes,
        'bonusHebdo' => ['clients' => max(1, min(50, (int) ($e['bonusHebdo']['clients'] ?? 5))), 'montant' => array_filter(
            array_map(fn ($m) => is_numeric($m) && $m >= 0 ? (float) $m : null, array_slice((array) ($e['bonusHebdo']['montant'] ?? []), 0, 8)), fn ($m) => $m !== null)],
    ];
    enregistrerReglageAmorac('programme', $programme);
    journaliser(null, $admin['id'], 'amorac-programme', ['par' => $admin['email']]);
    repondre(['ok' => true, 'programme' => $programme]);
}

// ---------- Espace commercial (/commercial/) ----------

function commercialConnecte(): array
{
    $jeton = jetonRecu();
    if (!$jeton) throw new ErreurApi('Connexion nécessaire', 401);
    $c = requete('SELECT j.expire_le, c.* FROM jetons_commerciaux j JOIN commerciaux c ON c.id = j.commercial_id WHERE j.jeton_hash = ?', [hash('sha256', $jeton)])->fetch();
    if (!$c || $c['expire_le'] < maintenant()) throw new ErreurApi('Session expirée : reconnectez-vous', 401);
    if (!$c['actif']) throw new ErreurApi('Compte commercial désactivé', 403);
    requete('UPDATE commerciaux SET vu_le = ? WHERE id = ?', [maintenant(), $c['id']]);
    return $c;
}

// ---------- Inscription d'un commercial par lui-même (validée ensuite par l'équipe Amorac) ----------
// { nom, telephone, pays, email?, pin, conditionsAcceptees: true }
function routeCommercialInscription(): never
{
    $e = entree();
    $cleIp = 'ip-inscription-commercial:' . adresseIp();
    verifierBlocage($cleIp);
    if (($e['conditionsAcceptees'] ?? false) !== true) throw new ErreurApi('Merci d’accepter les conditions du programme commercial');
    $nom = texte($e, 'nom', 'votre nom', true, 80);
    $pays = strtoupper((string) ($e['pays'] ?? ''));
    if (!isset(PAYS[$pays])) throw new ErreurApi('Choisissez votre pays');
    $num = telephoneValide(texte($e, 'telephone', 'votre téléphone', true, 40), $pays, 'votre téléphone');
    if (requete('SELECT 1 FROM commerciaux WHERE cle_telephone = ?', [$num['cle']])->fetch()) {
        noterEchec($cleIp, 10);
        throw new ErreurApi('Ce numéro a déjà un compte commercial : connectez-vous, ou attendez la validation de l’équipe.', 409);
    }
    $ville = texte($e, 'ville', 'votre ville', true, 80);
    $quartier = texte($e, 'quartier', 'votre quartier', true, 80);
    $email = trim((string) ($e['email'] ?? ''));
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) throw new ErreurApi('Adresse e-mail invalide');
    $pin = (string) ($e['pin'] ?? '');
    if (!preg_match('/^\d{6}$/', $pin)) throw new ErreurApi('Code PIN : 6 chiffres');
    // Au plus quelques demandes par heure et par adresse IP (une demande réussie compte aussi)
    if (noterEchec($cleIp, 6)) throw new ErreurApi('Trop de demandes : réessayez plus tard.', 429);
    $id = nouvelId('co');
    $code = genererCodeParrain($nom);
    requete('INSERT INTO commerciaux (id, nom, telephone, cle_telephone, email, pays, ville, quartier, code, pin_hash, taux, actif, notes, cree_le, valide_le) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, NULL)',
        [$id, $nom, $num['affichage'], $num['cle'], $email, $pays, $ville, $quartier, $code, password_hash($pin, PASSWORD_DEFAULT), (float) programme()['taux'], 'Inscription faite par le commercial lui-même', maintenant()]);
    journaliser(null, null, 'commercial-inscription', ['commercial' => $nom, 'code' => $code]);
    envoyerEmail(
        lireFichierEnvCle('EmailEquipe') ?? 'contact@kaislo.com',
        'Kaislo — nouveau commercial à valider : ' . $nom,
        "Un commercial vient de s'inscrire.\n\nNom : $nom\nTéléphone : " . $num['affichage'] . "\nPays : $pays\n" . ($email !== '' ? "E-mail : $email\n" : '') . "\nÀ valider dans l'espace Amorac → Commerciaux : https://" . (domaineSite() ?: 'kaislo.com') . "/admin/"
    );
    repondre(['ok' => true, 'enAttente' => true, 'code' => $code], 201);
}

// POST /api/admin/commercial-validation { id, action: valider | refuser }
function routeAdminCommercialValidation(): never
{
    $admin = adminConnecte(true);
    $e = entree();
    $c = requete('SELECT * FROM commerciaux WHERE id = ?', [(string) ($e['id'] ?? '')])->fetch();
    if (!$c) throw new ErreurApi('Commercial introuvable', 404);
    $action = (string) ($e['action'] ?? '');
    if ($action === 'valider') {
        requete('UPDATE commerciaux SET actif = 1, valide_le = ? WHERE id = ?', [maintenant(), $c['id']]);
        if (!empty($c['email'])) {
            envoyerEmail($c['email'], 'Kaislo — votre compte commercial est validé',
                "Bonjour {$c['nom']},\n\nVotre compte commercial Kaislo est validé.\nVotre code parrain : {$c['code']}\nVotre espace : https://" . (domaineSite() ?: 'kaislo.com') . "/commercial/ (numéro de téléphone et code PIN choisi à l'inscription).\n\nL'équipe Kaislo");
        }
    } elseif ($action === 'refuser') {
        if (!empty($c['valide_le'])) throw new ErreurApi('Ce commercial est déjà validé : désactivez-le plutôt');
        requete('DELETE FROM commerciaux WHERE id = ?', [$c['id']]);
        requete('DELETE FROM jetons_commerciaux WHERE commercial_id = ?', [$c['id']]);
    } else {
        throw new ErreurApi('Action inconnue');
    }
    journaliser(null, $admin['id'], 'amorac-commercial-' . $action, ['commercial' => $c['nom'], 'par' => $admin['email']]);
    repondre(['ok' => true]);
}

function routeCommercialConnexion(): never
{
    $e = entree();
    $cleIp = 'ip-commercial:' . adresseIp();
    verifierBlocage($cleIp);
    $n = normaliserTelephone((string) ($e['telephone'] ?? ''), strtoupper((string) ($e['pays'] ?? 'MA')));
    $cle = 'commercial:' . ($n['ok'] ? $n['cle'] : 'x');
    verifierBlocage($cle);
    $c = $n['ok'] ? requete('SELECT * FROM commerciaux WHERE cle_telephone = ?', [$n['cle']])->fetch() : null;
    $valide = password_verify((string) ($e['pin'] ?? ''), $c ? $c['pin_hash'] : password_hash('leurre', PASSWORD_DEFAULT));
    // Mot de passe juste mais inscription pas encore validée par l'équipe : message clair (seule la personne concernée le voit)
    if ($c && $valide && !$c['actif'] && empty($c['valide_le'])) {
        throw new ErreurApi('Votre inscription est en cours de validation par l’équipe Kaislo. Nous vous prévenons dès qu’elle est validée.', 403);
    }
    if (!$c || !$valide || !$c['actif']) {
        $bloque = noterEchec($cle);
        $bloque = noterEchec($cleIp, 20) || $bloque;
        throw new ErreurApi($bloque ? 'Trop d’essais : réessayez dans ' . MINUTES_BLOCAGE . ' minutes.' : 'Numéro ou code PIN incorrect', $bloque ? 429 : 401);
    }
    effacerEchecs($cle);
    $jeton = bin2hex(random_bytes(32));
    requete('INSERT INTO jetons_commerciaux (jeton_hash, commercial_id, cree_le, expire_le) VALUES (?, ?, ?, ?)', [hash('sha256', $jeton), $c['id'], maintenant(), maintenant(DUREE_SESSION_COMMERCIAL)]);
    requete('DELETE FROM jetons_commerciaux WHERE expire_le < ?', [maintenant()]);
    repondre(['ok' => true, 'jeton' => $jeton]);
}

function routeCommercialMoi(): never
{
    $c = commercialConnecte();
    $infos = versCommercial($c);
    unset($infos['notes']); // notes internes de l'équipe
    repondre(['ok' => true, 'commercial' => $infos, 'clients' => clientsCommercial($c['id'], false), 'primes' => primesCommercial($c['id']), 'bonusHebdo' => bonusHebdoCommercial($c), 'contrat' => contratCommercial($c), 'programme' => programme() + ['remiseParrain' => (float) reglesTarifs()['remiseParrain']]]);
}

// POST /api/admin/commercial-contrat { id } : le contrat devient disponible dans l'espace du commercial (compte validé uniquement).
// Les règles du programme sont figées à cet instant. Plus de changement possible une fois le contrat accepté.
function routeAdminCommercialContrat(): never
{
    $admin = adminConnecte(true);
    $e = entree();
    $c = requete('SELECT * FROM commerciaux WHERE id = ?', [(string) ($e['id'] ?? '')])->fetch();
    if (!$c) throw new ErreurApi('Commercial introuvable', 404);
    if (empty($c['valide_le']) || !$c['actif']) throw new ErreurApi('Le compte doit d’abord être validé et actif');
    if (!empty($c['contrat_accepte_le'])) throw new ErreurApi('Le contrat a déjà été accepté par le commercial');
    $p = programme();
    $conditions = [
        'taux' => (float) $c['taux'], 'dureeMois' => (int) $p['dureeMois'], 'moisValidation' => (int) $p['moisValidation'],
        'bonusHebdo' => $p['bonusHebdo'], 'primes' => $p['primes'],
    ];
    $numero = $c['contrat_numero'] ?: ('KC-' . gmdate('Y') . '-' . sprintf('%04d', 1 + (int) requete('SELECT COUNT(*) AS n FROM commerciaux WHERE contrat_numero IS NOT NULL')->fetch()['n']));
    requete('UPDATE commerciaux SET contrat_numero = ?, contrat_envoye_le = ?, contrat_conditions = ? WHERE id = ?', [$numero, maintenant(), json_encode($conditions, JSON_UNESCAPED_UNICODE), $c['id']]);
    journaliser(null, $admin['id'], 'amorac-contrat-envoye', ['commercial' => $c['nom'], 'numero' => $numero, 'par' => $admin['email']]);
    $c = requete('SELECT * FROM commerciaux WHERE id = ?', [$c['id']])->fetch();
    if (!empty($c['email'])) {
        envoyerEmail($c['email'], 'Kaislo — votre contrat de commercial', "Bonjour {$c['nom']},\n\nVotre contrat de commercial Kaislo ($numero) est disponible dans votre espace : https://" . (domaineSite() ?: 'kaislo.com') . "/commercial/\nOuvrez-le, lisez-le, puis appuyez sur « J'ai lu et j'accepte ».\n\nL'équipe Kaislo");
    }
    repondre(['ok' => true, 'contrat' => contratCommercial($c)]);
}

// POST /api/commercial/contrat-accepter : « lu et approuvé » (la date est enregistrée)
function routeCommercialContratAccepter(): never
{
    $c = commercialConnecte();
    if (empty($c['contrat_envoye_le'])) throw new ErreurApi('Aucun contrat à accepter pour le moment', 400);
    if (empty($c['contrat_accepte_le'])) {
        requete('UPDATE commerciaux SET contrat_accepte_le = ? WHERE id = ?', [maintenant(), $c['id']]);
        journaliser(null, null, 'commercial-contrat-accepte', ['commercial' => $c['nom'], 'numero' => $c['contrat_numero']]);
    }
    $c = requete('SELECT * FROM commerciaux WHERE id = ?', [$c['id']])->fetch();
    repondre(['ok' => true, 'contrat' => contratCommercial($c)]);
}

function routeCommercialPin(): never
{
    $c = commercialConnecte();
    $e = entree();
    if (!password_verify((string) ($e['ancien'] ?? ''), $c['pin_hash'])) throw new ErreurApi('Ancien code PIN incorrect', 401);
    $nouveau = (string) ($e['nouveau'] ?? '');
    if (!preg_match('/^\d{6}$/', $nouveau)) throw new ErreurApi('Le nouveau code PIN doit contenir 6 chiffres');
    requete('UPDATE commerciaux SET pin_hash = ? WHERE id = ?', [password_hash($nouveau, PASSWORD_DEFAULT), $c['id']]);
    repondre(['ok' => true]);
}

function routeCommercialDeconnexion(): never
{
    $jeton = jetonRecu();
    if ($jeton) requete('DELETE FROM jetons_commerciaux WHERE jeton_hash = ?', [hash('sha256', $jeton)]);
    repondre(['ok' => true]);
}
