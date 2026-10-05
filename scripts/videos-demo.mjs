// ------------------------------------------------------------
// VIDÉOS DE DÉMONSTRATION du site (public/videos/), avec voix et musique
//   presentation-kaislo : le tour complet (paysage)
//   demo-restaurant     : de la commande au ticket (paysage)
//   demo-epicerie       : vente, crédit, comptes du soir (vertical, pour WhatsApp / réseaux)
//   ajout-produits      : ajouter un article (paysage)
//   gestion-vendeurs    : créer un vendeur, ses droits (vertical)
//
// Utilisation : npm run build, puis npm run videos (toutes les vidéos)
//               ou npm run videos -- produits (seulement celles dont le nom contient « produits »)
//
// Un navigateur automatique utilise la vraie démo pendant qu'on l'enregistre.
// Voix : Vivienne (voix neuronale Microsoft, via l'outil Python edge-tts :
//        pip install edge-tts). Les phrases sont gardées dans outils/voix-cache/.
// Musique : composée par ce script (aucun droit d'auteur), baissée quand la voix parle.
// Pour changer l'adresse affichée à la fin : LIEN_FINAL ci-dessous.
// ------------------------------------------------------------
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { execFile, execFileSync, spawnSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';
import ffmpeg from 'ffmpeg-static';

// Adresse affichée sous « Essai gratuit 30 jours » à la fin des vidéos (vide = aucune adresse)
const LIEN_FINAL = '';
// Chrome : variable CHROME_PATH, sinon emplacements habituels (Windows, Mac, Linux)
const CHROME = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].filter(Boolean).find((c) => fs.existsSync(c));
if (!CHROME) { console.error('Chrome introuvable : indiquez son chemin dans la variable CHROME_PATH.'); process.exit(1); }
// Python (voix edge-tts) : variable PYTHON, sinon « python » (Windows) ou « python3 » (Mac, Linux)
const PYTHON = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
// Essai (ESSAI=1 ou npm run videos -- --essai) : voix remplacée par du silence et vidéos écrites dans outils/videos-essai/,
// pour vérifier que toute la mise en scène fonctionne sans toucher aux vraies vidéos ni utiliser la voix.
const ESSAI = process.env.ESSAI === '1' || process.argv.includes('--essai');
const SORTIE = ESSAI ? 'outils/videos-essai' : 'public/videos';
const PORT = 4310;

// Voix et rythme
const VOIX = 'fr-FR-VivienneMultilingualNeural';
const VOIX_VITESSE = '-6%'; // un peu plus lent que la normale : posé, agréable
const VOIX_HAUTEUR = '-2Hz'; // légèrement plus grave : plus chaleureux
const CACHE_VOIX = 'outils/voix-cache';
const RALENTI = 1.3; // toutes les attentes de la mise en scène sont multipliées par ce nombre
const VOLUME_MUSIQUE = 0.3;

const execFileAsync = promisify(execFile);

// ---------- 1. Petit serveur pour le dossier out/ ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
if (!fs.existsSync('out/index.html')) { console.error('Lancez d’abord : npm run build'); process.exit(1); }
const serveur = http.createServer((req, res) => {
  let f = path.join('out', decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(PORT);
const U = `http://localhost:${PORT}`;

// ---------- 2. Outils de mise en scène (doigt, sous-titres, cartes) ----------
const attendre = (ms) => new Promise((r) => setTimeout(r, ms)); // attente technique
const pause = (ms) => attendre(ms * RALENTI); // attente de mise en scène (ralentie)

// Styles injectés dans la page enregistrée
const STYLE = `
#v-doigt { position: fixed; z-index: 99999; width: 34px; height: 34px; margin: -17px 0 0 -17px; border-radius: 50%;
  background: rgba(20,33,28,.28); border: 3px solid #fff; box-shadow: 0 2px 10px rgba(0,0,0,.35);
  left: 50%; top: 110%; transition: left .75s cubic-bezier(.4,0,.2,1), top .75s cubic-bezier(.4,0,.2,1), transform .18s; pointer-events: none; }
#v-doigt.appui { transform: scale(.75); background: rgba(232,163,23,.55); }
#v-titre { position: fixed; z-index: 99998; left: 50%; top: 14px; transform: translateX(-50%); max-width: 92%;
  background: rgba(20,33,28,.94); color: #fff; font: 600 22px/1.3 'DM Sans', system-ui, sans-serif; padding: 12px 22px; border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0,0,0,.25); text-align: center; transition: opacity .3s; pointer-events: none; }
#v-titre b { color: #E8A317; font-weight: 700; }
#v-titre:empty { opacity: 0; }
#v-carte { position: fixed; inset: 0; z-index: 100000; background: #14211C; color: #F6F5F1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; text-align: center; padding: 32px; font-family: 'DM Sans', system-ui, sans-serif; transition: opacity .5s; }
#v-carte .k { width: 72px; height: 72px; border-radius: 16px; background: #1F5C45; display: grid; place-items: center; font: 800 42px/1 system-ui; margin-bottom: 18px; }
#v-carte .marque { font: 800 30px/1 system-ui; letter-spacing: -.02em; margin-bottom: 26px; }
#v-carte h1 { font-size: 40px; line-height: 1.15; letter-spacing: -.02em; max-width: 760px; margin: 0; }
#v-carte p { font-size: 21px; opacity: .78; margin: 16px 0 0; max-width: 640px; }
#v-carte .bouton { margin-top: 30px; background: #E8A317; color: #14211C; font-weight: 700; font-size: 22px; padding: 14px 28px; border-radius: 10px; }
#v-carte .v-adresse { margin-top: 16px; font-size: 19px; color: #F6F5F1; opacity: .85; }
.sk { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 28px 22px; gap: 14px; font-family: 'DM Sans', system-ui, sans-serif; }
.sk.ancien { background: linear-gradient(#f3e3b8, #e7cf94); color: #3b2a12; }
.sk.kaislo { background: linear-gradient(#e8f1ec, #cfe6da); color: #14211C; }
.sk-badge { font: 800 17px/1 'DM Sans', system-ui; letter-spacing: .04em; text-transform: uppercase; background: #14211C; color: #E8A317; padding: 10px 16px; border-radius: 999px; }
.sk.kaislo .sk-badge { background: #1F5C45; color: #fff; }
.sk-gros { font-size: 110px; line-height: 1; display: inline-block; }
.sk-rangee { display: flex; gap: 14px; align-items: center; justify-content: center; font-size: 64px; }
.sk-bulle { background: #fff; color: #14211C; border-radius: 22px; padding: 14px 18px; font: 600 21px/1.3 'DM Sans', system-ui; box-shadow: 0 6px 18px rgba(0,0,0,.18); max-width: 330px; min-height: 28px; }
.sk-bulle:empty { visibility: hidden; }
.sk-horloge { font: 800 64px/1 'DM Sans', system-ui; font-variant-numeric: tabular-nums; background: #14211C; color: #E8A317; padding: 12px 22px; border-radius: 16px; }
.sk-legende { font: 700 19px/1.3 'DM Sans', system-ui; opacity: .8; }
.sk-secoue { animation: sk-secoue .35s infinite; }
.sk-envol { animation: sk-envol 1.6s ease-in forwards; }
.sk-pop { animation: sk-pop .5s ease-out both; }
@keyframes sk-secoue { 0%,100% { transform: rotate(-9deg); } 50% { transform: rotate(9deg); } }
@keyframes sk-envol { 0% { transform: translate(0,0) rotate(0); opacity: 1; } 100% { transform: translate(220px,-420px) rotate(540deg) scale(.3); opacity: 0; } }
@keyframes sk-pop { 0% { transform: scale(.3); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
.sk-versus { width: 100%; display: flex; flex-direction: column; gap: 10px; }
.sk-ligne { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; animation: sk-pop .5s ease-out both; }
.sk-ligne div { border-radius: 14px; padding: 10px 8px; font: 700 19px/1.25 'DM Sans', system-ui; display: flex; align-items: center; justify-content: center; text-align: center; min-height: 92px; }
.sk-ligne .ancien-c { background: #f3e3b8; color: #5a4217; }
.sk-ligne .kaislo-c { background: #1F5C45; color: #fff; }
.sk-entete { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font: 800 14px/1.2 'DM Sans', system-ui; text-transform: uppercase; letter-spacing: .04em; }
.v-mobile #v-titre { font-size: 19px; top: 10px; padding: 11px 16px; }
.v-mobile #v-carte h1 { font-size: 30px; }
.v-mobile #v-carte p { font-size: 18px; }
`;

async function preparer(p, mobile) {
  await p.evaluate((css, mobile) => {
    if (document.getElementById('v-doigt')) return;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    for (const id of ['v-doigt', 'v-titre']) { const el = document.createElement('div'); el.id = id; document.body.appendChild(el); }
    if (mobile) document.documentElement.classList.add('v-mobile');
  }, STYLE, mobile);
}

// ---------- 3. Voix off ----------
// narration : les phrases dites pendant la vidéo en cours (fichier + heure de début)
let narration = { pistes: [], finVoix: 0, manquantes: 0 };

function dureeAudio(f) {
  const r = spawnSync(ffmpeg, ['-i', f], { encoding: 'utf8' });
  const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(r.stderr || '');
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0;
}

// Fabrique (ou reprend du cache) le fichier audio d'une phrase
async function voix(texte) {
  fs.mkdirSync(CACHE_VOIX, { recursive: true });
  const cle = crypto.createHash('sha1').update(VOIX + VOIX_VITESSE + VOIX_HAUTEUR + texte).digest('hex').slice(0, 16);
  const f = path.join(ESSAI ? 'outils/voix-essai' : CACHE_VOIX, cle + '.mp3');
  if (ESSAI) {
    fs.mkdirSync(path.dirname(f), { recursive: true });
    // silence d'une durée proche de celle d'une vraie voix (environ 14 caractères par seconde)
    if (!fs.existsSync(f)) execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', String(Math.max(1.5, texte.length / 14)), '-q:a', '9', f]);
    return { f, duree: dureeAudio(f) };
  }
  if (!fs.existsSync(f)) {
    narration.manquantes++;
    await execFileAsync(PYTHON, ['-m', 'edge_tts', '--voice', VOIX, `--rate=${VOIX_VITESSE}`, `--pitch=${VOIX_HAUTEUR}`, '--text', texte, '--write-media', f]);
  }
  return { f, duree: dureeAudio(f) };
}

// Attend que la phrase en cours soit finie
async function attendreVoix() {
  const reste = narration.finVoix - Date.now();
  if (reste > 0) await attendre(reste);
}

// Dit une phrase (après la précédente) ; l'action continue pendant qu'elle parle
async function dire(texte) {
  await attendreVoix();
  const v = await voix(texte);
  narration.pistes.push({ f: v.f, t: Date.now() / 1000 });
  narration.finVoix = Date.now() + v.duree * 1000 + 350;
}

// Sous-titre en haut de l'écran, dit par la voix ("" pour le cacher)
async function titre(p, html, parole) {
  await attendreVoix();
  await p.evaluate((h) => { document.getElementById('v-titre').innerHTML = h; }, html);
  if (parole) await dire(parole);
}

// Carte plein écran (introduction / fin)
async function carte(p, html, duree = 0) {
  await p.evaluate((h) => { let c = document.getElementById('v-carte'); if (!c) { c = document.createElement('div'); c.id = 'v-carte'; document.body.appendChild(c); } c.style.opacity = 1; c.innerHTML = h; }, html);
  await pause(duree);
}
const masquerCarte = async (p) => { await p.evaluate(() => { const c = document.getElementById('v-carte'); if (c) { c.style.opacity = 0; setTimeout(() => c.remove(), 500); } }); await attendre(550); };

// Début et fin communs à toutes les vidéos
async function introduction(p, parole) {
  await pause(800);
  await dire(parole);
  await attendreVoix();
  await masquerCarte(p);
}
async function conclusion(p, film) {
  await titre(p, '');
  await carte(p, FIN);
  await dire(FIN_PAROLE);
  await attendreVoix();
  await pause(1500);
  await film.stop();
}

// Trouve un élément visible par son texte (ou un sélecteur seul), en attendant jusqu'à 6 s
async function trouver(p, texte, selecteur = 'button, a, .tuile, .liste-item, .option, .menu-lien') {
  for (let essai = 0; essai < 30; essai++) {
    const h = await p.evaluateHandle((t, s) => [...document.querySelectorAll(s)].find((e) => e.getClientRects().length > 0 && (!t || e.textContent.trim().includes(t))) || null, texte, selecteur);
    const el = h.asElement();
    if (el) return el;
    await attendre(200);
  }
  await p.screenshot({ path: 'videos-erreur.png' }); // pour comprendre ce qui était à l'écran
  throw new Error('Élément introuvable : ' + texte + ' (' + selecteur + ') — voir videos-erreur.png');
}

// Le doigt va sur l'élément, appuie, puis clique
async function toucher(p, texte, selecteur, attente = 700) {
  const el = await trouver(p, texte, selecteur);
  await el.evaluate((e) => e.scrollIntoView({ block: 'nearest' }));
  const b = await el.boundingBox();
  await p.evaluate((x, y) => { const d = document.getElementById('v-doigt'); d.style.left = x + 'px'; d.style.top = y + 'px'; }, b.x + b.width / 2, b.y + b.height / 2);
  await pause(650);
  await p.evaluate(() => document.getElementById('v-doigt').classList.add('appui'));
  await attendre(180);
  // Clic en JavaScript : fiable même pendant la boucle de captures (un clic souris y perd le focus)
  await el.evaluate((e) => { if (e.matches('input, textarea')) e.focus(); e.click(); });
  await p.evaluate(() => document.getElementById('v-doigt').classList.remove('appui'));
  await pause(attente);
}

// Saisie lente, comme une vraie personne
async function taper(p, selecteur, texte) {
  await toucher(p, null, selecteur, 200);
  await p.keyboard.type(texte, { delay: 145 });
}

// Repère un champ de formulaire par son libellé (« Prix », « Code PIN »…) et renvoie un sélecteur
let numeroChamp = 0;
async function champ(p, libelle) {
  const id = 'c' + numeroChamp++;
  const ok = await p.evaluate((l, id) => {
    const lab = [...document.querySelectorAll('.feuille label.champ, label.champ')].find((x) => x.getClientRects().length > 0 && x.querySelector('span')?.textContent.trim().startsWith(l));
    const input = lab?.querySelector('input, select, textarea');
    if (input) input.dataset.vChamp = id;
    return !!input;
  }, libelle, id);
  if (!ok) throw new Error('Champ introuvable : ' + libelle);
  return `[data-v-champ="${id}"]`;
}

// Repère le n-ième élément visible d'un sélecteur (ex : 2e option d'un groupe)
async function nieme(p, selecteur, n) {
  const id = 'n' + numeroChamp++;
  await p.evaluate((s, n, id) => { const el = [...document.querySelectorAll(s)].filter((e) => e.getClientRects().length > 0)[n]; if (el) el.dataset.vChamp = id; }, selecteur, n, id);
  return `[data-v-champ="${id}"]`;
}

// Fait défiler doucement jusqu'à un élément (texte d'un titre, ou sélecteur)
async function defiler(p, texte, selecteur = 'h2, h3, b, .section-titre', attente = 1200) {
  await p.evaluate((t, s) => [...document.querySelectorAll(s)].find((e) => e.getClientRects().length > 0 && e.textContent.includes(t))?.scrollIntoView({ behavior: 'smooth', block: 'center' }), texte, selecteur);
  await pause(attente);
}

// Connexion avec le numéro et le code PIN, tapés lentement
async function seConnecter(p, telephone, pin = '1234') {
  await taper(p, 'input[type=tel]', telephone);
  await p.keyboard.press('Enter');
  await p.keyboard.type(pin, { delay: 200 });
  await pause(1400);
}

const INTRO = (titreVideo, sousTitre) => `<div class="k">K</div><div class="marque">Kaislo</div><h1>${titreVideo}</h1><p>${sousTitre}</p>`;
const FIN = `<div class="k">K</div><div class="marque">Kaislo</div><h1>À vous de vendre.</h1>
  <p>Restaurants, épiceries, boutiques. Sur le téléphone que vous avez déjà, dans la devise de votre pays.</p>
  <div class="bouton">Essai gratuit 30 jours</div>${LIEN_FINAL ? '<div class="v-adresse">' + LIEN_FINAL + '</div>' : ''}`;
const FIN_PAROLE = 'Kaislo : la gestion simple de vos ventes, sur le téléphone que vous avez déjà. Essayez-la gratuitement pendant trente jours.';

// Règle l'horloge de la page sur une heure de la journée (ex : 19 h 40),
// pour que la démo ait une journée de ventes bien remplie quel que soit le moment du tournage.
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

// Ouvre la démo (données neuves), prête à filmer
async function connexion(p, demo, pays, mobile) {
  await p.goto(`${U}/app/?demo=${demo}&pays=${pays}`, { waitUntil: 'networkidle0' });
  await p.evaluate(() => localStorage.clear());
  await p.goto(`${U}/app/?demo=${demo}&pays=${pays}`, { waitUntil: 'networkidle0' });
  await p.evaluate(() => document.fonts.ready);
  await preparer(p, mobile);
}

// Si la journée de vente n'est pas ouverte, on l'ouvre (évite un blocage pendant l'enregistrement)
async function caisseOuverte(p) {
  const feuille = await p.$('.feuille');
  if (feuille && (await feuille.evaluate((f) => f.textContent.includes('Ouvrir la journée')))) await toucher(p, 'Ouvrir la journée', '.feuille button', 900);
}

// ---------- 4. Musique de fond, composée ici (libre de droits) ----------
// Accords doux (Do – La mineur – Fa – Sol) + petit arpège façon carillon + écho léger.
function composerMusique(duree, fichier) {
  const SR = 44100;
  const n = Math.ceil(duree * SR);
  const g = new Float32Array(n), d = new Float32Array(n);
  const note = (m) => 440 * Math.pow(2, (m - 69) / 12); // numéro MIDI -> fréquence
  const ACCORDS = [[48, 60, 64, 67, 71], [45, 57, 60, 64, 67], [41, 57, 60, 64, 69], [43, 55, 59, 62, 67]];
  const temps = 60 / 72; // 72 battements par minute
  const mesure = temps * 4;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const k = Math.floor(t / mesure);
    const dans = t - k * mesure;
    const accord = ACCORDS[k % 4];
    // Nappe continue : en fin de mesure, l'accord suivant arrive en fondu enchaîné (pas de « respiration »)
    const FONDU = 1.2;
    const vers = Math.max(0, (dans - (mesure - FONDU)) / FONDU); // 0 -> 1 pendant le fondu
    let pg = 0, pd = 0;
    for (const [acc, poids] of [[accord, 1 - vers], [ACCORDS[(k + 1) % 4], vers]]) {
      if (poids <= 0) continue;
      acc.forEach((m, j) => {
        const f = note(m);
        const a = (j === 0 ? 0.16 : 0.07) * Math.sqrt(poids);
        pg += a * (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t));
        pd += a * (Math.sin(2 * Math.PI * (f + 0.4) * t) + 0.25 * Math.sin(4 * Math.PI * (f + 0.4) * t));
      });
    }
    // Arpège : une note de l'accord, une octave au-dessus, toutes les croches
    const croche = temps / 2;
    const c = Math.floor(t / croche);
    const tc = t - c * croche;
    const fa = note(accord[1 + (c % 4)] + 12);
    const cloche = 0.06 * Math.exp(-tc * 4) * (Math.sin(2 * Math.PI * fa * tc) + 0.3 * Math.sin(2 * Math.PI * 2 * fa * tc) * Math.exp(-tc * 6));
    const pan = c % 2 ? 0.35 : 0.65;
    g[i] = pg + cloche * (1 - pan);
    d[i] = pd + cloche * pan;
  }
  // Écho léger (impression d'espace)
  for (const [retard, gain] of [[0.29, 0.28], [0.47, 0.18]]) {
    const r = Math.floor(retard * SR);
    for (let i = r; i < n; i++) { g[i] += d[i - r] * gain; d[i] += g[i - r] * gain; }
  }
  // Fondu d'entrée et de sortie, puis normalisation
  let max = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = Math.min(1, t / 2) * Math.min(1, (duree - t) / 3);
    g[i] *= f; d[i] *= f;
    max = Math.max(max, Math.abs(g[i]), Math.abs(d[i]));
  }
  // Fichier WAV 16 bits stéréo
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  const echelle = 0.8 / (max || 1);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(g[i] * echelle * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(d[i] * echelle * 32767), 46 + i * 4);
  }
  fs.writeFileSync(fichier, buf);
}

// ---------- 5. Enregistrement + montage (image, voix, musique) ----------

// Filme la page image par image, en gardant l'heure de chaque image.
// hauteDefinition : captures d'écran en boucle (environ 13 images/s, mais en 2x pour le téléphone),
// sinon flux vidéo de Chrome (plus fluide, mais toujours en 1x).
async function filmer(p, dossier, largeurPx, hauteurPx, liste, hauteDefinition) {
  const images = [];
  const nouvelleImage = () => path.join(dossier, `i${String(images.length).padStart(5, '0')}.jpg`);
  let arreter;
  if (hauteDefinition) {
    let actif = true;
    const boucle = (async () => {
      while (actif) {
        const t = Date.now() / 1000;
        const f = nouvelleImage();
        await p.screenshot({ path: f, type: 'jpeg', quality: 90, optimizeForSpeed: true, captureBeyondViewport: false }).catch(() => {});
        if (fs.existsSync(f)) images.push({ f, t });
      }
    })();
    arreter = async () => { actif = false; await boucle; };
  } else {
    const cdp = await p.createCDPSession();
    cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
      const f = nouvelleImage();
      fs.writeFileSync(f, Buffer.from(data, 'base64'));
      images.push({ f, t: metadata.timestamp });
      await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: largeurPx, maxHeight: hauteurPx, everyNthFrame: 1 });
    arreter = () => cdp.send('Page.stopScreencast');
  }
  const film = {
    async stop() {
      const fin = Date.now() / 1000;
      await arreter();
      // Chaque image reste affichée jusqu'à la suivante (Chrome n'envoie rien si l'écran ne bouge pas)
      const lignes = images.map((im, i) => `file '${im.f.replace(/\\/g, '/')}'\nduration ${Math.max(0.001, (images[i + 1]?.t ?? fin) - im.t).toFixed(3)}`);
      lignes.push(`file '${images.at(-1).f.replace(/\\/g, '/')}'`); // ffmpeg ignore la durée de la dernière ligne
      fs.writeFileSync(liste, lignes.join('\n'));
      film.debut = images[0].t;
      film.duree = fin - images[0].t;
    },
  };
  return film;
}

// npm run videos -- produits vendeurs : n'enregistre que les vidéos dont le nom contient ces mots
const VOULUES = process.argv.slice(2).filter((a) => a !== '--essai');
const veut = (nom) => !VOULUES.length || VOULUES.some((v) => nom.includes(v));

async function enregistrer(nom, options, scenario) {
  if (!veut(nom)) return;
  // Le navigateur automatique peut rarement « décrocher » (page fermée) : on recommence une fois
  try {
    await enregistrerUneFois(nom, options, scenario);
  } catch (e) {
    console.log(`${nom} : incident (${e.message.slice(0, 80)}), nouvel essai…`);
    await enregistrerUneFois(nom, options, scenario);
  }
}

async function enregistrerUneFois(nom, { largeur, hauteur, mobile, affiche }, scenario) {
  // Si des phrases ont dû être fabriquées pendant le tournage (petits temps morts),
  // on refait la prise : elles sont alors dans le cache et tout est parfaitement calé.
  for (let prise = 1; prise <= 2; prise++) {
    narration = { pistes: [], finVoix: 0, manquantes: 0 };
    const dossierTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kaislo-video-'));
    const navigateur = await puppeteer.launch({ executablePath: CHROME, headless: 'new', userDataDir: dossierTmp, args: ['--hide-scrollbars', '--lang=fr-FR', ...(process.getuid?.() === 0 ? ['--no-sandbox'] : [])] });
    const p = await navigateur.newPage();
    // L'application suit la langue du navigateur : on tourne toujours en français, quelle que soit la machine
    await p.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'language', { get: () => 'fr-FR' });
      Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR', 'fr'] });
    });
    await p.setExtraHTTPHeaders({ 'Accept-Language': 'fr-FR,fr;q=0.9' });
    await p.setViewport({ width: largeur, height: hauteur, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
    const echelle = mobile ? 2 : 1; // téléphone : images en haute définition (écran « retina »)
    const liste = path.join(dossierTmp, 'images.txt');
    let film;
    await scenario(p, async () => (film = await filmer(p, dossierTmp, largeur * echelle, hauteur * echelle, liste, mobile)));
    await navigateur.close();
    if (narration.manquantes > 0 && prise === 1) {
      console.log(`${nom} : ${narration.manquantes} phrase(s) fabriquée(s), nouvelle prise pour un calage parfait…`);
      fs.rmSync(dossierTmp, { recursive: true, force: true });
      continue;
    }
    monter(nom, dossierTmp, liste, film, affiche);
    fs.rmSync(dossierTmp, { recursive: true, force: true });
    break;
  }
}

// Assemble les images, la voix (chaque phrase à son heure) et la musique (baissée sous la voix)
function monter(nom, dossierTmp, liste, film, affiche) {
  fs.mkdirSync(SORTIE, { recursive: true });
  const muet = path.join(dossierTmp, 'muet.mp4');
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', liste, '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-pix_fmt', 'yuv420p', '-vf', 'fps=30,scale=trunc(iw/2)*2:trunc(ih/2)*2', '-an', muet]);
  const musique = path.join(dossierTmp, 'musique.wav');
  composerMusique(film.duree, musique);

  const entrees = ['-i', muet, '-i', musique];
  const filtres = [];
  narration.pistes.forEach((v, i) => {
    entrees.push('-i', v.f);
    const ms = Math.max(0, Math.round((v.t - film.debut) * 1000));
    filtres.push(`[${i + 2}:a]aformat=sample_rates=44100:channel_layouts=stereo,adelay=${ms}|${ms}[p${i}]`);
  });
  const n = narration.pistes.length;
  filtres.push(`${narration.pistes.map((_, i) => `[p${i}]`).join('')}amix=inputs=${n}:normalize=0:dropout_transition=0,volume=1.15[voix]`);
  filtres.push('[voix]asplit=2[voixA][voixB]');
  filtres.push(`[1:a]volume=${VOLUME_MUSIQUE}[mus]`);
  filtres.push('[mus][voixB]sidechaincompress=threshold=0.02:ratio=8:attack=40:release=700[musBas]');
  filtres.push('[musBas][voixA]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=44100[son]');

  const mp4 = `${SORTIE}/${nom}.mp4`;
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', ...entrees, '-filter_complex', filtres.join(';'), '-map', '0:v', '-map', '[son]',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-t', film.duree.toFixed(2), '-movflags', '+faststart', mp4]);
  // Image d'attente (affichée avant la lecture) : un moment parlant de la vidéo (« affiche », en secondes)
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-ss', String(affiche), '-i', mp4, '-frames:v', '1', '-q:v', '80', `${SORTIE}/${nom}.webp`]);
  console.log(`${mp4} : ${film.duree.toFixed(0)} s, ${n} phrases, ${(fs.statSync(mp4).size / 1e6).toFixed(1)} Mo`);
}

// ---------- 6. Les scénarios ----------

// Présentation générale (restaurant, Abidjan) : le tour complet du système
await enregistrer('presentation-kaislo', { largeur: 1280, hauteur: 720, mobile: false, affiche: 30 }, async (p, demarrer) => {
  await regler(p, 19, 30);
  await connexion(p, 'resto-ivoire', 'CI', false);
  await carte(p, INTRO('La gestion simple des restaurants, épiceries et boutiques.', 'Présentation de Kaislo'));
  const film = await demarrer();
  await introduction(p, 'Voici Kaislo : la gestion simple des restaurants, des épiceries et des boutiques.');

  await titre(p, 'Chacun se connecte avec <b>son numéro</b> et <b>son code PIN</b>', 'Chaque membre de l’équipe se connecte avec son numéro, et son code personnel.');
  await seConnecter(p, '06 00 00 00 01');
  await titre(p, 'Le tableau de bord : <b>chiffre du jour</b>, marge, dépenses', 'Le tableau de bord vous montre votre chiffre du jour, votre marge, et vos dépenses.');
  await pause(1200);
  await titre(p, 'Ce qui se vend, <b>heure par heure</b>', 'Vous voyez même ce qui se vend, heure par heure.');
  await defiler(p, 'Évolution des ventes', 'h2, h3, b, p', 2000);
  await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));

  await titre(p, '<b>La vente</b> : touchez, validez', 'Pour vendre, il suffit de toucher les articles.');
  await toucher(p, 'Vendre', '.menu-lien', 900);
  await caisseOuverte(p);
  await toucher(p, 'Garba', '.tuile', 500);
  await toucher(p, 'Ajouter', '.feuille-pied button', 600);
  await toucher(p, 'Bissap', '.tuile');
  await toucher(p, 'Grand', '.option', 400);
  await toucher(p, 'Ajouter', '.feuille-pied button', 700);
  await titre(p, 'Espèces : Kaislo calcule <b>la monnaie à rendre</b>', 'En espèces, Kaislo calcule la monnaie à rendre. Plus aucune erreur.');
  await toucher(p, 'Espèces', '.panneau-panier .choix-grille button', 500);
  await toucher(p, null, '.panneau-panier .puces .puce:nth-child(2)', 1400);
  await toucher(p, 'Valider', '.panneau-panier button.grand', 1800);
  await toucher(p, 'Nouvelle vente', '.feuille-pied button', 600);

  await titre(p, '<b>Les tables</b> : qui mange quoi, depuis quand', 'Les tables : qui mange quoi, et depuis combien de temps.');
  await toucher(p, 'Tables', '.menu-lien', 1800);
  await titre(p, '<b>Les ventes</b> : chaque ticket, chaque vendeur', 'Les ventes : chaque ticket, et chaque vendeur.');
  await toucher(p, 'Ventes', '.menu-lien', 1500);
  await titre(p, 'Chaque journée de vente <b>gardée en historique</b>', 'Chaque journée de vente est gardée dans l’historique.');
  await toucher(p, 'Journées de vente', 'button', 1800);
  await titre(p, '<b>Le carnet de crédit</b> : qui vous doit combien', 'Le carnet de crédit : qui vous doit combien.');
  await toucher(p, 'Crédit', '.menu-lien', 1800);
  await titre(p, '<b>Vos articles</b> : prix, photos, options, marges', 'Vos articles, avec leurs prix, leurs photos, et vos marges.');
  await toucher(p, 'Produits', '.menu-lien', 1800);
  await titre(p, '<b>Votre équipe</b> : un compte et des droits par vendeur', 'Votre équipe : un compte, et des droits, pour chaque vendeur.');
  await toucher(p, 'Réglages', '.menu-lien', 1800);
  await titre(p, 'Téléphone, tablette, ordinateur · <b>toutes les devises</b>', 'Le tout sur téléphone, tablette ou ordinateur, dans la devise de votre pays.');
  await toucher(p, 'Accueil', '.menu-lien', 1800);
  await conclusion(p, film);
});

// Restaurant, Abidjan (FCFA), ordinateur / tablette
await enregistrer('demo-restaurant', { largeur: 1280, hauteur: 720, mobile: false, affiche: 40 }, async (p, demarrer) => {
  await regler(p, 19, 42);
  await connexion(p, 'resto-ivoire', 'CI', false);
  await carte(p, INTRO('De la commande au ticket, en quelques touches.', 'Démo restaurant'));
  const film = await demarrer();
  await introduction(p, 'Découvrez comment Kaislo simplifie le service, au restaurant.');

  await titre(p, 'Chaque serveur se connecte avec <b>son numéro</b> et <b>son code</b>', 'Chaque serveur se connecte avec son numéro, et son code personnel.');
  await seConnecter(p, '06 00 00 00 01');

  await titre(p, 'Touchez un plat, choisissez <b>l’accompagnement</b>', 'Touchez un plat, puis choisissez l’accompagnement. C’est aussi simple que ça.');
  await toucher(p, 'Vendre', '.menu-lien', 900);
  await caisseOuverte(p);
  await toucher(p, 'Attiéké', '.tuile');
  await toucher(p, 'Poisson grillé', '.option', 500);
  await toucher(p, 'Ajouter', '.feuille-pied button', 800);
  await toucher(p, 'Poulet braisé', '.tuile');
  await toucher(p, 'Demi', '.option', 500);
  await toucher(p, 'Ajouter', '.feuille-pied button', 800);
  await titre(p, 'Le prix se calcule <b>tout seul</b>', 'Le prix se calcule tout seul, suppléments compris.');
  await toucher(p, 'Bissap', '.tuile');
  await toucher(p, 'Grand', '.option', 500);
  await toucher(p, 'Ajouter', '.feuille-pied button', 1000);

  await titre(p, 'Payé par <b>Wave</b>, <b>Orange Money</b>, espèces ou carte', 'Le client paie comme il veut : Wave, Orange Money, espèces, ou carte.');
  await toucher(p, 'Wave', '.panneau-panier .choix-grille button', 1000);
  await toucher(p, 'Valider', '.panneau-panier button.grand', 1200);
  await titre(p, 'Ticket <b>imprimé</b> ou envoyé par <b>WhatsApp</b>', 'Et voilà ! Le ticket s’imprime, ou part directement sur WhatsApp.');
  await pause(1500);
  await toucher(p, 'Nouvelle vente', '.feuille-pied button', 800);

  await titre(p, 'Le soir : <b>chiffre du jour</b>, marge et dépenses, en direct', 'Le soir, retrouvez votre chiffre du jour, vos marges et vos dépenses, en un coup d’œil.');
  await toucher(p, 'Accueil', '.menu-lien', 2000);
  await conclusion(p, film);
});

// Épicerie, Paris (€), téléphone (vertical)
await enregistrer('demo-epicerie', { largeur: 390, hauteur: 780, mobile: true, affiche: 45 }, async (p, demarrer) => {
  await regler(p, 20, 15);
  await connexion(p, 'chez-sentinelle', 'FR', true);
  await carte(p, INTRO('Vente, crédit et comptes du soir, sur votre téléphone.', 'Démo épicerie'));
  const film = await demarrer();
  await introduction(p, 'Une journée d’épicerie avec Kaislo, directement sur votre téléphone.');

  await titre(p, 'Connexion : <b>numéro</b> + <b>code PIN</b>', 'Connectez-vous avec votre numéro, et votre code.');
  await seConnecter(p, '06 00 00 00 11');

  await titre(p, 'Cherchez ou <b>scannez</b> l’article', 'Cherchez un article, ou scannez son code-barres avec la caméra.');
  await toucher(p, 'Vendre', '.menu-lien', 900);
  await caisseOuverte(p);
  await taper(p, '.recherche input', 'lait');
  await pause(500);
  await toucher(p, 'Lait 1L', '.tuile', 600);
  await p.evaluate(() => { const i = document.querySelector('.recherche input'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, ''); i.dispatchEvent(new Event('input', { bubbles: true })); i.blur(); });
  await pause(500);
  await toucher(p, 'Pain rond', '.tuile', 500);
  await toucher(p, 'Pain rond', '.tuile', 500);
  await toucher(p, 'Huile de table 1L', '.tuile', 900);

  await titre(p, 'Le client paiera plus tard ? <b>À crédit</b>', 'Votre client paiera plus tard ? Notez la vente à crédit, en deux touches.');
  await toucher(p, 'Valider', '.barre-panier button', 1000);
  await toucher(p, 'À crédit', '.feuille .choix-grille button', 700);
  await toucher(p, 'Choisir le client', '.feuille button', 900);
  await toucher(p, null, '.feuille .liste-item', 900);
  await toucher(p, 'Noter à crédit', '.feuille button.grand', 1200);
  await titre(p, 'Noté dans le <b>carnet de crédit</b>, fini le cahier', 'C’est noté dans le carnet de crédit. Fini, le cahier qu’on perd !');
  await pause(1200);
  await toucher(p, 'Nouvelle vente', '.feuille-pied button', 700);
  await titre(p, 'Qui vous doit <b>combien</b>, en un coup d’œil', 'Et vous voyez, d’un coup d’œil, qui vous doit combien.');
  await toucher(p, 'Crédit', '.menu-lien', 1800);

  await titre(p, 'Le soir : Kaislo calcule les <b>espèces attendues</b>', 'Le soir, Kaislo calcule les espèces qui doivent être en main.');
  await toucher(p, 'Ventes', '.menu-lien', 900);
  await toucher(p, 'Fermer la journée', 'button', 1400);
  // On tape exactement le montant attendu : la compte est juste
  const attendu = await p.evaluate(() => { const l = [...document.querySelectorAll('.feuille .ligne, .feuille div')].find((e) => e.children.length === 2 && e.firstElementChild.textContent.trim() === 'Espèces attendues'); return l ? l.lastElementChild.textContent.replace(/[^\d,]/g, '') : '0'; });
  await taper(p, '.feuille input[placeholder="Montant compté"]', attendu);
  await p.evaluate(() => document.querySelector('.feuille .ecart')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  await titre(p, 'Vous comptez, Kaislo vous dit si la <b>compte est juste</b>', 'Vous comptez, et Kaislo vous dit si la compte est juste.');
  await pause(1500);
  await conclusion(p, film);
});

// Ajouter un article (restaurant) : nouvelle catégorie, prix, marge, accompagnements
await enregistrer('ajout-produits', { largeur: 1280, hauteur: 720, mobile: false, affiche: 40 }, async (p, demarrer) => {
  await regler(p, 11, 15);
  await connexion(p, 'resto-ivoire', 'CI', false);
  await carte(p, INTRO('Ajoutez un plat à votre carte, en une minute.', 'Gestion des articles'));
  const film = await demarrer();
  await introduction(p, 'Ajouter un plat à votre carte ? Ça prend une minute.');
  await titre(p, 'Le <b>gérant</b> se connecte', 'Le gérant se connecte.');
  await seConnecter(p, '06 00 00 00 01');

  await titre(p, 'Dans <b>Produits</b>, touchez « Nouvel article »', 'Allez dans Produits, et touchez : nouvel article.');
  await toucher(p, 'Produits', '.menu-lien', 1000);
  await toucher(p, 'Nouvel article', 'button', 1000);
  await titre(p, 'Le nom du plat', 'Donnez-lui un nom.');
  await taper(p, await champ(p, 'Nom'), 'Poulet DG');
  await pause(500);
  await titre(p, 'Une <b>nouvelle catégorie</b> ? Créez-la sans quitter la fiche', 'Une nouvelle catégorie ? Créez-la, sans quitter la fiche.');
  await toucher(p, 'Nouvelle', '.feuille button', 500);
  await taper(p, '.feuille input[placeholder^="Ex : Jus frais"]', 'Spécialités');
  await toucher(p, 'Créer', '.feuille button', 900);
  await titre(p, 'Le prix de vente et le <b>prix d’achat</b>', 'Indiquez le prix de vente, et le prix d’achat.');
  await taper(p, await champ(p, 'Prix ('), '4500');
  await taper(p, await champ(p, 'Prix d’achat'), '2600');
  await titre(p, 'Kaislo calcule <b>votre marge</b> tout seul', 'Kaislo calcule votre marge, automatiquement.');
  await defiler(p, 'Marge :', 'p', 1600);

  await titre(p, 'Les <b>accompagnements</b> au choix', 'Ajoutez les accompagnements, au choix du client.');
  await toucher(p, '+ Choix unique', '.feuille button', 800);
  await taper(p, await nieme(p, '.feuille .option-edition input.saisie:not(.chiffre)', 0), 'Alloco');
  await toucher(p, '+ Ajouter une option', '.feuille button', 400);
  await taper(p, await nieme(p, '.feuille .option-edition input.saisie:not(.chiffre)', 1), 'Riz');
  await toucher(p, '+ Ajouter une option', '.feuille button', 400);
  await taper(p, await nieme(p, '.feuille .option-edition input.saisie:not(.chiffre)', 2), 'Frites');
  await titre(p, 'Avec un <b>supplément</b> si besoin', 'Avec un petit supplément, si vous le souhaitez.');
  const prixFrites = await nieme(p, '.feuille .option-edition input.chiffre', 2);
  await toucher(p, null, prixFrites, 200);
  await p.keyboard.press('Backspace');
  await p.keyboard.type('300', { delay: 180 });
  await pause(900);
  await toucher(p, 'Enregistrer', '.feuille-pied button', 1000);

  await titre(p, 'Le plat est <b>tout de suite</b> en vente', 'Et voilà : le plat est déjà disponible à la vente !');
  await toucher(p, 'Vendre', '.menu-lien', 900);
  await caisseOuverte(p);
  await toucher(p, 'Spécialités', '.puces .puce', 900);
  await toucher(p, 'Poulet DG', '.tuile', 900);
  await toucher(p, 'Frites', '.option', 700);
  await toucher(p, 'Ajouter', '.feuille-pied button', 1500);
  await conclusion(p, film);
});

// Gérer les vendeurs (téléphone, vertical) : créer, donner des droits, désactiver
await enregistrer('gestion-vendeurs', { largeur: 390, hauteur: 780, mobile: true, affiche: 38 }, async (p, demarrer) => {
  await regler(p, 18, 50);
  await connexion(p, 'resto-ivoire', 'CI', true);
  await carte(p, INTRO('Vos vendeurs, vos règles.', 'Gestion de l’équipe'));
  const film = await demarrer();
  await introduction(p, 'Vos vendeurs, vos règles. Voyons comment ça marche.');
  await titre(p, 'Le <b>gérant</b> se connecte', 'Le gérant se connecte.');
  await seConnecter(p, '06 00 00 00 01');

  await titre(p, '<b>Réglages → Équipe</b>', 'Dans les réglages, ouvrez l’équipe.');
  await toucher(p, 'Plus', '.menu-lien', 800);
  await toucher(p, 'Réglages', '.feuille .liste-item', 1200);
  await titre(p, 'Chaque vendeur a <b>son propre compte</b>', 'Chaque vendeur a son propre compte.');
  await pause(800);
  await toucher(p, 'Vendeur', '.bouton-flottant', 900);
  await titre(p, 'Son nom, son numéro et <b>son code PIN</b>', 'Indiquez son nom, son numéro, et son code personnel.');
  await taper(p, await champ(p, 'Nom et prénom'), 'Amorac Kaislo');
  await taper(p, await champ(p, 'Numéro de téléphone'), '07 08 09 10 11');
  await taper(p, await champ(p, 'Code PIN'), '2580');
  await pause(500);
  await titre(p, 'Vous décidez <b>ce qu’il peut faire</b>', 'Puis choisissez ce qu’il a le droit de faire.');
  await defiler(p, 'Ce que ce vendeur peut faire', '.section-titre', 900);
  await toucher(p, null, '.feuille button.interrupteur[aria-label="Faire des remises"]', 1200);
  await toucher(p, 'Enregistrer', '.feuille-pied button', 1200);
  await titre(p, 'Il se connecte avec son numéro, <b>sur n’importe quel appareil</b>', 'Il se connecte avec son numéro, sur n’importe quel appareil du commerce.');
  await pause(1200);
  await titre(p, 'Un départ ? <b>Désactivez-le</b> en un geste', 'Un vendeur s’en va ? Désactivez-le, en un seul geste.');
  await toucher(p, null, '.liste-item:last-child button.interrupteur', 1500);
  await titre(p, 'Et suivez <b>les ventes de chacun</b>', 'Et suivez les ventes de chacun, au franc près.');
  await toucher(p, 'Accueil', '.menu-lien', 900);
  await defiler(p, 'Par vendeur', 'h2, h3, b, p', 2000);
  await conclusion(p, film);
});

// ============================================================
// VIDÉOS MARKETING HUMORISTIQUES (TikTok, Facebook Reels, WhatsApp) : « le commerçant à l'ancienne » contre « le commerçant Kaislo »
//   npm run videos -- promo           (toutes les vidéos « promo- »)
//   npm run videos -- promo-carnet    (une seule)
// Format vertical, 25 à 35 secondes. Un sketch animé (le cahier qui disparaît, la caisse comptée pendant 2 heures…),
// puis la vraie application qui règle le problème en quelques touches, puis le message clé :
// « Kaislo fait les calculs à votre place. Votre entreprise tient dans votre poche. »
// On se moque de la méthode, jamais de la personne : l'humour reste bienveillant.
// ============================================================
const MESSAGE_CLE = `<div class="k">K</div><div class="marque">Kaislo</div>
  <h1>Kaislo fait les calculs<br>à votre place.</h1>
  <p style="font-size:26px;opacity:1;color:#E8A317;font-weight:700">Votre entreprise tient<br>dans votre poche.</p>
  <div class="bouton">Essai gratuit 30 jours</div>`;
const MESSAGE_CLE_PAROLE = 'Kaislo fait les calculs à votre place. Votre entreprise tient dans votre poche.';

async function conclusionPromo(p, film) {
  await titre(p, '');
  await carte(p, MESSAGE_CLE);
  await dire(MESSAGE_CLE_PAROLE);
  await attendreVoix();
  await pause(1500);
  await film.stop();
}

// Sketch : une carte plein écran, des répliques dites une à une dans la bulle
async function sketch(p, classe, html, repliques) {
  await carte(p, `<div class="sk ${classe}">${html}</div>`, 400);
  for (const r of repliques) {
    await attendreVoix();
    await p.evaluate((h) => { const b = document.querySelector('#v-carte .sk-bulle'); if (b) { b.innerHTML = h.texte; b.classList.remove('sk-pop'); void b.offsetWidth; b.classList.add('sk-pop'); } if (h.js) new Function(h.js)(); }, { texte: r.texte, js: r.js || '' });
    await dire(r.parole || r.texte.replace(/<[^>]+>/g, ''));
  }
  await attendreVoix();
  await pause(500);
}
// Horloge qui s'emballe (heure de début, heure de fin, secondes réelles)
const HORLOGE_JS = (de, a, secondes) => `(() => { const h = document.querySelector('#v-carte .sk-horloge'); const t0 = performance.now(); const d = ${de}, f = ${a};
  const tick = () => { const k = Math.min(1, (performance.now() - t0) / ${secondes * 1000}); const m = Math.round(d + (f - d) * k); h.textContent = String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); if (k < 1) requestAnimationFrame(tick); }; tick(); })()`;

// Le carnet de crédit qui disparaît
await enregistrer('promo-carnet-credit', { largeur: 390, hauteur: 780, mobile: true, affiche: 6 }, async (p, demarrer) => {
  await regler(p, 18, 40);
  await connexion(p, 'chez-sentinelle', 'CI', true);
  await carte(p, `<div class="sk ancien"><div class="sk-badge">Le commerçant à l’ancienne</div><div class="sk-gros sk-secoue">📒</div><div class="sk-bulle"></div><div class="sk-legende">Dettes des clients retrouvées : <b>???</b></div></div>`);
  const film = await demarrer();
  await pause(600);
  await sketch(p, 'ancien', `<div class="sk-badge">Le commerçant à l’ancienne</div><div class="sk-gros sk-secoue" id="sk-carnet">📒</div><div class="sk-bulle"></div><div class="sk-legende">Dettes des clients retrouvées : <b>???</b></div>`, [
    { texte: 'Mon carnet de crédit ?<br>Il était là ce matin !', parole: 'Mon carnet de crédit ? Il était là ce matin !' },
    { texte: 'Qui me doit combien ?!<br>😱', parole: 'Qui me doit combien ?', js: "const c=document.getElementById('sk-carnet'); c.classList.remove('sk-secoue'); c.classList.add('sk-envol');" },
  ]);
  await sketch(p, 'kaislo', `<div class="sk-badge">Le commerçant Kaislo 😎</div><div class="sk-rangee sk-pop">📱</div><div class="sk-bulle"></div>`, [
    { texte: 'Moi, tout est dans<br>mon téléphone.', parole: 'Moi, tout est dans mon téléphone.' },
  ]);
  await masquerCarte(p);
  await seConnecter(p, '06 00 00 00 11');
  await titre(p, 'Une vente à <b>crédit</b> ? Deux touches.', 'Une vente à crédit ? Deux touches.');
  await toucher(p, 'Vendre', '.menu-lien', 900);
  await caisseOuverte(p);
  await toucher(p, 'Pain rond', '.tuile', 400);
  await toucher(p, 'Pain rond', '.tuile', 400);
  await toucher(p, 'Huile de table 1L', '.tuile', 900);
  await toucher(p, 'Valider', '.barre-panier button', 900);
  await toucher(p, 'À crédit', '.feuille .choix-grille button', 600);
  await toucher(p, 'Choisir le client', '.feuille button', 800);
  await toucher(p, null, '.feuille .liste-item', 800);
  await toucher(p, 'Noter à crédit', '.feuille button.grand', 1400);
  await titre(p, 'Noté. <b>Rien ne se perd.</b>', 'Noté. Rien ne se perd.');
  await toucher(p, 'Nouvelle vente', '.feuille-pied button', 600);
  await titre(p, 'Qui vous doit <b>combien</b>, d’un coup d’œil', 'Et je vois qui me doit combien, d’un coup d’œil.');
  await toucher(p, 'Crédit', '.menu-lien', 2200);
  await conclusionPromo(p, film);
});

// La caisse comptée pendant 2 heures
await enregistrer('promo-caisse-2h', { largeur: 390, hauteur: 780, mobile: true, affiche: 6 }, async (p, demarrer) => {
  await regler(p, 21, 10);
  await connexion(p, 'resto-ivoire', 'CI', true);
  await carte(p, `<div class="sk ancien"><div class="sk-badge">Le commerçant à l’ancienne</div><div class="sk-horloge">18:00</div><div class="sk-rangee">🧮🪙🪙</div><div class="sk-bulle"></div></div>`);
  const film = await demarrer();
  await pause(600);
  await sketch(p, 'ancien', `<div class="sk-badge">Le commerçant à l’ancienne</div><div class="sk-horloge">18:00</div><div class="sk-rangee"><span class="sk-secoue">🧮</span><span>🪙</span><span>🪙</span></div><div class="sk-bulle"></div>`, [
    { texte: 'Il manque 500…<br>non, 1 000 !', parole: 'Il manque cinq cents… non, mille !', js: HORLOGE_JS(18 * 60, 19 * 60 + 15, 4) },
    { texte: 'Je recompte tout…<br>depuis le début.', parole: 'Je recompte tout, depuis le début.', js: HORLOGE_JS(19 * 60 + 15, 20 * 60, 3) },
  ]);
  await sketch(p, 'kaislo', `<div class="sk-badge">Le commerçant Kaislo 😎</div><div class="sk-horloge" style="background:#1F5C45;color:#fff">0:10</div><div class="sk-bulle"></div>`, [
    { texte: 'Moi, dix secondes.<br>Et je rentre dîner.', parole: 'Moi, dix secondes. Et je rentre dîner.' },
  ]);
  await masquerCarte(p);
  await seConnecter(p, '06 00 00 00 01');
  await titre(p, 'Fermer la journée : <b>espèces attendues</b>', 'Je ferme la journée : Kaislo sait déjà combien il doit y avoir.');
  await toucher(p, 'Ventes', '.menu-lien', 900);
  await toucher(p, 'Fermer la journée', 'button', 1400);
  const attendu = await p.evaluate(() => { const l = [...document.querySelectorAll('.feuille .ligne, .feuille div')].find((e) => e.children.length === 2 && e.firstElementChild.textContent.trim() === 'Espèces attendues'); return l ? l.lastElementChild.textContent.replace(/[^\d,]/g, '') : '0'; });
  await taper(p, '.feuille input[placeholder="Montant compté"]', attendu);
  await p.evaluate(() => document.querySelector('.feuille .ecart')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  await titre(p, 'Je compte : <b>la compte est juste</b> ✅', 'Je compte : la compte est juste.');
  await pause(1800);
  await conclusionPromo(p, film);
});

// Le comptable : photo floue du cahier contre rapport Excel
await enregistrer('promo-comptable', { largeur: 390, hauteur: 780, mobile: true, affiche: 6 }, async (p, demarrer) => {
  await regler(p, 19, 20);
  await connexion(p, 'chez-sentinelle', 'CI', true);
  await carte(p, `<div class="sk ancien"><div class="sk-badge">Le commerçant à l’ancienne</div><div class="sk-gros">📸</div><div class="sk-bulle"></div></div>`);
  const film = await demarrer();
  await pause(600);
  await sketch(p, 'ancien', `<div class="sk-badge">Le commerçant à l’ancienne</div><div class="sk-gros sk-secoue">📸</div><div class="sk-bulle"></div><div class="sk-legende">Au comptable : « une photo du cahier »</div>`, [
    { texte: '« Patron, voici mes comptes<br>du mois. » 📒', parole: 'Patron, voici mes comptes du mois.' },
    { texte: 'Le comptable : « …c’est flou. »<br>😑', parole: 'Le comptable : c’est flou.' },
  ]);
  await sketch(p, 'kaislo', `<div class="sk-badge">Le commerçant Kaislo 😎</div><div class="sk-rangee sk-pop">📊📄</div><div class="sk-bulle"></div>`, [
    { texte: 'Moi, un clic.<br>Excel et PDF.', parole: 'Moi, un clic. Excel, et P D F.' },
  ]);
  await masquerCarte(p);
  await seConnecter(p, '06 00 00 00 11');
  await titre(p, 'Touchez <b>Exporter</b>', 'Je touche : exporter.');
  await toucher(p, 'Exporter', 'button', 1200);
  await titre(p, 'Jour, semaine, <b>mois</b> ou année', 'Le jour, la semaine, le mois, ou l’année.');
  await toucher(p, 'Semaine', '.feuille .segment button', 1000);
  await toucher(p, 'Mois', '.feuille .segment button', 1500);
  await titre(p, 'Un vrai <b>tableau Excel</b>, sans erreur', 'Un vrai tableau Excel, sans erreur.');
  await toucher(p, 'Excel', '.feuille-pied button', 2200);
  await titre(p, 'Ou un <b>PDF</b> prêt à envoyer', 'Ou un P D F, prêt à envoyer.');
  await toucher(p, 'PDF', '.feuille-pied button', 2200);
  await conclusionPromo(p, film);
});

// Face à face : l'ancienne méthode contre Kaislo (animation seule)
await enregistrer('promo-face-a-face', { largeur: 390, hauteur: 780, mobile: true, affiche: 14 }, async (p, demarrer) => {
  await regler(p, 19, 0);
  await connexion(p, 'chez-sentinelle', 'CI', true);
  await carte(p, `<div class="sk kaislo" style="background:#14211C;color:#fff"><div class="k" style="width:72px;height:72px;border-radius:16px;background:#1F5C45;display:grid;place-items:center;font:800 42px/1 system-ui">K</div><h1 style="font-size:34px;line-height:1.15;margin:0">À l’ancienne<br>ou Kaislo ?</h1></div>`);
  const film = await demarrer();
  await pause(600);
  await dire('À l’ancienne, ou Kaislo ? Faites votre choix.');
  await attendreVoix();
  const lignes = [
    ['✍️ Noter chaque vente<br>à la main', '📱 Trois touches', 'Noter une vente, à la main ? Ou trois touches.'],
    ['😱 Carnet de crédit<br>perdu', '📒 Crédit toujours<br>à jour', 'Le carnet perdu, ou le crédit toujours à jour.'],
    ['🧮 Compter la caisse<br>2 heures', '⏱️ 10 secondes', 'Deux heures de calculs, ou dix secondes.'],
    ['📸 Photo floue<br>pour le comptable', '📊 Excel en un clic', 'Une photo floue, ou un Excel en un clic.'],
  ];
  await carte(p, `<div class="sk kaislo" style="background:#f6f5f1;gap:18px"><div class="sk-entete" style="width:100%;font-size:16px"><div style="color:#8a6a1e">À l’ancienne</div><div style="color:#1F5C45">Kaislo 😎</div></div><div class="sk-versus" id="sk-vs"></div></div>`);
  for (const [a, k, parole] of lignes) {
    await attendreVoix();
    await p.evaluate((a, k) => { const v = document.getElementById('sk-vs'); const l = document.createElement('div'); l.className = 'sk-ligne'; l.innerHTML = '<div class="ancien-c">' + a + '</div><div class="kaislo-c">' + k + '</div>'; v.appendChild(l); }, a, k);
    await dire(parole);
  }
  await attendreVoix();
  await pause(900);
  await conclusionPromo(p, film);
});

serveur.close();
console.log('Vidéos prêtes dans ' + SORTIE);
