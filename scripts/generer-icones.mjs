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

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const VERT = '#1E5B43', CREME = '#F6F5F1', SAFRAN = '#E8A317', ENCRE = '#14211C';

// La marque : un K dont la jambe se termine par une « boîte » (la caisse et le stock)
const dessinK = `<g fill="none" stroke="${CREME}" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v34"/><path d="M42 15L24 33l11 10"/></g><rect x="35.5" y="38.5" width="13" height="13" rx="2.8" fill="${SAFRAN}"/>`;
const marque = (arrondi = 15) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="${arrondi}" fill="${VERT}"/>${dessinK}</svg>`;
// Icône « maskable » (Android découpe en rond ou en goutte) : dessin réduit au centre, fond plein
const marqueMaskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${VERT}"/><g transform="translate(9.6 9.6) scale(0.7)">${dessinK}</g></svg>`;
const POLICE = `<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=DM+Sans:wght@500;600&display=block" rel="stylesheet">`;
const logoComplet = (fond, texte) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 330 80"><rect width="330" height="80" fill="${fond}"/><g transform="translate(8 8)">${marque().replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">', '<svg width="64" height="64" viewBox="0 0 64 64">')}</g><text x="86" y="59" font-family="'Bricolage Grotesque', 'Arial Black', sans-serif" font-weight="800" font-size="52" letter-spacing="-1.8" fill="${texte}">Kaislo</text></svg>`;

fs.mkdirSync('public/icons', { recursive: true });
fs.mkdirSync('public/logo', { recursive: true });
fs.writeFileSync('public/icons/icone.svg', marque());
fs.writeFileSync('public/logo/kaislo-marque.svg', marque());
fs.writeFileSync('public/logo/kaislo-logo.svg', logoComplet('none', ENCRE).replace('<rect width="330" height="80" fill="none"/>', ''));
fs.writeFileSync('public/logo/kaislo-logo-sombre.svg', logoComplet(ENCRE, CREME));

const navigateur = await puppeteer.launch({ executablePath: CHROME, headless: 'new', userDataDir: fs.mkdtempSync('out-icones-') });
const page = await navigateur.newPage();

// Rend un morceau de HTML en PNG (fond transparent possible)
async function rendre(html, largeur, hauteur, fichier, transparent = true) {
  await page.setViewport({ width: largeur, height: hauteur, deviceScaleFactor: 1 });
  await page.setContent(`<html><head>${POLICE}<style>html,body{margin:0;background:transparent}</style></head><body>${html}</body></html>`, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  return page.screenshot({ path: fichier, omitBackground: transparent, clip: { x: 0, y: 0, width: largeur, height: hauteur } });
}
const img = (svg, taille) => `<img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" width="${taille}" height="${taille}" style="display:block">`;

for (const t of [48, 192, 512]) await rendre(img(marque(), t), t, t, `public/icons/icone-${t}.png`);
await rendre(img(marque(0), 180), 180, 180, 'public/icons/icone-180.png', false); // iPhone : carré plein (arrondi par iOS)
await rendre(img(marqueMaskable, 512), 512, 512, 'public/icons/icone-maskable-512.png', false);
await rendre(img(marque(), 1024), 1024, 1024, 'public/logo/kaislo-marque.png');
await rendre(`<div style="display:flex;align-items:center;gap:22px;padding:24px 36px 24px 24px">${img(marque(), 112)}<span style="font:800 92px 'Bricolage Grotesque';letter-spacing:-0.035em;color:${ENCRE}">Kaislo</span></div>`, 520, 160, 'public/logo/kaislo-logo.png');
await rendre(`<div style="display:flex;align-items:center;gap:22px;padding:24px 36px 24px 24px;background:${ENCRE}">${img(marque(), 112)}<span style="font:800 92px 'Bricolage Grotesque';letter-spacing:-0.035em;color:${CREME}">Kaislo</span></div>`, 520, 160, 'public/logo/kaislo-logo-sombre.png', false);

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
await rendre(`<div style="width:1200px;height:630px;background:#F6F5F1;display:flex;align-items:center;gap:40px;padding:0 0 0 72px;box-sizing:border-box;font-family:'DM Sans',sans-serif;overflow:hidden">
  <div style="flex:0 0 520px">
    <div style="display:flex;align-items:center;gap:16px">${img(marque(), 76)}<span style="font:800 64px 'Bricolage Grotesque';letter-spacing:-0.035em;color:${ENCRE}">Kaislo</span></div>
    <p style="font:800 46px/1.12 'Bricolage Grotesque';letter-spacing:-0.02em;color:${ENCRE};margin:34px 0 18px">La caisse et la gestion de stock de votre commerce.</p>
    <p style="font:500 24px/1.4 'DM Sans';color:#4A5650;margin:0">Téléphone, tablette, ordinateur · toutes les devises · essai gratuit 30 jours</p>
  </div>
  ${capture ? `<img src="${capture}" style="height:520px;border-radius:14px;border:1px solid #CFCBC0;box-shadow:0 24px 60px rgba(20,33,28,.18)">` : ''}
</div>`, 1200, 630, 'public/og-image.png', false);

await navigateur.close();
for (const d of fs.readdirSync('.')) if (d.startsWith('out-icones-')) fs.rmSync(d, { recursive: true, force: true });
console.log('Logo et icônes générés.');
