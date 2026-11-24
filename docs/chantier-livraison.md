# Chantier « commande et livraison » : préparation

État : **préparé, non activé.** Rien de ce document n'est visible des utilisateurs tant que l'interrupteur `LivraisonActive` n'est pas à `oui`. Les écrans de référence sont dans `docs/conception-kaislo-livraison.md` (client, commerçant, livreur) et dans la maquette Figma (écrans client C01 à C16).

## Ce qui existe déjà (point de départ)
- Accueil par proximité : boutiques classées par distance, une boutique s'ouvre dans la page (`Decouverte.jsx`).
- Commande par WhatsApp vers la boutique, enregistrée côté commerçant dans « Commandes en ligne » (`commandes_en_ligne`, statuts nouvelle, confirmée, prête, livrée, annulée).
- Position des boutiques (`boutiques.lat/lng`), distance côté serveur.
- Rôles d'équipe (gérant, vendeur) avec PIN ; notifications push et e-mail.

## L'interrupteur
- Serveur : ligne `LivraisonActive=oui` dans le `.env` (absente = non). `GET /api/livraison/etat` répond `{ actif }`.
- Application et site : `src/lib/livraison.js` lit cet état. Tant qu'il est « non », aucun écran, bouton ni message de livraison n'apparaît, et les routes de livraison répondent 404.
- Activer = ajouter la ligne au `.env`, vider le cache. Désactiver = retirer la ligne.

## Les lots (dans l'ordre, chacun activable seul)
| Lot | Contenu | Dépend de |
|---|---|---|
| L1 | Commande dans Kaislo (panier, validation, numéro de commande, statuts visibles du client), toujours payée au commerçant | rien |
| L2 | Livraison par le commerçant : rôle « livreur » dans l'équipe, assignation d'une commande, statuts en route et livrée, code de livraison | L1 |
| L3 | Suivi du client : écran de statut, notifications, position du livreur pendant la course seulement | L2 |
| L4 | Paiement en ligne via un prestataire agréé (Kaislo ne garde pas l'argent) | L1 + contrat prestataire |
| L5 | Livreurs indépendants, partage des courses, commission, gains | L2, L4, avis juridique |

## Données à ajouter (à valider avant de migrer)
- `commandes_en_ligne` : ajouter `mode` (retrait ou livraison), `adresse_lat/lng`, `frais_livraison`, `livreur_id`, `code_livraison`, `paiement` (a_la_livraison, en_ligne), `paiement_statut`.
- `livreurs` : id, commerce_id (L2) ou null (L5), nom, téléphone, véhicule, disponible, actif.
- `livraisons` : commande_id, livreur_id, statut, horodatages (acceptée, récupérée, livrée), preuve.
- `zones_livraison` : commerce_id, rayon en km, frais, minimum de commande.
- `positions_livreurs` : livreur_id, lat, lng, horodatage, **effacées à la fin de la course**.
- `evaluations` : commande_id, note du commerce, note du livreur, commentaire.
Chaque lot ajoute sa part de migration (numéro de base suivant) ; rien n'est créé avant.

## Routes à ajouter (toutes derrière l'interrupteur)
`POST /api/commande-client` · `GET /api/commande-client/suivi` · `POST /api/commandes-en-ligne/assigner` · `POST /api/livraison/statut` · `GET/POST /api/livreurs` · `GET/POST /api/zones-livraison` · `POST /api/evaluation`.

## Règles à cadrer avant L4 et L5
- **Paiement :** pas d'encaissement pour le compte des commerçants sans prestataire agréé (Payzone, Pay10, banque…). Contrat et API de test à obtenir.
- **Données :** position et coordonnées du client (loi 09-08, CNDP, et lois des pays concernés) : finalité, durée de conservation, mention dans Confidentialité, déclaration.
- **Livreurs :** statut (indépendants ou salariés du commerçant), assurance, conditions d'utilisation propres.
- **Vente à distance :** loi 31-08 (informations, rétractation, remboursement) et conditions de vente à adapter.
- **Opérations :** support, litiges, remboursements, qui répond à qui.

## Check-list d'activation d'un lot
1. Migration testée sur une copie de la base, sauvegarde faite.
2. Tests automatiques du lot au vert ; essai de bout en bout sur un commerce de démonstration.
3. Textes FR et EN, mentions légales et Confidentialité à jour.
4. Un ou deux commerçants pilotes dans un seul quartier.
5. Ajouter `LivraisonActive=oui`, vider le cache, surveiller les premières commandes.
6. Retour arrière possible à tout moment : retirer la ligne.
