<?php
// ------------------------------------------------------------
// PAIEMENT EN LIGNE (lot L4) : le client paie sa commande chez un prestataire de paiement agréé ; Kaislo ne touche jamais l'argent.
// Le prestataire encaisse, garde sa commission et reverse au commerçant ; Kaislo retient sa propre commission (PaiementCommission, en %)
// dans le contrat avec le prestataire, et ne fait ici que la tenir à jour dans ses comptes.
//
// Activer : « LivraisonOptions=paiement », « PaiementEnLigne=<prestataire> » et « PaiementSecret=<12 caractères ou plus> » dans le .env.
// Prestataires : « essai » (simulation, pour tester le parcours sans argent réel). Brancher un vrai prestataire (CMI, Payzone, Pay10…) =
// ajouter une classe qui implémente InterfacePasserelle ci-dessous, et son nom dans passerelle(). Aucune clé de prestataire dans le code.
//
//   POST /api/paiement/notification        { ref, statut: paye|echoue, signature }  appelé par le prestataire (signature HMAC-SHA256 de « ref|statut »)
//   POST /api/public/commande-suivi/payer  { cle }  nouveau lien de paiement pour une commande à payer
//   POST /api/commandes-en-ligne/rembourser { id }  le commerçant rembourse une commande payée en ligne et annulée
//   GET  /api/paiements-en-ligne                    les paiements en ligne du commerçant et ce qui lui est reversé
//   GET  /api/public/paiement-essai?ref=…           page de simulation (prestataire « essai » seulement)
// ------------------------------------------------------------

const STATUTS_PAIEMENT = ['a_payer', 'paye', 'echoue', 'a_rembourser', 'rembourse'];

interface InterfacePasserelle
{
    /** Crée la demande de paiement chez le prestataire : [référence, adresse de la page de paiement]. */
    public function creerSession(array $commande, string $retour): array;

    /** Vérifie que la notification vient bien du prestataire. */
    public function signatureValide(string $ref, string $statut, string $signature): bool;

    /** Rembourse un paiement : vrai si le prestataire l'a fait. */
    public function rembourser(string $ref, float $montant): bool;
}

/** Prestataire de simulation : un faux paiement en deux boutons, signé comme le ferait un vrai prestataire. */
final class PasserelleEssai implements InterfacePasserelle
{
    public static function signer(string $ref, string $statut): string
    {
        return hash_hmac('sha256', $ref . '|' . $statut, (string) lireFichierEnvCle('PaiementSecret'));
    }

    public function creerSession(array $commande, string $retour): array
    {
        $ref = 'ess_' . bin2hex(random_bytes(8));
        return [$ref, 'https://' . (domaineSite() ?: 'kaislo.com') . '/api/public/paiement-essai?ref=' . $ref . '&retour=' . rawurlencode($retour)];
    }

    public function signatureValide(string $ref, string $statut, string $signature): bool
    {
        return hash_equals(self::signer($ref, $statut), $signature);
    }

    public function rembourser(string $ref, float $montant): bool
    {
        return str_starts_with($ref, 'ess_');
    }
}

function passerelle(): ?InterfacePasserelle
{
    if (!optionLivraison('paiement') || strlen((string) (lireFichierEnvCle('PaiementSecret') ?? '')) < 12) return null;
    return match (strtolower(trim((string) (lireFichierEnvCle('PaiementEnLigne') ?? '')))) {
        'essai' => new PasserelleEssai(),
        default => null,
    };
}

function paiementEnLigneActif(): bool
{
    return passerelle() !== null;
}

function commissionPaiement(float $total, string $devise): float
{
    $pourcent = max(0.0, min(30.0, (float) str_replace(',', '.', (string) (lireFichierEnvCle('PaiementCommission') ?? '0'))));
    return arrondirMontant($total * $pourcent / 100, $devise);
}

/** La commande, dans la forme attendue par les messages au commerçant (e-mail, WhatsApp, notification). */
function commandePourMessage(array $l): array
{
    $c = requete('SELECT nom FROM commerces WHERE id = ?', [$l['commerce_id']])->fetch();
    return [
        'numero' => (int) $l['numero'], 'total' => (float) $l['total'], 'devise' => $l['devise'], 'lignes' => json_decode($l['lignes'], true) ?: [],
        'client' => ['nom' => $l['client_nom'], 'telephone' => $l['client_telephone'], 'adresse' => $l['adresse']], 'note' => (string) $l['note'],
        'boutique' => $c['nom'] ?? '', 'gros' => !empty($l['gros']),
    ];
}

/** Crée la session de paiement d'une commande (ou en recrée une) et renvoie son adresse. */
function sessionPaiement(array $l): string
{
    $p = passerelle();
    if (!$p) throw new ErreurApi('Le paiement en ligne n’est pas disponible', 400);
    [$ref, $url] = $p->creerSession(commandePourMessage($l), 'https://' . (domaineSite() ?: 'kaislo.com') . '/');
    requete("UPDATE commandes_en_ligne SET paiement_ref = ?, paiement_statut = 'a_payer', modifie_le = ? WHERE id = ?", [$ref, maintenant(), $l['id']]);
    return $url;
}

/** Un paiement vient d'être confirmé : le commerçant découvre alors la commande (avant, elle n'est pas comptée). */
function paiementConfirme(array $l): void
{
    $commission = commissionPaiement((float) $l['total'], (string) $l['devise']);
    requete("UPDATE commandes_en_ligne SET paiement_statut = 'paye', commission = ?, modifie_le = ? WHERE id = ?", [$commission, maintenant(), $l['id']]);
    journaliser($l['commerce_id'], null, 'paiement-en-ligne', ['numero' => (int) $l['numero'], 'total' => (float) $l['total']]);
    notifierNouvelleCommande($l['commerce_id'], commandePourMessage($l) + ['paye' => true]);
}

// POST /api/paiement/notification : appelé par le prestataire (et par la page de simulation)
function routePaiementNotification(): never
{
    $p = passerelle() ?? throw new ErreurApi('Introuvable', 404);
    $e = entree();
    $ref = (string) ($e['ref'] ?? '');
    $statut = (string) ($e['statut'] ?? '');
    $cleIp = 'paiement-notification:' . adresseIp();
    verifierBlocage($cleIp);
    if (!in_array($statut, ['paye', 'echoue'], true) || !$p->signatureValide($ref, $statut, (string) ($e['signature'] ?? ''))) {
        if (noterEchec($cleIp, 20)) throw new ErreurApi('Trop de demandes', 429);
        throw new ErreurApi('Notification refusée', 403);
    }
    $l = requete('SELECT * FROM commandes_en_ligne WHERE paiement_ref = ?', [$ref])->fetch();
    if (!$l) throw new ErreurApi('Paiement inconnu', 404);
    // Idempotent : un paiement déjà confirmé le reste, une notification répétée ne change rien
    if ($l['paiement_statut'] === 'a_payer' || ($l['paiement_statut'] === 'echoue' && $statut === 'paye')) {
        if ($statut === 'paye') paiementConfirme($l);
        else requete("UPDATE commandes_en_ligne SET paiement_statut = 'echoue', modifie_le = ? WHERE id = ?", [maintenant(), $l['id']]);
    }
    repondre(['ok' => true]);
}

// POST /api/public/commande-suivi/payer { cle } : le client reprend le paiement (échec, page fermée)
function routeSuiviPayer(): never
{
    exigerOptionLivraison('paiement');
    $e = entree();
    $cleIp = 'suivi-payer:' . adresseIp();
    verifierBlocage($cleIp);
    $cle = (string) ($e['cle'] ?? '');
    $l = preg_match('/^[a-f0-9]{20}$/', $cle) ? requete('SELECT * FROM commandes_en_ligne WHERE suivi_cle = ?', [$cle])->fetch() : false;
    if (!$l) { noterEchec($cleIp, 60); throw new ErreurApi('Commande introuvable', 404); }
    if ($l['paiement'] !== 'en_ligne' || !in_array($l['paiement_statut'], ['a_payer', 'echoue'], true) || $l['statut'] === 'annulee') throw new ErreurApi('Cette commande n’est pas à payer', 400);
    repondre(['ok' => true, 'url' => sessionPaiement($l)]);
}

// POST /api/commandes-en-ligne/rembourser { id } : remboursement d'une commande payée en ligne puis annulée
function routeCommandeRembourser(): never
{
    exigerOptionLivraison('paiement');
    $u = utilisateurConnecte();
    if ($u['role'] !== 'gerant') throw new ErreurApi('Réservé au gérant', 403);
    $e = entree();
    $l = requete('SELECT * FROM commandes_en_ligne WHERE id = ? AND commerce_id = ?', [(string) ($e['id'] ?? ''), $u['commerce_id']])->fetch();
    if (!$l) throw new ErreurApi('Commande introuvable', 404);
    if (!in_array($l['paiement_statut'], ['paye', 'a_rembourser'], true)) throw new ErreurApi('Cette commande n’a pas été payée en ligne');
    if ($l['statut'] !== 'annulee') throw new ErreurApi('Annulez d’abord la commande, puis remboursez-la');
    $p = passerelle() ?? throw new ErreurApi('Le paiement en ligne n’est pas disponible', 400);
    if (!$p->rembourser((string) $l['paiement_ref'], (float) $l['total'])) throw new ErreurApi('Le prestataire n’a pas pu rembourser : réessayez plus tard', 502);
    requete("UPDATE commandes_en_ligne SET paiement_statut = 'rembourse', modifie_le = ? WHERE id = ?", [maintenant(), $l['id']]);
    journaliser($u['commerce_id'], $u['id'], 'paiement-rembourse', ['numero' => (int) $l['numero']]);
    repondre(['ok' => true, 'commande' => versCommandeLigne(requete('SELECT * FROM commandes_en_ligne WHERE id = ?', [$l['id']])->fetch())]);
}

// GET /api/paiements-en-ligne : ce que le commerçant a reçu par ce moyen, et ce qui lui sera reversé
function routePaiementsEnLigne(): never
{
    exigerOptionLivraison('paiement');
    $u = utilisateurConnecte();
    if ($u['role'] !== 'gerant') throw new ErreurApi('Réservé au gérant', 403);
    $lignes = requete("SELECT * FROM commandes_en_ligne WHERE commerce_id = ? AND paiement = 'en_ligne' AND paiement_statut IN ('paye', 'a_rembourser', 'rembourse') ORDER BY cree_le DESC LIMIT 100", [$u['commerce_id']])->fetchAll();
    $devise = requete('SELECT devise FROM commerces WHERE id = ?', [$u['commerce_id']])->fetch()['devise'] ?? '';
    $aReverser = 0.0;
    $paiements = array_map(function ($l) use (&$aReverser) {
        $net = (float) $l['total'] - (float) ($l['commission'] ?? 0);
        if ($l['paiement_statut'] === 'paye') $aReverser += $net;
        return ['numero' => (int) $l['numero'], 'client' => $l['client_nom'], 'total' => (float) $l['total'], 'commission' => (float) ($l['commission'] ?? 0), 'net' => $net, 'statut' => $l['paiement_statut'], 'le' => $l['modifie_le']];
    }, $lignes);
    repondre(['ok' => true, 'devise' => $devise, 'paiements' => $paiements, 'aReverser' => $aReverser]);
}

// GET /api/public/paiement-essai?ref=… : fausse page de paiement (prestataire « essai » seulement) ; deux boutons qui envoient la notification signée
function routePaiementEssai(): never
{
    if (!(passerelle() instanceof PasserelleEssai)) throw new ErreurApi('Introuvable', 404);
    $ref = (string) ($_GET['ref'] ?? '');
    $l = preg_match('/^ess_[a-f0-9]{16}$/', $ref) ? requete('SELECT numero, total, devise FROM commandes_en_ligne WHERE paiement_ref = ?', [$ref])->fetch() : false;
    if (!$l) throw new ErreurApi('Paiement introuvable', 404);
    $retour = (string) ($_GET['retour'] ?? '/');
    if (!preg_match('#^https://[a-z0-9.-]+/[^\s"<>]*$#i', $retour)) $retour = '/';
    $js = json_encode(['ref' => $ref, 'retour' => $retour, 'paye' => PasserelleEssai::signer($ref, 'paye'), 'echoue' => PasserelleEssai::signer($ref, 'echoue')]);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');
    $montant = htmlspecialchars(number_format((float) $l['total'], 2, ',', ' ') . ' ' . $l['devise']);
    echo '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Paiement de test</title>'
        . '<body style="font-family:system-ui,sans-serif;max-width:420px;margin:40px auto;padding:0 16px;color:#14211c"><h1>Paiement de test</h1>'
        . '<p><b>Simulation :</b> aucun argent n’est prélevé. Commande n° ' . (int) $l['numero'] . ' · ' . $montant . '</p>'
        . '<button id="p" style="width:100%;padding:14px;font-size:16px;background:#1e5b43;color:#fff;border:0;border-radius:8px;margin:8px 0">Payer (simulation)</button>'
        . '<button id="e" style="width:100%;padding:14px;font-size:16px;background:#fff;color:#b4412f;border:1px solid #b4412f;border-radius:8px">Faire échouer le paiement</button><p id="m"></p>'
        . '<script>const c=' . $js . ';async function f(s){const r=await fetch("/api/paiement/notification",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ref:c.ref,statut:s,signature:c[s]})});'
        . 'if(r.ok){document.getElementById("m").textContent="Merci, retour au site…";setTimeout(()=>location.href=c.retour,900)}else document.getElementById("m").textContent="Erreur"}'
        . 'document.getElementById("p").onclick=()=>f("paye");document.getElementById("e").onclick=()=>f("echoue")</script>';
    exit;
}
