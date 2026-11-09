<?php
// ------------------------------------------------------------
// PAIEMENT PAR VIREMENT BANCAIRE de l'abonnement.
//
//   L'équipe Kaislo enregistre ses comptes bancaires (un par devise : EUR, MAD…) dans l'espace Kaislo → Tarifs.
//   Le gérant les voit dans l'application (Compte → Abonnement → Payer par virement) avec :
//     · le montant à virer dans la devise du compte (prix de la grille, avec ses remises : parrain, fondateur…) ;
//     · une référence à indiquer dans le motif du virement (KAISLO-code du commerce), pour que l'équipe retrouve le paiement ;
//     · un bouton « J'ai fait le virement » qui prévient l'équipe par la messagerie.
//   L'équipe enregistre ensuite le paiement dans l'espace Kaislo (moyen « Virement »), comme pour les autres moyens.
//
//   Paiement mobile (Orange Money, Wave, MTN MoMo…) : l'équipe enregistre ses numéros dans l'espace Kaislo → Tarifs ; le gérant d'un commerce
//   dans la même devise voit le numéro, le montant en sa devise et la même référence KAISLO-code (qu'il indique à l'équipe avec « J'ai payé »).
//   Chaque moyen est montré aux commerces des PAYS cochés (Wave et Orange Money de Côte d'Ivoire : Côte d'Ivoire ; MTN MoMo et Airtel Money : Congo…).
//   Un commerce d'un autre pays ne voit que le virement bancaire. Un moyen a un numéro, un code QR à scanner (image dans public/paiement/) et/ou un lien :
//   un lien de paiement Wave (https://pay.wave.com/…) reçoit le montant de la formule du commerce (1 mois, 12 mois) tout seul (?amount=…, ou à la place de {montant}).
//
//   GET  /api/paiement-virement   comptes, numéros mobiles et montants pour le commerce du gérant connecté
//   GET  /api/admin/paiements-mobiles   numéros enregistrés (équipe Kaislo)
//   POST /api/admin/paiements-mobiles   { moyens: [{ operateur, pays: ['CI'], numero?, qr?, lien?, titulaire?, note? }] } (administrateur) : un numéro, un code QR ou un lien au moins
//   GET  /api/admin/virement      comptes enregistrés (équipe Kaislo)
//   POST /api/admin/virement      { comptes: [{ devise, beneficiaire, banque, iban, bic?, note? }] } (administrateur)
// ------------------------------------------------------------

const DEVISES_VIREMENT = ['EUR', 'MAD', 'USD', 'CAD', 'FCFA', 'GNF'];
const COMPTES_VIREMENT_MAX = 6;
const OPERATEURS_MOBILES = ['Orange Money', 'Wave', 'MTN MoMo', 'Moov Money', 'Airtel Money', 'M-Pesa'];
const MOYENS_MOBILES_MAX = 8;
// Numéro proposé tant que l'équipe n'a rien enregistré (modifiable dans l'espace Kaislo → Tarifs)
const MOYENS_MOBILES_DEFAUT = [
    ['operateur' => 'Orange Money', 'pays' => ['CI'], 'numero' => '+2250779872585', 'qr' => 'orange-money.png', 'lien' => '', 'titulaire' => '', 'note' => ''],
    ['operateur' => 'Wave', 'pays' => ['CI'], 'numero' => '', 'qr' => 'wave.png', 'lien' => 'https://pay.wave.com/m/M_ci_9JyOKoTX4xvQ/c/ci/', 'titulaire' => 'Traoreservice', 'note' => ''],
    ['operateur' => 'MTN MoMo', 'pays' => ['CI'], 'numero' => '+2250507131267', 'qr' => 'mtn-momo.png', 'lien' => '', 'titulaire' => '', 'note' => ''], // code « MoMo Pay » (2250507131267@momopay)
];
/** Nom d'une image de code QR rangée dans public/paiement/ (pas de chemin : seulement un nom de fichier). */
function qrValide(string $nom): bool
{
    return (bool) preg_match('/^[a-z0-9][a-z0-9-]{0,40}\.(png|jpe?g|webp)$/', $nom);
}
const HOTES_LIENS_PAIEMENT = ['pay.wave.com']; // liens de paiement acceptés (évite qu'un lien trompeur soit proposé aux gérants)

/** Un lien de paiement valide (https, hôte autorisé), ou null. */
function lienPaiementValide(string $lien): ?string
{
    $lien = trim($lien);
    $p = parse_url($lien);
    if (!$p || ($p['scheme'] ?? '') !== 'https' || !in_array(strtolower((string) ($p['host'] ?? '')), HOTES_LIENS_PAIEMENT, true) || isset($p['user']) || isset($p['port']) || strlen($lien) > 300) return null;
    return $lien;
}

/** Le lien avec le montant : à la place de {montant} s'il y en a un, sinon en paramètre amount. */
function lienAvecMontant(string $lien, float $montant): string
{
    $m = (string) (int) round($montant);
    if (str_contains($lien, '{montant}')) return str_replace('{montant}', $m, $lien);
    return $lien . (str_contains($lien, '?') ? '&' : '?') . 'amount=' . $m;
}

function moyensMobiles(): array
{
    $r = reglageAmorac('paiements_mobiles', ['moyens' => MOYENS_MOBILES_DEFAUT]);
    return is_array($r['moyens'] ?? null) ? array_values($r['moyens']) : [];
}

function comptesVirement(): array
{
    $r = reglageAmorac('virement', ['comptes' => []]);
    return is_array($r['comptes'] ?? null) ? array_values($r['comptes']) : [];
}

function referenceVirement(array $commerce): string
{
    return 'KAISLO-' . $commerce['code'];
}

// GET /api/paiement-virement
function routePaiementVirement(): never
{
    $u = utilisateurConnecte();
    if ($u['role'] !== 'gerant') throw new ErreurApi('Réservé au gérant', 403);
    $c = requete('SELECT * FROM commerces WHERE id = ?', [$u['commerce_id']])->fetch();
    $comptes = [];
    foreach (comptesVirement() as $compte) {
        $t = tarifCommerce($c, $compte['devise']);
        if ($t['parMois'] <= 0) continue; // la formule n'a pas de prix dans cette devise
        $comptes[] = $compte + ['parMois' => $t['parMois'], 'annuel' => $t['annuel']];
    }
    // Numéros de paiement mobile des devises du commerce, avec le prix dans sa devise
    $mobiles = [];
    foreach (moyensMobiles() as $m) {
        // Un commerce ne voit que les moyens de son pays (anciens réglages : sa devise)
        $pays = (array) ($m['pays'] ?? []);
        if ($pays ? !in_array($c['pays'], $pays, true) : !in_array($c['devise'], (array) ($m['devises'] ?? []), true)) continue;
        $t = tarifCommerce($c, $c['devise']);
        if ($t['parMois'] <= 0) continue;
        $lien = lienPaiementValide((string) ($m['lien'] ?? ''));
        $m['liens'] = $lien ? [['mois' => 1, 'montant' => $t['parMois'], 'url' => lienAvecMontant($lien, (float) $t['parMois'])], ['mois' => 12, 'montant' => $t['annuel'], 'url' => lienAvecMontant($lien, (float) $t['annuel'])]] : [];
        unset($m['lien']);
        $m['qr'] = !empty($m['qr']) && qrValide((string) $m['qr']) ? '/paiement/' . $m['qr'] : '';
        $mobiles[] = $m + ['devise' => $c['devise'], 'parMois' => $t['parMois'], 'annuel' => $t['annuel']];
    }
    repondre(['ok' => true, 'reference' => referenceVirement($c), 'comptes' => $comptes, 'mobiles' => $mobiles]);
}

function routeAdminMoyensMobilesLire(): never
{
    adminConnecte();
    repondre(['ok' => true, 'moyens' => moyensMobiles(), 'operateurs' => OPERATEURS_MOBILES]);
}

function routeAdminMoyensMobilesEnregistrer(): never
{
    $admin = adminConnecte(true);
    $liste = is_array(entree()['moyens'] ?? null) ? array_values(entree()['moyens']) : [];
    if (count($liste) > MOYENS_MOBILES_MAX) throw new ErreurApi('Huit numéros au plus');
    $moyens = [];
    foreach ($liste as $m) {
        $operateur = (string) ($m['operateur'] ?? '');
        if (!in_array($operateur, OPERATEURS_MOBILES, true)) throw new ErreurApi('Opérateur inconnu');
        $numero = preg_replace('/[^\d+]/', '', (string) ($m['numero'] ?? ''));
        $lien = trim((string) ($m['lien'] ?? ''));
        if ($lien !== '' && !lienPaiementValide($lien)) throw new ErreurApi('Lien de paiement invalide : il doit commencer par https://pay.wave.com/');
        $qr = trim((string) ($m['qr'] ?? ''));
        if ($qr !== '' && !qrValide($qr)) throw new ErreurApi('Nom du code QR invalide : un nom de fichier comme wave.png (image rangée dans public/paiement/)');
        if ($numero === '' && $lien === '' && $qr === '') throw new ErreurApi('Indiquez un numéro, un code QR ou un lien de paiement');
        if ($numero !== '' && !preg_match('/^\+?\d{8,15}$/', $numero)) throw new ErreurApi('Numéro invalide (8 à 15 chiffres, avec l’indicatif du pays)');
        $idsPays = array_column(LISTE_PAYS, 'id');
        $pays = array_values(array_unique(array_filter((array) ($m['pays'] ?? []), fn ($p) => in_array($p, $idsPays, true))));
        if (!$pays) throw new ErreurApi('Choisissez au moins un pays : les commerces des autres pays ne verront pas ce moyen (ils ne verront que le virement)');
        $moyens[] = ['operateur' => $operateur, 'pays' => $pays, 'numero' => $numero, 'qr' => $qr, 'lien' => $lien, 'titulaire' => texte($m, 'titulaire', 'le nom du titulaire', false, 80), 'note' => texte($m, 'note', 'la note', false, 200)];
    }
    enregistrerReglageAmorac('paiements_mobiles', ['moyens' => $moyens]);
    journaliser(null, null, 'amorac-paiements-mobiles', ['numeros' => count($moyens), 'par' => $admin['email']]);
    repondre(['ok' => true, 'moyens' => $moyens]);
}

function routeAdminVirementLire(): never
{
    adminConnecte();
    repondre(['ok' => true, 'comptes' => comptesVirement()]);
}

function routeAdminVirementEnregistrer(): never
{
    $admin = adminConnecte(true);
    $e = entree();
    $liste = is_array($e['comptes'] ?? null) ? array_values($e['comptes']) : [];
    if (count($liste) > COMPTES_VIREMENT_MAX) throw new ErreurApi('Six comptes au plus');
    $comptes = [];
    foreach ($liste as $c) {
        $devise = (string) ($c['devise'] ?? '');
        if (!in_array($devise, DEVISES_VIREMENT, true)) throw new ErreurApi('Devise du compte inconnue');
        $iban = strtoupper(preg_replace('/\s+/', '', (string) ($c['iban'] ?? '')));
        if (!preg_match('/^[A-Z0-9]{8,34}$/', $iban)) throw new ErreurApi('IBAN ou RIB invalide (8 à 34 lettres et chiffres, sans caractères spéciaux)');
        $bic = strtoupper(preg_replace('/\s+/', '', (string) ($c['bic'] ?? '')));
        if ($bic !== '' && !preg_match('/^[A-Z0-9]{8}([A-Z0-9]{3})?$/', $bic)) throw new ErreurApi('Code BIC invalide (8 ou 11 caractères)');
        $comptes[] = [
            'devise' => $devise, 'beneficiaire' => texte($c, 'beneficiaire', 'le nom du bénéficiaire', true, 80),
            'banque' => texte($c, 'banque', 'la banque', false, 80), 'iban' => $iban, 'bic' => $bic, 'note' => texte($c, 'note', 'la note', false, 200),
        ];
    }
    enregistrerReglageAmorac('virement', ['comptes' => $comptes]);
    journaliser(null, null, 'amorac-virement', ['comptes' => count($comptes), 'par' => $admin['email']]);
    repondre(['ok' => true, 'comptes' => $comptes]);
}
