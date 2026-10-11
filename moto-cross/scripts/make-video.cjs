// Génère une vidéo de prévisualisation du jeu, image par image (horloge simulée → vidéo fluide quelle que soit la machine).
// Usage : node scripts/make-video.cjs <largeur> <hauteur> <secondes> <fichier.mp4> [url]
// Nécessite : playwright, ffmpeg, et le jeu servi en mode développement (npm run dev) — l'accès au pilote automatique en dépend.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const { mkdirSync, rmSync, writeFileSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const [W, H, SECONDS, OUT, URL = 'http://localhost:5174/'] = [Number(process.argv[2] || 1920), Number(process.argv[3] || 1080), Number(process.argv[4] || 18), process.argv[5] || 'preview.mp4', process.argv[6]];
const FPS = 30, FRAMES = Math.round(SECONDS * FPS), TMP = '/tmp/mc-frames-' + W + 'x' + H;

// Horloge simulée : le jeu avance exactement d'une image à chaque __step()
const CLOCK = () => {
  window.__t = 0; const rafs = []; let timers = [], tid = 0;
  window.requestAnimationFrame = (cb) => { rafs.push(cb); return rafs.length; };
  window.cancelAnimationFrame = () => {};
  performance.now = () => window.__t;
  window.setTimeout = (fn, ms = 0, ...a) => { const id = ++tid; timers.push({ id, at: window.__t + ms, fn: () => fn(...a) }); return id; };
  window.clearTimeout = (id) => { timers = timers.filter((x) => x.id !== id); };
  window.setInterval = (fn, ms = 0) => { const id = ++tid; const f = () => { fn(); timers.push({ id, at: window.__t + ms, fn: f }); }; timers.push({ id, at: window.__t + ms, fn: f }); return id; };
  window.clearInterval = window.clearTimeout;
  window.__step = (n = 1, dt = 1000 / 30) => { for (let i = 0; i < n; i++) { window.__t += dt; const due = timers.filter((x) => x.at <= window.__t).sort((a, b) => a.at - b.at); timers = timers.filter((x) => x.at > window.__t); due.forEach((x) => x.fn()); rafs.splice(0).forEach((cb) => cb(window.__t)); } };
};

// Pilote automatique : suit la piste, nitro, et fait un salto arrière quand le saut est assez grand
const AUTOPILOT = () => {
  let flip = false, decided = false;
  window.__auto = () => {
    const g = window.__g, pl = g.player; if (!g || (g.state !== 'racing' && g.state !== 'countdown')) return;
    const S = g.track.SAMPLES, sm = g.track.samples, tgt = sm[(pl.idx + 8 + Math.min(10, Math.round(Math.hypot(pl.vx || 0, pl.vz || 0) * 0.12))) % S];
    let e = Math.atan2(tgt.x - pl.x, tgt.z - pl.z) - pl.heading; e = Math.atan2(Math.sin(e), Math.cos(e));
    g.keys.left = e > 0.05 && pl.grounded; g.keys.right = e < -0.05 && pl.grounded; g.keys.nitro = Math.abs(e) < 0.12;
    if (pl.grounded) { g.keys.up = Math.abs(e) < 0.6; g.keys.down = Math.abs(e) > 1.0; flip = false; decided = false; window.__closeup = undefined; return; }
    g.keys.up = false;
    if (!decided && pl.airT > 0.12) { decided = true; flip = pl.vy > 6; }
    if (flip) { g.keys.down = pl.spinX > -(Math.PI * 2) + 0.45; window.__closeup = 2.3; window.__closeDist = 8.5; window.__closeH = 2.2; window.__closeFov = 52; }
  };
};

(async () => {
  rmSync(TMP, { recursive: true, force: true }); mkdirSync(TMP, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 480, height: 270 }, deviceScaleFactor: 1 });
  await page.addInitScript(CLOCK); await page.addInitScript(AUTOPILOT);
  await page.addInitScript(() => { localStorage.setItem('motocross_save_v2', JSON.stringify({ coins: 5000, owned: [0, 1, 2, 3, 4, 5, 6, 7], daily: { day: '2999-01-01', streak: 1 }, stats: { races: 9 }, podium: { forest: true, desert: true, snow: true, volcano: true, night: true }, settings: { quality: 2, lang: 'en', music: false, sfx: false } })); localStorage.setItem('motocross_sel', JSON.stringify({ track: Number(new URLSearchParams(location.search).get('track') || 0), bike: 2, diff: 1, mode: 'race', cup: 0 })); });
  await page.addStyleTag({ content: '*{transition:none!important;animation:none!important}' }).catch(() => {});
  await page.goto((URL || 'http://localhost:5174/') + (process.env.TRACK ? '?track=' + process.env.TRACK : ''));
  const step = (n = 1) => page.evaluate((n) => window.__step(n), n);
  for (let i = 0; i < 200; i++) { await step(1); if (await page.evaluate(() => !document.getElementById('loading') && !!window.__g)) break; await page.waitForTimeout(30); }
  await page.addStyleTag({ content: '*{transition:none!important;animation:none!important}#touch,.iconbtn,.toast{display:none!important}' });
  await page.evaluate(() => document.getElementById('play').click());
  for (let i = 0; i < 400 && (await page.evaluate(() => window.__g.state)) !== 'racing'; i++) await step(1);   // compte à rebours rapide (petite fenêtre)
  await page.setViewportSize({ width: W, height: H }); await step(2);
  const t0 = Date.now();
  for (let f = 0; f < FRAMES; f++) {
    await page.evaluate(() => { window.__auto(); window.__step(1); });
    await page.screenshot({ path: `${TMP}/f_${String(f).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 92 });
    if (f % 30 === 29) console.log(`  ${f + 1}/${FRAMES} images (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
  await browser.close();
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', `${TMP}/f_%04d.jpg`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '21', '-preset', 'slow', '-an', '-movflags', '+faststart', OUT]);
  console.log('✔', OUT);
})();
