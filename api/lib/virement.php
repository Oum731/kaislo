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
//
//   GET  /api/paiement-virement   comptes, numéros mobiles et montants pour le commerce du gérant connecté
//   GET  /api/admin/paiements-mobiles   numéros enregistrés (équipe Kaislo)
//   POST /api/admin/paiements-mobiles   { moyens: [{ operateur, numero, titulaire?, devises: ['FCFA'], note? }] } (administrateur)
//   GET  /api/admin/virement      comptes enregistrés (équipe Kaislo)
//   POST /api/admin/virement      { comptes: [{ devise, beneficiaire, banque, iban, bic?, note? }] } (administrateur)
// ------------------------------------------------------------

const DEVISES_VIREMENT = ['EUR', 'MAD', 'USD', 'CAD', 'FCFA', 'GNF'];
const COMPTES_VIREMENT_MAX = 6;
const OPERATEURS_MOBILES = ['Orange Money', 'Wave', 'MTN MoMo', 'Moov Money', 'Airtel Money', 'M-Pesa'];
const MOYENS_MOBILES_MAX = 8;
// Numéro proposé tant que l'équipe n'a rien enregistré (modifiable dans l'espace Kaislo → Tarifs)
const MOYENS_MOBILES_DEFAUT = [['operateur' => 'Orange Money', 'numero' => '+2250779872585', 'titulaire' => '', 'devises' => ['FCFA'], 'note' => '']];

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
        if (!in_array($c['devise'], (array) ($m['devises'] ?? []), true)) continue;
        $t = tarifCommerce($c, $c['devise']);
        if ($t['parMois'] <= 0) continue;
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
        if (!preg_match('/^\+?\d{8,15}$/', $numero)) throw new ErreurApi('Numéro invalide (8 à 15 chiffres, avec l’indicatif du pays)');
        $devises = array_values(array_unique(array_filter((array) ($m['devises'] ?? []), fn ($d) => in_array($d, DEVISES_VIREMENT, true))));
        if (!$devises) throw new ErreurApi('Choisissez au moins une devise (celle des commerces qui peuvent payer par ce numéro)');
        $moyens[] = ['operateur' => $operateur, 'numero' => $numero, 'titulaire' => texte($m, 'titulaire', 'le nom du titulaire', false, 80), 'devises' => $devises, 'note' => texte($m, 'note', 'la note', false, 200)];
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
