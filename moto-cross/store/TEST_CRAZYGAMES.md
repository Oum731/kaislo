# Fiche de test avant envoi à CrazyGames

But : repérer ce qui pourrait faire refuser le jeu **avant** de le soumettre. Comptez 45 à 60 minutes.
Cochez chaque ligne ; en cas d'échec, notez-le dans « Compte rendu » (en bas) et voyez « Si ça échoue ».

> Les règles viennent de la documentation CrazyGames (liens dans `PUBLISHING.md`). Les libellés exacts du portail peuvent différer de ceux écrits ici : suivez l'esprit de chaque étape. En cas de doute, la documentation officielle fait foi.

## 0. Matériel et préparation (5 min)

- [ ] Un ordinateur avec **Chrome** et **Edge** (obligatoires), idéalement Firefox.
- [ ] Un **téléphone Android** et, si possible, un **iPhone** (Safari).
- [ ] Un deuxième appareil ou un deuxième profil de navigateur (pour tester la sauvegarde et le compte).
- [ ] Un compte développeur sur https://developer.crazygames.com et un compte joueur CrazyGames pour tester la connexion.
- [ ] Le dépôt à jour. Dans PowerShell :
```powershell
cd moto-cross
npm install
npm run preflight
```
Résultat attendu : **« Aucun point bloquant »** et `moto-cross.zip` créé. (Même contrôle automatique à chaque commit sur GitHub : onglet **Actions** ▸ dernière exécution ▸ **Artifacts** ▸ `moto-cross-crazygames`.)
- [ ] `VITE_LEADERBOARD_URL` est **vide** (le contrôle l'indique : « Classement en ligne désactivé »).

## 1. Essai local avec le SDK en mode « local » (10 min)

Le SDK reconnaît `localhost` / `127.0.0.1` comme un environnement local : pubs de démonstration (texte affiché par-dessus le jeu) et événements écrits dans la console. Sur une autre adresse, ajoutez `?useLocalSdk=true` à l'URL.

```powershell
npm run dev        # puis ouvrez http://localhost:5173 (ou affichez l'adresse donnée par la commande)
```
Ouvrez les outils du navigateur (**F12**) ▸ onglet **Console**, et ouvrez le jeu **dans une fenêtre de navigation privée** (sinon vous n'êtes pas un « nouveau joueur »).

| # | Étape | Résultat attendu | OK |
|---|---|---|---|
| 1.1 | Ouvrir la page | Écran « MOTO CROSS » avec roue qui tourne, puis disparition | ☐ |
| 1.2 | Regarder la console | Messages du SDK (initialisation, début/fin de chargement). **Aucune erreur rouge** | ☐ |
| 1.3 | Rien cliquer | Le jeu **démarre tout seul en course** (compte à rebours 3-2-1-GO) : un nouveau joueur n'a pas de menu à passer | ☐ |
| 1.4 | À « GO » | Un événement de **début de gameplay** apparaît dans la console | ☐ |
| 1.5 | Terminer la course (ou appuyer sur **R**) | Un événement de **fin de gameplay** apparaît (à l'arrivée **et** au redémarrage) | ☐ |
| 1.6 | Écran de fin | Boutons **REJOUER**, **MENU** et « ▶ Regarder une pub : +N 🪙 » | ☐ |
| 1.7 | Cliquer « Regarder une pub » | Pub de démonstration, **son coupé** pendant la pub, pièces ajoutées à la fin | ☐ |
| 1.8 | Immédiatement après, cliquer REJOUER | **Pas de seconde pub** (règle : pas de pub récompensée + pub entre deux courses dans la même pause) | ☐ |
| 1.9 | Terminer une autre course puis REJOUER **sans** regarder la pub facultative | Une pub « entre deux courses » peut apparaître (la plateforme limite elle-même la fréquence, environ 1 toutes les 3 minutes : si elle n'apparaît pas, ce n'est pas une erreur) | ☐ |
| 1.10 | Victoire ou médaille d'or | Événement « happy time » dans la console | ☐ |
| 1.11 | Changer d'onglet pendant une course puis revenir | Événement de **fin** de gameplay à la sortie, de **début** au retour ; le jeu reprend sans bug | ☐ |

**Si ça échoue** : voir le tableau de la section 8.

## 2. Création du jeu et prévisualisation sur le portail (10 min)

La prévisualisation est l'environnement le plus proche du vrai site : c'est la référence.

1. Connectez-vous au **Developer Portal** et créez un nouveau jeu (titre : le vôtre, distinct des jeux existants).
2. Envoyez `moto-cross.zip` (**`index.html` doit être à la racine du zip** : ouvrez le zip pour vérifier, vous devez voir `index.html` et `assets/`, pas un dossier intermédiaire).
3. Remplissez la fiche avec `store/LISTING.md` (textes anglais en priorité) et téléversez les visuels de `store/` (`cover_1920x1080.png`, `cover_800x1200.png`, `icon_800x800.png`, captures). Vérifiez les formats demandés par le portail et recadrez si besoin.
4. Lancez la **prévisualisation** du jeu. Ouvrez la console (F12) avant le chargement.

- [ ] Le jeu se charge dans la prévisualisation (pas d'écran noir, pas d'erreur de fichier introuvable)
- [ ] Le portail indique la taille / le temps de chargement : **≤ 50 Mo** (nous sommes à environ 0,6 Mo)

## 3. Chargement et démarrage (dans la prévisualisation)

Faites ces tests en **navigation privée** pour être un nouveau joueur.

| # | Étape | Résultat attendu | OK |
|---|---|---|---|
| 3.1 | Chronométrer du clic sur « jouer » du portail jusqu'à la voiture… la moto jouable | Quelques secondes (objectif de la plateforme : environ 20 s maximum) | ☐ |
| 3.2 | Onglet **Réseau** (F12) | Requêtes uniquement vers CrazyGames et vers **vos** fichiers (`index.html`, `assets/…js`). Aucune police, statistique ou service externe | ☐ |
| 3.3 | Arrivée en jeu | Course lancée directement (pas d'écran « Jouer » à cliquer) | ☐ |
| 3.4 | Console | Pas d'erreur rouge liée au jeu. (Les avertissements WebGL « GPU stall » sont normaux) | ☐ |

## 4. Publicités (dans la prévisualisation)

| # | Étape | Résultat attendu | OK |
|---|---|---|---|
| 4.1 | Fin de course ▸ REJOUER | Une pub entre deux courses peut s'afficher à ce moment-là, **jamais pendant la conduite** | ☐ |
| 4.2 | Pub affichée | Le son du jeu est coupé, puis revient à la fin | ☐ |
| 4.3 | Fin de course ▸ « Regarder une pub » | Pub avec récompense ; **le bouton de fermeture/passage n'est pas masqué par le jeu** ; la récompense (pièces) arrive seulement si la pub est allée au bout | ☐ |
| 4.4 | Pub récompensée puis REJOUER | Pas de seconde pub dans la foulée | ☐ |
| 4.5 | Bloqueur de pub activé | Le bouton « Regarder une pub » disparaît ; le jeu continue normalement | ☐ |
| 4.6 | Le texte du bouton | Indique clairement ce qu'on gagne (« +400 🪙 ») et que c'est facultatif | ☐ |

## 5. Son

| # | Étape | Résultat attendu | OK |
|---|---|---|---|
| 5.1 | Premier clic/touche | La musique et les bruitages démarrent (le navigateur interdit le son avant une action du joueur : c'est normal) | ☐ |
| 5.2 | Boutons 🎵 / 🔊 ou touches **N** / **M** | Coupent la musique / les effets | ☐ |
| 5.3 | Réglage « couper le son » du portail (si présent dans la prévisualisation) | Coupe tout le son du jeu, même si les boutons du jeu sont activés | ☐ |
| 5.4 | Onglet caché | Plus aucun son | ☐ |

## 6. Compte CrazyGames et sauvegarde

| # | Étape | Résultat attendu | OK |
|---|---|---|---|
| 6.1 | Jouer 2-3 courses **en invité**, gagner des pièces | Progression conservée si on recharge la page | ☐ |
| 6.2 | Menu principal | Bouton « 👤 Se connecter pour synchroniser » (visible seulement pour un invité) | ☐ |
| 6.3 | Cliquer dessus et se connecter | Fenêtre de connexion CrazyGames ; après connexion le bouton disparaît, le jeu **n'est pas cassé** | ☐ |
| 6.4 | Même compte sur **un autre appareil** | La progression (pièces, motos, niveau) y est retrouvée | ☐ |
| 6.5 | Pseudo dans le défi quotidien | Le pseudo du compte est proposé automatiquement (le classement en ligne est désactivé : l'écran « Classement » indique que les résultats sont gardés sur l'appareil) | ☐ |
| 6.6 | Se déconnecter puis se reconnecter | Pas de perte de progression ni d'erreur | ☐ |
| 6.7 | Aucune option de connexion externe (Google, Facebook…) dans le jeu | Il n'y en a pas | ☐ |

## 7. Affichage, appareils et contenu

**Tailles** : dans la prévisualisation, testez la fenêtre en taille réduite (bureau ≈ **907×510**, mobile ≈ **800×450**) et en plein écran. Réglez le zoom du navigateur à 100 %.

| # | Étape | Résultat attendu | OK |
|---|---|---|---|
| 7.1 | 907×510 : menu, course, écran de fin, garage | Tous les textes **lisibles**, rien de coupé (le menu défile si l'écran est bas) | ☐ |
| 7.2 | 800×450 | Idem | ☐ |
| 7.3 | Écran de téléphone, **paysage** | Boutons tactiles ◀ ▶ ▲ ▼ N visibles, HUD (position, tour, vitesse, nitro) sans chevauchement | ☐ |
| 7.4 | Écran de téléphone, **portrait** | Le jeu reste utilisable (paysage recommandé) | ☐ |
| 7.5 | Chrome, Edge | Aucun bug | ☐ |
| 7.6 | Safari (Mac ou iPhone) | Pas d'écran noir ; si le jeu ramène une fluidité insuffisante, voir section 8 | ☐ |
| 7.7 | Ordinateur modeste (4 Go de RAM) ou téléphone d'entrée de gamme | Jouable sans saccades majeures (la qualité baisse toute seule si besoin ; réglage manuel : ⚙ Réglages ▸ Qualité) | ☐ |
| 7.8 | Langues : ⚙ Réglages ▸ Langue, ou le menu en haut à gauche | Anglais, français, espagnol, portugais, allemand s'affichent sans texte coupé | ☐ |
| 7.9 | Parcours de 15 minutes | Course rapide, championnat, contre-la-montre, défi quotidien, garage (achat + amélioration), succès : aucun blocage | ☐ |
| 7.10 | Chercher tout lien/bouton vers un site, un store, un réseau social ou un autre jeu | Il n'y en a pas | ☐ |
| 7.11 | Contenu | Tout public : aucune violence ni contenu sensible | ☐ |

## 8. Si ça échoue : causes probables et corrections

| Symptôme | Cause probable | Où corriger (dépôt `moto-cross/`) |
|---|---|---|
| Aucun événement SDK dans la console | SDK non chargé (script bloqué) ou environnement « disabled » (adresse non reconnue) | Ouvrir avec `?useLocalSdk=true` ; vérifier la balise `<script>` dans `index.html` |
| Le jeu arrive sur un menu au lieu de la course | Le joueur n'est plus « nouveau » (progression existante) ou le SDK n'est pas prêt | Navigation privée ; condition « nouveau joueur » en fin de `boot()` dans `src/main.js` (pour démarrer en course pour **tous** les joueurs : retirer la condition `stats.races === 0`) |
| Début de gameplay jugé trop tardif / absent | Il est envoyé au « GO », pas pendant le compte à rebours | `platform.gameplayStart()` dans la boucle `frame` de `src/main.js` ; le déplacer au début de `startRace()` si la plateforme le demande |
| Pub trop fréquente / refusée | La plateforme limite elle-même la fréquence ; une pub trop tôt est ignorée | `showMidgameAd()` dans `src/platform.js` ; ne rien forcer |
| Bouton « Regarder une pub » refusé | Règle d'affichage de la pub récompensée | Le retirer : supprimer l'appel `offerAd(...)` dans `endRace`/`endDaily` (`src/main.js`) |
| Écran noir sous Safari / saccades | Trop lourd pour l'appareil | Baisser la qualité par défaut : `autoLevel()` dans `src/quality.js` |
| Texte trop petit à 907×510 | Taille de police | Règles `@media (max-height:620px)` dans `index.html` |
| Fichier introuvable au chargement | `index.html` pas à la racine du zip, ou chemins absolus | Refaire le zip avec `npm run zip` ; `npm run preflight` contrôle les chemins |
| Appels réseau inattendus signalés | `VITE_LEADERBOARD_URL` défini | Le vider et reconstruire |
| Progression perdue après connexion | Sauvegarde cloud plus récente prioritaire (la plus récente gagne) | `mergeCloud` dans `src/save.js` |

**Pour appliquer un correctif** : modifiez le code, faites un commit sur GitHub ▸ l'action « Moto Cross — build prêt à publier » produit un nouveau `moto-cross.zip` (onglet Actions ▸ Artifacts) ▸ renvoyez-le sur le portail ▸ relancez la prévisualisation.

## 9. Avant de cliquer sur « Soumettre »

- [ ] Toutes les cases ci-dessus sont cochées (ou les écarts sont connus et acceptés)
- [ ] Titre unique, description, instructions et tags renseignés (`store/LISTING.md`)
- [ ] Couvertures et captures aux formats demandés
- [ ] Vous avez relu les pages « Requirements » officielles de CrazyGames (leurs règles évoluent)
- [ ] Vous visez le **Full Launch** (SDK complet + pubs) et non seulement le Basic Launch

## Compte rendu (copiez-collez et remplissez)

```
Date :                     Navigateur / appareil :
Version du zip (commit) :
Section 1 (local)   : OK / problèmes :
Section 3 (chargement) : temps jusqu'au jeu = ... s ; erreurs console :
Section 4 (pubs)    : OK / problèmes :
Section 5 (son)     : OK / problèmes :
Section 6 (compte)  : OK / problèmes :
Section 7 (écrans / appareils) : OK / problèmes :
Retour de la plateforme (copier le message exact) :
```
