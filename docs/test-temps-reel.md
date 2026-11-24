# Test en temps réel : livraison Kaislo (lots L1 à L5)

Tout est codé et caché derrière des interrupteurs. Ce guide dit comment les ouvrir pour un essai réel avec un ou deux commerçants pilotes, et comment tout refermer.

## 1. Avant de commencer
1. Sauvegarder la base (hPanel → Bases de données → sauvegarde).
2. Fusionner et déployer `hostinger`, vider le cache (`https://kaislo.com/purge-cache.txt`).
3. Vérifier `https://kaislo.com/api/` : `versionBase` doit valoir **40** (les migrations v34 à v40 se font toutes seules).

## 2. Les interrupteurs (fichier `.env` du serveur)
```
LivraisonActive=oui
LivraisonOptions=carte,paiement,independants
PaiementEnLigne=essai
PaiementSecret=<une longue phrase secrète, 12 caractères ou plus>
PaiementCommission=5
CommissionLivreur=20
```
- Sans `LivraisonOptions` : seulement L1 (commande dans Kaislo) et L2 (livreur du commerçant).
- `carte` = suivi de la position du livreur (L3) · `paiement` = paiement en ligne (L4, prestataire **de simulation** : aucun argent réel) · `independants` = livreurs Kaislo (L5).
- Retour arrière : retirer la ligne, vider le cache. Les données restent en base.

## 3. Scénario d'essai (à faire sur de vrais téléphones)
Prévoir : le téléphone du commerçant pilote, un téléphone « client », un téléphone « livreur ».
1. **Commerçant** : Compte → Boutique en ligne : mettre la boutique sur la carte, activer la livraison (frais, minimum) et le paiement en ligne, publier.
2. **Client** : ouvrir kaislo.com, voir la boutique, commander en livraison. Option : payer « en ligne » (page de simulation à deux boutons). Suivre la commande (lien de suivi).
3. **Commerçant** : recevoir la notification, accepter la commande.
4. **Livreur du commerçant (L2)** : Assigner un livreur → envoyer le lien de course sur WhatsApp → « J'ai récupéré » → le client voit son code → le livreur saisit le code.
5. **Position (L3)** : pendant « en route », le client voit le livreur sur la carte ; elle disparaît à la livraison.
6. **Livreur Kaislo (L5)** : s'inscrire sur kaislo.com/livreurs/ → l'équipe appelle puis valide (espace Kaislo → Livreurs) → envoyer le lien personnel → le livreur se met disponible → le commerçant clique « Demander un livreur Kaislo » avec un prix → le livreur accepte → course comme au point 4 → commission « due » visible dans l'espace Kaislo ; la marquer réglée.
7. **Annulation payée en ligne** : annuler → « Rembourser le client ».

## 4. À regarder pendant l'essai
- La notification arrive-t-elle (commerçant, client) ? Les textes sont-ils justes en français et en anglais ?
- La carte bouge-t-elle ? La position partage-t-elle bien seulement pendant la course ?
- Le premier livreur qui accepte gagne-t-il bien, sans doublon ?
- Les chiffres : prix, frais, commission, « à reverser ».
- Noter chaque problème avec l'heure et le téléphone utilisé.

## 5. Ce qui est simulé ou manquant (à ne pas oublier)
- Le paiement est une **simulation** : un vrai prestataire (Payzone, Pay10…) demande un contrat et une classe qui implémente `InterfacePasserelle`.
- Aucune notification push aux livreurs indépendants (la page se rafraîchit seule toutes les 20 s).
- Avis juridique à obtenir avant une ouverture publique : CNDP (position, coordonnées), statut des livreurs indépendants et assurance, vente à distance (loi 31-08), agrément de paiement.
