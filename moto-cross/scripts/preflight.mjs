// Contrôle du build avant envoi à CrazyGames : node scripts/preflight.mjs   (ou npm run preflight)
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIST = 'dist';
if (!existsSync(join(DIST, 'index.html'))) { console.error('✖ dist/index.html introuvable : lancez d\'abord `npm run build`.'); process.exit(1); }
const files = [];
(function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : files.push(p); } })(DIST);
const bytes = files.reduce((s, f) => s + statSync(f).size, 0), MB = (b) => (b / 1048576).toFixed(2) + ' Mo';
const html = readFileSync(join(DIST, 'index.html'), 'utf8');
const results = [];
const check = (level, label, detail = '') => { results.push(level); console.log(`${level === 'ok' ? '✔' : level === 'warn' ? '⚠' : '✖'} ${label}${detail ? ' — ' + detail : ''}`); };

check(bytes <= 50 * 1048576 ? 'ok' : 'fail', 'Poids total ≤ 50 Mo (téléchargement initial)', MB(bytes));
check(files.length <= 1500 ? 'ok' : 'fail', 'Nombre de fichiers ≤ 1 500', String(files.length));
check('ok', 'index.html à la racine du dossier dist');
const head = html.slice(0, html.indexOf('</head>')), sdkPos = head.indexOf('sdk.crazygames.com/crazygames-sdk-v3.js'), modPos = html.indexOf('type="module"');
check(sdkPos >= 0 && sdkPos < modPos ? 'ok' : 'fail', 'SDK CrazyGames v3 dans le <head>, avant le code du jeu');
check(!/(?:src|href)="\/(?!\/)/.test(html) ? 'ok' : 'fail', 'Chemins relatifs dans index.html (pas de « /… » absolu)');

// Adresses externes présentes dans le code livré
const urls = new Set();
for (const f of files) if (['.js', '.html', '.css'].includes(extname(f))) for (const m of readFileSync(f, 'utf8').matchAll(/https?:\/\/[^\s"'`)<>\\]+/g)) urls.add(m[0].replace(/[.,;]+$/, ''));
const known = [/^https:\/\/sdk\.crazygames\.com\//, /^https?:\/\/www\.w3\.org\//];
const unknown = [...urls].filter((u) => !known.some((k) => k.test(u)));
check(unknown.length === 0 ? 'ok' : 'warn', 'Aucune adresse externe hormis le SDK', unknown.length ? unknown.slice(0, 8).join('  ') : '');
const lbOn = [...urls].some((u) => /workers\.dev|localhost:\d+|127\.0\.0\.1/.test(u));
check(lbOn ? 'warn' : 'ok', 'Classement en ligne désactivé (aucun serveur externe appelé)', lbOn ? 'VITE_LEADERBOARD_URL est défini : à éviter pour la version CrazyGames sauf accord de la plateforme' : '');
if (existsSync('moto-cross.zip')) check('ok', 'moto-cross.zip présent', MB(statSync('moto-cross.zip').size));
else check('warn', 'moto-cross.zip absent', 'lancez `npm run zip`');

const fail = results.filter((r) => r === 'fail').length, warn = results.filter((r) => r === 'warn').length;
console.log(`\n${fail ? '✖ ' + fail + ' point(s) bloquant(s)' : '✔ Aucun point bloquant'}${warn ? ' · ' + warn + ' avertissement(s)' : ''}`);
process.exit(fail ? 1 : 0);
