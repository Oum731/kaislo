// Empaquette le jeu en fichiers HTML autonomes (images incluses, aucune ressource externe sauf le SDK du portail).
//   node build.mjs                       -> dist/apex-rider-gp.html (autonome, sans SDK)
//   GM_ID=votre_game_id node build.mjs   -> + dist/gamemonetize/ (index.html avec SDK GameMonetize + zip + miniatures)
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const here = dirname(fileURLToPath(import.meta.url));
const out = await build({ entryPoints: [join(here, 'game.js')], bundle: true, minify: true, format: 'iife', write: false, target: 'es2020' });
const js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
let html = readFileSync(join(here, 'index.html'), 'utf8').replace(/<script type="module" src=".\/game.js"><\/script>/, () => `<script>${js}</script>`);
// images locales -> data URI (un seul fichier, aucun chargement externe)
html = html.replace(/assets\/([\w.-]+\.jpg)/g, (_, f) => `data:image/jpeg;base64,${readFileSync(join(here, 'assets', f)).toString('base64')}`);

const sdk = id => `<script>
window.SDK_OPTIONS={gameId:"${id}",onEvent:function(a){switch(a.name){case"SDK_GAME_PAUSE":window.__gm&&window.__gm.pause();break;case"SDK_GAME_START":window.__gm&&window.__gm.resume();break;}}};
(function(a,b,c){var d=a.getElementsByTagName(b)[0];a.getElementById(c)||(a=a.createElement(b),a.id=c,a.src="https://api.gamemonetize.com/sdk.js",d.parentNode.insertBefore(a,d))})(document,"script","gamemonetize-sdk");
</script>`;
const dist = join(here, 'dist'); rmSync(dist, { recursive: true, force: true }); mkdirSync(dist, { recursive: true });
writeFileSync(join(dist, 'apex-rider-gp.html'), html.replace('<!--GM_SDK-->', ''));
console.log('standalone OK', (html.length / 1024).toFixed(0), 'Ko');

const gm = join(dist, 'gamemonetize'); mkdirSync(gm, { recursive: true });
const id = process.env.GM_ID || 'VOTRE_GAME_ID';
writeFileSync(join(gm, 'index.html'), html.replace('<!--GM_SDK-->', sdk(id)));
try { execFileSync('zip', ['-j', '-q', join(gm, 'apex-rider-gp-gamemonetize.zip'), join(gm, 'index.html')]); console.log('zip OK (gameId =', id + ')'); }
catch { console.log('zip indisponible : compressez dist/gamemonetize/index.html à la main'); }
for (const f of readdirSync(join(here, 'store'))) copyFileSync(join(here, 'store', f), join(gm, f));
