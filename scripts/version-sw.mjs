// ------------------------------------------------------------
// Donne au service worker une version unique à chaque construction du site :
// les appareils qui ont déjà installé l'application récupèrent ainsi les nouveautés
// (plus besoin de changer VERSION à la main dans public/sw.js).
// Lancé automatiquement après « npm run build » et par les scripts de publication.
// ------------------------------------------------------------
import fs from 'node:fs';

const fichier = 'out/sw.js';
if (!fs.existsSync(fichier)) { console.error('out/sw.js introuvable : construisez d’abord le site (npm run build).'); process.exit(1); }
const version = 'kaislo-' + new Date().toISOString().slice(0, 16).replace(/\D/g, ''); // ex : kaislo-202610050104
const source = fs.readFileSync(fichier, 'utf8');
const nouveau = source.replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`);
if (nouveau === source) { console.error('Ligne « const VERSION = … » introuvable dans out/sw.js'); process.exit(1); }
fs.writeFileSync(fichier, nouveau);
console.log('Service worker : version ' + version);
