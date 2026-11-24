# Kaislo en une page

## L'idée
Kaislo est une **application de caisse et de gestion de stock pour les commerçants** d'Afrique, du Maghreb et d'Europe. Elle se pense pour le terrain : un téléphone suffit, **elle marche sans internet**, et elle se règle selon le métier (épicerie, boulangerie, restaurant, boutique…). Le commerçant vend, suit son stock, ses crédits clients et sa journée, sans matériel coûteux ni formation.

Kaislo est une marque exploitée par **Amorac SARL AU** (Casablanca, capital 10 000 MAD). Langues : français et anglais.

## Ce que fait l'application
- **Vendre vite** au comptoir : panier, remises, encaissement (espèces, mobile money, carte…), ticket (impression Bluetooth, WhatsApp).
- **Stock** : produits, quantités, alertes de stock bas, achats, pertes.
- **Crédit clients** : noter ce qu'un client doit, avec ou sans vente, et suivre les paiements.
- **Fin de journée** : caisse, bilan, résumé du soir envoyé au gérant.
- **Équipe** : gérant et vendeurs, chacun avec son code PIN et ses droits.
- **Restaurant** : tables et commandes. **Boutique en ligne** : le commerçant a un lien public pour recevoir des commandes.
- **Rien ne se perd** : l'app enregistre d'abord sur le téléphone, puis se synchronise dès qu'il y a du réseau.

## Comment ça marche (technique, en 4 lignes)
- **Application web installable** (Next.js, pages statiques) + **serveur PHP/MySQL** chez Hostinger.
- **Hors ligne d'abord** : les données vivent sur l'appareil et se synchronisent avec le serveur.
- **Publication** : une fusion sur `main` envoie le code sur la branche `hostinger`, que Hostinger récupère.
- **Étape suivante** : application Android (Capacitor) sur Google Play.

## Le modèle économique
- **Essai gratuit**, puis **abonnement** par formule et par pays, payé en **mobile money** (Orange Money, Wave, MTN), virement ou carte selon le pays.
- Le gérant signale son paiement, l'équipe le valide, une **facture** est générée. Des rappels préviennent avant l'échéance.
- **Activation provisoire** de quelques jours le temps de la vérification.

## Le site et l'équipe
- **Site public** kaislo.com (français / anglais) : pages métiers, tarifs, boutique, avis de commerçants, pages légales.
- **Espace Kaislo (équipe)** : commerces, messages, paiements, avis, retours, commerciaux.

## Le cadre légal
- **Droit marocain** pour le contrat, avec des **annexes par pays** (Maroc, Côte d'Ivoire, Sénégal, Burkina Faso, Congo).
- Données personnelles (loi 09-08 / CNDP), suppression de compte en 30 jours, conditions de vente des boutiques.

## Où en est-on
- **Fait** : caisse, stock, crédit, rapports, abonnement, factures PDF, rappels, pages légales, avis traduits, site FR/EN.
- **En attente** : double authentification admin (après le système de paiement), déclaration CNDP, relecture par un avocat.
- **À venir** : habillage « vraie application mobile native », application Android sur Google Play, impression iPhone, arabe.
