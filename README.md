# Kaislo — Caisse pour restaurants, épiceries et boutiques

Site public (pour Google) + application de caisse, en **Next.js**.
Démo prête à présenter : un restaurant et une épicerie, tous deux nommés **Amorac Kaislo** (comme leurs gérants, vendeurs et clients), dans la devise du pays choisi.

> La version finale sera une vraie application mobile (Capacitor) reliée à un serveur Laravel.
> Dans cette version, les données restent **dans l'appareil** (pas encore de serveur).

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
| `ancienne-demo/` | L'ancienne démo (Alpine.js), gardée pour référence |

Trois fichiers sont prévus pour être remplacés plus tard :

- `src/lib/donnees/stockage.js` → appels à l'API Laravel
- `src/lib/donnees/images.js` → envoi des photos et logos sur le serveur (aujourd'hui : base d'images de l'appareil)
- `src/lib/impression/bluetooth-web.js` → Bluetooth natif dans l'app mobile (iPhone + imprimantes Bluetooth « classique »)

## Imprimante

Imprimante thermique Bluetooth **BLE**, 58 ou 80 mm, ESC/POS.
Dans le navigateur : **Chrome** (Android ou ordinateur). Sur iPhone, l'aperçu du ticket s'affiche à l'écran.

## Version de test en ligne (GitHub Pages)

Lien à donner aux clients : https://oum731.github.io/kaisly/

Pour mettre à jour ce lien après des modifications (arrêtez `npm run dev` avant) :

```
npm run publier-github
```

Le site est alors construit pour le sous-dossier `/kaisly` et envoyé sur la branche `gh-pages`.
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
`POST /api/verifier-gerant` (annulation), `POST /api/biometrie/defi|enregistrer|connexion` (empreinte / Face ID, norme WebAuthn).

**Fonctionnement :** chaque caisse garde une copie des données et marche sans internet ; les modifications partent
dans une file d'attente envoyée dès que possible (la plus récente gagne en cas de conflit). Les codes PIN ne sont
jamais sur les appareils des vendeurs : le serveur les garde chiffrés. La version GitHub Pages (`npm run publier-github`)
n'a pas de serveur : les comptes y restent dans le navigateur.
Les tables MySQL sont créées automatiquement au premier appel.

**Publier :** `npm run publier-hostinger` (site + API envoyés sur la branche `hostinger` de GitHub).

**Réglages à faire une seule fois dans hPanel :**
1. Avancé → Configuration PHP : PHP 8.1 ou plus récent.
2. Gestionnaire de fichiers : vider `public_html` (supprimer la page par défaut).
3. Avancé → GIT : dépôt `https://github.com/Oum731/kaisly.git`, branche `hostinger`, dossier vide → Créer, puis « Déployer ».
   Facultatif : activer le déploiement automatique et coller l'adresse du webhook dans GitHub → Settings → Webhooks.
4. Gestionnaire de fichiers : créer le fichier `.env` dans le dossier **au-dessus** de `public_html`
   (`domains/<domaine>/.env`), avec `Db`, `User`, `Password` (base MySQL créée dans hPanel).
   Le serveur MySQL est `localhost` sur Hostinger (clé `DbHost` seulement s'il est différent).
5. Vérifier : `https://<domaine>/api/sante` doit afficher `"ok":true`.

**Tester l'API sur l'ordinateur :** PHP 8.1+ avec une base SQLite de test :
`.env` de test avec `DbDriver=sqlite`, puis `php -S 127.0.0.1:4320 api/index.php`.
