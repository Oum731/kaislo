// ------------------------------------------------------------
// IMAGES RESPONSIVES du site : npm run images
// Pour chaque capture d'écran de public/captures/ (et chaque affiche de public/videos/), fabrique des versions plus petites
// (…-480.webp, …-800.webp, …-1200.webp pour les écrans d'ordinateur ; …-390.webp, …-600.webp pour les téléphones),
// pour qu'un téléphone ne télécharge pas une image de 1440 pixels. L'original reste la plus grande version.
// Les versions sont versionnées avec le dépôt : à relancer seulement quand une capture ou une affiche change.
// ------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const DOSSIERS = ['public/captures', 'public/videos'];
const LARGEURS_ORDI = [480, 800, 1200];
const LARGEURS_TEL = [390, 600];
const estVariante = (nom) => /-\d+\.webp$/.test(nom);
let total = 0, nb = 0;

for (const dossier of DOSSIERS) {
  for (const nom of fs.readdirSync(dossier)) {
    if (!nom.endsWith('.webp') || estVariante(nom)) continue;
    const source = path.join(dossier, nom);
    const meta = await sharp(source).metadata();
    const tel = meta.height > meta.width; // téléphone : image en hauteur
    for (const l of tel ? LARGEURS_TEL : LARGEURS_ORDI) {
      if (l >= meta.width) continue;
      const sortie = path.join(dossier, nom.replace(/\.webp$/, `-${l}.webp`));
      await sharp(source).resize({ width: l }).webp({ quality: 72, effort: 6 }).toFile(sortie);
      total += fs.statSync(sortie).size; nb++;
    }
  }
}
console.log(`${nb} versions réduites écrites (${Math.round(total / 1024)} Ko au total).`);
