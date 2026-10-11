# Publier le jeu — marche à suivre

## 1. Préparer le build
```powershell
cd moto-cross
npm install
npm run zip          # construit avec le SDK CrazyGames et crée moto-cross.zip
```
`npm run build` (sans SDK) donne un `dist/` utilisable sur toute plateforme qui ne demande pas de SDK (itch.io, GitHub Pages, votre propre site).

## 2. CrazyGames
1. Créez un compte développeur sur https://developer.crazygames.com
2. Créez un nouveau jeu, envoyez `moto-cross.zip` (le `index.html` doit être à la racine du zip).
3. Remplissez la fiche avec `store/LISTING.md` et téléversez les visuels de `store/`.
4. Le jeu utilise déjà le SDK : `gameplayStart/Stop`, pubs « midgame » entre les courses, son coupé pendant les pubs (voir `src/platform.js`).
5. Testez avec leur outil de prévisualisation (mode « QA tool » du portail), puis soumettez.

**À vérifier dans le portail au moment de l'envoi** (les règles évoluent) : poids maximal du jeu, formats des visuels, exigences de qualité/tests mobile, conditions de revenus et d'exclusivité éventuelle.

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
