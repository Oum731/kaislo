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
