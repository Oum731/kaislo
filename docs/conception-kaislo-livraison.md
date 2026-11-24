# Kaislo : conception « caisse + commandes + livraison » (inspirée de Glovo)

## 1. Principe
Kaislo reste la **caisse et le stock du commerçant**. On y ajoute une couche « commande et livraison » en trois rôles, dans la même application :

| Rôle | Ce qu'il fait |
|---|---|
| **Client** | Trouve un commerce, commande, paie, suit sa livraison, note. |
| **Commerçant** | Reçoit la commande, prépare, assigne un livreur, encaisse. C'est l'application actuelle. |
| **Livreur** | Accepte une course, récupère, livre, encaisse si paiement à la livraison. |

Étapes de lancement (de la moins risquée à la plus lourde) :
1. **Livraison par le commerçant** : ses propres livreurs, suivi de statut, lien de suivi pour le client.
2. **Annuaire Kaislo par quartier** : le client découvre les commerces proches.
3. **Paiement en ligne** via un prestataire agréé (Kaislo ne détient pas l'argent).
4. **Livreurs indépendants** et commission.

Principes de design : usage à une main, gros boutons, peu de texte, fonctionne avec réseau faible, vert Kaislo conservé, rien qui ressemble à un « effet IA ».

## 2. Cycle d'une commande
`Envoyée` → `Acceptée` (ou `Refusée`) → `En préparation` → `Prête` → `Livreur assigné` → `En route` → `Livrée` (ou `Annulée` / `Échec de livraison`).
Le paiement suit son propre statut : `À payer à la livraison`, `Payé en ligne`, `Remboursé`.

## 3. Écrans par rôle

### A. Client (23 écrans)
1. Bienvenue / choix de langue et de pays
2. Connexion par numéro + code SMS ou WhatsApp
3. Choix de l'adresse (carte, position actuelle, adresses enregistrées)
4. Accueil : catégories, commerces proches, promos
5. Recherche (commerces, produits)
6. Liste des commerces d'une catégorie (filtres : ouvert, délai, frais)
7. Page d'un commerce (horaires, note, produits par rayon)
8. Fiche produit (options, quantité, note pour le commerçant)
9. Panier
10. Validation de commande (adresse, créneau, instructions)
11. Choix du paiement (espèces, mobile money, carte)
12. Paiement mobile money / carte (attente de confirmation)
13. Confirmation de commande
14. Suivi : statut en direct
15. Suivi sur carte avec le livreur
16. Contacter le livreur ou le commerçant (appel / WhatsApp)
17. Commande livrée : noter commerce et livreur
18. Historique des commandes
19. Détail d'une commande et facture
20. Adresses enregistrées
21. Profil et paiements
22. Aide et signalement d'un problème
23. Notifications

### B. Commerçant (application actuelle + 14 écrans nouveaux)
Existants à habiller (native) : Accueil, Vendre, Produits, Stock, Clients et crédit, Rapports, Fin de journée, Équipe, Réglages, Abonnement, Boutique en ligne.
Nouveaux :
1. File des commandes en ligne (nouvelles, en cours, terminées)
2. Alerte nouvelle commande (son + plein écran)
3. Détail d'une commande (articles, client, adresse)
4. Accepter / refuser avec motif et délai de préparation
5. Marquer « prête » et assigner un livreur
6. Choix du livreur (mes livreurs / disponibles)
7. Suivi des livraisons en cours (carte)
8. Gestion des livreurs (ajout, disponibilité)
9. Zones et frais de livraison
10. Horaires et statut ouvert/fermé de la boutique en ligne
11. Mon catalogue en ligne (produits visibles, photos, prix)
12. Paiements en ligne reçus et reversements
13. Avis des clients et réponses
14. Statistiques des commandes en ligne

### C. Livreur (14 écrans)
1. Connexion
2. Accueil : bouton disponible / indisponible, gains du jour
3. Course proposée (accepter / refuser avec délai)
4. Course acceptée : aller au commerce (navigation)
5. Au commerce : vérifier les articles, code de retrait
6. En route vers le client (navigation, appel)
7. Arrivée : remise, code de livraison, preuve (photo)
8. Encaissement à la livraison
9. Problème (client absent, adresse introuvable)
10. Course terminée : récapitulatif
11. Historique des courses
12. Gains et paiement des livreurs
13. Profil, véhicule, documents
14. Aide

### D. Communs (6 écrans)
Langue, notifications, permissions (position, notifications), mode hors ligne, mise à jour requise, erreurs et états vides.

## 4. Données à ajouter (à valider plus tard)
`commandes_en_ligne` (statut, paiement, adresse, créneau), `livraisons` (livreur, étapes, horodatage), `livreurs`, `zones_livraison`, `adresses_clients`, `evaluations`. Position du livreur : seulement pendant une course, supprimée ensuite.

## 5. Règles à cadrer avant le code
- **Paiement :** pas d'encaissement pour le compte des commerçants sans prestataire agréé.
- **Données :** position et coordonnées du client (loi 09-08 / CNDP), conservation courte.
- **Livreurs :** statut juridique (indépendants ou salariés du commerçant) et assurance.
- **Vente à distance :** loi 31-08 (informations, rétractation, remboursement).
- **Opérations :** support, litiges, remboursements.
