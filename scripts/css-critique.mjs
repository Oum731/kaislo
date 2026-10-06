// ------------------------------------------------------------
// Après « npm run build » : place dans chaque page le CSS dont l'écran de départ a besoin, et charge le reste
// sans bloquer l'affichage (Google PageSpeed : « éliminez les ressources qui bloquent le rendu »).
// Le fichier CSS complet reste chargé ; sans JavaScript, il se charge normalement (balise noscript).
// ------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import Critters from 'critters';

const DOSSIER = 'out';
const critters = new Critters({ path: DOSSIER, publicPath: '/', preload: 'media', pruneSource: false, logLevel: 'silent' });

const pages = [];
(function lire(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (e.name !== '_next') lire(p); } else if (e.name.endsWith('.html')) pages.push(p);
  }
})(DOSSIER);

let faites = 0;
for (const p of pages) {
  const html = fs.readFileSync(p, 'utf8');
  if (!/<link rel="stylesheet"/.test(html)) continue;
  // Sans JavaScript : la version de secours (noscript) charge le CSS normalement
  const sortie = (await critters.process(html)).replace(/<noscript>(<link rel="stylesheet"[^>]*?) media="print" onload="this\.media='all'"/g, '<noscript>$1');
  fs.writeFileSync(p, sortie);
  faites++;
}
console.log(`CSS critique : ${faites} pages optimisées.`);
