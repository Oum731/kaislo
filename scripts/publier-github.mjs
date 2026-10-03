// ------------------------------------------------------------
// Publie la version de test sur GitHub Pages :
//   https://oum731.github.io/kaislo/
//
// Utilisation : npm run publier-github  (arrêtez "npm run dev" avant)
// 1. construit le site pour le sous-dossier /kaislo
// 2. envoie le dossier out/ sur la branche gh-pages du dépôt
// Attention : out/ contient alors la version GitHub. Relancez
// "npm run build" avant d'envoyer le site sur Hostinger.
// ------------------------------------------------------------
import { execSync } from 'node:child_process';
import fs from 'node:fs';

// Dépôt lu dans git (« origin ») : marche avant et après le renommage du dépôt sur GitHub
const DEPOT = execSync('git remote get-url origin').toString().trim();
const NOM = DEPOT.replace(/\.git$/, '').split('/').pop(); // kaislo
const PROPRIETAIRE = DEPOT.replace(/\.git$/, '').split('/').slice(-2, -1)[0].toLowerCase();
const lancer = (cmd, options = {}) => execSync(cmd, { stdio: 'inherit', ...options });

// 1. Construction avec le sous-dossier
// Version de test : pas de serveur (API_ACTIVE faux), les comptes restent dans le navigateur
lancer('npx next build', { env: { ...process.env, NEXT_PUBLIC_BASE_PATH: '/' + NOM, NEXT_PUBLIC_API: 'non' } });

// GitHub Pages ignore les dossiers commençant par "_" (comme _next) sans ce fichier
fs.writeFileSync('out/.nojekyll', '');

// 2. Envoi : out/ devient un petit dépôt dont on pousse le contenu sur gh-pages
fs.rmSync('out/.git', { recursive: true, force: true });
lancer('git init -q -b gh-pages', { cwd: 'out' });
lancer('git add -A', { cwd: 'out' });
lancer('git commit -q -m "Publication de la version de test"', { cwd: 'out' });
lancer(`git push -f ${DEPOT} gh-pages`, { cwd: 'out' });
fs.rmSync('out/.git', { recursive: true, force: true });

console.log(`\nPublié : https://${PROPRIETAIRE}.github.io/${NOM}/ (visible dans 1 à 2 minutes)`);
