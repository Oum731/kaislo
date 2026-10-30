# Apex Rider GP — prototype jouable

Jeu de course moto 3D (Three.js) tiré du GDD *Apex Rider GP*. Aucune dépendance au reste du dépôt Kaislo.

## Jouer / publier
Tout est généré par `npm install && GM_ID=<votre_game_id> npm run build` :

| Fichier | Usage |
|---|---|
| `dist/apex-rider-gp.html` | Jeu complet en **un seul fichier** (Three.js et images incorporés, aucune requête externe). Ouvrir dans un navigateur. |
| `dist/gamemonetize/apex-rider-gp-gamemonetize.zip` | **À téléverser sur GameMonetize** : `index.html` à la racine, SDK GameMonetize intégré (pause/reprise + interstitielle). |
| `dist/gamemonetize/thumb_512x512.jpg`, `thumb_512x384.jpg`, `thumb_300x300.jpg`, `thumb_100x100.jpg` | Miniatures à fournir dans le formulaire de soumission. |

### Soumission GameMonetize
1. Créez le jeu dans votre compte GameMonetize pour obtenir votre **Game ID**, puis relancez `GM_ID=<id> npm run build` (le zip contient alors votre identifiant). Sans cela, le SDK est chargé avec le texte `VOTRE_GAME_ID`.
2. Type : **HTML5**, taille conseillée **960×540** (le jeu est responsive et plein écran), jeu jouable au **clavier, à la manette et au tactile**.
3. Le SDK appelle `window.__gm.pause()/resume()` (jeu et son suspendus pendant la publicité). Une interstitielle est demandée au départ d'une course, **jamais avant la 2ᵉ course et au plus toutes les 2 minutes**.
4. Si GameMonetize vous donne un extrait de SDK différent, remplacez la fonction `sdk()` dans `build.mjs`.

### Images
La moto et le pilote viennent de l'image 10 fournie (détourée). Les logos de marques réelles (Ducati, Alpinestars, Michelin, Arai, Brembo, Akrapovič…) ont été effacés par retouche et remplacés par des emblèmes fictifs ; les textes de la combinaison (CYBERNETIC, NEXUS, VELOCITA, ARYTUN) sont aussi effacés. Seul le numéro 88 du casque et de la moto reste. Vérifiez `assets/bike.png` en grand avant soumission : de très petits autocollants ont pu subsister.

Les visuels du menu, de l'aperçu garage, de la bannière de résultats et **toutes les miniatures** sont recadrés à partir des images que vous avez fournies (`assets/`, `store/`) : rien n'est généré. J'ai volontairement écarté celles qui montrent des marques réelles (Red Bull/KTM/Yamaha, Yokohama, logo MotoGP), car les portails refusent ce type de contenu.

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

Sur mobile : boutons tactiles (◀ ▶, GAZ, FREIN, ARR., STAND, pause).

## Ce qui est implémenté (par rapport au GDD)
- **Carrière** : 3 catégories (300cc → 600cc → 1000cc Apex GP) débloquées par podium, primes, sponsors (paient selon le classement), salaires, XP et **arbre de compétences** (Agilité, Gestion des pneus, Freinage tardif, Résistance).
- **Course rapide**, **contre-la-montre** (meilleurs temps locaux), 11 adversaires IA. Multijoueur : non (grisé « bientôt »).
- **Physique** : frein avant/arrière séparés, inclinaison avec limite de décrochage, transfert de masse, fading des freins, **usure et température des pneus par côté gauche/droit et avant/arrière**.
- **Météo dynamique** (la pluie arrive au tour 2) et **trajectoire séchante** : la ligne de course reste plus adhérente sous la pluie.
- **Chutes** : pilote éjecté (ragdoll simplifié), débris, dégâts cumulés, **abandon technique** à 100 %.
- **Stand** : demande avec B, voie des stands, **QTE** de changement de roues (une erreur = +0,7 s), choix du compound.
- **HUD** : compte-tours/vitesse/rapport, inclinaison vs limite, diagramme des pneus (bleu froid → vert optimal → rouge surchauffe), minicarte, écarts, classement.
- **Garage** : moteur, échappement, suspension, freins carbone, pneus, couleurs de la moto (principale et accent), sponsors, courbe de puissance. Sauvegarde automatique (`localStorage`).
- **Aucun texte à l'écran** : interface en icônes et chiffres, décor sans lettres.

## Limites connues
Pas de multijoueur en ligne ni de classement mondial (serveur requis), pas de « licences de sécurité », ragdoll simplifié, pas de fuel, la moto et le pilote sont une image fournie (`assets/bike.png`, vue de dos détourée, recolorée par code) : pas de roues animées, chute simplifiée (la moto bascule).
