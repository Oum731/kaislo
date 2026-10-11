// Génère les visuels de publication (couvertures, icône, captures) directement depuis le jeu.
// Usage : npm run dev (dans un terminal) puis, dans un autre : node scripts/store-assets.cjs
// Nécessite Playwright : npm i -D playwright && npx playwright install chromium
const { chromium } = require('playwright');
const URL = process.env.GAME_URL || 'http://localhost:5173/';
const OUT = process.env.OUT_DIR || 'store/';

const LANG = process.env.LANG_ID || 'en';
const TAGLINE = { en: ['6 tracks · 8 bikes · stunts', 'RACING 3D'], fr: ['6 pistes · 8 motos · figures', 'RACING 3D'], es: ['6 pistas · 8 motos · acrobacias', 'RACING 3D'], pt: ['6 pistas · 8 motos · manobras', 'RACING 3D'], de: ['6 Strecken · 8 Motorräder · Stunts', 'RACING 3D'] }[LANG] || ['6 tracks · 8 bikes · stunts', 'RACING 3D'];
const SAVE = JSON.stringify({ coins: 4350, owned: [0, 1, 2, 3, 4, 5, 6, 7], upg: { 7: { eng: 2, han: 1, nit: 3 }, 2: { eng: 3, han: 2, nit: 2 } }, podium: { forest: true, desert: true, snow: true, volcano: true, night: true }, daily: { day: '2999-01-01', streak: 3 }, settings: { music: true, sfx: true, quality: 2, lang: LANG }, stats: { races: 12, wins: 5, tricks: 40, coins: 3000 } });

async function open(browser, track, bike) {
  const page = await browser.newPage({ viewport: { width: 480, height: 270 } });
  await page.addInitScript(([s, sel]) => { localStorage.setItem('motocross_save_v2', s); localStorage.setItem('motocross_sel', sel); }, [SAVE, JSON.stringify({ track, bike, diff: 1 })]);
  await page.goto(URL); await page.waitForTimeout(2500);
  return page;
}
const hideUI = (page) => page.addStyleTag({ content: '#hud,#touch,.iconbtn,.wallet,.toast,#big,#trick,#nitrofx,#banner,#rankpop,#hint{display:none!important}' });
// Les règles CrazyGames : sur les couvertures, uniquement le titre du jeu, sans bordure.
async function overlay(page, kind) {
  await page.evaluate((kind) => {
    const d = document.createElement('div');
    const w = innerWidth;
    d.style.cssText = `position:fixed;inset:0;display:flex;align-items:${kind === 'wide' ? 'flex-start' : 'flex-start'};justify-content:center;padding-top:${kind === 'wide' ? '3.5%' : '7%'};box-sizing:border-box;font-family:system-ui,Segoe UI,Arial;pointer-events:none;background:linear-gradient(180deg,#0008 0,#0000 38%)`;
    d.innerHTML = `<div style="font-size:${kind === 'wide' ? w * 0.082 : w * 0.17}px;font-weight:900;line-height:.92;color:#ff9d2e;text-shadow:0 ${w * 0.006}px 0 #6a2d00,0 ${w * 0.012}px ${w * 0.03}px #000;letter-spacing:2px;text-align:center">MOTO CROSS</div>`;
    document.body.appendChild(d);
  }, kind);
}
async function race(page) {
  await page.click('#play', { force: true });
  await page.waitForFunction(() => window.__g.state === 'racing', null, { timeout: 90000 });
}
// Téléporte le joueur juste avant un saut, puis attend d'être en l'air en plein flip
async function jumpShot(page, jumpIndex, angle) {
  await page.evaluate(([ji, ang]) => {
    window.__closeup = ang; window.__closeDist = 9.5; window.__closeH = 2.2; window.__closeFov = 58;
    const g = window.__g, S = g.track.SAMPLES, sm = g.track.samples, i = (Math.round(g.track.def.jumps[ji] * S) - 14 + S) % S, a = sm[i], b = sm[(i + 3) % S], p = g.player;
    p.x = a.x; p.z = a.z; p.heading = Math.atan2(b.x - a.x, b.z - a.z); p.y = g.track.heightAt(a.x, a.z, i); p.speed = 41; p.nitro = 1; g.keys.up = true;
    window.__flip = setInterval(() => { g.keys.down = !p.grounded && p.airT > 0.25; }, 16);
  }, [jumpIndex, angle]);
  await page.waitForFunction(() => { const p = window.__g.player; return !p.grounded && p.airT > 0.7 && Math.abs(p.spinX) > 1.3 && Math.abs(p.spinX) < 2.6; }, null, { timeout: 120000, polling: 30 });
}
async function groundShot(page) {
  await page.evaluate(() => { const g = window.__g; g.keys.up = true; g.keys.nitro = true; window.__closeup = 2.5; window.__closeDist = 7; window.__closeH = 1.8; window.__closeFov = 62; });
  await page.waitForTimeout(4000);
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const jobs = [
    // [fichier, piste, moto, mode, taille, overlay]
    ['screenshot_1_forest_flip.png', 0, 2, 'jump', [1920, 1080], null],
    ['screenshot_2_desert_jump.png', 1, 3, 'jump', [1920, 1080], null],
    ['screenshot_3_snow_race.png', 2, 1, 'ground', [1920, 1080], null],
    ['screenshot_4_volcano_jump.png', 3, 4, 'jump', [1920, 1080], null],
    ['screenshot_5_night_race.png', 4, 7, 'ground', [1920, 1080], null],
    ['screenshot_6_tropic_jump.png', 5, 5, 'jump', [1920, 1080], null],
  ];
  for (const [file, track, bike, mode, [w, h], ov, ang = 2.3] of jobs) {
    const page = await open(browser, track, bike);
    await race(page);
    await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(500);
    if (mode === 'jump') await jumpShot(page, track === 1 ? 2 : 0, ang); else await groundShot(page);
    await page.evaluate(() => window.__g.coins.forEach((c) => { c.on = false; })); await page.waitForTimeout(100);
    await hideUI(page); if (ov) await overlay(page, ov);
    await page.waitForTimeout(150);
    await page.screenshot({ path: OUT + file });
    console.log('✔', file);
    await page.close();
  }
  // Couvertures : grille de départ (6 pilotes de couleurs différentes) filmée de face, titre seul
  const covers = [
    ['cover_1920x1080.png', [1920, 1080], 'wide', { pos: [0, 2.4, 15], fov: 36 }],
    ['cover_800x1200.png', [800, 1200], 'tall', { pos: [-2.2, 1.9, 8.5], fov: 44 }],
    ['icon_800x800.png', [800, 800], 'tall', { pos: [0.5, 2.0, 10.5], fov: 42 }],
  ];
  for (const [file, [w, h], kind, cam] of covers) {
    const page = await open(browser, 0, 3);
    await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(1200);
    await page.evaluate((cam) => {
      const g = window.__g; let cx = 0, cy = 0, cz = 0; g.all.forEach((r) => { cx += r.x; cy += r.y; cz += r.z; }); const n = g.all.length; cx /= n; cy /= n; cz /= n;
      const hd = g.player.heading, fx = Math.sin(hd), fz = Math.cos(hd), rx = fz, rz = -fx;   // repère de la grille : avant / droite
      const [a, hgt, fwd] = [cam.pos[0], cam.pos[1], cam.pos[2]];
      window.__cam = { pos: [cx + rx * a + fx * fwd, cy + hgt, cz + rz * a + fz * fwd], look: [cx, cy + 1.55, cz], fov: cam.fov };
    }, cam);
    await page.addStyleTag({ content: '#menu,.iconbtn,.wallet,.toast,.lvlRing{display:none!important}' });
    await page.waitForTimeout(600); await overlay(page, kind); await page.waitForTimeout(200);
    await page.screenshot({ path: OUT + file }); console.log('✔', file); await page.close();
  }
  // Garage + menu
  let page = await open(browser, 0, 7);
  await page.setViewportSize({ width: 1920, height: 1080 }); await page.waitForTimeout(800);
  await page.click('#garage'); await page.waitForTimeout(3500);
  await page.screenshot({ path: OUT + 'screenshot_7_garage.png' }); console.log('✔ screenshot_7_garage.png');
  await page.close();
  await browser.close();
})();
