// Confettis de victoire (canvas 2D léger).
let cv, ctx, parts = [], raf = 0;
export function confetti(n = 140) {
  if (!cv) {
    cv = document.createElement('canvas');
    cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:20';
    document.body.appendChild(cv); ctx = cv.getContext('2d');
  }
  cv.width = innerWidth; cv.height = innerHeight;
  const colors = ['#ff9d2e', '#ffd84d', '#4dd2ff', '#7dff3a', '#ff5fd2', '#fff'];
  for (let i = 0; i < n; i++) parts.push({ x: Math.random() * cv.width, y: -20 - Math.random() * cv.height * 0.4, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4, s: 5 + Math.random() * 7, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, c: colors[(Math.random() * colors.length) | 0] });
  if (!raf) tick();
}
export function clearConfetti() { parts = []; }
function tick() {
  ctx.clearRect(0, 0, cv.width, cv.height);
  parts = parts.filter((p) => p.y < cv.height + 30);
  for (const p of parts) {
    p.x += p.vx; p.y += p.vy; p.r += p.vr;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
  }
  raf = parts.length ? requestAnimationFrame(tick) : 0;
  if (!raf) ctx.clearRect(0, 0, cv.width, cv.height);
}
