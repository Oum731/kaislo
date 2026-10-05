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
- Plan du site `/sitemap.xml` sans fausses dates ; `robots.txt` ferme `/app/`, `/admin/`, `/commercial/` et `/api/`.
- **Pages par pays** (`/pays/cote-d-ivoire/`, `/pays/senegal/`… 15 pays) : devise, modes de paiement, numéros de téléphone et prix réels du pays (`src/lib/pays-seo.js`).
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

## Tarifs et postes

- Une **formule par métier** (`src/lib/donnees/tarifs.js` et `api/lib/tarifs.php`, à garder identiques ; modifiables
  ensuite dans `/admin` → Tarifs). Chaque formule comprend **1 poste avec 5 vendeurs au maximum**, plus le gérant.
- **Poste** = l'appareil relié à l'imprimante (Réglages → Postes). Chaque vendeur est affecté à un poste ; ses tickets
  (et ses envois en cuisine) s'impriment sur l'imprimante de ce poste. Sur l'appareil du poste : Réglages → Postes →
  « Cet appareil imprime les tickets du poste… » + imprimante Bluetooth connectée, application ouverte
  (synchronisation toutes les 5 secondes).
- Paiement annuel : 2 mois offerts. Tarif fondateur : −20 % à vie, 20 places (case dans la fiche du commerce).
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
- Le commercial suit tout dans son espace : `https://kaislo.com/commercial/` (numéro + code PIN).
- Page de recrutement : `/devenir-commercial/`.

## Numéros de téléphone

Chaque commerce et chaque utilisateur est identifié par son numéro, enregistré au **format international**
(ex : `+225 07 12 34 56 78`) selon les règles du pays (`src/lib/donnees/telephone.js` et `api/lib/telephone.php`,
à garder identiques). Un numéro ne peut appartenir qu'à un seul commerce. Pour ajouter un pays : compléter les deux fichiers.

## Avant l'ouverture au public (production)

- [ ] Acheter `kaislo.com`, le relier à Hostinger (hPanel → Domaines) et activer le certificat SSL.
- [ ] `.env` du serveur complet (`Db`, `User`, `Password`, `CleAdmin`, `EmailEquipe`, `EmailExpediteur`) et **jamais** dans Git.
- [ ] Premier compte Amorac créé dans `/admin`, puis changer ou retirer `CleAdmin` du `.env`.
- [ ] `src/config.js` : vrai numéro WhatsApp (`CONTACT_WHATSAPP`) et informations de la société (`SOCIETE`).
- [ ] Tarifs en EUR, CAD, USD et GNF : conversions provisoires à confirmer dans `/admin` → Tarifs.
- [ ] Montants des primes des commerciaux : `/admin` → Commerciaux → Règles.
- [ ] Sauvegardes : hPanel → Bases de données → sauvegarde automatique activée ; exporter la base (phpMyAdmin) avant chaque grosse mise à jour.
- [ ] Après chaque publication : ouvrir `/api/sante` (`versionBase` à jour) et tester une connexion.
- Sécurité déjà en place : HTTPS forcé, en-têtes de sécurité (`public/.htaccess`), PIN et mots de passe chiffrés,
  limitation des tentatives de connexion, API jamais mise en cache par l'application.

**Tester l'API sur l'ordinateur :** PHP 8.1+ avec une base SQLite de test :
`.env` de test avec `DbDriver=sqlite`, puis `php -S 127.0.0.1:4320 api/index.php`.
