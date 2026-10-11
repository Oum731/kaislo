// Fabrique dist-single/index.html : UN SEUL fichier avec tout le jeu à l'intérieur (code et styles).
// Le SDK CrazyGames reste une balise externe (il doit être chargé depuis leurs serveurs).
// Usage : npm run single   (compile puis intègre)
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'dist', OUT = 'dist-single';
let html = readFileSync(join(SRC, 'index.html'), 'utf8');
const used = new Set(['index.html']);

// <script type="module" crossorigin src="./assets/x.js"></script>  →  script en ligne
html = html.replace(/<script type="module"[^>]*\ssrc="\.\/([^"]+)"[^>]*><\/script>/g, (m, file) => {
  used.add(file);
  const js = readFileSync(join(SRC, file), 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script type="module">${js}</script>`;
});
// <link rel="stylesheet" href="./assets/x.css">  →  style en ligne
html = html.replace(/<link rel="stylesheet"[^>]*\shref="\.\/([^"]+)"[^>]*>/g, (m, file) => { used.add(file); return `<style>${readFileSync(join(SRC, file), 'utf8')}</style>`; });
html = html.replace(/<link rel="modulepreload"[^>]*>/g, '');

// Tout fichier restant dans dist/ ne serait pas intégré : on prévient plutôt que de livrer un jeu incomplet
const all = []; (function walk(d, p = '') { for (const f of readdirSync(d)) { const q = join(d, f); statSync(q).isDirectory() ? walk(q, p + f + '/') : all.push(p + f); } })(SRC);
const missing = all.filter((f) => !used.has(f));
if (missing.length) { console.error('✖ Fichiers non intégrés (images, polices…) :', missing.join(', '), '\n  Intégrez-les en data: dans le code ou ajoutez-les à scripts/single.mjs.'); process.exit(1); }

rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'index.html'), html);
console.log(`✔ ${OUT}/index.html créé (${(Buffer.byteLength(html) / 1024).toFixed(0)} Ko)`);
