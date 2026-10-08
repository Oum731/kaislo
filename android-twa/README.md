# Kaislo pour Android (coque TWA)

Cette application Android est une **coque** : elle ouvre `https://kaislo.com/app/` en plein écran, sans barre d'adresse, comme une vraie application (technologie Google « Trusted Web Activity »). Aucun écran n'est recopié :

- le site, l'API et l'hébergement Hostinger **ne changent pas** ;
- chaque mise à jour du site arrive tout de suite dans l'application, **sans republier sur Google Play** ;
- ce dossier est indépendant du site : il n'est ni compilé par `npm run build`, ni envoyé sur Hostinger.

> **État** : le projet est prêt mais **n'a pas encore été compilé** (aucun Android SDK dans l'environnement où il a été préparé). Le premier « Build » sur votre ordinateur dira si un numéro de version doit être ajusté ; Android Studio le propose en un clic.

## Ce qu'il y a dans ce dossier

| Élément | Rôle |
|---|---|
| `app/` | Le projet Android (identifiant `com.kaislo.app`, adresse de départ, couleurs, icônes) |
| `play-store/` | Icône 512, image à la une 1024×500, 4 captures 1080×1920 et les textes de la fiche Google Play |
| `generer-visuels.mjs` | Refabrique les icônes et les visuels depuis les captures du site (`node android-twa/generer-visuels.mjs`) |
| `assetlinks.exemple.json` | Modèle du fichier qui relie le site à l'application (voir étape 4) |
| `twa-manifest.json` | Réglages équivalents pour l'outil en ligne de commande Bubblewrap (autre façon de compiler) |

## Les 5 étapes

### 1. Créer le compte développeur Google Play
https://play.google.com/console : 25 $ une seule fois, vérification d'identité (quelques jours). Choisissez « Compte personnel » ou « Organisation » (Amorac si la société est enregistrée ; une organisation demande un numéro D-U-N-S).

> Les comptes personnels créés récemment doivent d'abord faire tester l'application par **12 testeurs pendant 14 jours** avant de pouvoir publier pour tout le monde. Un compte « Organisation » évite cette étape. Prévoyez des amis ou des commerçants testeurs.

### 2. Produire le fichier à envoyer (`.aab`)

**Voie A, la plus simple (sans rien installer)** : https://www.pwabuilder.com
1. Saisissez `https://kaislo.com/app/`, puis « Package for stores » → Android.
2. Identifiant du package : `com.kaislo.app`. Laissez « Google Play signing » activé.
3. Téléchargez l'archive : elle contient le `.aab`, la clé et un `assetlinks.json`.

**Voie B, avec ce projet (contrôle total)** :
1. Installez Android Studio (https://developer.android.com/studio).
2. « Open » → choisissez ce dossier `android-twa`. Acceptez les mises à jour d'outils proposées.
3. Menu **Build → Generate Signed App Bundle** → *Android App Bundle*. Créez la clé de signature quand c'est demandé.
   **Gardez ce fichier de clé et ses mots de passe en lieu sûr, hors du dépôt** (`.gitignore` les exclut déjà). Sans la clé, plus aucune mise à jour possible.
4. Le fichier `app-release.aab` apparaît dans `app/release/`.

En ligne de commande (avec le SDK installé et `keystore.properties` renseigné) : `gradle bundleRelease`.

### 3. Envoyer sur Google Play
1. Console Play → « Créer une application » : nom « Kaislo : caisse et stock », français, application, gratuite.
2. Remplissez la fiche avec `play-store/fiche-google-play.md` et les images de `play-store/`.
3. Déclarations obligatoires (annonces, public cible, sécurité des données…) : réponses conseillées dans `fiche-google-play.md`.
4. Production (ou « Test fermé » au début) → créez une version → envoyez le `.aab` → laissez **Play App Signing** activé.

### 4. Relier le site à l'application (obligatoire)
Sans cette étape, l'application s'ouvre avec une barre d'adresse Chrome au lieu du plein écran.

1. Console Play → *Configuration → Intégrité de l'application → Signature d'application* : copiez l'**empreinte du certificat SHA-256** de la « clé de signature d'application ».
2. **Envoyez-moi cette empreinte** : j'ajoute `public/.well-known/assetlinks.json` au site (à partir de `assetlinks.exemple.json`), vous déployez `hostinger` et purgez le cache.
3. Vérifiez que `https://kaislo.com/.well-known/assetlinks.json` s'affiche dans un navigateur.

### 5. Tester sur un vrai téléphone Android
Installez la version de test depuis Google Play (lien de test interne) et vérifiez :
- plein écran, sans barre d'adresse ;
- connexion, vente, **impression Bluetooth** sur votre imprimante (le Bluetooth passe par Chrome : à valider avec l'imprimante réelle), ticket WhatsApp ;
- fonctionnement hors ligne, puis retour du réseau.

## Mises à jour
- Une modification du site ou de l'application web : **rien à faire**, elle apparaît dans l'application.
- Nouvelle version de la coque (icône, nom, version de l'outil) : augmentez `versionCode` et `versionName` dans `app/build.gradle`, refaites le `.aab`, envoyez-le.
- Google relève chaque année le niveau d'Android demandé (`targetSdk`) : si la console le réclame, changez `compileSdk` et `targetSdk` dans `app/build.gradle`.

## Et l'iPhone ?
Cette coque ne fonctionne que sur Android. Safari sur iPhone ne gère pas le Bluetooth web : pour l'iPhone et l'impression Bluetooth native, la suite logique est une application **Capacitor** (même application web emballée, avec le Bluetooth natif). Cela demande un Mac et un compte Apple (99 $ par an).
