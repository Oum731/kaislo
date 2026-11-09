<?php
// ------------------------------------------------------------
// ALERTES DE L'ÉQUIPE AMORAC : à chaque nouveau commerce, message d'un commerce, question d'un visiteur, avis ou commercial à valider,
// l'équipe reçoit un e-mail (EmailEquipe du .env) ET une notification sur les appareils où elle a activé les alertes
// (espace Amorac → Accueil → « Alertes sur ce téléphone »). Les notifications réutilisent le push des commerçants (lib/push.php) :
// les appareils de l'équipe sont des abonnements dont commerce_id vaut ABONNES_EQUIPE.
//
//   GET  /api/admin/push              clé publique et nombre d'appareils de l'équipe
//   POST /api/admin/push/abonner      { endpoint, appareil }   (comme /api/push/abonner, pour un compte de l'équipe)
//   POST /api/admin/push/desabonner   { endpoint }
// ------------------------------------------------------------

const ABONNES_EQUIPE = 'amorac';

/** Appareils des comptes actifs de l'équipe qui ont activé les alertes. */
function appareilsEquipe(): array
{
    return requete('SELECT a.* FROM abonnements_push a JOIN admins d ON d.id = a.utilisateur_id WHERE a.commerce_id = ? AND d.actif = 1', [ABONNES_EQUIPE])->fetchAll();
}

/**
 * Prévient l'équipe : e-mail (si $sujet est donné) et notification sur ses appareils. Envoyés après la réponse : un échec ne gêne jamais l'action.
 * $type : 'inscription' | 'message' | 'visiteur' | 'avis' | 'commercial' (20 caractères au plus).
 */
function alerterEquipe(string $type, string $titre, string $texte, ?string $sujetEmail = null, ?string $corpsEmail = null, string $url = '/admin/'): void
{
    if ($sujetEmail !== null) envoyerEmail(lireFichierEnvCle('EmailEquipe') ?? 'contact@kaislo.com', $sujetEmail, (string) $corpsEmail);
    apresReponse(function () use ($type, $titre, $texte, $url) {
        try {
            $appareils = appareilsEquipe();
            if ($appareils) diffuserPush($appareils, ABONNES_EQUIPE, $type, $titre, $texte, $url);
        } catch (Throwable) { /* l'alerte est un plus : jamais d'erreur visible */ }
    });
}

function lienAdmin(): string
{
    return 'https://' . (domaineSite() ?: 'kaislo.com') . '/admin/';
}

function routeAdminPushEtat(): never
{
    adminConnecte();
    $cle = null;
    try { $cle = cleVapid()['publique']; } catch (Throwable) { /* pas de clé : notifications indisponibles */ }
    repondre(['ok' => true, 'clePublique' => $cle, 'appareils' => count(appareilsEquipe())]);
}

function routeAdminPushAbonner(): never
{
    $admin = adminConnecte();
    $e = entree();
    $endpoint = (string) ($e['endpoint'] ?? '');
    if (!adressePushAutorisee($endpoint)) throw new ErreurApi('Ce navigateur n’est pas pris en charge pour les notifications');
    $hash = hash('sha256', $endpoint);
    $appareil = mb_substr((string) ($e['appareil'] ?? ''), 0, 200);
    $existant = requete('SELECT id FROM abonnements_push WHERE endpoint_hash = ?', [$hash])->fetch();
    if ($existant) {
        requete('UPDATE abonnements_push SET commerce_id = ?, utilisateur_id = ?, appareil = ?, vu_le = ?, echecs = 0 WHERE id = ?', [ABONNES_EQUIPE, $admin['id'], $appareil, maintenant(), $existant['id']]);
    } else {
        $nb = (int) requete('SELECT COUNT(*) AS n FROM abonnements_push WHERE utilisateur_id = ?', [$admin['id']])->fetch()['n'];
        if ($nb >= 10) throw new ErreurApi('Trop d’appareils : désactivez les alertes sur un ancien appareil', 400);
        requete('INSERT INTO abonnements_push (id, commerce_id, utilisateur_id, endpoint_hash, endpoint, appareil, cree_le, vu_le, echecs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)', [
            nouvelId('ap'), ABONNES_EQUIPE, $admin['id'], $hash, $endpoint, $appareil, maintenant(), maintenant(),
        ]);
    }
    repondre(['ok' => true]);
}

function routeAdminPushDesabonner(): never
{
    $admin = adminConnecte();
    $endpoint = (string) (entree()['endpoint'] ?? '');
    requete('DELETE FROM abonnements_push WHERE endpoint_hash = ? AND utilisateur_id = ?', [hash('sha256', $endpoint), $admin['id']]);
    repondre(['ok' => true]);
}
