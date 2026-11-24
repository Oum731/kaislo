# Chantier « commande et livraison » : préparation

État : **préparé ; le lot L1 est codé, derrière l'interrupteur, non activé.** Rien de ce document n'est visible des utilisateurs tant que l'interrupteur `LivraisonActive` n'est pas à `oui`. Les écrans de référence sont dans `docs/conception-kaislo-livraison.md` (client, commerçant, livreur) et dans la maquette Figma (écrans client C01 à C16).

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
| L1 | **Codé, non activé.** Commande dans Kaislo (panier, retrait ou livraison, frais, minimum, numéro de commande, suivi par le client), toujours payée au commerçant | rien |
| L2 | **Codé, non activé.** Livraison par le commerçant : livreurs (simple fiche), assignation d'une commande, statuts en route et livrée, code de livraison | L1 |
| L3 | **Codé, non activé** (option `carte`). Suivi du client : écran de statut, notifications, position du livreur pendant la course seulement | L2 |
| L4 | **Codé avec un prestataire de simulation, non activé** (option `paiement`). Paiement en ligne via un prestataire agréé (Kaislo ne garde pas l'argent) | L1 + contrat prestataire |
| L5 | **Codé, non activé** (option `independants`). Livreurs indépendants, offres de course, commission, gains | L2, L4, avis juridique |

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

## Lot L1 : ce qui est codé (base v35)
- Réglages de la boutique (Compte → Boutique en ligne, visibles seulement quand l'interrupteur est ouvert) : livraison à domicile, retrait en boutique, frais de livraison, commande minimum.
- Commande du client : choix retrait ou livraison, frais ajoutés au total par le serveur (jamais par le navigateur), minimum contrôlé, adresse inutile pour un retrait.
- Suivi : une clé au hasard par commande, gardée dans l'appareil du client (jamais dans une adresse de page) ; `GET /api/public/commande-suivi` ; l'accueil affiche « Mes commandes » ; statuts (envoyée, acceptée, prête, livrée) mis à jour toutes les 20 s.
- Commerçant : la liste Commandes en ligne indique retrait et frais de livraison ; les statuts existants alimentent le suivi du client.
- Sans l'interrupteur : la commande reste celle d'avant (WhatsApp, pas de frais, pas de suivi).
- Notification : le client peut s'abonner depuis le suivi (« Me prévenir quand le statut change ») ; à chaque changement de statut il reçoit une notification, en français ou en anglais selon sa langue (même mécanisme que celles du gérant, abonnement lié à la clé de suivi, 3 appareils au plus ; base v36). Sur iPhone, seulement après ajout de Kaislo à l'écran d'accueil.
- Anglais : la boutique ouverte, le panier, le suivi, la discussion et les notifications sont traduits. Les messages d'erreur renvoyés par le serveur et le message WhatsApp envoyé à la boutique restent en français.
- Pas encore fait dans L1 : essai sur de vrais téléphones (Android et iPhone), y compris la réception réelle des notifications.

## Lot L2 : ce qui est codé (base v37)
- **Livreur = une fiche** (nom, numéro vérifié), pas un compte : il n'a donc accès à aucune donnée du commerce (ni ventes, ni stock, ni autres commandes). Le commerçant les gère dans Compte → Commandes en ligne (ajouter, assigner, retirer). Trente livreurs au plus.
- **Assigner** (commande en livraison acceptée) : chaque attribution crée un lien propre à la course, `kaislo.com/livraison/?c=…` (non référencé), à envoyer au livreur par WhatsApp (bouton prêt, message écrit). Changer de livreur invalide l'ancien lien.
- **Page du livreur** : adresse et téléphone du client, articles, montant à encaisser comme convenu avec la boutique, appel du client et de la boutique ; « J'ai récupéré la commande » puis saisie du code du client pour « Livraison terminée ».
- **Code de remise** : quatre chiffres, donnés au client seulement (visible dans son suivi quand la commande est en route), jamais au livreur ni au commerçant ; cinq codes faux au plus, puis blocage de quinze minutes.
- **Client** : statut « En route » dans son suivi et notification (français ou anglais), prénom du livreur, code de livraison ; le commerçant est prévenu sur ses appareils quand la commande est récupérée puis livrée.
- **Statuts** : `en_route` s'ajoute (nouvelle, confirmée, prête, en route, livrée, annulée) et n'existe qu'avec l'interrupteur ouvert.
- Pas encore fait dans L2 : essai sur de vrais téléphones, suivi du livreur sur carte (L3), encaissement tracé (L4).

## Lot L3 : ce qui est codé (base v38)
- **Options** : `LivraisonOptions=carte` dans le `.env` (liste séparée par des virgules : `carte,paiement,independants`), en plus de `LivraisonActive=oui`. Chaque option se coupe seule.
- **Livreur** : sur la page de sa course, tant que la commande est « en route », son téléphone envoie sa position toutes les dix secondes (il est prévenu, et s'il refuse la localisation la course continue sans carte).
- **Client** : carte OpenStreetMap avec la position du livreur et son ancienneté (« mise à jour il y a N min » ; au-delà de dix minutes, « position indisponible »). **Commerçant** : lien « Voir le livreur sur la carte ».
- **Vie privée** : une seule position par commande (table `positions_course`), effacée dès que la commande est livrée, annulée ou ramenée à un statut d'avant la route, jamais gardée plus de deux heures ; mention dans la page Confidentialité.
- Pas de calcul d'itinéraire ni de durée d'arrivée : l'adresse du client est un texte, pas une position.

## Lot L4 : ce qui est codé (base v39)
- **Activation** : `LivraisonOptions=paiement`, `PaiementEnLigne=essai` et `PaiementSecret=…` (12 caractères ou plus) dans le `.env` ; `PaiementCommission=5` (en %, facultatif). Sans secret ou avec un prestataire inconnu, le paiement en ligne reste coupé.
- **Prestataire « essai »** : simulation complète (page de paiement de test à deux boutons, notification signée en HMAC-SHA256) pour essayer tout le parcours en conditions réelles **sans argent**. **Ce n'est pas un vrai prestataire.**
- **Parcours** : la boutique accepte le paiement en ligne et dit où elle reçoit l'argent ; le client choisit « À la réception » ou « En ligne maintenant » ; commande « en attente de paiement » (le commerçant n'est pas prévenu et ne peut pas l'accepter) ; la notification signée du prestataire la confirme, alors seulement le commerçant est prévenu ; paiement échoué : le client réessaie depuis son suivi ; annulation d'une commande payée : « à rembourser », puis remboursement par le commerçant ; une commande payée ne se modifie plus.
- **Argent** : Kaislo ne le touche jamais ; le commerçant voit « À vous reverser par le prestataire » (net après commission) et la liste de ses paiements.
- **Brancher un vrai prestataire** : écrire une classe qui implémente `InterfacePasserelle` (`creerSession`, `signatureValide`, `rembourser`) dans `api/lib/paiement-ligne.php` et l'ajouter dans `passerelle()`. Il faut d'abord un contrat (CMI via banque, Payzone, Pay10…) avec compte marchand, API de test, clé secrète, adresse de notification (`/api/paiement/notification`), et la réponse à ces questions : reversement automatique aux commerçants (sous-comptes) ou non, commission, délai, remboursement par l'API. Sans reversement par le prestataire, il faudra un avis juridique avant de garder l'argent des commerçants.
- Pas encore fait : paiement en cash non tracé, litiges, facture de commission (L5), version anglaise de la page de simulation.

## Lot L5 : ce qui est codé (base v40)
- **Activation** : `LivraisonOptions=independants` dans le `.env` ; réglages facultatifs `CommissionLivreur=20` (en % du prix de la course) et `LivreursRayonKm=8`.
- **Inscription** : sur `/livreurs/` (formulaire affiché seulement quand l'option est ouverte ; sinon le contact WhatsApp reste). Numéro réel exigé, défi anti-robot, un numéro = une inscription. L'équipe est alertée.
- **Validation** : espace Kaislo → **Livreurs** : valider (crée un lien personnel secret `/espace-livreur/?k=…`, à envoyer par WhatsApp), refuser, suspendre, « nouveau lien » (l'ancien cesse de marcher).
- **Espace du livreur** (sans mot de passe) : disponible / indisponible (la position, si autorisée, sert seulement à proposer des courses proches ; effacée à l'indisponibilité), courses proposées (prix, commission annoncée, distance), course en cours, gains.
- **Commerçant** : sur une commande en livraison acceptée, « Demander un livreur Kaislo » avec le prix de la course ; l'offre expire au bout de 30 minutes ou s'annule. Le commerçant paie le livreur lui-même.
- **Acceptation** : le premier livreur qui accepte prend la course (mise à jour unique côté base, le second reçoit 409). La course se déroule ensuite comme au lot L2 (lien de course, code client, position L3).
- **Commission** : fixée à la livraison (`commission_livraison`, `gain_livreur`) ; l'équipe voit « commission due » par livreur et la marque réglée. Kaislo ne touche pas l'argent des courses.
- **Pas encore fait** : paiement automatique de la commission, notes des livreurs, documents (pièce d'identité) téléchargés, assurance, notifications push aux livreurs (la page se rafraîchit toute seule toutes les 20 s).
- **À valider avant ouverture** : statut du livreur indépendant, assurance, conditions propres aux livreurs, CNDP pour la position.
