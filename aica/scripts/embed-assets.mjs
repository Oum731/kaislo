// Intègre les images de la carte dans src/lib/assets-data.js (base64),
// pour que la génération du PDF marche sur n'importe quel hébergeur (aucun fichier à lire).
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
const out = {};
const jobs = { logo: ['public/brand/logo.png', 360], cachet: ['assets/cachet.png', 320], ci: ['assets/ci.png', 150], ma: ['assets/ma.png', 150] };
for (const [k, [f, w]] of Object.entries(jobs)) {
  const buf = await sharp(f).resize({ width: w }).png({ compressionLevel: 9, palette: k === 'ci' }).toBuffer();
  out[k] = buf.toString('base64');
}
writeFileSync('src/lib/assets-data.js', '// Généré par scripts/embed-assets.mjs — ne pas modifier à la main\nexport default ' + JSON.stringify(out) + ';\n');
console.log('ok', Object.fromEntries(Object.entries(out).map(([k, v]) => [k, Math.round(v.length / 1024) + ' Ko'])));
