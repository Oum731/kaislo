<?php
// ------------------------------------------------------------
// PAIEMENT PAR VIREMENT BANCAIRE de l'abonnement.
//
//   L'équipe Amorac enregistre ses comptes bancaires (un par devise : EUR, MAD…) dans l'espace Amorac → Tarifs.
//   Le gérant les voit dans l'application (Compte → Abonnement → Payer par virement) avec :
//     · le montant à virer dans la devise du compte (prix de la grille, avec ses remises : parrain, fondateur…) ;
//     · une référence à indiquer dans le motif du virement (KAISLO-code du commerce), pour que l'équipe retrouve le paiement ;
//     · un bouton « J'ai fait le virement » qui prévient l'équipe par la messagerie.
//   L'équipe enregistre ensuite le paiement dans l'espace Amorac (moyen « Virement »), comme pour les autres moyens.
//
//   GET  /api/paiement-virement   comptes et montants pour le commerce du gérant connecté
//   GET  /api/admin/virement      comptes enregistrés (équipe Amorac)
//   POST /api/admin/virement      { comptes: [{ devise, beneficiaire, banque, iban, bic?, note? }] } (administrateur)
// ------------------------------------------------------------

const DEVISES_VIREMENT = ['EUR', 'MAD', 'USD', 'CAD', 'FCFA', 'GNF'];
const COMPTES_VIREMENT_MAX = 6;

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
    repondre(['ok' => true, 'reference' => referenceVirement($c), 'comptes' => $comptes]);
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
