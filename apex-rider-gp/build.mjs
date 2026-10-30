// Empaquette le jeu en UN SEUL fichier HTML autonome (dist/apex-rider-gp.html).
// Usage : node build.mjs   (nécessite esbuild : npm i -D esbuild)
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const out = await build({ entryPoints: [join(here, 'game.js')], bundle: true, minify: true, format: 'iife', write: false, target: 'es2020' });
const js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = readFileSync(join(here, 'index.html'), 'utf8').replace(/<script type="module" src=".\/game.js"><\/script>/, () => `<script>${js}</script>`);
mkdirSync(join(here, 'dist'), { recursive: true });
writeFileSync(join(here, 'dist/apex-rider-gp.html'), html);
console.log('OK', (html.length / 1024).toFixed(0), 'Ko');
// Archive prête à téléverser (itch.io, Newgrounds, GameJolt, CrazyGames… : index.html à la racine du zip)
import { execFileSync } from 'node:child_process';
import { copyFileSync, rmSync } from 'node:fs';
copyFileSync(join(here, 'dist/apex-rider-gp.html'), join(here, 'dist/index.html'));
rmSync(join(here, 'dist/apex-rider-gp.zip'), { force: true });
try { execFileSync('zip', ['-j', '-q', join(here, 'dist/apex-rider-gp.zip'), join(here, 'dist/index.html')]); console.log('zip OK'); } catch { console.log('zip non disponible : compressez dist/index.html à la main'); }
rmSync(join(here, 'dist/index.html'), { force: true });
