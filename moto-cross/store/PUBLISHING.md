# Publier le jeu — marche à suivre

## 1. Préparer le build
Le **SDK CrazyGames v3 est intégré en dur** dans `index.html` : plus aucune commande spéciale.
```powershell
cd moto-cross
npm install
npm run zip          # construit le jeu et crée moto-cross.zip (index.html à la racine)
```
`npm run build` donne le même `dist/` pour toutes les plateformes : le SDK se désactive tout seul là où il n'est pas autorisé.

**Automatique à chaque commit** : l'action GitHub « Moto Cross — build prêt à publier » (`.github/workflows/moto-cross-build.yml`) lance les tests, construit le jeu, vérifie que le SDK est dans la page et fournit `moto-cross.zip`. Pour le récupérer : onglet **Actions** du dépôt ▸ dernière exécution ▸ **Artifacts** ▸ `moto-cross-crazygames`, puis envoyez ce zip sur CrazyGames. (Pour fixer l'adresse du classement en ligne : Settings ▸ Secrets and variables ▸ Actions ▸ Variables ▸ `LEADERBOARD_URL`.)

## 2. CrazyGames
1. Créez un compte développeur sur https://developer.crazygames.com
2. Créez un nouveau jeu, envoyez `moto-cross.zip` (le `index.html` doit être à la racine du zip).
3. Remplissez la fiche avec `store/LISTING.md` et téléversez les visuels de `store/`.
4. Testez avec l'**outil de prévisualisation** du portail (c'est l'environnement le plus proche du vrai site), puis soumettez.

### Ce qui est branché dans le jeu (`src/platform.js`)
| Module du SDK | Utilisation |
|---|---|
| `init` | Une seule fois au démarrage, avec délai maximum ; `SDK.environment` est vérifié |
| `game.loadingStart/Stop` | Autour du chargement du jeu |
| `game.gameplayStart/Stop` | Début de course au « GO », arrêt à l'arrivée, au redémarrage, au retour au menu et quand l'onglet est caché |
| `game.happytime` | Victoires, médailles d'or/argent, championnat gagné |
| `ad` | Pub **midgame** entre deux courses (écran de fin / retour au menu, jamais en conduite) ; pub **rewarded** facultative « regarder une pub : pièces » ; son coupé pendant les pubs ; test adblock |
| `data` | Sauvegarde partagée entre appareils (la plus récente gagne ; la qualité graphique reste propre à l'appareil) |
| `user` | Pseudo du compte CrazyGames utilisé pour le classement ; langue du joueur proposée par la plateforme |
| `banner`, achats intégrés | **Non utilisés** pour l'instant |

### Conformité aux exigences CrazyGames
> Source : documentation officielle de CrazyGames — [Exigences techniques](https://docs.crazygames.com/requirements/technical/), [Publicités](https://docs.crazygames.com/requirements/ads/), [Gameplay](https://docs.crazygames.com/requirements/gameplay/), [Comptes](https://docs.crazygames.com/requirements/account-integration/), [SDK HTML5 v3](https://docs.crazygames.com/sdk/html5-v3/intro). **Ces pages n'étaient pas accessibles depuis l'environnement où le jeu a été écrit** : les règles ci-dessous viennent de leur contenu relevé par recherche web. Relisez les pages officielles avant d'envoyer le jeu ; elles font foi.

| Exigence | État |
|---|---|
| Téléchargement initial ≤ 50 Mo (≤ 20 Mo pour la page d'accueil mobile), mesuré jusqu'au 1er `gameplayStart` ; build ≤ 250 Mo ; ≤ 1 500 fichiers | ✅ build ≈ 0,6 Mo, 2 fichiers |
| Chemins de fichiers relatifs | ✅ (`base: './'`) |
| Fonctionne sur Chrome et Edge ; fluide sur petite machine | ✅ qualité graphique automatique et dégradation si le jeu ralentit ; ⚠️ à tester aussi sur Safari et sur un vrai téléphone |
| Texte lisible à `devicePixelRatio` 1 dans une iframe 16:9 (907×510 bureau, 800×450 mobile) | ✅ vérifié aux deux tailles (menu, course, fin de partie) |
| SDK v3 chargé dans le `<head>` avant le jeu, `init()` attendu avant tout appel | ✅ |
| N'utiliser le SDK que si l'environnement est `local` ou `crazygames` | ✅ |
| `gameplayStart` quand le joueur peut jouer ; `gameplayStop` à chaque pause (menu, fin de course, redémarrage, onglet caché) et avant chaque pub | ✅ |
| `loadingStart/Stop` autour du chargement + indicateur de chargement | ✅ |
| Le joueur arrive directement en jeu | ✅ pour un nouveau joueur sur CrazyGames (course lancée sans cliquer sur « Jouer ») ; ⚠️ confirmez ce point dans l'outil de prévisualisation |
| Pubs uniquement via le SDK ; pub *midgame* à un moment naturel (fin de course) ; la fréquence est gérée par le SDK (≈ 1 toutes les 3 min) | ✅ |
| Pub avec récompense facultative, jamais cumulée avec une pub midgame dans la même pause | ✅ (après une pub récompensée, la pub midgame suivante est sautée) |
| Son coupé pendant les pubs ; réglage « couper le son » de la plateforme prioritaire | ✅ |
| Sauvegarde via le module `data` ; compte CrazyGames (pseudo, connexion en jeu, rechargement après connexion) ; aucune connexion externe | ✅ |
| Aucun lien externe, autre jeu, réseau social ou store dans le jeu | ✅ |
| Version anglaise | ✅ (5 langues, anglais disponible et utilisé par défaut si la langue du joueur n'est pas gérée) |
| Contenu tout public | ✅ |
| Pas d'appel à un serveur externe | ✅ par défaut : laissez `VITE_LEADERBOARD_URL` **vide** pour la version envoyée à CrazyGames tant que vous n'avez pas confirmé que c'est autorisé |
| Achats intégrés, bannières | non utilisés |

**Deux étapes de lancement** : le « Basic Launch » (peu d'exigences, pas de monétisation) puis le « Full Launch » (SDK complet, pubs, comptes) réservé à certains jeux. Visez le Full Launch : c'est lui qui rapporte des revenus.

### Environnements et tests
- `localhost` / `127.0.0.1` : environnement **local** — pubs de démonstration (texte superposé), autres événements visibles dans la console. Pour forcer ce mode sur une autre adresse : ajoutez `?useLocalSdk=true` à l'URL.
- Domaines CrazyGames : environnement **crazygames** (fonctionnement réel).
- Partout ailleurs : environnement **disabled** (tous les appels du SDK échouent). Le jeu n'appelle donc le SDK que dans les environnements local et crazygames et marche normalement ailleurs.
- Le SDK a été branché d'après la documentation officielle et testé avec une **simulation** de son API (démarrage, pubs, sauvegarde cloud, environnement désactivé). Il n'a pas pu être essayé contre le vrai SDK depuis l'environnement de développement : faites un premier passage dans l'outil de prévisualisation et regardez la console du navigateur.
- **À vérifier dans le portail** : les exigences actuelles de CrazyGames (technique, gameplay, pubs, comptes) évoluent ; relisez leur page « requirements » avant de soumettre.

**Fiche de test pas à pas** : [`TEST_CRAZYGAMES.md`](TEST_CRAZYGAMES.md) (45 à 60 min), à dérouler avant de soumettre. `npm run preflight` fait le contrôle automatique du build (poids, nombre de fichiers, chemins relatifs, SDK, adresses externes).

## 3. Autres plateformes
Chaque plateforme a son propre SDK et ses règles : ajoutez un adaptateur dans `src/platform.js` (mêmes fonctions : `gameplayStart`, `showMidgameAd`, …).
- **itch.io** : upload du `dist/` zippé, aucun SDK, bon pour récupérer des retours.
- **Poki**, **GameDistribution**, **GameMonetize**, **Y8**, **Newgrounds**… : comptes développeur et SDK propres. Certaines exigent l'exclusivité : lisez leurs conditions avant de publier ailleurs.

## 4. Classement du défi quotidien (facultatif)
Le défi quotidien marche hors ligne. Pour un classement mondial, déployez le serveur (`server/README.md`, gratuit sur Cloudflare) puis construisez avec `VITE_LEADERBOARD_URL`. **Vérifiez d'abord que la plateforme autorise les appels vers un serveur externe** : sinon publiez la version sans classement en ligne.

## 5. Avant de soumettre (checklist)
- [ ] Testé sur un vrai téléphone (Chrome Android, Safari iOS) en paysage
- [ ] Testé sur navigateur ordinateur (Chrome, Firefox, Edge)
- [ ] Aucun lien externe ni publicité tierce dans le jeu
- [ ] Titre unique, visuels et textes prêts (`store/`)
- [x] Interface en 5 langues (EN/FR/ES/PT/DE) avec détection automatique — remplissez la fiche en anglais en priorité (`store/LISTING.md`)
- [ ] Sauvegarde testée (fermer / rouvrir la page)

## 6. Après la publication
- Le jeu retient les joueurs grâce au championnat, au fantôme, aux étoiles, aux succès et au bonus quotidien : regardez quelle fonction fait revenir les joueurs et renforcez-la.
- Surveillez les statistiques (durée de session, taux de retour) : c'est ce qui décide de la mise en avant.
- Ajoutez régulièrement du contenu : nouvelles pistes, motos, défis quotidiens.
- Les revenus dépendent des pubs et du trafic : ils peuvent être faibles au début et ne sont pas garantis.
