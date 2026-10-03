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
5. À chaque mise à jour : changer `VERSION` dans `public/sw.js`, refaire `npm run build`, renvoyer `out/`

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
| `src/app/` | Les pages : accueil du site, pages restaurant / épicerie, `/app` |
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

## Vidéos de démonstration

Les 5 vidéos de `public/videos/` (présentation, restaurant, épicerie, ajout d'articles, vendeurs)
sont tournées automatiquement dans la vraie démo, avec voix off (Vivienne) et musique composée par le script.

```
pip install edge-tts      # une seule fois : la voix
npm run build
npm run videos            # toutes les vidéos (environ 15 min la première fois)
npm run videos -- produits   # une seule vidéo
```

Textes dits et sous-titres : `scripts/videos-demo.mjs` (fonction `titre(p, sous-titre, phrase dite)`).
Les phrases déjà fabriquées sont gardées dans `outils/voix-cache/`.
Note : la voix passe par le service de lecture à voix haute de Microsoft Edge (outil edge-tts, non officiel).
Pour un usage commercial à grande échelle, prévoir les mêmes voix via Azure Speech (offre gratuite disponible).

## Hébergement Hostinger (site + API PHP)

Domaine provisoire : https://darkgrey-albatross-393608.hostingersite.com

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

**Publier :** `npm run publier-hostinger` (site + API envoyés sur la branche `hostinger` de GitHub).

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

## Programme des commerciaux

- Dans `/admin` → Commerciaux : créer un commercial (nom, téléphone, **code parrain**, taux, code PIN à 6 chiffres).
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
