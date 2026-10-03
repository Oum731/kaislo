// ------------------------------------------------------------
// VIDÉOS DE DÉMONSTRATION du site (public/videos/)
//   1. demo-restaurant.mp4 : format paysage, de la commande au ticket
//   2. demo-epicerie.mp4   : format vertical (WhatsApp, réseaux sociaux),
//      vente, crédit client et fermeture de caisse
//
// Utilisation : npm run build, puis npm run videos (toutes les vidéos)
//               ou npm run videos -- produits (seulement celles dont le nom contient « produits »)
// Un navigateur automatique utilise la vraie démo pendant qu'on l'enregistre :
// les vidéos restent donc à jour avec l'application.
// Pour changer l'adresse affichée à la fin : LIEN_FINAL ci-dessous.
// ------------------------------------------------------------
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';
import ffmpeg from 'ffmpeg-static';

const LIEN_FINAL = 'oum731.github.io/kaisly';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SORTIE = 'public/videos';
const PORT = 4310;

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
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// Styles injectés dans la page enregistrée
const STYLE = `
#v-doigt { position: fixed; z-index: 99999; width: 34px; height: 34px; margin: -17px 0 0 -17px; border-radius: 50%;
  background: rgba(20,33,28,.28); border: 3px solid #fff; box-shadow: 0 2px 10px rgba(0,0,0,.35);
  left: 50%; top: 110%; transition: left .55s cubic-bezier(.4,0,.2,1), top .55s cubic-bezier(.4,0,.2,1), transform .15s; pointer-events: none; }
#v-doigt.appui { transform: scale(.75); background: rgba(232,163,23,.55); }
#v-titre { position: fixed; z-index: 99998; left: 50%; top: 14px; transform: translateX(-50%); max-width: 92%;
  background: rgba(20,33,28,.94); color: #fff; font: 600 22px/1.3 'DM Sans', system-ui, sans-serif; padding: 12px 22px; border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0,0,0,.25); text-align: center; transition: opacity .25s; pointer-events: none; }
#v-titre b { color: #E8A317; font-weight: 700; }
#v-titre:empty { opacity: 0; }
#v-carte { position: fixed; inset: 0; z-index: 100000; background: #14211C; color: #F6F5F1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; text-align: center; padding: 32px; font-family: 'DM Sans', system-ui, sans-serif; transition: opacity .4s; }
#v-carte .k { width: 72px; height: 72px; border-radius: 16px; background: #1F5C45; display: grid; place-items: center; font: 800 42px/1 system-ui; margin-bottom: 18px; }
#v-carte .marque { font: 800 30px/1 system-ui; letter-spacing: -.02em; margin-bottom: 26px; }
#v-carte h1 { font-size: 40px; line-height: 1.15; letter-spacing: -.02em; max-width: 760px; margin: 0; }
#v-carte p { font-size: 21px; opacity: .78; margin: 16px 0 0; max-width: 640px; }
#v-carte .bouton { margin-top: 30px; background: #E8A317; color: #14211C; font-weight: 700; font-size: 22px; padding: 14px 28px; border-radius: 10px; }
#v-carte .v-adresse { margin-top: 16px; font-size: 19px; color: #F6F5F1; opacity: .85; }
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

// Sous-titre en haut de l'écran ("" pour le cacher)
const titre = (p, html) => p.evaluate((h) => { document.getElementById('v-titre').innerHTML = h; }, html);

// Carte plein écran (introduction / fin)
async function carte(p, html, duree) {
  await p.evaluate((h) => { let c = document.getElementById('v-carte'); if (!c) { c = document.createElement('div'); c.id = 'v-carte'; document.body.appendChild(c); } c.style.opacity = 1; c.innerHTML = h; }, html);
  await pause(duree);
}
const masquerCarte = async (p) => { await p.evaluate(() => { const c = document.getElementById('v-carte'); if (c) { c.style.opacity = 0; setTimeout(() => c.remove(), 400); } }); await pause(450); };

// Trouve un élément visible par son texte (ou un sélecteur seul), en attendant jusqu'à 6 s
async function trouver(p, texte, selecteur = 'button, a, .tuile, .liste-item, .option, .menu-lien') {
  for (let essai = 0; essai < 30; essai++) {
    const h = await p.evaluateHandle((t, s) => [...document.querySelectorAll(s)].find((e) => e.getClientRects().length > 0 && (!t || e.textContent.trim().includes(t))) || null, texte, selecteur);
    const el = h.asElement();
    if (el) return el;
    await pause(200);
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
  await pause(600);
  await p.evaluate(() => document.getElementById('v-doigt').classList.add('appui'));
  await pause(140);
  // Clic en JavaScript : fiable même pendant la boucle de captures (un clic souris y perd le focus)
  await el.evaluate((e) => { if (e.matches('input, textarea')) e.focus(); e.click(); });
  await p.evaluate(() => document.getElementById('v-doigt').classList.remove('appui'));
  await pause(attente);
}

// Saisie lente, comme une vraie personne
async function taper(p, selecteur, texte) {
  await toucher(p, null, selecteur, 200);
  await p.keyboard.type(texte, { delay: 110 });
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
  await p.keyboard.type(pin, { delay: 160 });
  await pause(1600);
}

const INTRO = (titreVideo, sousTitre) => `<div class="k">K</div><div class="marque">Kaisly</div><h1>${titreVideo}</h1><p>${sousTitre}</p>`;
const FIN = `<div class="k">K</div><div class="marque">Kaisly</div><h1>À vous d’encaisser.</h1>
  <p>Restaurants, épiceries, boutiques. Sur le téléphone que vous avez déjà, dans la devise de votre pays.</p>
  <div class="bouton">Essai gratuit 30 jours</div><div class="v-adresse">${LIEN_FINAL}</div>`;

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

// Ouvre la démo, se connecte (avec le doigt et la saisie visibles)
async function connexion(p, demo, pays, telephone, mobile) {
  await p.goto(`${U}/app/?demo=${demo}&pays=${pays}`, { waitUntil: 'networkidle0' });
  await p.evaluate(() => localStorage.clear());
  await p.goto(`${U}/app/?demo=${demo}&pays=${pays}`, { waitUntil: 'networkidle0' });
  await p.evaluate(() => document.fonts.ready);
  await preparer(p, mobile);
}

// Si la journée de caisse n'est pas ouverte, on l'ouvre (évite un blocage pendant l'enregistrement)
async function caisseOuverte(p) {
  const feuille = await p.$('.feuille');
  if (feuille && (await feuille.evaluate((f) => f.textContent.includes('Ouvrir la caisse')))) await toucher(p, 'Ouvrir la caisse', '.feuille button', 900);
}

// ---------- 3. Enregistrement + conversion en MP4 léger ----------

// Filme la page image par image (protocole de Chrome), en gardant l'heure de chaque image.
// Renvoie { stop } : à l'arrêt, écrit la liste des images et leur durée pour ffmpeg.
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
  return {
    async stop() {
      const fin = Date.now() / 1000;
      await arreter();
      // Chaque image reste affichée jusqu'à la suivante (Chrome n'envoie rien si l'écran ne bouge pas)
      const lignes = images.map((im, i) => `file '${im.f.replace(/\\/g, '/')}'\nduration ${Math.max(0.001, (images[i + 1]?.t ?? fin) - im.t).toFixed(3)}`);
      lignes.push(`file '${images.at(-1).f.replace(/\\/g, '/')}'`); // ffmpeg ignore la durée de la dernière ligne
      fs.writeFileSync(liste, lignes.join('\n'));
    },
  };
}
// npm run videos -- produits vendeurs : n'enregistre que les vidéos dont le nom contient ces mots
const VOULUES = process.argv.slice(2);
const veut = (nom) => !VOULUES.length || VOULUES.some((v) => nom.includes(v));

async function enregistrer(nom, { largeur, hauteur, mobile, affiche }, scenario) {
  if (!veut(nom)) return;
  const dossierTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kaisly-video-'));
  const navigateur = await puppeteer.launch({ executablePath: CHROME, headless: 'new', userDataDir: dossierTmp, args: ['--hide-scrollbars'] });
  const p = await navigateur.newPage();
  await p.setViewport({ width: largeur, height: hauteur, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  const echelle = mobile ? 2 : 1; // téléphone : images en haute définition (écran « retina »)
  const liste = path.join(dossierTmp, 'images.txt');
  await scenario(p, () => filmer(p, dossierTmp, largeur * echelle, hauteur * echelle, liste, mobile));
  await navigateur.close();
  // H.264 (lu partout, iPhone compris), démarrage rapide sur le web, sans son
  fs.mkdirSync(SORTIE, { recursive: true });
  const mp4 = `${SORTIE}/${nom}.mp4`;
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', liste, '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-pix_fmt', 'yuv420p', '-vf', 'fps=30,scale=trunc(iw/2)*2:trunc(ih/2)*2', '-movflags', '+faststart', '-an', mp4]);
  // Image d'attente (affichée avant la lecture) : un moment parlant de la vidéo (« affiche », en secondes)
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-ss', String(affiche), '-i', mp4, '-frames:v', '1', '-q:v', '80', `${SORTIE}/${nom}.webp`]);
  fs.rmSync(dossierTmp, { recursive: true, force: true });
  console.log(`${mp4} : ${(fs.statSync(mp4).size / 1e6).toFixed(1)} Mo`);
}

// ---------- 4. Les deux scénarios ----------

// Restaurant, Abidjan (FCFA), ordinateur / tablette
await enregistrer('demo-restaurant', { largeur: 1280, hauteur: 720, mobile: false, affiche: 27 }, async (p, demarrer) => {
  await regler(p, 19, 42);
  await connexion(p, 'resto-ivoire', 'CI', '06 00 00 00 01', false);
  await carte(p, INTRO('De la commande au ticket, en quelques touches.', 'Démo restaurant'), 0);
  const film = await demarrer();
  await pause(2600);
  await masquerCarte(p);

  await titre(p, 'Chaque serveur se connecte avec <b>son numéro</b> et <b>son code</b>');
  await taper(p, 'input[type=tel]', '06 00 00 00 01');
  await p.keyboard.press('Enter');
  await p.keyboard.type('1234', { delay: 160 });
  await pause(1800);

  await titre(p, 'Touchez un plat, choisissez <b>l’accompagnement</b>');
  await toucher(p, 'Caisse', '.menu-lien', 900);
  await caisseOuverte(p);
  await toucher(p, 'Attiéké', '.tuile');
  await toucher(p, 'Poisson grillé', '.option', 500);
  await toucher(p, 'Ajouter', '.feuille-pied button', 800);
  await toucher(p, 'Poulet braisé', '.tuile');
  await toucher(p, 'Demi', '.option', 500);
  await toucher(p, 'Ajouter', '.feuille-pied button', 800);
  await titre(p, 'Le prix se calcule <b>tout seul</b>');
  await toucher(p, 'Bissap', '.tuile');
  await toucher(p, 'Grand', '.option', 500);
  await toucher(p, 'Ajouter', '.feuille-pied button', 1200);

  await titre(p, 'Payé par <b>Wave</b>, <b>Orange Money</b>, espèces ou carte');
  await toucher(p, 'Wave', '.panneau-panier .choix-grille button', 1000);
  await toucher(p, 'Encaisser', '.panneau-panier button.grand', 1500);
  await titre(p, 'Ticket <b>imprimé</b> ou envoyé par <b>WhatsApp</b>');
  await pause(3000);
  await toucher(p, 'Nouvelle vente', '.feuille-pied button', 800);

  await titre(p, 'Le soir : <b>chiffre du jour</b>, marge et dépenses, en direct');
  await toucher(p, 'Accueil', '.menu-lien', 3600);
  await titre(p, '');
  await carte(p, FIN, 4200);
  await film.stop();
});

// Épicerie, Paris (€), téléphone (vertical)
await enregistrer('demo-epicerie', { largeur: 390, hauteur: 780, mobile: true, affiche: 27 }, async (p, demarrer) => {
  await regler(p, 20, 15);
  await connexion(p, 'chez-sentinelle', 'FR', '06 00 00 00 11', true);
  await carte(p, INTRO('Vente, crédit et caisse du soir, sur votre téléphone.', 'Démo épicerie'), 0);
  const film = await demarrer();
  await pause(2600);
  await masquerCarte(p);

  await titre(p, 'Connexion : <b>numéro</b> + <b>code PIN</b>');
  await taper(p, 'input[type=tel]', '06 00 00 00 11');
  await p.keyboard.press('Enter');
  await p.keyboard.type('1234', { delay: 160 });
  await pause(1600);

  await titre(p, 'Cherchez ou <b>scannez</b> l’article');
  await toucher(p, 'Caisse', '.menu-lien', 900);
  await caisseOuverte(p);
  await taper(p, '.recherche input', 'lait');
  await pause(500);
  await toucher(p, 'Lait 1L', '.tuile', 600);
  await p.evaluate(() => { const i = document.querySelector('.recherche input'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, ''); i.dispatchEvent(new Event('input', { bubbles: true })); i.blur(); });
  await pause(500);
  await toucher(p, 'Pain rond', '.tuile', 500);
  await toucher(p, 'Pain rond', '.tuile', 500);
  await toucher(p, 'Huile de table 1L', '.tuile', 900);

  await titre(p, 'Le client paiera plus tard ? <b>À crédit</b>');
  await toucher(p, 'Encaisser', '.barre-panier button', 1000);
  await toucher(p, 'À crédit', '.feuille .choix-grille button', 700);
  await toucher(p, 'Choisir le client', '.feuille button', 900);
  await toucher(p, null, '.feuille .liste-item', 900);
  await toucher(p, 'Noter à crédit', '.feuille button.grand', 1600);
  await titre(p, 'Noté dans le <b>carnet de crédit</b>, fini le cahier');
  await pause(1800);
  await toucher(p, 'Nouvelle vente', '.feuille-pied button', 700);
  await toucher(p, 'Crédit', '.menu-lien', 2600);

  await titre(p, 'Le soir : Kaisly calcule les <b>espèces attendues</b>');
  await toucher(p, 'Ventes', '.menu-lien', 900);
  await toucher(p, 'Fermer la caisse', 'button', 1400);
  // On tape exactement le montant attendu : la caisse est juste
  const attendu = await p.evaluate(() => { const l = [...document.querySelectorAll('.feuille .ligne, .feuille div')].find((e) => e.children.length === 2 && e.firstElementChild.textContent.trim() === 'Espèces attendues'); return l ? l.lastElementChild.textContent.replace(/[^\d,]/g, '') : '0'; });
  await taper(p, '.feuille input[placeholder="Montant compté"]', attendu);
  await p.evaluate(() => document.querySelector('.feuille .ecart')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  await titre(p, 'Vous comptez, Kaisly vous dit si la <b>caisse est juste</b>');
  await pause(2600);
  await titre(p, '');
  await carte(p, FIN, 4200);
  await film.stop();
});

// Présentation générale (restaurant, Abidjan) : le tour complet du système
await enregistrer('presentation-kaisly', { largeur: 1280, hauteur: 720, mobile: false, affiche: 23 }, async (p, demarrer) => {
  await regler(p, 19, 30);
  await connexion(p, 'resto-ivoire', 'CI', '06 00 00 00 01', false);
  await carte(p, INTRO('La caisse simple des restaurants, épiceries et boutiques.', 'Présentation de Kaisly en 1 minute'), 0);
  const film = await demarrer();
  await pause(3000);
  await masquerCarte(p);

  await titre(p, 'Chacun se connecte avec <b>son numéro</b> et <b>son code PIN</b>');
  await seConnecter(p, '06 00 00 00 01');
  await titre(p, 'Le tableau de bord : <b>chiffre du jour</b>, marge, dépenses');
  await pause(2600);
  await titre(p, 'Ce qui se vend, <b>heure par heure</b>');
  await defiler(p, 'Évolution des ventes', 'h2, h3, b, p', 2400);
  await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));

  await titre(p, '<b>La caisse</b> : touchez, encaissez');
  await toucher(p, 'Caisse', '.menu-lien', 900);
  await caisseOuverte(p);
  await toucher(p, 'Garba', '.tuile', 500);
  await toucher(p, 'Ajouter', '.feuille-pied button', 600);
  await toucher(p, 'Bissap', '.tuile');
  await toucher(p, 'Grand', '.option', 400);
  await toucher(p, 'Ajouter', '.feuille-pied button', 700);
  await titre(p, 'Espèces : Kaisly calcule <b>la monnaie à rendre</b>');
  await toucher(p, 'Espèces', '.panneau-panier .choix-grille button', 500);
  await toucher(p, null, '.panneau-panier .puces .puce:nth-child(2)', 1600);
  await toucher(p, 'Encaisser', '.panneau-panier button.grand', 2200);
  await toucher(p, 'Nouvelle vente', '.feuille-pied button', 600);

  await titre(p, '<b>Les tables</b> : qui mange quoi, depuis quand');
  await toucher(p, 'Tables', '.menu-lien', 2800);
  await titre(p, '<b>Les ventes</b> : chaque ticket, chaque vendeur');
  await toucher(p, 'Ventes', '.menu-lien', 2200);
  await titre(p, 'Chaque journée de caisse <b>gardée en historique</b>');
  await toucher(p, 'Journées de caisse', 'button', 2600);
  await titre(p, '<b>Le carnet de crédit</b> : qui vous doit combien');
  await toucher(p, 'Crédit', '.menu-lien', 2800);
  await titre(p, '<b>Vos articles</b> : prix, photos, options, marges');
  await toucher(p, 'Produits', '.menu-lien', 2800);
  await titre(p, '<b>Votre équipe</b> : un compte et des droits par vendeur');
  await toucher(p, 'Réglages', '.menu-lien', 2800);
  await titre(p, 'Téléphone, tablette, ordinateur · <b>toutes les devises</b>');
  await toucher(p, 'Accueil', '.menu-lien', 2600);
  await titre(p, '');
  await carte(p, FIN, 4500);
  await film.stop();
});

// Ajouter un article (restaurant) : nouvelle catégorie, prix, marge, accompagnements
await enregistrer('ajout-produits', { largeur: 1280, hauteur: 720, mobile: false, affiche: 22 }, async (p, demarrer) => {
  await regler(p, 11, 15);
  await connexion(p, 'resto-ivoire', 'CI', '06 00 00 00 01', false);
  await carte(p, INTRO('Ajoutez un plat à votre carte, en une minute.', 'Gestion des articles'), 0);
  const film = await demarrer();
  await pause(2600);
  await masquerCarte(p);
  await seConnecter(p, '06 00 00 00 01');

  await titre(p, 'Dans <b>Produits</b>, touchez « Nouvel article »');
  await toucher(p, 'Produits', '.menu-lien', 1000);
  await toucher(p, 'Nouvel article', 'button', 1000);
  await titre(p, 'Le nom du plat');
  await taper(p, await champ(p, 'Nom'), 'Poulet DG');
  await pause(500);
  await titre(p, 'Une <b>nouvelle catégorie</b> ? Créez-la sans quitter la fiche');
  await toucher(p, 'Nouvelle', '.feuille button', 500);
  await taper(p, '.feuille input[placeholder^="Ex : Jus frais"]', 'Spécialités');
  await toucher(p, 'Créer', '.feuille button', 900);
  await titre(p, 'Le prix de vente et le <b>prix d’achat</b>');
  await taper(p, await champ(p, 'Prix ('), '4500');
  await taper(p, await champ(p, 'Prix d’achat'), '2600');
  await titre(p, 'Kaisly calcule <b>votre marge</b> tout seul');
  await defiler(p, 'Marge :', 'p', 2200);

  await titre(p, 'Les <b>accompagnements</b> au choix');
  await toucher(p, '+ Choix unique', '.feuille button', 800);
  await taper(p, await nieme(p, '.feuille .option-edition input.saisie:not(.chiffre)', 0), 'Alloco');
  await toucher(p, '+ Ajouter une option', '.feuille button', 400);
  await taper(p, await nieme(p, '.feuille .option-edition input.saisie:not(.chiffre)', 1), 'Riz');
  await toucher(p, '+ Ajouter une option', '.feuille button', 400);
  await taper(p, await nieme(p, '.feuille .option-edition input.saisie:not(.chiffre)', 2), 'Frites');
  await titre(p, 'Avec un <b>supplément</b> si besoin');
  const prixFrites = await nieme(p, '.feuille .option-edition input.chiffre', 2);
  await toucher(p, null, prixFrites, 200);
  await p.keyboard.press('Backspace');
  await p.keyboard.type('300', { delay: 140 });
  await pause(900);
  await toucher(p, 'Enregistrer', '.feuille-pied button', 1200);

  await titre(p, 'Le plat est <b>tout de suite</b> à la caisse');
  await toucher(p, 'Caisse', '.menu-lien', 900);
  await caisseOuverte(p);
  await toucher(p, 'Spécialités', '.puces .puce', 900);
  await toucher(p, 'Poulet DG', '.tuile', 900);
  await toucher(p, 'Frites', '.option', 700);
  await toucher(p, 'Ajouter', '.feuille-pied button', 2400);
  await titre(p, '');
  await carte(p, FIN, 4200);
  await film.stop();
});

// Gérer les vendeurs (téléphone, vertical) : créer, donner des droits, désactiver
await enregistrer('gestion-vendeurs', { largeur: 390, hauteur: 780, mobile: true, affiche: 24.5 }, async (p, demarrer) => {
  await regler(p, 18, 50);
  await connexion(p, 'resto-ivoire', 'CI', '06 00 00 00 01', true);
  await carte(p, INTRO('Vos vendeurs, vos règles.', 'Gestion de l’équipe'), 0);
  const film = await demarrer();
  await pause(2600);
  await masquerCarte(p);
  await titre(p, 'Le gérant se connecte');
  await seConnecter(p, '06 00 00 00 01');

  await titre(p, '<b>Réglages → Équipe</b>');
  await toucher(p, 'Plus', '.menu-lien', 800);
  await toucher(p, 'Réglages', '.feuille .liste-item', 1400);
  await titre(p, 'Chaque vendeur a <b>son propre compte</b>');
  await pause(1800);
  await toucher(p, 'Vendeur', '.bouton-flottant', 900);
  await titre(p, 'Son nom, son numéro et <b>son code PIN</b>');
  await taper(p, await champ(p, 'Nom et prénom'), 'Amorac Kaisly');
  await taper(p, await champ(p, 'Numéro de téléphone'), '07 08 09 10 11');
  await taper(p, await champ(p, 'Code PIN'), '2580');
  await pause(500);
  await titre(p, 'Vous décidez <b>ce qu’il peut faire</b>');
  await defiler(p, 'Ce que ce vendeur peut faire', '.section-titre', 900);
  await toucher(p, null, '.feuille button.interrupteur[aria-label="Faire des remises"]', 1400);
  await toucher(p, 'Enregistrer', '.feuille-pied button', 1400);
  await titre(p, 'Il se connecte avec son numéro, <b>sur n’importe quel appareil</b>');
  await pause(2200);
  await titre(p, 'Un départ ? <b>Désactivez-le</b> en un geste');
  await toucher(p, null, '.liste-item:last-child button.interrupteur', 2200);
  await titre(p, 'Et suivez <b>les ventes de chacun</b>');
  await toucher(p, 'Accueil', '.menu-lien', 900);
  await defiler(p, 'Par vendeur', 'h2, h3, b, p', 3000);
  await titre(p, '');
  await carte(p, FIN, 4200);
  await film.stop();
});

serveur.close();
console.log('Vidéos prêtes dans ' + SORTIE);
