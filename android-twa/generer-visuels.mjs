// ------------------------------------------------------------
// Fabrique les images de l'application Android à partir des icônes et captures du site :
//   - icônes de l'application (app/src/main/res/mipmap-*, drawable-nodpi)
//   - visuels de la fiche Google Play (play-store/) : icône 512, image à la une 1024×500, 4 captures 1080×1920
// Utilisation (depuis le dossier du dépôt) : npm run build, puis  node android-twa/generer-visuels.mjs
// (utilise sharp et puppeteer-core déjà installés pour le site ; Chrome/Chromium cherché comme pour « npm run captures »)
// ------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import puppeteer from 'puppeteer-core';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.join(ICI, '..');
const RES = path.join(ICI, 'app/src/main/res');
const PLAY = path.join(ICI, 'play-store');
const VERT = '#1E5B43';
const CHROMES = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/opt/pw-browsers/chromium/chrome-linux/chrome', '/opt/pw-browsers/chromium', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
const CHROME = CHROMES.find((c) => fs.existsSync(c));
if (!CHROME) { console.error('Chrome introuvable : indiquez son chemin dans la variable CHROME_PATH.'); process.exit(1); }

fs.mkdirSync(path.join(PLAY, 'captures'), { recursive: true });
const marque = path.join(SITE, 'public/icons/icone-maskable-512.png'); // K blanc + carré safran sur fond vert, plein cadre
const icone = path.join(SITE, 'public/icons/icone-512.png'); // même icône, coins arrondis

// ---------- Icônes de l'application ----------
const DENSITES = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [d, taille] of Object.entries(DENSITES)) {
  const dossier = path.join(RES, `mipmap-${d}`);
  await sharp(icone).resize(taille, taille).png().toFile(path.join(dossier, 'ic_launcher.png'));
  const rond = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${taille}" height="${taille}"><circle cx="${taille / 2}" cy="${taille / 2}" r="${taille / 2}"/></svg>`);
  await sharp(marque).resize(taille, taille).composite([{ input: rond, blend: 'dest-in' }]).png().toFile(path.join(dossier, 'ic_launcher_round.png'));
}
// Icône adaptative : le K sur fond transparent (le fond vert est dans res/values/colors.xml), centré dans la zone sûre
{
  const { data, info } = await sharp(marque).resize(518, 518).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const ecart = Math.abs(data[i] - 30) + Math.abs(data[i + 1] - 91) + Math.abs(data[i + 2] - 67); // proche du vert #1E5B43
    if (ecart < 24) data[i + 3] = 0;
    else if (ecart < 90) data[i + 3] = Math.round(((ecart - 24) / 66) * 255);
  }
  await sharp(data, { raw: info }).extract({ left: 43, top: 43, width: 432, height: 432 }).png().toFile(path.join(RES, 'drawable-nodpi/ic_launcher_foreground.png'));
  // Écran de démarrage : le logo seul, sur le fond crème
  await sharp(icone).resize(320, 320).png().toFile(path.join(RES, 'drawable-nodpi/ecran_demarrage.png'));
}

// ---------- Fiche Google Play ----------
await sharp(marque).resize(512, 512).png().toFile(path.join(PLAY, 'icone-512.png'));

if (!fs.existsSync(path.join(SITE, 'out/index.html'))) { console.error('Lancez d’abord : npm run build'); process.exit(1); }
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json' };
const serveur = http.createServer((req, res) => {
  let f = path.join(SITE, 'out', decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(4377);
const U = 'http://localhost:4377';
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
const navigateur = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--hide-scrollbars', '--allow-file-access-from-files'] });

// Capture du tableau de bord (démo restaurant, FCFA) pour la 4e image
async function captureTableau() {
  const ctx = await navigateur.createBrowserContext();
  const p = await ctx.newPage();
  await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p.evaluateOnNewDocument(() => Object.defineProperty(navigator, 'language', { get: () => 'fr-FR' }));
  const url = `${U}/app/?demo=resto-ivoire&pays=CI`;
  await p.goto(url, { waitUntil: 'networkidle0' });
  await p.evaluate(() => localStorage.clear());
  await p.goto(url, { waitUntil: 'networkidle0' });
  for (let i = 0; i < 30; i++) {
    const ok = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((e) => e.offsetParent && e.textContent.includes('Gérant')); if (b) b.click(); return !!b; });
    if (ok) break; await attendre(250);
  }
  await attendre(1500);
  const ouverture = await p.evaluate(() => { const b = [...document.querySelectorAll('.feuille button')].find((e) => e.textContent.includes('Ouvrir la journée')); if (b) b.click(); return !!b; });
  if (ouverture) await attendre(900);
  const sortie = path.join(PLAY, 'captures/_tableau.png');
  await p.screenshot({ path: sortie });
  await ctx.close();
  return sortie;
}

const page = await navigateur.newPage();
async function visuel(fichier, largeur, hauteur, html) {
  await page.setViewport({ width: largeur, height: hauteur, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await attendre(300);
  await page.screenshot({ path: fichier });
}
const CSS = `*{box-sizing:border-box;margin:0}body{font-family:'DejaVu Sans',Arial,sans-serif;color:#fff;overflow:hidden;background:linear-gradient(160deg,#0f2f23 0%,#1e5b43 70%,#2a7556 100%)}`;
const data = (f) => 'data:image/' + path.extname(f).slice(1) + ';base64,' + fs.readFileSync(f).toString('base64');

// Image à la une 1024×500
await visuel(path.join(PLAY, 'image-a-la-une-1024x500.png'), 1024, 500, `<style>${CSS}
 body{width:1024px;height:500px;position:relative}
 .m{position:absolute;left:70px;top:70px;width:76px;height:76px;border-radius:19px;box-shadow:0 0 0 4px #f6f5f1}
 .n{position:absolute;left:168px;top:76px;font-size:58px;font-weight:800;letter-spacing:-2px}
 h1{position:absolute;left:70px;top:190px;width:520px;font-size:36px;line-height:1.22}h1 b{color:#e9a23b}
 p{position:absolute;left:70px;top:372px;font-size:20px;color:#cfe3d8}
 .t{position:absolute;left:640px;top:56px;width:230px;border-radius:26px;border:6px solid #f6f5f1;box-shadow:0 14px 34px rgba(0,0,0,.5)}
 .t2{left:790px;top:120px;opacity:.95}
 </style><img class="m" src="${data(path.join(SITE, 'public/logo/kaislo-marque.png'))}"><div class="n">Kaislo</div>
 <h1>Vos <b>ventes</b>, votre <b>stock</b> et vos comptes dans votre téléphone.</h1><p>Essai gratuit 30 jours · kaislo.com</p>
 <img class="t" src="${data(path.join(SITE, 'public/captures/vente-mobile.webp'))}"><img class="t t2" src="${data(path.join(SITE, 'public/captures/epicerie-mobile.webp'))}">`);

// Captures 1080×1920 (Google Play refuse les images plus allongées que 2:1 : on place la capture sur un fond de marque)
const tableau = await captureTableau();
const SCENES = [
  ['1-vendre', 'Vendez en touchant<br>les articles', path.join(SITE, 'public/captures/vente-mobile.webp')],
  ['2-stock-credit', 'Stock et crédit clients<br>sous la main', path.join(SITE, 'public/captures/epicerie-mobile.webp')],
  ['3-tableau-de-bord', 'Votre chiffre du jour<br>en un coup d’œil', tableau],
  ['4-plusieurs-commerces', 'Plusieurs commerces,<br>un seul compte', path.join(SITE, 'public/captures/commerces-mobile.webp')],
];
for (const [nom, titre, image] of SCENES) {
  await visuel(path.join(PLAY, `captures/${nom}.png`), 1080, 1920, `<style>${CSS}
   body{width:1080px;height:1920px;position:relative}
   h2{position:absolute;left:0;right:0;top:110px;text-align:center;font-size:76px;line-height:1.18;font-weight:800;letter-spacing:-1.5px}
   .t{position:absolute;left:50%;top:420px;width:760px;transform:translateX(-50%);border-radius:56px;border:12px solid #f6f5f1;box-shadow:0 30px 70px rgba(0,0,0,.5)}
   </style><h2>${titre}</h2><img class="t" src="${data(image)}">`);
}
fs.unlinkSync(tableau);
await navigateur.close();
serveur.close();
console.log('Visuels écrits dans app/src/main/res et play-store/');
