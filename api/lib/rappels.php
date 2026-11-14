<?php
// ------------------------------------------------------------
// RAPPELS D'ABONNEMENT (essai, délai pour payer, échéance)
//
// Appelés par le planificateur horaire (GET /api/cron/notifications, voir notifications.php) : chaque commerce reçoit un message avant la fin
// de son essai (7, 3 et 1 jours avant, puis quand il est terminé), avant la fin du délai de l'activation provisoire (2 et 1 jours),
// et avant l'échéance d'un abonnement payé (5 et 1 jours), avec le chemin le plus court pour payer.
// Un seul message par palier et par période (commerces.rappel_abo = « fin|palier »). Aucun rappel : si le commerce est suspendu,
// si le gérant a déjà signalé son paiement (« J'ai payé »), ou si l'abonnement est terminé depuis plus de 14 jours.
// Canaux : ceux du compte (e-mail, notification sur l'appareil). Pas de WhatsApp : il faut des modèles de message approuvés par Meta.
// ------------------------------------------------------------

const PALIERS_RAPPEL = ['essai' => [7, 3, 1, 0], 'provisoire' => [2, 1], 'paye' => [5, 1]];
const RAPPEL_ANCIENNETE_MAX_JOURS = 14;

/** Rappel à envoyer maintenant à ce commerce : ['genre', 'fin', 'palier', 'jours'], ou null. */
function rappelAbonnementDu(array $c, DateTimeImmutable $maintenant): ?array
{
    if (($c['statut'] ?? '') === 'suspendu' || !empty($c['paiement_declare_le'])) return null;
    if (($c['statut'] ?? '') === 'actif') {
        $fin = (string) ($c['periode_fin'] ?? '');
        $genre = !empty($c['periode_provisoire']) ? 'provisoire' : 'paye';
    } else {
        $fin = (string) ($c['essai_fin'] ?? '');
        $genre = 'essai';
    }
    if ($fin === '') return null;
    try { $f = new DateTimeImmutable($fin); } catch (Exception) { return null; }
    $secondes = $f->getTimestamp() - $maintenant->getTimestamp();
    $jours = (int) ceil($secondes / 86400);
    if ($jours < -RAPPEL_ANCIENNETE_MAX_JOURS) return null;
    $jours = max(0, $jours);
    // Plus petit palier atteint (ex : 2 jours restants → palier 3) ; « 0 » = abonnement terminé (essai et période payée seulement)
    $palier = null;
    foreach (PALIERS_RAPPEL[$genre] as $p) if ($jours <= $p && ($palier === null || $p < $palier)) $palier = $p;
    if ($secondes <= 0 && $genre !== 'essai') return null; // délai ou période passés : les fonctions sont déjà limitées (le bandeau de l'application le dit), pas de nouveau rappel
    if ($palier === null) return null;
    if (($c['rappel_abo'] ?? '') === $fin . '|' . $palier) return null;
    return ['genre' => $genre, 'fin' => $fin, 'palier' => $palier, 'jours' => $jours];
}

function composerRappel(array $c, array $r, string $langue, DateTimeImmutable $maintenant): array
{
    $en = $langue === 'en';
    $fuseau = fuseauDuCommerce($c);
    $date = dateTexte((new DateTimeImmutable($r['fin']))->setTimezone($fuseau), $langue);
    $n = $r['jours'];
    $unite = $en ? ($n > 1 ? 'days' : 'day') : ($n > 1 ? 'jours' : 'jour');
    $lien = 'https://' . (domaineSite() ?: 'kaislo.com') . '/app/';
    $nom = (string) $c['nom'];
    $chemin = $en ? 'Open Kaislo, then tap "Activate subscription" (Home) or "Pay now".' : 'Ouvrez Kaislo, puis touchez « Activer l’abonnement » (Accueil) ou « Payer maintenant ».';
    if ($r['genre'] === 'essai' && $r['palier'] === 0) {
        $sujet = $en ? "Your Kaislo trial has ended: $nom" : "Votre essai Kaislo est terminé : $nom";
        $texte = $en ? "Your free trial for $nom ended on $date. Activate your subscription to keep using Kaislo without limits: you get a few days to pay." : "Votre essai gratuit de $nom s’est terminé le $date. Activez votre abonnement pour continuer sans limite : vous avez quelques jours pour payer.";
        $court = $en ? 'Trial ended: activate your subscription' : 'Essai terminé : activez votre abonnement';
    } elseif ($r['genre'] === 'essai') {
        $sujet = $en ? "Your Kaislo trial ends in $n $unite: $nom" : "Votre essai Kaislo se termine dans $n $unite : $nom";
        $texte = $en ? "Your free trial for $nom ends on $date. To keep going without interruption, activate your subscription before then." : "Votre essai gratuit de $nom se termine le $date. Pour continuer sans interruption, activez votre abonnement avant cette date.";
        $court = $en ? "Trial ends in $n $unite" : "Essai : encore $n $unite";
    } elseif ($r['genre'] === 'provisoire') {
        $sujet = $en ? "Pay before $date to keep everything: $nom" : "Payez avant le $date pour tout garder : $nom";
        $texte = $en ? "Your subscription for $nom is activated until $date. Without payment by then, reports, exports, new items and sellers, and online orders are suspended (the till keeps working)." : "Votre abonnement de $nom est activé jusqu’au $date. Sans paiement d’ici là, les rapports, les exports, les nouveaux articles et vendeurs et les commandes en ligne sont suspendus (la caisse reste utilisable).";
        $court = $en ? "Pay within $n $unite" : "À payer sous $n $unite";
    } else {
        $sujet = $en ? "Your Kaislo subscription renews on $date: $nom" : "Votre abonnement Kaislo arrive à échéance le $date : $nom";
        $texte = $en ? "The subscription for $nom ends on $date. Pay before then to avoid any interruption." : "L’abonnement de $nom se termine le $date. Payez avant cette date pour éviter toute interruption.";
        $court = $en ? "Subscription ends in $n $unite" : "Abonnement : encore $n $unite";
    }
    return ['sujet' => $sujet, 'corps' => $texte . "\n\n" . $chemin . "\n" . $lien . "\n\nKaislo", 'push' => [$court . ' · ' . $nom, $texte]];
}

/** Envoie le rappel dû (s'il y en a un) ; renvoie true s'il est parti sur au moins un canal. */
function envoyerRappelSiDu(array $c, array $reglages, DateTimeImmutable $maintenant): bool
{
    $r = rappelAbonnementDu($c, $maintenant);
    if ($r === null) return false;
    // Marqué avant l'envoi : jamais deux fois le même palier, même si l'envoi échoue
    requete('UPDATE commerces SET rappel_abo = ? WHERE id = ?', [$r['fin'] . '|' . $r['palier'], $c['id']]);
    $langue = langueNotifications($c, $reglages);
    $contenu = composerRappel($c, $r, $langue, $maintenant);
    $resultats = envoyerNotification($c, $reglages, 'rappel', $contenu, $langue);
    return (bool) array_filter($resultats, fn ($x) => $x[1] === 'envoye');
}
