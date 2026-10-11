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

## 4. Avant de soumettre (checklist)
- [ ] Testé sur un vrai téléphone (Chrome Android, Safari iOS) en paysage
- [ ] Testé sur navigateur ordinateur (Chrome, Firefox, Edge)
- [ ] Aucun lien externe ni publicité tierce dans le jeu
- [ ] Titre unique, visuels et textes prêts (`store/`)
- [ ] Version anglaise de l'interface si vous visez le public international
- [ ] Sauvegarde testée (fermer / rouvrir la page)

## 5. Après la publication
- Surveillez les statistiques (durée de session, taux de retour) : c'est ce qui décide de la mise en avant.
- Ajoutez régulièrement du contenu : nouvelles pistes, motos, défis quotidiens.
- Les revenus dépendent des pubs et du trafic : ils peuvent être faibles au début et ne sont pas garantis.
