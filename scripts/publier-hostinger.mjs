// ------------------------------------------------------------
// Publie le site + l'API PHP pour Hostinger, sur la branche « hostinger » du dépôt.
//
// Utilisation : npm run publier-hostinger   (arrêtez "npm run dev" avant)
//   1. construit le site (dossier out/, à la racine du domaine)
//   2. ajoute l'API PHP (dossier api/) dans out/api
//   3. envoie le tout sur la branche « hostinger » de GitHub
//
// Sur Hostinger (une seule fois) : hPanel → Sites web → Gérer → Avancé → GIT
//   dépôt https://github.com/Oum731/kaisly.git, branche « hostinger », dossier vide (public_html).
//   Puis « Déployer » après chaque publication, ou le déploiement automatique (webhook GitHub).
// Le fichier .env (accès à la base) n'est JAMAIS publié : il se crée sur le serveur,
// dans le dossier au-dessus de public_html (voir README).
// ------------------------------------------------------------
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DEPOT = 'https://github.com/Oum731/kaisly.git';
const BRANCHE = 'hostinger';
const lancer = (cmd, options = {}) => execSync(cmd, { stdio: 'inherit', ...options });
const essayer = (cmd, options = {}) => { try { execSync(cmd, { stdio: 'ignore', ...options }); return true; } catch { return false; } };

// 1. Site, sans sous-dossier (à la racine du domaine)
const env = { ...process.env };
delete env.NEXT_PUBLIC_BASE_PATH;
lancer('npx next build', { env });

// 2. Copie de travail de la branche « hostinger » (créée si elle n'existe pas encore)
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'kaisly-hostinger-'));
if (!essayer(`git clone --quiet --depth 1 --branch ${BRANCHE} ${DEPOT} "${dossier}"`)) {
  lancer('git init -q', { cwd: dossier });
  lancer(`git checkout -q --orphan ${BRANCHE}`, { cwd: dossier });
}
// On vide tout (sauf l'historique .git) pour ne garder aucun fichier supprimé du projet
for (const f of fs.readdirSync(dossier)) if (f !== '.git') fs.rmSync(path.join(dossier, f), { recursive: true, force: true });

// 3. Site + API (sans les fichiers de test ni les secrets)
fs.cpSync('out', dossier, { recursive: true });
fs.cpSync('api', path.join(dossier, 'api'), {
  recursive: true,
  filter: (source) => !/(\.sqlite|\.env|\.log)$/.test(source),
});

// 4. Envoi sur GitHub (historique conservé : Hostinger peut faire un simple « git pull »)
lancer('git add -A', { cwd: dossier });
if (essayer('git diff --cached --quiet', { cwd: dossier })) {
  console.log('\nRien de nouveau à publier.');
} else {
  lancer(`git commit -q -m "Publication du ${new Date().toISOString().slice(0, 16).replace('T', ' ')}"`, { cwd: dossier });
  lancer(`git push -q ${DEPOT} HEAD:${BRANCHE}`, { cwd: dossier });
  console.log(`\nPublié sur la branche « ${BRANCHE} ». Sur Hostinger : hPanel → GIT → Déployer (ou automatique si le webhook est réglé).`);
}
fs.rmSync(dossier, { recursive: true, force: true });
