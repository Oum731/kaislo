// Génère les visuels de publication (couvertures, icône, captures) directement depuis le jeu.
// Usage : npm run dev (dans un terminal) puis, dans un autre : node scripts/store-assets.cjs
// Nécessite Playwright : npm i -D playwright && npx playwright install chromium
const { chromium } = require('playwright');
const URL = process.env.GAME_URL || 'http://localhost:5173/';
const OUT = 'store/';

const SAVE = JSON.stringify({ coins: 4350, owned: [0, 1, 2, 3], upg: { 2: { eng: 3, han: 2, nit: 2 }, 3: { eng: 2, han: 1, nit: 3 } }, podium: { forest: true, desert: true }, daily: { day: '2999-01-01', streak: 3 }, settings: { music: true, sfx: true, quality: 2 }, stats: { races: 12, wins: 5, tricks: 40, coins: 3000 } });

async function open(browser, track, bike) {
  const page = await browser.newPage({ viewport: { width: 480, height: 270 } });
  await page.addInitScript(([s, sel]) => { localStorage.setItem('motocross_save_v2', s); localStorage.setItem('motocross_sel', sel); }, [SAVE, JSON.stringify({ track, bike, diff: 1 })]);
  await page.goto(URL); await page.waitForTimeout(2500);
  return page;
}
const hideUI = (page) => page.addStyleTag({ content: '#hud,#touch,.iconbtn,.wallet,.toast,#big,#trick{display:none!important}' });
async function overlay(page, kind) {
  await page.evaluate((kind) => {
    const d = document.createElement('div');
    d.style.cssText = `position:fixed;inset:0;display:flex;flex-direction:column;justify-content:${kind === 'wide' ? 'flex-end' : 'flex-start'};align-items:${kind === 'wide' ? 'flex-start' : 'center'};padding:${kind === 'wide' ? '0 0 6% 5%' : '8% 4% 0'};box-sizing:border-box;font-family:system-ui,Segoe UI,Arial;pointer-events:none;background:linear-gradient(${kind === 'wide' ? '90deg,#000a,#0000 55%' : '180deg,#000b,#0000 45%'})`;
    const w = innerWidth;
    d.innerHTML = `<div style="font-size:${kind === 'wide' ? w * 0.075 : w * 0.17}px;font-weight:900;line-height:.95;color:#ff9d2e;text-shadow:0 ${w * 0.006}px 0 #6a2d00,0 ${w * 0.01}px ${w * 0.02}px #000;letter-spacing:2px;text-align:${kind === 'wide' ? 'left' : 'center'}">MOTO<br>CROSS</div>
      <div style="margin-top:${w * 0.012}px;font-size:${kind === 'wide' ? w * 0.026 : w * 0.06}px;font-weight:800;color:#fff;text-shadow:0 2px 8px #000;text-align:${kind === 'wide' ? 'left' : 'center'}">${kind === 'wide' ? 'RACING 3D · 3 pistes · 4 motos · figures' : 'RACING 3D<br>3 pistes · 4 motos · figures'}</div>`;
    document.body.appendChild(d);
  }, kind);
}
async function race(page) {
  await page.click('#play');
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
    ['cover_1920x1080.png', 0, 3, 'jump', [1920, 1080], 'wide'],
    ['cover_800x1200.png', 1, 2, 'jump', [800, 1200], 'tall'],
    ['icon_800x800.png', 1, 2, 'jump', [800, 800], 'tall'],
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
  // Garage + menu
  let page = await open(browser, 0, 2);
  await page.setViewportSize({ width: 1920, height: 1080 }); await page.waitForTimeout(800);
  await page.click('#garage'); await page.waitForTimeout(3500);
  await page.screenshot({ path: OUT + 'screenshot_4_garage.png' }); console.log('✔ screenshot_4_garage.png');
  await page.close();
  await browser.close();
})();
