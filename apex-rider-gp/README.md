# Apex Rider GP — prototype jouable

Jeu de course moto 3D (Three.js) tiré du GDD *Apex Rider GP*. Aucune dépendance au reste du dépôt Kaislo.

## Jouer / publier
- **`dist/apex-rider-gp.html`** : le jeu complet en **un seul fichier** (Three.js embarqué, aucun réseau requis). Ouvrez-le dans un navigateur.
- **`dist/apex-rider-gp.zip`** : même jeu, `index.html` à la racine — format attendu par itch.io, Newgrounds, GameJolt, CrazyGames, etc. (type « HTML5 / jouable dans le navigateur », plein écran).

Pour régénérer : `npm install && npm run build`.

## Commandes
| Action | Clavier | Manette |
|---|---|---|
| Incliner | ← → (ou A/D) | stick gauche |
| Gaz | ↑ (W) | RT |
| Frein avant | ↓ (S) | LT |
| Frein arrière | Espace | A |
| Transfert de masse | Q avant · E arrière | stick droit |
| Stand (au prochain passage) | B | |
| Pneus du prochain arrêt | 1 Tendre · 2 Medium · 3 Dur · 4 Pluie | |
| Pause | Échap | |

## Ce qui est implémenté (par rapport au GDD)
- **Carrière** : 3 catégories (300cc → 600cc → 1000cc Apex GP) débloquées par podium, primes, sponsors (paient selon le classement), salaires, XP et **arbre de compétences** (Agilité, Gestion des pneus, Freinage tardif, Résistance).
- **Course rapide**, **contre-la-montre** (meilleurs temps locaux), 11 adversaires IA. Multijoueur : non (grisé « bientôt »).
- **Physique** : frein avant/arrière séparés, inclinaison avec limite de décrochage, transfert de masse, fading des freins, **usure et température des pneus par côté gauche/droit et avant/arrière**.
- **Météo dynamique** (la pluie arrive au tour 2) et **trajectoire séchante** : la ligne de course reste plus adhérente sous la pluie.
- **Chutes** : pilote éjecté (ragdoll simplifié), débris, dégâts cumulés, **abandon technique** à 100 %.
- **Stand** : demande avec B, voie des stands, **QTE** de changement de roues (une erreur = +0,7 s), choix du compound.
- **HUD** : compte-tours/vitesse/rapport, inclinaison vs limite, diagramme des pneus (bleu froid → vert optimal → rouge surchauffe), minicarte, écarts, classement.
- **Garage** : moteur, échappement, suspension, freins carbone, pneus, peinture (5 finitions dont carbone et chrome), numéro, sponsors, motifs, courbe de puissance. Sauvegarde automatique (`localStorage`).

## Limites connues
Pas de multijoueur en ligne ni de classement mondial (serveur requis), pas de « licences de sécurité », ragdoll simplifié, pas de fuel, modèle de moto procédural (pas d'assets importés).
