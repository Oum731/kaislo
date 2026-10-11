# Serveur de classement du défi quotidien

Le défi quotidien fonctionne **sans serveur** : médailles, récompenses, série de jours et historique sont gardés sur l'appareil.
Ce dossier ajoute le **classement en ligne** (les meilleurs temps du jour, tous joueurs confondus). Il est facultatif.

```
shared/daily.js     défi du jour, médailles, règles de validation (jeu + serveur)
server/core.js      logique de l'API (validation, rangs)
server/worker.js    adaptateur Cloudflare Workers + base D1
server/schema.sql   table SQL
server/dev-server.mjs   serveur local pour tester
server/test.mjs     tests (node server/test.mjs)
```

## API

| Requête | Rôle |
|---|---|
| `GET /daily?day=AAAA-MM-JJ&limit=20&playerId=…` | Top du jour + votre rang |
| `POST /daily` `{day, track, time, name, playerId}` | Envoie un temps (secondes). Seul le meilleur temps par joueur est gardé |
| `GET /health` | Test de disponibilité |

Le jeu envoie un **identifiant anonyme** (généré au hasard), le **pseudo** choisi et le **temps**. Aucun e-mail, aucune donnée personnelle. L'adresse IP sert uniquement à limiter le débit (20 envois/minute) et n'est pas stockée.

## 1. Tester en local (2 minutes)

```powershell
# terminal 1 — le serveur de classement
cd moto-cross
npm run server

# terminal 2 — le jeu branché dessus
$env:VITE_LEADERBOARD_URL="http://localhost:8787"; npm run dev
```
Choisissez le mode **Défi quotidien** dans le menu, jouez, entrez un pseudo : votre temps apparaît dans 🏅 Classement.
Tests automatiques du serveur : `npm run test:server`.

## 2. Mettre en ligne sur Cloudflare (gratuit)

L'offre gratuite de Cloudflare suffit largement au départ (plusieurs dizaines de milliers de requêtes par jour).

1. Créez un compte sur https://dash.cloudflare.com
2. Dans PowerShell :
```powershell
cd moto-cross\server
npx wrangler login
npx wrangler d1 create moto-cross
```
3. Copiez le `database_id` affiché dans **`wrangler.toml`** (ligne `database_id = …`).
4. Créez la table puis déployez :
```powershell
npx wrangler d1 execute moto-cross --remote --file=schema.sql
npx wrangler deploy
```
5. Wrangler affiche l'adresse du serveur (`https://moto-cross-leaderboard.….workers.dev`). Vérifiez : ouvrez `…/health` dans le navigateur.
6. Construisez le jeu en lui donnant cette adresse :
```powershell
cd ..
$env:VITE_LEADERBOARD_URL="https://moto-cross-leaderboard.VOTRE-COMPTE.workers.dev"; npm run build
```
(ou copiez `.env.example` en `.env.production` et remplissez la ligne.)

> Le code serveur est testé en local (`npm run test:server`) ; le déploiement Cloudflare lui-même n'a pas pu être essayé depuis l'environnement où il a été écrit : si une commande `wrangler` change de syntaxe, suivez la documentation de Cloudflare.

## Limites à connaître

- **Anti-triche léger** : le serveur refuse les temps impossibles (moins de 55 % du temps de référence), les mauvais jours/pistes et limite le débit, mais un joueur déterminé peut envoyer de faux temps plausibles, car le jeu tourne chez le joueur. Surveillez le haut du classement et supprimez les abus :
  `npx wrangler d1 execute moto-cross --remote --command "DELETE FROM scores WHERE name='Pseudo' AND day='2026-10-11'"`
- **Pseudos** : filtre de gros mots minimal ; à renforcer si le jeu devient populaire.
- **Nettoyage** (facultatif) : `DELETE FROM scores WHERE day < date('now','-60 day')`.
- **Temps de référence / médailles** : `PAR` dans `shared/daily.js` est une estimation. Après quelques jours de vraies parties, ajustez-le avec les temps réels du classement.
- **Règles des plateformes** : certaines plateformes (CrazyGames, Poki…) encadrent ou interdisent les appels à un serveur externe. Vérifiez leurs conditions avant d'activer le classement sur leur version ; sans `VITE_LEADERBOARD_URL` le jeu reste 100 % hors ligne.
