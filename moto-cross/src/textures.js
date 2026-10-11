import * as THREE from 'three';

// Textures générées par le code (aucun fichier image) : grain du sol et surface de la piste avec ornières.
function mulberry(a) { return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

// Grain fin et irrégularités du sol (herbe, terre, neige…) : se répète sans couture
export function detailTexture() {
  const S = 256, c = canvas(S, S), x = c.getContext('2d'), r = mulberry(7);
  x.fillStyle = '#d6d6d6'; x.fillRect(0, 0, S, S);
  const stamp = (fn) => { for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) fn(dx, dy); };
  for (let i = 0; i < 60; i++) { const px = r() * S, py = r() * S, rad = 12 + r() * 30, g = 190 + r() * 50 | 0; stamp((dx, dy) => { const gr = x.createRadialGradient(px + dx, py + dy, 0, px + dx, py + dy, rad); gr.addColorStop(0, `rgba(${g},${g},${g},0.35)`); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(px + dx - rad, py + dy - rad, rad * 2, rad * 2); }); }
  for (let i = 0; i < 9000; i++) {   // brins et grains
    const px = r() * S, py = r() * S, l = 2 + r() * 5, a = -Math.PI / 2 + (r() - 0.5) * 0.9, g = 120 + r() * 135 | 0;
    x.strokeStyle = `rgba(${g},${g},${g},${0.25 + r() * 0.4})`; x.lineWidth = 0.7 + r() * 0.8;
    stamp((dx, dy) => { x.beginPath(); x.moveTo(px + dx, py + dy); x.lineTo(px + dx + Math.cos(a) * l, py + dy + Math.sin(a) * l); x.stroke(); });
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// Surface de la piste : terre tassée, deux ornières de pneus, cailloux, bords irréguliers (alpha)
export function trackTexture() {
  const W = 256, H = 512, c = canvas(W, H), x = c.getContext('2d'), r = mulberry(21);
  x.fillStyle = '#e4e4e4'; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 26000; i++) { const g = 150 + r() * 105 | 0; x.fillStyle = `rgba(${g},${g},${g},${0.18 + r() * 0.3})`; x.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r()); }
  const rut = (u0, ph) => {                       // ornière : bande sombre qui ondule, traces de crampons
    for (let y = 0; y < H; y++) {
      const cx = (u0 + Math.sin((y / H) * Math.PI * 4 + ph) * 0.012 + Math.sin((y / H) * Math.PI * 14 + ph * 2) * 0.004) * W;
      const g = x.createLinearGradient(cx - 15, 0, cx + 15, 0); g.addColorStop(0, 'rgba(60,50,44,0)'); g.addColorStop(0.5, 'rgba(70,58,50,0.42)'); g.addColorStop(1, 'rgba(60,50,44,0)');
      x.fillStyle = g; x.fillRect(cx - 15, y, 30, 1);
      if (y % 6 < 2) { x.fillStyle = 'rgba(40,32,28,0.22)'; x.fillRect(cx - 9, y, 18, 1); }
    }
  };
  rut(0.37, 0.3); rut(0.63, 1.7);
  for (let i = 0; i < 260; i++) { const g = r() < 0.5 ? 245 : 90; x.fillStyle = `rgba(${g},${g},${g},0.55)`; x.beginPath(); x.arc(r() * W, r() * H, 0.8 + r() * 1.8, 0, 7); x.fill(); }
  const img = x.getImageData(0, 0, W, H), d = img.data;
  const vn = (a, b) => { const h = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); }; const ia = Math.floor(a), ib = Math.floor(b), fa = a - ia, fb = b - ib, sa = fa * fa * (3 - 2 * fa), sb = fb * fb * (3 - 2 * fb); return (h(ia, ib) * (1 - sa) + h(ia + 1, ib) * sa) * (1 - sb) + (h(ia, ib + 1) * (1 - sa) + h(ia + 1, ib + 1) * sa) * sb; };
  for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {      // bords irréguliers
    const u = xx / W, n = vn(y * 0.05, u < 0.5 ? 1 : 9) * 0.1, e = Math.min(u, 1 - u) - 0.04 - n;
    d[(y * W + xx) * 4 + 3] = Math.max(0, Math.min(1, e / 0.12)) * 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// Bande de sécurité rouge et blanche (barrière de bord de piste)
export function barrierTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 32;
  const g = c.getContext('2d');
  for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#f4f4f0' : '#d8231b'; g.fillRect(i * 32, 0, 32, 32); }
  g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(0, 0, 128, 3); g.fillRect(0, 29, 128, 3);
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(0, 8, 128, 4);
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
