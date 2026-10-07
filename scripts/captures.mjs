// ------------------------------------------------------------
// CAPTURES D'ÉCRAN du site (public/captures/*.webp), prises dans la vraie démo.
//
// Utilisation : npm run build, puis npm run captures
//               ou npm run captures -- stock (seulement celles dont le nom contient « stock »)
//
// Navigateur : Chrome ou Chromium (cherché automatiquement ; sinon variable CHROME_PATH).
// Ordinateur : 1440 × 900 · téléphone : 390 × 844 en double définition (780 × 1688).
// ------------------------------------------------------------
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const SORTIE = 'public/captures';
const PORT = 4311;
const CHROMES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/opt/pw-browsers/chromium/chrome-linux/chrome',
].filter(Boolean);
const CHROME = CHROMES.find((c) => fs.existsSync(c));
if (!CHROME) { console.error('Chrome introuvable : indiquez son chemin dans la variable CHROME_PATH.'); process.exit(1); }
if (!fs.existsSync('out/index.html')) { console.error('Lancez d’abord : npm run build'); process.exit(1); }

// Petit serveur pour le dossier out/
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const serveur = http.createServer((req, res) => {
  let f = path.join('out', decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(PORT);
const U = `http://localhost:${PORT}`;

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

// Fixe l'heure de la démo (les ventes du jour dépendent de l'heure)
async function regler(p, heure, minute) {
  const cible = new Date(); cible.setHours(heure, minute, 0, 0);
  await p.evaluateOnNewDocument((decalage) => {
    const VraieDate = Date;
    class DateDemo extends VraieDate {
      constructor(...a) { if (a.length === 0) super(VraieDate.now() + decalage); else super(...a); }
      static now() { return VraieDate.now() + decalage; }
    }
    globalThis.Date = DateDemo;
  }, cible.getTime() - Date.now());
}

// Touche le premier élément visible qui contient ce texte
async function toucher(p, texte, selecteur = 'button', attente = 500) {
  // L'élément peut mettre un instant à apparaître : on réessaie pendant 8 secondes
  let ok = false;
  for (let essai = 0; essai < 32 && !ok; essai++) {
    ok = await p.evaluate((texte, selecteur) => {
      const el = [...document.querySelectorAll(selecteur)].find((e) => e.offsetParent !== null && e.textContent.replace(/\s+/g, ' ').includes(texte));
      if (!el) return false;
      el.click();
      return true;
    }, texte, selecteur);
    if (!ok) await attendre(250);
  }
  if (!ok) throw new Error(`« ${texte} » introuvable (${selecteur})`);
  await attendre(attente);
}

// Ouvre la démo (données neuves) et se connecte comme gérant
async function connexion(p, demo, pays) {
  await p.goto(`${U}/app/?demo=${demo}&pays=${pays}`, { waitUntil: 'networkidle0' });
  await p.evaluate(() => localStorage.clear());
  await p.goto(`${U}/app/?demo=${demo}&pays=${pays}`, { waitUntil: 'networkidle0' });
  await p.evaluate(() => document.fonts.ready);
  await toucher(p, 'Gérant', 'button', 1500);
  // Journée ouverte (sinon la fenêtre d'ouverture cache l'écran)
  if (await p.$('.feuille')) {
    const texte = await p.$eval('.feuille', (f) => f.textContent);
    if (texte.includes('Ouverture de la journée')) await toucher(p, 'Ouvrir la journée', '.feuille button', 900);
  }
}

// Ajoute un article à la commande (avec ses choix éventuels)
async function ajouter(p, nom, choix = []) {
  await toucher(p, nom, '.grille-articles button, .article, button', 600);
  if (await p.$('.feuille')) {
    for (const c of choix) await toucher(p, c, '.feuille button, .feuille label', 250);
    await toucher(p, 'Ajouter ·', '.feuille button', 600);
  }
}

const ORDI = { largeur: 1440, hauteur: 900, mobile: false };
const TEL = { largeur: 390, hauteur: 844, mobile: true };

const CAPTURES = [
  ['vente-ordi', ORDI, 'resto-ivoire', 'CI', [19, 30], async (p) => {
    await toucher(p, 'Vendre', '.menu-lien');
    await ajouter(p, 'Attiéké', ['Poisson grillé', 'Alloco']);
    await ajouter(p, 'Poulet braisé', ['Demi']);
    await ajouter(p, 'Bissap', ['Grand']);
  }],
  ['epicerie-ordi', ORDI, 'chez-sentinelle', 'FR', [20, 15], async (p) => {
    await toucher(p, 'Vendre', '.menu-lien');
    await ajouter(p, 'Huile de table');
    await ajouter(p, 'Lait 1L');
    await ajouter(p, 'Lait 1L');
    await ajouter(p, 'Thé vert');
  }],
  ['fermeture-ordi', ORDI, 'resto-ivoire', 'CI', [21, 30], async (p) => {
    await toucher(p, 'Ventes', '.menu-lien');
    await toucher(p, 'Fermer la journée', 'button', 900);
  }],
  ['credit-ordi', ORDI, 'chez-sentinelle', 'FR', [20, 15], async (p) => { await toucher(p, 'Crédit', '.menu-lien'); }],
  ['stock-ordi', ORDI, 'chez-sentinelle', 'FR', [20, 15], async (p) => { await toucher(p, 'Stock', '.menu-lien'); }],
  ['tableau-ordi', ORDI, 'resto-ivoire', 'CI', [19, 30], async () => {}],
  ['tables-ordi', ORDI, 'resto-ivoire', 'CI', [19, 30], async (p) => { await toucher(p, 'Tables', '.menu-lien'); }],
  ['vente-mobile', TEL, 'resto-ivoire', 'CI', [19, 30], async (p) => {
    await toucher(p, 'Vendre', '.menu-lien');
    await ajouter(p, 'Alloco portion');
    await ajouter(p, 'Malta');
  }],
  ['epicerie-mobile', TEL, 'chez-sentinelle', 'FR', [20, 15], async (p) => {
    await toucher(p, 'Vendre', '.menu-lien');
    await ajouter(p, 'Huile de table');
    await ajouter(p, 'Lait 1L');
    await ajouter(p, 'Lait 1L');
  }],
  // Plusieurs commerces : on ajoute un 2e commerce dans la démo, puis on ouvre la liste avec le total
  ['commerces-mobile', TEL, 'chez-sentinelle', 'FR', [20, 15], async (p) => {
    await toucher(p, '', 'button.avatar', 700); // mon compte
    await toucher(p, 'Mes commerces', '.feuille button', 700);
    await toucher(p, 'Ajouter un commerce', '.feuille button', 700);
    await p.type('.feuille input[placeholder^="Ex"]', 'Chez Awa Restaurant');
    await p.select('.feuille select', 'restaurant');
    await toucher(p, 'Créer ce commerce', '.feuille button', 900);
    await toucher(p, '', 'button.avatar', 700);
    await toucher(p, 'Mes commerces', '.feuille button', 900);
  }],
];

// Une série de captures par devise : FCFA (nom.webp, par défaut), puis nom-mad, -gnf, -eur, -cad, -usd.webp
// (src/lib/captures-devise.js choisit la bonne selon le pays du visiteur)
const DEVISES = [['', 'CI'], ['-mad', 'MA'], ['-gnf', 'GN'], ['-eur', 'FR'], ['-cad', 'CA'], ['-usd', 'XX']];
const filtre = process.argv[2];
const navigateur = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
let echecs = 0;
for (const [suffixe, paysDevise] of DEVISES) for (const [nom, taille, demo, , [h, m], scene] of CAPTURES) {
  const pays = paysDevise;
  if (filtre && !nom.includes(filtre)) continue;
  // Navigateur neuf pour chaque capture (sinon la session d'une capture précédente reste ouverte)
  const contexte = await navigateur.createBrowserContext();
  const p = await contexte.newPage();
  try {
    await p.setViewport({ width: taille.largeur, height: taille.hauteur, deviceScaleFactor: taille.mobile ? 2 : 1, isMobile: taille.mobile, hasTouch: taille.mobile });
    // Les captures sont en français, quelle que soit la langue du navigateur qui les prend
    await p.setExtraHTTPHeaders({ 'Accept-Language': 'fr-FR,fr' });
    await p.evaluateOnNewDocument(() => Object.defineProperty(navigator, 'language', { get: () => 'fr-FR' }));
    await regler(p, h, m);
    await connexion(p, demo, pays);
    await scene(p);
    await attendre(600);
    await p.screenshot({ path: `${SORTIE}/${nom}${suffixe}.webp`, type: 'webp', quality: 82 });
    console.log('✓', nom + suffixe);
  } catch (e) {
    echecs++;
    console.error('✗', nom + suffixe, '—', e.message);
  }
  await contexte.close();
}
await navigateur.close();
serveur.close();
process.exit(echecs ? 1 : 0);
