// ------------------------------------------------------------
// Génère le logo et toutes les icônes de Kaislo à partir du dessin ci-dessous.
// Lancer : npm run icones   (après « npm run build » pour l'image de partage)
//
//   public/favicon.ico                 onglet du navigateur et résultats Google (16, 32, 48 px)
//   public/icons/icone.svg             icône vectorielle (navigateurs récents)
//   public/icons/icone-48|180|192|512.png, icone-maskable-512.png   téléphones (iPhone, Android)
//   public/og-image.png                image affichée quand on partage un lien (1200 × 630)
//   public/logo/…                      logo complet (SVG, PNG clair et sombre) pour les documents
// ------------------------------------------------------------
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const CHROME = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].filter(Boolean).find((c) => fs.existsSync(c));
if (!CHROME) { console.error('Chrome introuvable : indiquez son chemin dans la variable CHROME_PATH.'); process.exit(1); }
const VERT = '#05561F', CREME = '#F6F5F1', SAFRAN = '#F5B014', ENCRE = '#14211C';

// LOGO FOURNI : public/logo/kaislo-source.jpg (le logo de la marque, tel que fourni). On n'en redessine rien :
// la « tuile » (le K dans son carré vert) est découpée dans cette image pour les icônes, le logo complet sert tel quel.
const SOURCE = fs.readFileSync('public/logo/kaislo-source.jpg').toString('base64');
let TUILE = ''; // PNG 512 × 512 de la tuile, coins arrondis transparents (préparé plus bas avec le navigateur)
const marque = (arrondi = 15) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><image href="data:image/png;base64,${TUILE}" width="64" height="64"/></svg>`;
// Icônes à fond plein (iPhone, Android « maskable ») : fond vert du logo, tuile réduite au centre
const marquePleine = (echelle) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${VERT}"/><image href="data:image/png;base64,${TUILE}" x="${(64 - 64 * echelle) / 2}" y="${(64 - 64 * echelle) / 2}" width="${64 * echelle}" height="${64 * echelle}"/></svg>`;
const logoImage = (fond) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 896 885"><rect width="896" height="885" fill="${fond}"/><image href="data:image/jpeg;base64,${SOURCE}" width="896" height="885"/></svg>`;
const POLICE = `<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=DM+Sans:wght@500;600&display=block" rel="stylesheet">`;

fs.mkdirSync('public/icons', { recursive: true });
fs.mkdirSync('public/logo', { recursive: true });

const navigateur = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: process.env.CHROME_SANS_BAC_A_SABLE ? ['--no-sandbox'] : [], userDataDir: fs.mkdtempSync('out-icones-') });
const page = await navigateur.newPage();

// La tuile : le carré vert du logo, découpé aux coins arrondis (le reste du fond blanc devient transparent)
TUILE = (await page.evaluate(async (src) => {
  const im = new Image(); im.src = 'data:image/jpeg;base64,' + src; await im.decode();
  const c = document.createElement('canvas'); c.width = 512; c.height = 512; const x = c.getContext('2d');
  const [sx, sy, sw, sh, r] = [226, 81, 448, 432, 76];
  x.beginPath(); x.roundRect(0, 0, 512, 512, r * 512 / sw); x.clip();
  x.drawImage(im, sx, sy, sw, sh, 0, 0, 512, 512);
  return c.toDataURL('image/png').split(',')[1];
}, SOURCE));
fs.writeFileSync('public/icons/icone.svg', marque());
fs.writeFileSync('public/logo/kaislo-marque.svg', marque());
fs.writeFileSync('public/logo/kaislo-logo.svg', logoImage('#ffffff'));
fs.writeFileSync('public/logo/kaislo-logo-sombre.svg', logoImage('#ffffff'));
fs.writeFileSync('public/logo/kaislo-marque-96.png', Buffer.from(await page.evaluate(async (t) => {
  const im = new Image(); im.src = 'data:image/png;base64,' + t; await im.decode();
  const c = document.createElement('canvas'); c.width = 96; c.height = 96; const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, 96, 96);
  return c.toDataURL('image/png').split(',')[1];
}, TUILE), 'base64'));

// Rend un morceau de HTML en PNG (fond transparent possible)
async function rendre(html, largeur, hauteur, fichier, transparent = true) {
  await page.setViewport({ width: largeur, height: hauteur, deviceScaleFactor: 1 });
  await page.setContent(`<html><head>${POLICE}<style>html,body{margin:0;background:transparent}</style></head><body>${html}</body></html>`, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  return page.screenshot({ path: fichier, omitBackground: transparent, clip: { x: 0, y: 0, width: largeur, height: hauteur } });
}
const img = (svg, taille) => `<img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" width="${taille}" height="${taille}" style="display:block">`;

for (const t of [48, 192, 512]) await rendre(img(marque(), t), t, t, `public/icons/icone-${t}.png`);
await rendre(img(marquePleine(0.9), 180), 180, 180, 'public/icons/icone-180.png', false); // iPhone : carré plein (arrondi par iOS)
await rendre(img(marquePleine(0.68), 512), 512, 512, 'public/icons/icone-maskable-512.png', false);
await rendre(img(marque(), 1024), 1024, 1024, 'public/logo/kaislo-marque.png');
await rendre(`<img src="data:image/jpeg;base64,${SOURCE}" width="600" height="593" style="display:block">`, 600, 593, 'public/logo/kaislo-logo.png', false);
fs.copyFileSync('public/logo/kaislo-logo.png', 'public/logo/kaislo-logo-sombre.png');

// favicon.ico : plusieurs tailles PNG dans un seul fichier
const tailles = [16, 32, 48];
const pngs = [];
for (const t of tailles) pngs.push(await rendre(img(marque(t <= 16 ? 12 : 15), t), t, t, `out-icones-${t}.png`));
const entete = Buffer.alloc(6 + 16 * tailles.length);
entete.writeUInt16LE(0, 0); entete.writeUInt16LE(1, 2); entete.writeUInt16LE(tailles.length, 4);
let decalage = entete.length;
tailles.forEach((t, i) => {
  const o = 6 + 16 * i;
  entete.writeUInt8(t, o); entete.writeUInt8(t, o + 1); entete.writeUInt16LE(1, o + 4); entete.writeUInt16LE(32, o + 6);
  entete.writeUInt32LE(pngs[i].length, o + 8); entete.writeUInt32LE(decalage, o + 12);
  decalage += pngs[i].length;
});
fs.writeFileSync('public/favicon.ico', Buffer.concat([entete, ...pngs]));
for (const t of tailles) fs.rmSync(`out-icones-${t}.png`, { force: true });

// Image de partage (Facebook, WhatsApp, LinkedIn, Google) : logo, promesse et capture de l'application
const capture = fs.existsSync('public/captures/tableau-ordi.webp') ? `data:image/webp;base64,${fs.readFileSync('public/captures/tableau-ordi.webp').toString('base64')}` : '';
await rendre(`<div style="width:1200px;height:630px;background:#FFFFFF;display:flex;align-items:center;gap:40px;padding:0 0 0 72px;box-sizing:border-box;font-family:'DM Sans',sans-serif;overflow:hidden">
  <div style="flex:0 0 520px">
    <img src="data:image/jpeg;base64,${SOURCE}" width="250" height="247" style="display:block;margin:0 0 -10px -20px">
    <p style="font:800 46px/1.12 'Bricolage Grotesque';letter-spacing:-0.02em;color:${ENCRE};margin:34px 0 18px">La gestion des ventes et du stock de votre commerce.</p>
    <p style="font:500 24px/1.4 'DM Sans';color:#4A5650;margin:0">Téléphone, tablette, ordinateur · toutes les devises · essai gratuit 30 jours</p>
  </div>
  ${capture ? `<img src="${capture}" style="height:520px;border-radius:14px;border:1px solid #CFCBC0;box-shadow:0 24px 60px rgba(20,33,28,.18)">` : ''}
</div>`, 1200, 630, 'public/og-image.png', false);

await navigateur.close();
for (const d of fs.readdirSync('.')) if (d.startsWith('out-icones-')) fs.rmSync(d, { recursive: true, force: true });
console.log('Logo et icônes générés.');
