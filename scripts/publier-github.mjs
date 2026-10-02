// ------------------------------------------------------------
// Publie la version de test sur GitHub Pages :
//   https://oum731.github.io/kaisly/
//
// Utilisation : npm run publier-github  (arrêtez "npm run dev" avant)
// 1. construit le site pour le sous-dossier /kaisly
// 2. envoie le dossier out/ sur la branche gh-pages du dépôt
// Attention : out/ contient alors la version GitHub. Relancez
// "npm run build" avant d'envoyer le site sur Hostinger.
// ------------------------------------------------------------
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const DEPOT = 'https://github.com/Oum731/kaisly.git';
const lancer = (cmd, options = {}) => execSync(cmd, { stdio: 'inherit', ...options });

// 1. Construction avec le sous-dossier
lancer('npx next build', { env: { ...process.env, NEXT_PUBLIC_BASE_PATH: '/kaisly' } });

// GitHub Pages ignore les dossiers commençant par "_" (comme _next) sans ce fichier
fs.writeFileSync('out/.nojekyll', '');

// 2. Envoi : out/ devient un petit dépôt dont on pousse le contenu sur gh-pages
fs.rmSync('out/.git', { recursive: true, force: true });
lancer('git init -q -b gh-pages', { cwd: 'out' });
lancer('git add -A', { cwd: 'out' });
lancer('git commit -q -m "Publication de la version de test"', { cwd: 'out' });
lancer(`git push -f ${DEPOT} gh-pages`, { cwd: 'out' });
fs.rmSync('out/.git', { recursive: true, force: true });

console.log('\nPublié : https://oum731.github.io/kaisly/ (visible dans 1 à 2 minutes)');
