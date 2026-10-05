// ------------------------------------------------------------
// CONTRÔLE DU RÉFÉRENCEMENT sur le site construit (dossier out/) — lancé par la CI après « npm run build »
//   npm run build && npm run seo
// Vérifie sur chaque page publique : titre et description de bonne longueur, adresse canonique, aperçu de partage
// à la bonne adresse, un seul titre h1, données structurées lisibles, présence dans le plan du site.
// ------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';

const SITE = 'https://kaislo.com';
const PRIVEES = [/^app\//, /^admin\//, /^commercial\//, /^404/, /^videos\//, /^caisse-/];
const erreurs = [];
const pages = [];
(function parcourir(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) parcourir(p);
    else if (e.name === 'index.html') pages.push(p);
  }
})('out');

// Jamais d'en-tête « noindex » dans le .htaccess : il a déjà empêché Google d'indexer kaislo.com
const htaccess = fs.existsSync('out/.htaccess') ? fs.readFileSync('out/.htaccess', 'utf8') : '';
if (/^[^#\n]*X-Robots-Tag[^\n]*noindex/im.test(htaccess)) erreurs.push('.htaccess : en-tête X-Robots-Tag noindex interdit (bloque l\'indexation par Google)');
const sitemap = fs.readFileSync('out/sitemap.xml', 'utf8');
for (const f of pages) {
  const lien = path.relative('out', path.dirname(f)).replace(/\\/g, '/');
  if (PRIVEES.some((r) => r.test(lien + '/'))) continue;
  const adresse = lien ? `/${lien}/` : '/';
  const html = fs.readFileSync(f, 'utf8');
  const dit = (m) => erreurs.push(`${adresse} : ${m}`);
  const titre = /<title>(.*?)<\/title>/.exec(html)?.[1];
  const description = /<meta name="description" content="(.*?)"/.exec(html)?.[1];
  const canonique = /rel="canonical" href="(.*?)"/.exec(html)?.[1];
  const ogUrl = /<meta property="og:url" content="(.*?)"/.exec(html)?.[1];
  if (!titre) dit('titre manquant'); else if (titre.length > 65) dit(`titre trop long (${titre.length}) : ${titre}`);
  if (!description) dit('description manquante'); else if (description.length > 160 || description.length < 50) dit(`description de ${description.length} caractères`);
  if (canonique !== SITE + adresse) dit(`adresse canonique inattendue : ${canonique}`);
  if (ogUrl !== SITE + adresse) dit(`aperçu de partage (og:url) inattendu : ${ogUrl}`);
  const h1 = (html.match(/<h1[ >]/g) || []).length;
  if (h1 !== 1) dit(`${h1} titres h1 (un seul attendu)`);
  for (const m of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) {
    try { JSON.parse(m[1]); } catch { dit('données structurées illisibles'); }
  }
  if (!sitemap.includes(`<loc>${SITE}${adresse}</loc>`)) dit('absente du plan du site');
}
for (const m of sitemap.matchAll(/<loc>(.*?)<\/loc>/g)) {
  const lien = m[1].replace(SITE, '').replace(/^\/|\/$/g, '');
  if (!fs.existsSync(path.join('out', lien, 'index.html'))) erreurs.push(`plan du site : ${m[1]} n'existe pas`);
}
if (erreurs.length) { console.error(erreurs.join('\n')); process.exit(1); }
console.log(`Référencement : ${pages.length} pages contrôlées, aucun problème.`);
