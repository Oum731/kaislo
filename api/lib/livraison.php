<?php
// ------------------------------------------------------------
// COMMANDE ET LIVRAISON : interrupteur général (chantier préparé, pas encore activé : voir docs/chantier-livraison.md)
//   GET /api/livraison/etat   { ok, actif } : l'application et le site s'y réfèrent avant d'afficher quoi que ce soit de la livraison
// Activer : ajouter « LivraisonActive=oui » dans le fichier .env du serveur (et vider le cache). Désactiver : retirer la ligne.
// Les routes du chantier appellent exigerLivraison() : tant que l'interrupteur est coupé, elles répondent 404 comme si elles n'existaient pas.
// ------------------------------------------------------------

function livraisonActive(): bool
{
    return in_array(strtolower(trim((string) (lireFichierEnvCle('LivraisonActive') ?? ''))), ['oui', '1', 'true'], true);
}

function exigerLivraison(): void
{
    if (!livraisonActive()) throw new ErreurApi('Introuvable', 404);
}

function routeLivraisonEtat(): never
{
    repondre(['ok' => true, 'actif' => livraisonActive()]);
}

// ---------- Notification du client quand le statut de sa commande change (lot L1) ----------
// Le client n'a pas de compte : son appareil s'abonne avec la clé de suivi de sa commande (utilisateur « cl:<clé> »).

function textesStatutClient(string $statut, string $mode, string $langue): ?array
{
    $retrait = $mode === 'retrait';
    $fr = ['confirmee' => 'Votre commande n° {n} est acceptée.', 'prete' => $retrait ? 'Votre commande n° {n} est prête à être retirée.' : 'Votre commande n° {n} est prête : la livraison se prépare.',
        'livree' => $retrait ? 'Votre commande n° {n} est retirée. Merci !' : 'Votre commande n° {n} est livrée. Merci !', 'annulee' => 'Votre commande n° {n} a été annulée par la boutique.'];
    $en = ['confirmee' => 'Your order no. {n} has been accepted.', 'prete' => $retrait ? 'Your order no. {n} is ready to pick up.' : 'Your order no. {n} is ready: delivery is being prepared.',
        'livree' => $retrait ? 'Your order no. {n} has been picked up. Thank you!' : 'Your order no. {n} has been delivered. Thank you!', 'annulee' => 'Your order no. {n} was cancelled by the shop.'];
    $t = ($langue === 'en' ? $en : $fr)[$statut] ?? null;
    return $t === null ? null : [$t];
}

/** Prévient les appareils du client que la commande a changé de statut. Sans abonnement ou sans clé : rien. */
function notifierClientCommande(array $commande, string $statut): void
{
    if (!livraisonActive() || empty($commande['suivi_cle'])) return;
    $abos = requete('SELECT * FROM abonnements_push WHERE utilisateur_id = ?', ['cl:' . $commande['suivi_cle']])->fetchAll();
    if (!$abos) return;
    $boutique = requete('SELECT nom FROM commerces WHERE id = ?', [$commande['commerce_id']])->fetch()['nom'] ?? 'Kaislo';
    foreach (['fr', 'en'] as $langue) {
        $groupe = array_values(array_filter($abos, fn ($a) => ($a['langue'] ?: 'fr') === $langue));
        $t = textesStatutClient($statut, (string) ($commande['mode'] ?: 'livraison'), $langue);
        if ($groupe && $t) diffuserPush($groupe, $commande['commerce_id'], 'commande', $boutique, str_replace('{n}', (string) $commande['numero'], $t[0]), '/');
    }
}

// POST /api/public/commande-suivi/notifier { cle, endpoint, appareil, langue } : le client autorise les notifications pour cette commande
function routeSuiviNotifier(): never
{
    exigerLivraison();
    $e = entree();
    $cle = (string) ($e['cle'] ?? '');
    $cleIp = 'suivi-notifier:' . adresseIp();
    verifierBlocage($cleIp);
    $c = preg_match('/^[a-f0-9]{20}$/', $cle) ? requete('SELECT commerce_id FROM commandes_en_ligne WHERE suivi_cle = ?', [$cle])->fetch() : false;
    if (!$c) { noterEchec($cleIp, 60); throw new ErreurApi('Commande introuvable', 404); }
    $endpoint = (string) ($e['endpoint'] ?? '');
    if (!adressePushAutorisee($endpoint)) throw new ErreurApi('Ce navigateur n’est pas pris en charge pour les notifications');
    $hash = hash('sha256', $endpoint);
    $appareil = mb_substr((string) ($e['appareil'] ?? ''), 0, 200);
    $langue = ($e['langue'] ?? '') === 'en' ? 'en' : 'fr';
    $utilisateur = 'cl:' . $cle;
    $existant = requete('SELECT id FROM abonnements_push WHERE endpoint_hash = ?', [$hash])->fetch();
    if ($existant) {
        requete('UPDATE abonnements_push SET commerce_id = ?, utilisateur_id = ?, appareil = ?, langue = ?, vu_le = ?, echecs = 0 WHERE id = ?', [$c['commerce_id'], $utilisateur, $appareil, $langue, maintenant(), $existant['id']]);
    } else {
        if ((int) requete('SELECT COUNT(*) AS n FROM abonnements_push WHERE utilisateur_id = ?', [$utilisateur])->fetch()['n'] >= 3) throw new ErreurApi('Trop d’appareils pour cette commande', 400);
        requete('INSERT INTO abonnements_push (id, commerce_id, utilisateur_id, endpoint_hash, endpoint, appareil, langue, cree_le, vu_le, echecs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)', [
            nouvelId('ap'), $c['commerce_id'], $utilisateur, $hash, $endpoint, $appareil, $langue, maintenant(), maintenant(),
        ]);
    }
    repondre(['ok' => true]);
}
