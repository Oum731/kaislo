# Kaislo — Caisse et gestion de stock pour tous les commerces

Site public (pour Google) + application de caisse, en **Next.js**.
Démo prête à présenter : un restaurant et une épicerie, tous deux nommés **Amorac Kaislo** (comme leurs gérants, vendeurs et clients), dans la devise du pays choisi.

> En ligne (Hostinger), les données sont synchronisées avec le serveur PHP + MySQL et la caisse marche aussi sans internet.
> Sur GitHub Pages (version de test), il n'y a pas de serveur : les données restent dans le navigateur.
> Prochaine étape : application mobile (Capacitor).

## Lancer sur votre PC

```bash
npm install        # une seule fois
npm run dev        # puis ouvrir http://localhost:3000
```

- Site public : http://localhost:3000
- Application : http://localhost:3000/app
- Connexion : **numéro de téléphone + code PIN** (chaque personne a son numéro)
- Démo restaurant : gérant 06 00 00 00 01 / 1234 · vendeurs 06 00 00 00 02 / 0000 et 06 00 00 00 03 / 1111
- Démo épicerie : gérant 06 00 00 00 11 / 1234 · vendeurs 06 00 00 00 12 / 0000 et 06 00 00 00 13 / 1111
- Espace Amorac : /admin (mot de passe de démo dans src/config.js)

## Mettre en ligne sur Hostinger

1. Dans `src/config.js`, remplacer `SITE_URL` par l'adresse définitive du site
2. Arrêter `npm run dev` s'il tourne (Ctrl + C), puis `npm run build` → crée le dossier `out/`
   (les deux commandes utilisent le même dossier `.next` et se gênent)
3. hPanel → domaine ou sous-domaine → activer le **SSL** (gratuit, obligatoire pour le Bluetooth)
4. Gestionnaire de fichiers → `public_html` → envoyer **tout le contenu** de `out/` (y compris `.htaccess`)
5. À chaque mise à jour : refaire `npm run build`, renvoyer `out/` (la version du service worker change toute seule : `scripts/version-sw.mjs`)

## Ce que fait l'application

| Fonction | Où |
|---|---|
| Caisse avec options (accompagnements, tailles), recherche, code-barres | Caisse |
| Remises (% ou montant) et prix promo | Caisse / Produits |
| Vente à crédit, carnet clients, remboursements, rappel WhatsApp | Crédit |
| Tables, commandes en cours, ticket cuisine | Tables (restaurants) |
| Stock, entrées de marchandise, inventaire, valeur du stock | Stock (épiceries, boutiques) |
| Marge (prix d'achat), dépenses, solde, statistiques | Accueil (gérant) |
| Ouverture et fermeture de caisse chaque jour (fond compté, total vendu par article, écart), historique des journées | Ventes |
| Reçu envoyé par WhatsApp (client à distance) | Caisse / ticket |
| Espace équipe Amorac : commerces, abonnements, paiements, offres | /admin |
| Vendeurs, codes PIN, droits (produits, remises) | Réglages |
| Photos des articles, catégories (gérant et vendeurs autorisés) | Produits |
| Logo (aussi imprimé sur le ticket), téléphone, e-mail, adresse, position sur la carte | Réglages → Commerce |
| Impression Bluetooth (ventes, cuisine, clôture, remboursements) | Imprimante |

## Organisation du code

| Dossier | Rôle |
|---|---|
| `src/app/` | Les adresses du site : `(fr)/` pages françaises et `/app`, `(en)/en/` pages anglaises (le contenu est dans `src/components/site/pages/`) |
| `src/components/site/` | Éléments du site public |
| `src/components/app/` | L'application : `ecrans/` (un fichier par écran) et `feuilles/` (fenêtres) |
| `src/store/` | L'état de l'application et toutes les actions (caisse, gestion, impression) |
| `src/lib/donnees/` | Calculs (vente, statistiques, crédit, clôture), données de démo, **stockage** |
| `src/lib/impression/` | Tickets et imprimante Bluetooth |
| `src/app/globals.css` | Le design (couleurs, téléphone / tablette / ordinateur) |

Trois fichiers sont prévus pour être remplacés plus tard :

- `src/lib/donnees/stockage.js` → appels à l'API Laravel
- `src/lib/donnees/images.js` → envoi des photos et logos sur le serveur (aujourd'hui : base d'images de l'appareil)
- `src/lib/impression/bluetooth-web.js` → Bluetooth natif dans l'app mobile (iPhone + imprimantes Bluetooth « classique »)

## Imprimante

Imprimante thermique Bluetooth **BLE**, 58 ou 80 mm, ESC/POS.
Dans le navigateur : **Chrome** (Android ou ordinateur). Sur iPhone, l'aperçu du ticket s'affiche à l'écran.

## Version de test en ligne (GitHub Pages)

Lien à donner aux clients : https://oum731.github.io/kaislo/

Pour mettre à jour ce lien après des modifications (arrêtez `npm run dev` avant) :

```
npm run publier-github
```

Le site est alors construit pour le sous-dossier `/kaislo` et envoyé sur la branche `gh-pages`.
Ensuite, relancez `npm run build` avant tout envoi sur Hostinger (dossier `out/` normal).

## Pages légales

Conditions d'utilisation, confidentialité, cookies, sécurité, mentions légales : `src/app/<page>/page.js`.
Avant le lancement commercial :
- compléter `SOCIETE` et `HEBERGEUR` dans `src/config.js` (forme juridique, siège, immatriculation, responsable) ;
- changer `DATE_PAGES_LEGALES` à chaque modification ;
- faire relire les textes par un juriste du pays du siège d'Amorac.

## Captures d'écran du site

Les 9 images de `public/captures/` (vente, épicerie, fermeture de la journée, crédit, stock, tableau de bord, tables)
sont prises automatiquement dans la vraie démo (ordinateur 1440 × 900, téléphone 390 × 844 en double définition).

```
npm run build
npm run captures            # toutes les captures (environ 1 minute)
npm run captures -- stock   # une seule capture
```

Les scènes sont décrites dans `scripts/captures.mjs`.

**Sans PC :** GitHub → onglet Actions → « Captures et vidéos » → Run workflow (captures, vidéos, ou les deux). Le résultat est envoyé sur la branche `medias-auto` :
regardez les images et les vidéos, puis ouvrez une pull request de `medias-auto` vers `main`.

## Vidéos de démonstration

Les 5 vidéos de `public/videos/` (présentation, restaurant, épicerie, ajout d'articles, vendeurs)
sont tournées automatiquement dans la vraie démo, avec voix off (Vivienne) et musique composée par le script.

```
pip install edge-tts      # une seule fois : la voix
npm run build
npm run videos            # toutes les vidéos (environ 15 min la première fois)
npm run videos -- produits   # une seule vidéo
npm run videos -- --essai    # essai sans voix : vérifie la mise en scène, écrit dans outils/videos-essai/
```

Chrome est cherché automatiquement (Windows, Mac, Linux) ; sinon indiquer son chemin dans la variable `CHROME_PATH`.
Python : `python` sous Windows, `python3` ailleurs (ou variable `PYTHON`).
Après un changement de vocabulaire ou d'écran : refaire `npm run build`, puis `npm run captures` et `npm run videos`.

Textes dits et sous-titres : `scripts/videos-demo.mjs` (fonction `titre(p, sous-titre, phrase dite)`).
Les phrases déjà fabriquées sont gardées dans `outils/voix-cache/`.
Note : la voix passe par le service de lecture à voix haute de Microsoft Edge (outil edge-tts, non officiel).
Pour un usage commercial à grande échelle, prévoir les mêmes voix via Azure Speech (offre gratuite disponible).

## Hébergement Hostinger (site + API PHP)

Domaine : https://kaislo.com (adresse provisoire Hostinger : https://darkgrey-albatross-393608.hostingersite.com, renvoyée vers kaislo.com une fois le domaine actif)

L'API PHP (dossier `api/`, PHP simple sans framework) répond sur `/api/...` :
`GET /api/sante`, `POST /api/inscription`, `POST /api/connexion`, `GET /api/moi`, `POST /api/deconnexion`,
`GET|POST /api/donnees` (synchronisation des caisses), `POST /api/utilisateurs` (vendeurs),
`POST /api/verifier-gerant` (annulation), `POST /api/biometrie/defi|enregistrer|connexion` (empreinte / Face ID, norme WebAuthn),
`GET|POST /api/messages` (messagerie avec l'équipe), `/api/admin/...` (espace Amorac).

**Fonctionnement :** chaque caisse garde une copie des données et marche sans internet ; les modifications partent
dans une file d'attente envoyée dès que possible (la plus récente gagne en cas de conflit). Les codes PIN ne sont
jamais sur les appareils des vendeurs : le serveur les garde chiffrés. La version GitHub Pages (`npm run publier-github`)
n'a pas de serveur : les comptes y restent dans le navigateur.
Les tables MySQL sont créées automatiquement au premier appel.

**Publier :** automatique à chaque fusion dans `main` (GitHub Actions → « Publication sur Hostinger » : tests, construction, envoi sur la branche `hostinger`).
À la main, si besoin : `npm run publier-hostinger`, ou onglet Actions → « Publication sur Hostinger » → Run workflow.
Hostinger doit déployer la branche **`hostinger`** (pas `main`, qui ne contient que le code source). Pour que le déploiement soit aussi automatique :
hPanel → Avancé → GIT → activer le déploiement automatique et coller l'adresse du webhook dans GitHub → Settings → Webhooks.

**Anciennes adresses et caches :** `/caisse-restaurant/` (et les autres `/caisse-…/`) renvoient vers `/gestion-…/` par le `.htaccess` (301) et par une petite page de
redirection écrite à chaque publication (`scripts/anciennes-adresses.mjs`), qui remplace l'ancien fichier resté sur le serveur. Les pages ne sont plus gardées par le cache LiteSpeed de Hostinger ;
si une ancienne page s'affiche malgré tout : ouvrir `https://kaislo.com/purge-cache.txt` (vide le cache du serveur), ou hPanel → Gestionnaire de cache → tout purger.

**Surveillance :** le workflow « Surveillance du site » vérifie toutes les 30 minutes la page d'accueil et `/api/sante` (base de données comprise) ;
en cas d'échec, GitHub envoie un e-mail au propriétaire du dépôt. Si `/api/sante` affiche une erreur de base, le champ `diagnostic` dit quoi corriger.

**Réglages à faire une seule fois dans hPanel :**
1. Avancé → Configuration PHP : PHP 8.1 ou plus récent.
2. Gestionnaire de fichiers : vider `public_html` (supprimer la page par défaut).
3. Avancé → GIT : dépôt `https://github.com/Oum731/kaislo.git`, branche `hostinger`, dossier vide → Créer, puis « Déployer ».
   Facultatif : activer le déploiement automatique et coller l'adresse du webhook dans GitHub → Settings → Webhooks.
4. Gestionnaire de fichiers : créer le fichier `.env` dans le dossier **au-dessus** de `public_html`
   (`domains/<domaine>/.env`), avec `Db`, `User`, `Password` (base MySQL créée dans hPanel).
   Le serveur MySQL est `localhost` sur Hostinger (clé `DbHost` seulement s'il est différent).
   Ajouter aussi :
   - `CleAdmin=` une clé secrète de 12 caractères ou plus (sert une seule fois, pour créer le premier compte Amorac) ;
   - `EmailEquipe=` l'adresse qui reçoit les messages des commerces ;
   - `EmailExpediteur=` l'expéditeur des e-mails (ex : `no-reply@kaislo.com`, adresse créée dans hPanel → E-mails).
5. Vérifier : `https://<domaine>/api/sante` doit afficher `"ok":true`.
6. Ouvrir `https://<domaine>/admin/` : saisir la clé `CleAdmin`, son nom, son e-mail et un mot de passe
   (10 caractères minimum, avec lettres et chiffres). Les autres membres de l'équipe sont ajoutés ensuite
   dans l'onglet « Équipe » (rôle « admin » ou « support » ; le support ne peut ni encaisser ni suspendre).

## Référencement (Google)

- Chaque page publique : titre (≤ 62 caractères), description (≤ 155), adresse canonique et aperçu de partage à son **propre** adresse (`src/lib/seo.js`, fonction `metaPage`).
- Données structurées : logiciel (fonctions, essai gratuit, fourchette de prix), questions fréquentes, fil d'Ariane, vidéos (tutoriels).
- Plan du site `/sitemap.xml` sans fausses dates, servi explicitement en `application/xml` et sans cache serveur par le `.htaccess` (Search Console avait signalé « Le sitemap est un fichier HTML » : une page HTML servie à la place du XML) ; `robots.txt` ferme `/app/`, `/admin/`, `/commercial/` et `/api/`.
- **Pages par pays** (`/pays/cote-d-ivoire/`, `/pays/senegal/`… 15 pays) : devise, modes de paiement, numéros de téléphone et prix réels du pays (`src/lib/pays-seo.js`).
- **Ajouter un pays : un seul fichier**, `api/lib/pays.json` (lu par le site et par le serveur PHP) : nom, devise, indicatif, ville, modes de paiement, règles des numéros, fuseaux horaires, article (« en/au »), page SEO et nom anglais. Un test (`tests/pays.test.mjs`) vérifie que chaque pays est complet et que PHP et le site lisent la même liste. Une devise nouvelle demande en plus des prix dans `src/lib/donnees/tarifs.js` et `api/lib/tarifs.php`.
- Contrôle automatique après chaque construction : `npm run build && npm run seo` (lancé par la CI).
- À faire une fois : `GOOGLE_VERIFICATION` dans `src/config.js` (Search Console → Ajouter une propriété → balise HTML), puis envoyer `https://kaislo.com/sitemap.xml` dans Search Console ;
  idem dans Bing Webmaster Tools. Image de partage et icônes : GitHub → Actions → « Captures et vidéos » → « images de partage ».

## Stock calculé à partir des mouvements

Le stock n'est plus un nombre réécrit à chaque vente (deux appareils hors ligne s'écrasaient). Il se calcule :
`stock = quantité de départ (stockBase) + entrées et corrections d'inventaire (mouvements) − articles vendus (ventes non annulées)`, comptés depuis `stockDepuis`.
Ventes et mouvements ne changent jamais une fois enregistrés : à la synchronisation, tout s'additionne sans conflit. La fiche du produit n'est plus renvoyée au serveur à chaque vente
(le stock calculé, `stockActuel`, reste dans l'appareil). Code : `src/lib/donnees/stock.js`, tests : `tests/stock.test.mjs`.
Produits d'avant ce changement : l'ancien champ `stock` sert de départ, compté depuis le 5 octobre 2026 (`DEPUIS_ANCIENS`).

## Stockage sur l'appareil

Les données du commerce sont gardées dans l'appareil (IndexedDB, `src/lib/donnees/memoire.js`) : lecture instantanée, marche sans internet, et plus de limite de 5 Mo
comme avec `localStorage` (testé avec 40 000 ventes). Au premier lancement après la mise à jour, les anciennes données de `localStorage` sont reprises automatiquement,
puis retirées. Si l'enregistrement échoue (mémoire de l'appareil pleine), un message d'erreur s'affiche.

## Règles appliquées par le serveur

- **Ventes** : une vente enregistrée ne change plus. Un vendeur ne peut que l'annuler, et seulement si le code du gérant a été saisi sur son appareil
  (valable 6 heures, pour que l'annulation faite sans internet puisse partir ensuite) ; chaque annulation est notée dans le journal.
  Un vendeur ne crée des ventes qu'à son nom. Lignes et montants doivent être valides ; un total qui ne correspond pas aux lignes est accepté
  mais signalé dans le journal (`vente-incoherente`).
- **Abonnement expiré** (essai ou période payée terminés depuis plus de 7 jours) : la lecture reste possible, l'envoi de nouvelles données est refusé.
  Les ventes restent sur l'appareil et partent dès que l'équipe Amorac enregistre le paiement ou prolonge l'essai.
- Ces règles sont testées avec une vraie base : `npm test` (tests/api.test.mjs).

## Espace Amorac (/admin)

- **Tableau de bord** : commerces inscrits, en essai, abonnés, suspendus, chiffre d'affaires de l'abonnement.
- **Commerces** : fiche de chaque commerce (gérant, vendeurs, utilisation, journal), changement du numéro,
  notes internes, prolongation de l'essai, suspension / réactivation, enregistrement d'un paiement
  (espèces, mobile money, virement, carte) qui prolonge l'abonnement.
- **Messages** : conversation avec chaque commerce (écran « Aide » ou bulle « Discuter avec nous » de l'application)
  et messages des **visiteurs du site** (bulle sur toutes les pages : nom, WhatsApp ou e-mail, message ; réponse
  par WhatsApp ou e-mail, puis « Marquer comme traité »). Un e-mail prévient l'équipe à chaque nouveau message.
- **Paiements** : le montant proposé est calculé (formule du métier + postes supplémentaires, 12 mois = 2 offerts,
  tarif fondateur) ; on saisit le montant réellement reçu.
- **Commerciaux**, **Tarifs** et **Équipe** (administrateurs seulement).

## Direction visuelle du site public : « le cahier du commerçant »

Accueil : un vrai ticket de caisse (`TicketCaisse.jsx`, montants de la boutique de démonstration, total calculé) à la place des maquettes de
téléphone ; un titre concret ; des listes séparées par un filet à la place des cartes ; plus de pictogrammes emoji dans les rayons ; bandeau
de mesure réduit à une barre basse. Classes `.tk-*` (ne pas réutiliser `.ticket`, déjà pris par le reçu de l'application). Prochaine étape :
l'application. Page Tarifs : tableaux à filets, chiffres alignés à droite, règles communes sans cadre. Annuaire et vitrines : plus d'emoji, une initiale à la place d'une photo manquante. Le ticket affiche « Kaislo » (aucun nom propre).

## Bouton « Installer Kaislo » sur le téléphone

Presque personne ne sait qu'un site s'installe : `src/components/site/ProposerInstallation.jsx` (logique pure et testée dans `src/lib/installer-pwa.js`,
`tests/installer-pwa.test.mjs`) affiche **tout de suite** une barre avec un bouton « Installer » en bas de chaque page du site public, sur téléphone
seulement, tant que Kaislo n'est pas installé. Un toucher : Chrome/Edge Android ouvrent l'installation du navigateur (`beforeinstallprompt`) ; sinon
une fiche explique les 3 gestes un par un (iPhone : Partager → Sur l'écran d'accueil ; Android sans bouton : menu ⋮ → Installer l'application), ou
« Ouvrez Kaislo dans votre navigateur » avec « Copier le lien » dans les navigateurs intégrés (Facebook, Instagram, WhatsApp, TikTok : c'est là
qu'arrivent les clients des publicités). Si le visiteur annule l'installation, le bouton reste et explique les gestes. La croix masque la barre :
nouvelle apparition après 3 jours, puis 30 jours, puis plus jamais (`localStorage` : `kaislo_installation`). Le service worker est enregistré
à l'affichage (Chrome en a besoin pour proposer l'installation).

## Logo des boutiques

Le logo (ou la photo de profil) que le gérant choisit dans Réglages → Profil est envoyé au serveur avec le reste (élément `images`) et
`api/lib/boutique.php` l'expose : champ `logo` de `GET /api/public/boutique` et de l'annuaire `GET /api/public/boutiques`, téléchargeable
par `GET /api/public/boutique-image` (comme les photos des articles publiés ; aucune autre image n'est publique). Pas de logo ou image pas
encore arrivée : `null`, jamais un logo cassé. Il s'affiche dans l'en-tête de la vitrine, sur la carte de l'annuaire (l'initiale de la boutique
tant qu'il n'y a pas de logo), dans la page pour Google (`logo` des données structurées, image visible, et image de partage quand la
boutique n'a aucune photo d'article). Tests : `tests/api-boutique-logo.test.mjs`.

## Boutiques visibles dans la liste du site

Une boutique apparaît sur `kaislo.com/boutiques` quand elle est **activée**, **affichée** (case « Afficher ma boutique… »), non suspendue, avec un
abonnement valide et **au moins un article « Vendre en ligne »** (avec nom et prix). Chaque visiteur ne voit que les boutiques de son pays (choisi,
sinon deviné par l'adresse IP), mais tous les pays sont parcourus : un pays très actif ne cache pas les autres (plafond de 300 boutiques par pays).
`GET /api/boutique` renvoie `dansAnnuaire` et `raisonAnnuaire` (`aucunArticle`, `desactivee`, `privee`, `abonnement`, `suspendu`, `pasDeBoutique`) :
la fiche « Boutique en ligne » de l'application explique au gérant pourquoi sa boutique n'est pas dans la liste, et le bouton « Publier mes N articles
en ligne » coche « Vendre en ligne » sur tous les articles actifs qui ont un nom et un prix. Tests : `tests/api-boutique-annuaire.test.mjs`.

## Tarifs et postes

- Une **formule par métier** (`src/lib/donnees/tarifs.js` et `api/lib/tarifs.php`, à garder identiques ; modifiables
  ensuite dans `/admin` → Tarifs). Chaque formule comprend **1 poste avec 5 vendeurs au maximum**, plus le gérant.
- **Poste** = l'appareil relié à l'imprimante (Réglages → Postes). Chaque vendeur est affecté à un poste ; ses tickets
  (et ses envois en cuisine) s'impriment sur l'imprimante de ce poste. Sur l'appareil du poste : Réglages → Postes →
  « Cet appareil imprime les tickets du poste… » + imprimante Bluetooth connectée, application ouverte
  (synchronisation toutes les 5 secondes).
- Paiement annuel : 2 mois offerts. Tarif fondateur : −20 % à vie, 20 places (case dans la fiche du commerce).
- **Épicerie à part** (12 000 FCFA, 199 DH, 18 €…) ; les autres commerces de proximité restent à 9 000 FCFA.
- **Toutes les devises suivent le même taux** : `TAUX_CHANGE` (1 € = 655,957 FCFA, 10,8 DH, 1,5 CAD, 1,1 USD, 9 840 GNF), modifiable dans
  `/admin` → Tarifs → « Taux de change ». Changer un prix dans une devise recalcule toutes les autres (dirhams en …9, FCFA à 500, GNF à 5 000) ;
  deux boutons recalculent toute la grille depuis le FCFA ou l'euro. La migration 22 remplace une grille déjà enregistrée par la grille officielle.
- **Code parrain et prix catalogue** : les prix de la grille sont ceux des clients inscrits **avec un code parrain** (les tarifs
  actuels, inchangés). Les nouveaux clients **sans code** paient le **prix catalogue** = prix ÷ (1 − remise), arrondi au pas supérieur
  (FCFA 500, MAD 5, GNF 5 000, EUR/CAD/USD 1) : par défaut remise de 10 %, catalogue pour les inscriptions à partir du 06/10/2026
  (les commerces déjà inscrits gardent leur prix). Réglages dans `/admin` → Tarifs → « Code parrain et prix catalogue » ;
  « Non » = prix actuels pour tous (le code ne donne alors aucune remise).

## Programme des commerciaux

- **Le commercial crée lui-même son compte** sur `https://kaislo.com/commercial/` (bouton « Créer mon compte » ; lien direct
  `/commercial/?inscription=1`) : nom, numéro, e-mail facultatif, code PIN à 6 chiffres. Son **code parrain est généré
  automatiquement** (ex. `AWA42`). La demande reste « en attente » : dans `/admin` → Commerciaux (pastille sur le menu), l'équipe
  la **valide** ou la **refuse**. Tant qu'elle n'est pas validée, il ne peut pas se connecter et son code n'est pas accepté.
  L'équipe peut aussi créer un commercial à la main (« + Commercial », code automatique si le champ est vide).
- Le commerçant saisit le code à l'inscription, ou s'inscrit avec le lien `https://kaislo.com/app/?inscription=1&ref=CODE`.
- Commission : 25 % de ce que paie le client pendant 12 mois (une ligne par mois payé). Rien n'est payable avant la
  **validation** (6 mois payés + des ventes chaque semaine, contrôlé par le système ; l'équipe peut passer outre).
  Ensuite : mois 1 à 6 « à payer » d'un coup, puis chaque mois. « Client arrêté » annule les commissions en attente.
- Versements : cocher les commissions → « Marquer comme versé ». Primes par palier (10 et 25 clients validés),
  montants à définir dans « Règles ».
- **Bonus hebdomadaire** : 10 000 FCFA la semaine (lundi → dimanche, selon la date d'inscription) où au moins 5 clients ont
  *démarré* (3 articles et 1 vente dans les 7 jours qui suivent l'inscription). Nombre et montants dans « Règles » ; le suivi
  des 8 dernières semaines est dans la fiche du commercial (bouton « Verser » une fois la semaine terminée) et dans son espace.
- Le commercial suit tout dans son espace : `https://kaislo.com/commercial/` (numéro + code PIN).
- **Contrat** : après validation du compte, fiche du commercial → carte « Contrat » → « Mettre le contrat à disposition ». Le contrat
  (numéro `KC-AAAA-NNNN`, règles figées à cet instant : commission, bonus, primes) apparaît dans l'espace du commercial, qui le lit
  en PDF puis appuie sur « J'ai lu et j'accepte » (date enregistrée, visible dans sa fiche). Le PDF est fabriqué dans le navigateur
  (`src/lib/export/contrat-commercial.js`) ; la société (nom, adresse, immatriculation) vient de `SOCIETE` dans `src/config.js`.
  Le modèle de contrat est un point de départ : à faire relire par un juriste local avant usage.
- Page de recrutement : `/devenir-commercial/`.

## Boutique en ligne (vitrine par commerçant)

- Le gérant active sa boutique dans **Compte → Boutique en ligne** (adresse `kaislo.com/boutique/?b=nom`, WhatsApp qui reçoit les commandes,
  présentation, livraison) et coche **« Vendre en ligne »** dans la fiche des articles à publier.
- Le client choisit ses articles (options comprises), saisit son nom et son numéro, puis **WhatsApp s'ouvre avec la commande déjà écrite**
  à envoyer au commerçant. Kaislo n'encaisse rien : le client paie le commerçant comme d'habitude.
- La commande est aussi enregistrée (table `commandes_en_ligne`) : **Compte → Commandes en ligne** (statuts, WhatsApp au client,
  « Ouvrir dans la caisse » qui reprend les articles dans le panier pour que ventes et stock restent justes).
- Le serveur recalcule les prix (jamais ceux du navigateur) ; seuls les articles cochés sont visibles, sans prix d'achat ni stock ;
  limite d'envois par adresse IP et champ piège contre les robots. La page n'a ni suivi publicitaire ni référencement Google.
- **Démo** : la boutique est activée dans les deux commerces de démo (`/boutique/?demo=chez-sentinelle`, articles cochés « Vendre en ligne »).
  La commande du visiteur reste dans l'appareil et apparaît dans Compte → Commandes en ligne de la démo (avec deux commandes d'exemple) ;
  le message WhatsApp s'ouvre sans destinataire. Code : `src/lib/donnees/boutique-demo.js`.
- **Annuaire pour les clients** : `kaislo.com/boutiques/` (lien dans le menu, le pied de page et un bandeau de l'accueil français) liste les
  boutiques actives, rangées par rayon (restauration, alimentation, mode et beauté, téléphonie, maison, papeterie), avec 4 articles en
  exemple, une recherche (boutique, article, ville) et un filtre par pays. Un clic ouvre la boutique : la commande part ensuite
  directement sur le WhatsApp de CETTE boutique. **Seules les boutiques du pays du visiteur sont affichées** (et envoyées par l'API) : pays
  choisi (cookie `kaislo_pays`), sinon fuseau horaire puis adresse IP (même détection que les tarifs, `api/lib/pays.php`) ; liste de pays et
  « Utiliser ma position » pour changer ; sans pays connu, la page demande de choisir. Le gérant choisit d'y figurer (case dans Compte → Boutique en ligne, cochée par défaut) ;
  le numéro WhatsApp n'apparaît pas dans la liste. API : `GET /api/public/boutiques?pays=CI`. La page est dans le sitemap.
- Code : `api/lib/boutique.php`, `src/components/site/Boutique.jsx`, `src/components/app/feuilles/FeuillesBoutique.jsx`,
  `src/lib/donnees/boutique.js` ; tests `tests/api-boutique.test.mjs` et `tests/boutique.test.mjs`.

## Numéros de téléphone

Chaque commerce et chaque utilisateur est identifié par son numéro, enregistré au **format international**
(ex : `+225 07 12 34 56 78`) selon les règles du pays (`src/lib/donnees/telephone.js` et `api/lib/telephone.php`,
à garder identiques). Un numéro ne peut appartenir qu'à un seul commerce. Pour ajouter un pays : compléter les deux fichiers.

## Contacts du téléphone

Bouton « Choisir dans mes contacts » à côté des numéros de clients (client à distance et reçu WhatsApp à la caisse, nouveau client, client du crédit). Il utilise le **sélecteur de contacts du navigateur** (`src/lib/contacts.js`, `BoutonContacts.jsx`) : disponible sur **Chrome pour Android** (et l'application installée), absent sur iPhone/Safari et sur ordinateur, où le bouton n'apparaît pas et la saisie reste comme avant. Kaislo ne lit jamais tout le répertoire : le téléphone affiche sa propre fenêtre, la vendeuse touche un contact, et seuls son nom et ses numéros arrivent dans la fiche en cours (un contact avec plusieurs numéros : elle choisit le bon). Rien n'est copié ailleurs.

## Demi-carton et virement à la caisse

- **Demi-carton** : dans la fiche article (Vendre aussi en gros → « Vendre aussi au demi-carton »), prix propre ou moitié du carton par défaut. En mode Gros, un bouton « ½ » apparaît sur la tuile ; la ligne s'appelle « Coca (demi-carton de 12) », garde son prix, sort la moitié du contenu du stock, et n'a jamais de minimum. Sur le lien privé des grossistes, c'est un article de plus (identifiant `…:demi`). « Ouvrir dans la caisse » reprend les demi-cartons d'une commande.
- **Virement à la caisse** (un client paie la vendeuse par virement bancaire) : Réglages → Profil → « Accepter les virements bancaires » ajoute le moyen « Virement » (icône banque). La vendeuse peut noter le nom ou la référence (affichée dans l'historique) ; les virements sont comptés à part dans les comptes du soir, jamais avec les espèces. Distinct du virement d'abonnement (client → Kaislo), voir plus bas.

## Mode illustré (utiliser Kaislo sans lire)

Pour les vendeuses qui lisent peu : **Compte → Mode illustré** (réglage de ce téléphone). La caisse montre de grandes photos (ou une grande icône) avec le prix en gros chiffres, des photos dans le panier avec de gros boutons + et −, des moyens de paiement plus grands, et le bouton de validation plus haut. La **voix** (synthèse vocale du téléphone, `src/lib/voix.js`, rien n'est envoyé nulle part) dit l'article touché (« Attiéké, 3000 francs CFA »), le total sur demande (bouton haut-parleur), la monnaie à rendre et « Vente enregistrée ». Photos des articles : plus elles sont présentes, plus c'est simple (fiche article → photo, ou import).

## Paiement par virement et prix en euros

La page Tarifs propose « Prix en euros (€) » (colonne EUR de la grille). Dans l'application, Compte → Abonnement affiche « ou 20 € en euros (virement) » et le bouton **Payer par virement bancaire** : comptes de l'équipe (Espace Amorac → Tarifs → Comptes bancaires pour les virements), montant exact dans la devise du compte, référence `KAISLO-code` à écrire dans le motif, « J'ai fait le virement » (message à l'équipe). L'équipe enregistre ensuite le paiement avec le moyen « Virement » (`api/lib/virement.php`).

## Une page par boutique pour Google

Chaque boutique ouverte, publique (case « Afficher ma boutique sur kaislo.com/boutiques ») et avec au moins un article a une vraie page : `kaislo.com/boutique/nom-du-commerce/`. Le site est un export statique, donc le serveur écrit cette page à la demande (`api/lib/boutique-page.php`) : il prend la vitrine `boutique/index.html` et y met le titre, la description, l'adresse canonique, l'aperçu de partage, des données structurées (commerce local, fil d'Ariane, liste d'articles avec prix en XOF/XAF/MAD/EUR…) et le même contenu en HTML simple, que la vitrine retire dès qu'elle démarre. Réécritures dans `public/.htaccess` ; plan du site `kaislo.com/sitemap-boutiques.xml` (écrit par l'API, annoncé dans `robots.txt` ; les photos des articles restent lisibles par Google malgré `Disallow: /api/`).
- Boutique cachée de l'annuaire ou sans article : la page sert la vitrine en `noindex`. Boutique inconnue, fermée ou suspendue : vraie erreur 404.
- L'ancienne forme `/boutique/?b=nom` (liens déjà partagés) continue de marcher, en `noindex` ; le numéro WhatsApp du commerçant n'est jamais dans la page pour Google.
- Si un commerçant change l'adresse de sa boutique, l'ancienne adresse devient une 404 (pas de redirection).
- Le dossier du site se trouve tout seul (`dirname(api)`) ; la clé facultative `DossierSite=` du `.env` le force (utilisée par les tests).
- Après le déploiement : renvoyer `sitemap-boutiques.xml` dans la Search Console.

## Discussions en direct (clients ↔ commerçants)

La vitrine d'une boutique (`/boutique/?b=…`) a une bulle « Discuter » (`src/components/site/ChatBoutique.jsx`). Le visiteur n'a pas de compte : son navigateur garde un identifiant aléatoire, dont seule l'empreinte est stockée (`chats_clients`, `chats_messages`, voir `api/lib/chat.php`). Le gérant répond dans l'écran **Discussions** de l'application ; un nouveau message déclenche une notification push (au plus une toutes les 5 minutes par conversation) et une pastille dans le menu. « En direct » = relève toutes les 4 s tant que la fenêtre est ouverte (30 s fermée, 8 s pour la liste du gérant), rien en arrière-plan (`src/lib/sondage.js`) : pas de WebSocket, donc rien de plus à installer sur l'hébergement mutualisé. Désactivable par le commerçant (Compte → Boutique en ligne), blocage d'un visiteur possible, limites : 20 messages / 10 min par visiteur, 15 nouvelles conversations par adresse IP. La messagerie commerçant ↔ équipe Kaislo (écran Aide) relève maintenant toutes les 6 s.

## Notifications : résumé du soir et nouvelles commandes

Le serveur prévient chaque gérant par **e-mail** et/ou **WhatsApp** (code : `api/lib/notifications.php`, écran : Compte → Notifications, gérant seulement) :
- **Résumé du soir** (heure au choix, 19 h à 23 h, 21 h par défaut, heure locale du pays du commerce) : ventes du jour, panier moyen, marge, modes de paiement,
  plus vendus, dépenses, crédits à récupérer, commandes en ligne à traiter, stock bas. Pas de message pour un commerce sans aucune vente depuis 7 jours.
- **Nouvelle commande en ligne** : message tout de suite, avec le client, l'adresse et les articles.
- **Selon ce que le compte permet** : l'e-mail part si le commerce a une adresse (Réglages → Commerce) ; WhatsApp part seulement si le gérant l'a activé (son accord)
  et si le commerce a un numéro et que Kaislo a configuré l'API WhatsApp (sinon l'écran affiche « Bientôt disponible »). Un bouton envoie un essai.
- Réglages du gérant : `d.commerce.notifications` (`resume`, `heure`, `email`, `whatsapp`, `commandes`), envoyés au serveur par la synchronisation. Historique : table `notifications`.

**Notifications push (téléphone, même application fermée)** : gratuites, sans compte à ouvrir. Le gérant les autorise appareil par appareil (Compte → Notifications → « Sur cet appareil » ; sur iPhone, d'abord ajouter Kaislo à l'écran d'accueil). Le serveur envoie un signal vide signé (clé VAPID créée toute seule au premier usage et gardée dans `reglages_amorac`, clé « vapid ») aux services des navigateurs (Google, Mozilla, Apple, Microsoft) ; le texte de la notification reste chez Kaislo et c'est l'appareil qui vient le lire (`public/sw.js`, `api/lib/push.php`) : aucune donnée du commerce ne passe par ces services. Reçus par le gérant : résumé du soir, nouvelles commandes en ligne. Rien à configurer côté serveur (l'extension PHP OpenSSL suffit) ; le résumé du soir part en push dès qu'un appareil est abonné, même sans adresse e-mail, grâce à la tâche horaire ci-dessous.

**À faire une seule fois (serveur) :**
1. `.env` : ajouter `CleCron=` suivie d'une clé secrète de 12 caractères ou plus.
2. Déclencher chaque heure `POST https://kaislo.com/api/cron/notifications` avec l'en-tête `X-Cle-Cron: <la clé>` (ou `?cle=<la clé>` dans l'adresse). Deux façons :
   - hPanel → Avancé → **Tâches Cron** → toutes les heures : `curl -s -X POST -H "X-Cle-Cron: LA_CLE" https://kaislo.com/api/cron/notifications > /dev/null` ;
   - ou le workflow GitHub « Résumés du soir » : créer le secret `CLE_CRON` (Settings → Secrets and variables → Actions) avec la même clé.
3. Un commerce n'est jamais servi deux fois le même jour (colonne `commerces.resume_envoye_le`).

**WhatsApp (API WhatsApp Business de Meta, à activer quand vous êtes prêt) :**
1. Créer l'application et le numéro d'envoi dans Meta Business (WhatsApp Cloud API), et garder le **jeton permanent** et l'**identifiant du numéro**.
2. `.env` : `WhatsAppToken=` (jeton) et `WhatsAppNumeroId=` (identifiant du numéro). Facultatif : `WhatsAppModeleResume=` et `WhatsAppModeleCommande=`
   (par défaut `kaislo_resume_soir` et `kaislo_nouvelle_commande` ; la version anglaise ajoute `_en`).
3. Faire approuver par Meta (catégorie « Utilitaire ») les modèles, en français (`fr`) et en anglais (`en`) :
   - `kaislo_resume_soir` : « Bonjour, voici le résumé de {{1}} pour le {{2}} : ventes {{3}}, dépenses {{4}}, crédits à récupérer {{5}}, stock : {{6}}. Détails dans votre e-mail ou dans Kaislo. »
   - `kaislo_nouvelle_commande` : « Nouvelle commande n° {{1}} de {{2}} pour {{3}}. Livraison : {{4}}. Ouvrez Kaislo → Compte → Commandes en ligne. »
4. Sans ces lignes, WhatsApp n'est simplement pas proposé : rien ne casse. Les messages WhatsApp d'une entreprise sont facturés par Meta à la conversation : voir sa grille de prix.

**Essayer sans rien envoyer :** `NotificationsMode=test` dans le `.env` (tests, `npm test`) : chaque message est seulement noté dans la table `notifications`.

## Avant l'ouverture au public (production)

- [ ] Acheter `kaislo.com`, le relier à Hostinger (hPanel → Domaines) et activer le certificat SSL.
- [ ] `.env` du serveur complet (`Db`, `User`, `Password`, `CleAdmin`, `EmailEquipe`, `EmailExpediteur`) et **jamais** dans Git.
- [ ] Premier compte Amorac créé dans `/admin`, puis changer ou retirer `CleAdmin` du `.env`.
- [ ] `src/config.js` : informations de la société (`SOCIETE`). Le numéro WhatsApp (`CONTACT_WHATSAPP` et `CONTACT_WHATSAPP_AFFICHE`, +212 775 06 51 46) est provisoire : à remplacer par le numéro définitif dans `src/config.js`, puis régénérer le code QR (`outils/affiches/qr-whatsapp.svg`, adresse `https://wa.me/<numéro>`) et les affiches.
- [ ] Tarifs en EUR, CAD, USD et GNF : conversions provisoires à confirmer dans `/admin` → Tarifs.
- [ ] Montants des primes des commerciaux : `/admin` → Commerciaux → Règles.
- [ ] Sauvegardes : hPanel → Bases de données → sauvegarde automatique activée ; exporter la base (phpMyAdmin) avant chaque grosse mise à jour.
- [ ] Après chaque publication : ouvrir `/api/sante` (`versionBase` à jour) et tester une connexion.
- Sécurité déjà en place : HTTPS forcé, en-têtes de sécurité (`public/.htaccess`), PIN et mots de passe chiffrés,
  limitation des tentatives de connexion, API jamais mise en cache par l'application.

**Tester l'API sur l'ordinateur :** PHP 8.1+ avec une base SQLite de test :
`.env` de test avec `DbDriver=sqlite`, puis `php -S 127.0.0.1:4320 api/index.php`.

## Rapport d'activité (Excel et PDF)

Réglages → « Vos données » → « Rapport d'activité », ou le bouton « Exporter » du tableau de bord (gérant). Période au choix : jour, semaine (lundi → dimanche), mois, année, avec navigation vers les périodes passées.
- **Excel (.xlsx)** : un vrai classeur (exceljs) avec un onglet Résumé (chiffre d'affaires, tickets, panier moyen, remises, reçu, crédit, dépenses, solde, marge, annulations, paiements) puis ventes, articles, évolution, vendeurs, dépenses, crédits remboursés et dus, journées de vente, stock. Montants et dates sont de vrais nombres/dates, en-tête figé, filtres, totaux, mise en page A4 paysage.
- **PDF** (jsPDF) : synthèse, graphique, tableaux ; détail des tickets pour le jour et la semaine.
- Les chiffres sont calculés par `src/lib/donnees/rapport.js`, avec les mêmes règles que le tableau de bord et la fermeture de la journée (ventes annulées exclues, crédit ≠ argent reçu) ; `tests/rapport.test.mjs` et `tests/export-rapport.test.mjs` le vérifient. Sur téléphone, le fichier passe par la feuille de partage (WhatsApp, e-mail, Fichiers).

## Référencement : guides et modèles Excel

- `src/lib/guides.js` : les guides pratiques (FR + EN), un par entrée. Ajouter une entrée crée la page (`/guides/<slug>/`, `/en/guides/<slug>/`), le plan du site, les liens hreflang et les données structurées (Article, FAQ, fil d'Ariane).
- `scripts/modeles.mjs` : régénère les modèles Excel gratuits de `public/modeles/` (inventaire, suivi des ventes), liés depuis les guides.
- Après chaque changement : `npm run build && npm run seo` (titres ≤ 65 caractères avec « | Kaislo », descriptions 50–160, un seul h1, canonique, sitemap).

## Session et verrouillage (téléphone)

- La session reste ouverte (jeton valable 90 jours, renouvelé à chaque utilisation) ; l'application demande le stockage persistant au navigateur pour que ses données ne soient pas effacées.
- Après la première connexion par code PIN, Kaislo propose d'activer l'empreinte / Face ID (redemandé à chaque ouverture tant qu'il n'est pas activé). Une fois activé, l'application se verrouille à chaque réouverture et après 2 minutes en arrière-plan : empreinte / Face ID (vérifiés dans le téléphone, sans internet), ou code PIN en secours. Voir `src/components/app/VerrouApp.jsx` et `src/store/session.js`.
- Les lectures (GET) de l'API sont retentées une fois en cas de coupure réseau brève.

## Applications installées (PWA) : commerces, équipe Amorac, commerciaux

Trois manifestes, un par espace : `public/manifest.webmanifest` (`/app/`), `manifest-admin.webmanifest` (`/admin/`) et `manifest-commercial.webmanifest` (`/commercial/`), chacun avec son `id`, son `start_url` et son `scope`. Installer depuis `/admin/` ou `/commercial/` ouvre donc cette page, et non l'application des commerces. L'accueil du site (`/`, `/en/`), ouvert en mode application, renvoie vers le dernier espace utilisé (sinon `/app/`). La session de l'espace Amorac reste limitée à l'onglet/à l'ouverture (sécurité) : l'application affiche alors la connexion de l'équipe ; l'espace commercial garde la connexion 30 jours.

`src/lib/guides-pays.js` génère un guide par pays (15) à partir des données réelles du pays (devise, moyens de paiement, ville, commerces courants, prix), en français et en anglais : `/guides/gerer-son-commerce-<pays>/`, `/en/guides/running-a-business-in-<country>/`. Pas d'information juridique : ils renvoient vers les autorités locales.

## Métiers réglementés

Les métiers soumis à une réglementation propre (pharmacie…) ne sont plus proposés : ni à l'inscription (`TYPES_COMMERCE` dans `src/lib/donnees/modeles.js`, `TYPES_COMMERCE_OFFERTS` dans `api/lib/outils.php`), ni sur le site (pages, guides, textes). Les commerces déjà inscrits sous ce type (`TYPES_ANCIENS`) continuent de fonctionner avec la même formule de prix. Les anciennes adresses du site sont redirigées vers l'accueil ou les guides (`scripts/anciennes-adresses.mjs`, `.htaccess`).

## Vidéos marketing humoristiques (TikTok, Facebook Reels, WhatsApp)

`npm run build`, puis `npm run videos -- promo` : quatre vidéos verticales « le commerçant à l'ancienne contre le commerçant Kaislo » (le carnet de crédit qui disparaît, la caisse comptée pendant 2 heures, la photo floue pour le comptable, le face à face) avec la vraie application et le message clé « Kaislo fait les calculs à votre place. Votre entreprise tient dans votre poche. ». Ces vidéos sont destinées à la PUBLICITÉ, pas au site : elles ne vont jamais dans `public/videos/` (dossier publié avec le site) mais dans `outils/videos-pub/` (avec la voix, edge-tts : voir l'en-tête de `scripts/videos-demo.mjs`) ou `outils/videos-essai/` avec `--essai` (sans voix, musique et sous-titres seulement). Le dossier `outils/` n'est pas versionné. Les répliques sont dans `scripts/videos-demo.mjs`, section « VIDÉOS MARKETING ». Chaque vidéo existe en français (`promo-carnet-credit`, `promo-caisse-2h`, `promo-comptable`, `promo-face-a-face`) et en anglais (`promo-lost-notebook`, `promo-till-2h`, `promo-accountant`, `promo-head-to-head`) : l'application est alors tournée en anglais et la voix est britannique (`en-GB-SoniaNeural`). Les textes des deux langues sont dans l'objet `PROMO`.

## Va-et-vient entre le site et les tableaux de bord

Les espaces Amorac (`/admin/`) et commercial (`/commercial/`) ont un bouton « Voir le site » (menu « Plus » sur téléphone, bas du menu sur ordinateur, en-tête de l'espace commercial) qui ouvre l'accueil public (`/?site=1`) sans être renvoyé aussitôt dans son espace ; le souvenir dure le temps de l'onglet. Sur le site, « Mon espace » (en-tête) ramène au tableau de bord et remet la redirection automatique. Fonctionne aussi dans l'application installée. Logique : `src/lib/espace.js`.

## Suivi des inscriptions Google Ads

Pour savoir quelles publicités amènent de vrais commerces. **Tant que `GOOGLE_ADS_ID` est vide (`src/config.js`), rien n'est chargé et aucun bandeau n'apparaît.**

1. Google Ads → Outils → Mesure → Conversions → Nouvelle action de conversion → Site web. Catégorie « Inscription » ; saisissez une valeur de 0 ou une valeur estimée. Google affiche un identifiant `AW-1234567890` et une **étiquette de conversion** (par exemple `AbC-D_efG-h12345`).
2. Copiez-les dans `src/config.js` : `GOOGLE_ADS_ID` et `GOOGLE_ADS_INSCRIPTION` (ou donnez-les au build : `NEXT_PUBLIC_GOOGLE_ADS_ID`, `NEXT_PUBLIC_GOOGLE_ADS_INSCRIPTION`). Rebâtissez et déployez.
3. Un bandeau « Accepter / Refuser » apparaît alors aux visiteurs (jamais dans `/admin/` ni `/commercial/`). La balise Google (`gtag.js`) ne se charge **qu'après l'accord**, au repos, après le chargement de la page (pas d'effet sur la vitesse). Un refus est gardé (`kaislo-mesure`).
4. Quand quelqu'un crée son commerce (`inscrire()` dans `src/store/session.js`), `suivreInscription()` envoie la conversion et un événement `sign_up`. Aucune donnée de vente, de client ou de commerce n'est envoyée.
5. Vérifiez avec Google Tag Assistant (tagassistant.google.com) : visitez le site, acceptez, créez un commerce de test, et contrôlez que la conversion apparaît.

### Pixel Meta (Facebook et Instagram)

Le pixel Meta `2023668061621044` est branché sur **le même bandeau et le même accord** que Google Ads (`FACEBOOK_PIXEL_ID` dans `src/config.js`, ou `NEXT_PUBLIC_FACEBOOK_PIXEL_ID` au build ; vide = désactivé). Il n'est donc **pas collé tel quel dans le HTML** : le code de Facebook collé dans la page se chargerait avant l'accord du visiteur, ce que la page Confidentialité promet de ne pas faire.

- Le script `connect.facebook.net/en_US/fbevents.js` se charge au repos, **après l'accord**, jamais dans `/admin/` ni `/commercial/`.
- Événements envoyés : `PageView` (page vue) et `CompleteRegistration` (inscription d'un commerce). La détection automatique des boutons et des formulaires est coupée (`autoConfig` à `false`) : aucune donnée de commerce, de client ou de formulaire n'est transmise.
- La partie `<noscript>` du code Facebook (image de suivi pour les visiteurs sans JavaScript) n'est pas reprise : elle enverrait des données sans accord.
- La politique de sécurité (`public/.htaccess`) autorise `connect.facebook.net` et `www.facebook.com`.
- Dans Meta Events Manager, vérifiez avec l'extension « Meta Pixel Helper » : acceptez le bandeau, puis créez un commerce de test.

Fichiers : `src/lib/mesure.js` (logique), `src/components/site/BandeauMesure.jsx` (bandeau), `public/.htaccess` (la politique de sécurité autorise `googletagmanager.com` et les domaines de conversion Google), pages Cookies et Confidentialité (mises à jour automatiquement quand l'identifiant est rempli). Tests : `tests/mesure*.test.mjs`.

## Vitesse : images et cache

- **Images à la bonne taille** : `npm run images` (`scripts/images.mjs`) fabrique, pour chaque capture de `public/captures/` et chaque affiche de `public/videos/`, des versions réduites (`…-480`, `-800`, `-1200` ; `…-390`, `-600` pour les téléphones). Le site choisit la bonne selon l'écran (`srcset`, `src/lib/images-site.js`) : un téléphone télécharge environ 200 Ko d'images sur l'accueil au lieu d'environ 550 Ko. **À relancer après `npm run captures` ou `npm run videos`** (le test `tests/images-site.test.mjs` échoue s'il manque une version réduite).
- **Cache long** : les images et vidéos de `captures/`, `videos/`, `icons/` et `logo/` portent le numéro de la publication dans leur adresse (`?v=…`, `src/config.js` et `next.config.mjs`) ; `public/.htaccess` les fait garder 1 an par le navigateur. Une nouvelle image s'affiche tout de suite après une publication, puisque son adresse change. Les autres images (photos de la démo, image de partage, icônes du manifeste) sont gardées 30 jours ; les pages restent toujours à jour (`no-cache`).

## Vitesse : CSS et JavaScript

- **CSS bloquant** : après le build, `scripts/css-critique.mjs` (étape `postbuild`) place dans chaque page le CSS utile au premier écran et charge le fichier complet sans bloquer l'affichage.
- **JavaScript inutile** : le dictionnaire anglais (140 Ko) n'est plus téléchargé par les pages françaises. Il est livré par les pages `/en/` (`src/lib/i18n/charge-en.js`, importé par chaque page anglaise) et chargé à la demande dans l'application quand la langue est l'anglais. Une nouvelle page anglaise doit donc commencer par `import '@/lib/i18n/charge-en';`.

## Logo pour Google Ads

`npm run build` puis `npm run logos-ads` : crée dans `outils/logos-ads/` le logo carré 1200×1200 et paysage 1200×300 (PNG, fond blanc et transparent).

## Captures dans la devise du visiteur

Les captures du site existent en six devises : `nom.webp` (FCFA, par défaut), `nom-mad.webp`, `-gnf`, `-eur`, `-cad`, `-usd`. Le composant `ImageCapture` choisit la bonne version selon le pays du visiteur (même détection que les tarifs : pays choisi, puis adresse IP, fuseau horaire, langue). La page est écrite avec la version FCFA, remplacée sur l'appareil du visiteur.
`npm run build` puis `npm run captures` refait les 54 captures (chaque devise via `?pays=`), puis `npm run images` fabrique les versions réduites. Les vidéos de démonstration suivent la même règle (`demo-restaurant-eur.mp4`, affiches comprises) : `npm run videos -- --devise=EUR` (ou MAD, GNF, CAD, USD) refait les cinq vidéos du site dans cette devise, avec les montants saisis convertis et, hors FCFA, un paiement par carte à la place de Wave. Sans accès à la voix de Microsoft, `VOIX_MOTEUR=piper PIPER_MODELE=/chemin/fr_FR-siwis-medium.onnx` utilise la voix Piper (pip install piper-tts) ; les vidéos en FCFA d'origine gardent la voix Vivienne.

## Pages « avec redirection » dans Search Console

Ce motif est normal pour une ancienne adresse : Google n'indexe pas une page qui redirige, il indexe sa destination. À surveiller seulement si une adresse du **plan du site** ou d'un lien interne y figure (`npm run seo` vérifie que le plan du site ne contient aucune redirection).
- Anciennes adresses d'activité (`/caisse-restaurant/`… vers `/gestion-restaurant/`), `http://` vers `https://`, `www.` vers `kaislo.com`, `…hostingersite.com` vers `kaislo.com` : redirections 301 voulues (`public/.htaccess`).
- Pages retirées (pharmacie) : réponse « 410 Gone », sans redirection vers l'accueil (Google la rangerait parmi les pages avec redirection ou les soft 404) ; le fichier de secours `scripts/anciennes-adresses.mjs` est une page `noindex` sans redirection.
- Ancienne adresse `/videos/` : 301 vers `/tutoriels/`.
