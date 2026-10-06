// ------------------------------------------------------------
// LOGOS AU BON FORMAT POUR GOOGLE ADS : npm run logos-ads   (après « npm run build » : la police vient de out/)
//   outils/logos-ads/kaislo-ads-logo-carre-1200x1200.png       logo carré 1:1 (recommandé 1200 × 1200, minimum 128 × 128)
//   outils/logos-ads/kaislo-ads-logo-paysage-1200x300.png      logo paysage 4:1 (recommandé 1200 × 300, minimum 512 × 128)
//   … et leurs versions « -transparent » (fond transparent)
// PNG sur fond blanc (le plus sûr : Google affiche le logo sur des fonds variés), bien en dessous de la limite de 5 Mo.
// Dessin : le même que le logo du site (scripts/generer-icones.mjs).
// ------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const CHROME = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean).find((c) => fs.existsSync(c));
if (!CHROME) { console.error('Chrome introuvable : indiquez son chemin dans la variable CHROME_PATH.'); process.exit(1); }
const VERT = '#1E5B43', CREME = '#F6F5F1', SAFRAN = '#E8A317', ENCRE = '#14211C';
const SORTIE = 'outils/logos-ads';

// Police du logo (Bricolage Grotesque, déjà téléchargée par « npm run build ») : fichier « latin » indiqué par le CSS du site
const dossierCss = 'out/_next/static/css';
const css = fs.readdirSync(dossierCss).map((f) => fs.readFileSync(path.join(dossierCss, f), 'utf8')).join('\n');
const regle = [...css.matchAll(/@font-face\{font-family:Bricolage Grotesque;[^}]*?src:url\(([^)]+)\)[^}]*?unicode-range:([^}]*)\}/g)].find((m) => /u\+00\?\?/i.test(m[2]));
if (!regle) { console.error('Police introuvable dans out/ : lancez d’abord « npm run build ».'); process.exit(1); }
const fichierPolice = path.resolve('out' + regle[1]);

const marque = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="${VERT}"/><g fill="none" stroke="${CREME}" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v34"/><path d="M42 15L24 33l11 10"/></g><rect x="35.5" y="38.5" width="13" height="13" rx="2.8" fill="${SAFRAN}"/></svg>`;
const img = (taille) => `<img src="data:image/svg+xml;base64,${Buffer.from(marque).toString('base64')}" width="${taille}" height="${taille}" style="display:block">`;

const FORMATS = [
  // carré : la marque occupe 80 % de la largeur (marge de 10 % tout autour)
  { nom: 'carre-1200x1200', l: 1200, h: 1200, corps: img(960) },
  // paysage 4:1 : marque + mot « Kaislo », centrés, marge d'environ 10 % en haut et en bas
  { nom: 'paysage-1200x300', l: 1200, h: 300, corps: `<div style="display:flex;align-items:center;gap:34px">${img(220)}<span style="font:800 188px/1 'Bricolage Grotesque';letter-spacing:-0.035em;color:${ENCRE}">Kaislo</span></div>` },
];

fs.mkdirSync(SORTIE, { recursive: true });
const dossierTmp = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'logos-ads-'));
const navigateur = await puppeteer.launch({ executablePath: CHROME, headless: 'new', userDataDir: path.join(dossierTmp, 'profil'), args: process.getuid?.() === 0 ? ['--no-sandbox'] : [] });
const page = await navigateur.newPage();
for (const f of FORMATS) {
  for (const transparent of [false, true]) {
    await page.setViewport({ width: f.l, height: f.h, deviceScaleFactor: 1 });
    const html = path.join(dossierTmp, 'logo.html');
    fs.writeFileSync(html, `<html><head><style>@font-face{font-family:'Bricolage Grotesque';font-weight:200 800;src:url('file://${fichierPolice}') format('woff2')}html,body{margin:0;width:${f.l}px;height:${f.h}px;background:${transparent ? 'transparent' : '#fff'}}body{display:flex;align-items:center;justify-content:center}</style></head><body>${f.corps}</body></html>`);
    await page.goto('file://' + html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const fichier = path.join(SORTIE, `kaislo-ads-logo-${f.nom}${transparent ? '-transparent' : ''}.png`);
    await page.screenshot({ path: fichier, omitBackground: transparent, clip: { x: 0, y: 0, width: f.l, height: f.h } });
    console.log(`${fichier} : ${f.l} × ${f.h}, ${Math.round(fs.statSync(fichier).size / 1024)} Ko`);
  }
}
await navigateur.close();
fs.rmSync(dossierTmp, { recursive: true, force: true });
