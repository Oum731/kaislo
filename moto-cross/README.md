# Moto Cross Racing

Jeu de course de moto-cross 3D en HTML5 (Three.js + Vite), jouable dans le navigateur, sur ordinateur et téléphone.

## Lancer le jeu sur votre PC (Windows)

1. Installez **Node.js (version LTS)** : https://nodejs.org et **Git** : https://git-scm.com/download/win
2. Ouvrez **PowerShell** et tapez, ligne par ligne :

```powershell
git clone https://github.com/oum731/kaislo.git
cd kaislo
git checkout claude/brave-maxwell-bk3dyb
cd moto-cross
npm install
npm run dev
```

3. Ouvrez http://localhost:5173 dans Chrome. Pour arrêter : `Ctrl + C`.

> Sans Git : sur la page GitHub du dépôt, choisissez la branche `claude/brave-maxwell-bk3dyb`, cliquez sur **Code ▸ Download ZIP**, décompressez, puis ouvrez PowerShell dans le dossier `moto-cross` et lancez `npm install` puis `npm run dev`.

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement (rechargement automatique) |
| `npm run build` | Version finale dans `dist/` (hébergement libre : itch.io, GitHub Pages…) |
| `npm run server` | Serveur de classement local (port 8787) |
| `npm run test:server` | Tests du serveur de classement |
| `npm run zip` | Construit puis crée `moto-cross.zip` prêt à envoyer sur CrazyGames (le SDK CrazyGames est déjà intégré) |

## Commandes en jeu

| Action | Clavier | Mobile |
|---|---|---|
| Accélérer / freiner | ↑ ↓ ou W S | ▲ ▼ |
| Tourner | ← → ou A D | ◀ ▶ |
| Nitro | Shift ou Espace | N |
| Figures (en l'air) | ↑ front flip · ↓ back flip · ← → whip | ▲ ▼ ◀ ▶ |
| Recommencer | R | — |
| Son / musique | M / N | boutons en haut à gauche |

## Contenu

- **4 modes** : course rapide, **championnat** (2 coupes de 3 manches, points, trophée), **contre-la-montre** contre votre fantôme, **défi quotidien** (même piste, même moto prêtée et même modificateur pour tous, 3 médailles, série de jours, classement en ligne facultatif — voir `server/README.md`)
- **6 pistes** : Forêt, Désert, Glacier, Volcan, Nuit néon (avec phare), Île tropicale — chacune se débloque en finissant top 3 sur la précédente ; la Coupe Inferno (pistes 4 à 6) se débloque avec le Glacier
- **8 motos** (de la Rookie 125 à la Neon Ghost), 3 améliorations chacune (5 niveaux, coût selon la moto), peintures
- **Progression** : pièces, XP et niveaux, objectifs à 3 étoiles par piste, 20 succès, bonus quotidien, prochain but affiché
- Figures (front/back flip, whip) avec combos, nitro, collisions, 5 pilotes IA, 3 niveaux de difficulté
- **5 langues** : English, Français, Español, Português, Deutsch (détection automatique, sélecteur en haut à gauche)
- Musique et effets générés par le code (aucun fichier audio)
- Qualité graphique automatique (basse sur téléphone) avec dégradation si le jeu ralentit

## Structure

```
src/main.js        boucle de jeu, physique, IA, interface
src/track.js       pistes, relief, décor, pièces
src/moto.js        modèle 3D de la moto et du pilote, stats des motos
src/particles.js   poussière, flammes, étincelles
src/audio.js       moteur, effets, musique
src/save.js        sauvegarde, boutique, améliorations, peintures
src/progress.js    niveaux/XP, objectifs à étoiles, succès
src/i18n.js        traductions (5 langues) — ajouter une langue = une colonne
src/confetti.js    confettis de victoire
src/leaderboard.js client du classement en ligne (facultatif)
shared/daily.js    défi du jour, médailles, règles (jeu + serveur)
server/            serveur de classement (Cloudflare Workers) + tests
src/quality.js     niveaux de qualité graphique
src/platform.js    SDK CrazyGames v3 (init, chargement, pubs, sauvegarde cloud, compte)
scripts/           zip et génération des visuels
store/             visuels et textes de publication
```

Publication : voir [store/PUBLISHING.md](store/PUBLISHING.md).
