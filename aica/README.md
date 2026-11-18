# Site de l'AICA — Association des Ivoiriens de Casablanca

Site vitrine moderne + espace d'administration + **carte de membre générée automatiquement** (PDF recto/verso avec QR code de vérification, enregistrée côté admin).

- **Public** : accueil, événements, actions, activités, l'association, contact, adhésion (`/adhesion`), vérification d'une carte via QR (`/verification/AICA-2026-0001`).
- **Admin** (`/admin`) : tableau de bord, membres & cartes (recherche, PDF, régénération, révocation, export CSV/Excel, création manuelle), événements / actions / activités (avec photo), messages du formulaire de contact.
- **Carte** : mêmes champs que votre modèle (nom, prénoms, naissance, fonction, profession, quartier, téléphone, urgence, n° pièce, photo, n° `AICA-AAAA-NNNN`, validité 1 an, cachet du Président). La mise en page est dans `src/lib/card-layout.js` (aperçu écran + PDF).

## Mise en ligne 100 % gratuite (≈ 15 minutes)

Il faut 2 comptes gratuits : **Supabase** (base de données) et **Vercel** (hébergement). Tout (membres, photos, cartes PDF, contenus) est stocké dans la base ; aucun disque n'est nécessaire.

1. **Base de données** — [supabase.com](https://supabase.com) → *New project* (choisir une région Europe, noter le mot de passe).
   Puis *Connect* → *Transaction pooler* → copier l'URL `postgresql://…` (remplacer `[YOUR-PASSWORD]`). Les tables se créent toutes seules au premier appel.
2. **Code** — le dossier `aica/` de ce dépôt GitHub.
3. **Hébergement** — [vercel.com](https://vercel.com) → *Add New Project* → importer le dépôt → **Root Directory : `aica`** → ajouter les variables d'environnement :

   | Variable | Valeur |
   |---|---|
   | `DATABASE_URL` | l'URL Supabase de l'étape 1 |
   | `ADMIN_EMAIL` | `aicaivoirienscasa@gmail.com` |
   | `ADMIN_PASSWORD` | un mot de passe long, à vous |
   | `SESSION_SECRET` | une longue chaîne aléatoire (32+ caractères) |
   | `NEXT_PUBLIC_SITE_URL` | l'adresse finale du site, ex. `https://aica.vercel.app` (utilisée dans le QR code) |

   → *Deploy*. Ensuite connexion sur `https://…/admin`.
4. **Nom de domaine** (optionnel) : Vercel → Settings → Domains. Si l'adresse change, mettre à jour `NEXT_PUBLIC_SITE_URL` (les cartes déjà éditées gardent l'ancienne adresse dans leur QR : utilisez « Régénérer » dans l'admin).

### Limites du gratuit à connaître
- Supabase **met en pause** un projet gratuit après ~1 semaine sans activité (se réactive en un clic) ; 500 Mo de base = largement assez pour plusieurs milliers de membres (≈ 150 Ko par membre).
- Vercel « Hobby » est prévu pour un usage non commercial : correct pour une association.
- **Sauvegarde** : exportez régulièrement les membres (Admin → Membres → Export CSV).

## Lancer en local
```bash
cd aica && npm install
cp .env.example .env.local     # puis renseigner DATABASE_URL (toute base PostgreSQL) et les accès admin
npm run dev                    # http://localhost:3000
npm test
```

## Sécurité / données personnelles
- Photos et fiches membres ne sont accessibles qu'à l'admin (session signée, cookie httpOnly). Le lien `/carte/<jeton>` (32 caractères aléatoires) est personnel à chaque membre ; la page de vérification n'affiche que nom, fonction et validité.
- Anti-spam : champ piège + limite de 5 demandes/heure par connexion ; doublon refusé (même téléphone + date de naissance).
- Une carte **révoquée** n'est plus téléchargeable et la vérification QR affiche « révoquée ».

## À personnaliser
- Textes de `/a-propos` (rédigés de façon générique), pied de page, couleurs (`src/app/globals.css`).
- Le **cachet du Président** est celui de votre modèle (`public/brand/cachet.png`, intégré via `npm run` → `node scripts/embed-assets.mjs` si vous le changez).
