// Écrit src/lib/guides-slugs.json : les adresses (français, anglais) de chaque guide, sans leur texte.
// Pourquoi : le site public a besoin de ces adresses sur chaque page (lien « English », balises hreflang), mais pas des guides eux-mêmes
// (près de 300 Ko). Sans ce fichier, tout le texte des guides était envoyé au téléphone du visiteur dès l'accueil.
// À relancer après avoir ajouté ou renommé un guide : npm run guides-slugs   (un test échoue si le fichier est périmé)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GUIDES } from '../src/lib/guides.js';

const sortie = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/lib/guides-slugs.json');
const paires = GUIDES.map((g) => [g.fr.slug, g.en.slug]);
fs.writeFileSync(sortie, JSON.stringify(paires) + '\n');
console.log(paires.length + ' guides → ' + path.relative(process.cwd(), sortie));
