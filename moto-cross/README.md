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
| `npm run build:crazygames` | Version finale avec le SDK CrazyGames injecté |
| `npm run zip` | Construit puis crée `moto-cross.zip` prêt à envoyer sur une plateforme |

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

- 3 pistes (Forêt, Désert, Glacier) — les deux dernières se débloquent en finissant top 3 sur la précédente
- 4 motos, 3 améliorations chacune (moteur, suspension, nitro), 5 niveaux par amélioration
- Pièces à ramasser, récompenses de course, bonus quotidien, garage
- 5 pilotes IA, 3 niveaux de difficulté, collisions, figures, nitro
- Musique et effets générés par le code (aucun fichier audio)
- Qualité graphique automatique (bas sur téléphone, élevé sur PC) avec dégradation si le jeu ralentit

## Structure

```
src/main.js        boucle de jeu, physique, IA, interface
src/track.js       pistes, relief, décor, pièces
src/moto.js        modèle 3D de la moto et du pilote, stats des motos
src/particles.js   poussière, flammes, étincelles
src/audio.js       moteur, effets, musique
src/save.js        sauvegarde, boutique, améliorations
src/quality.js     niveaux de qualité graphique
src/platform.js    pont vers le SDK des plateformes (CrazyGames…)
scripts/           zip et génération des visuels
store/             visuels et textes de publication
```

Publication : voir [store/PUBLISHING.md](store/PUBLISHING.md).
