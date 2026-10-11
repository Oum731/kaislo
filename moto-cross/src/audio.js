// Moteur simple via WebAudio (aucun fichier à charger).
let ctx, osc, osc2, gain, filter;
export function startEngine() {
  if (ctx) { ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    osc = ctx.createOscillator(); osc.type = 'sawtooth';
    osc2 = ctx.createOscillator(); osc2.type = 'square';
    gain = ctx.createGain(); gain.gain.value = 0.0;
    filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 700;
    osc.connect(filter); osc2.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc2.start();
  } catch (e) { ctx = null; }
}
export function setEngine(speedRatio, throttle, nitro) {
  if (!ctx) return;
  const f = 45 + speedRatio * 110 + (nitro ? 25 : 0);
  osc.frequency.setTargetAtTime(f, ctx.currentTime, 0.05);
  osc2.frequency.setTargetAtTime(f * 0.5, ctx.currentTime, 0.05);
  filter.frequency.setTargetAtTime(500 + throttle * 900, ctx.currentTime, 0.1);
  gain.gain.setTargetAtTime(0.05 + throttle * 0.05, ctx.currentTime, 0.1);
}
export function stopEngine() { if (ctx) gain.gain.setTargetAtTime(0, ctx.currentTime, 0.1); }
export function beep(freq = 600, dur = 0.15) {
  if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.value = freq; g.gain.value = 0.15;
  o.connect(g); g.connect(ctx.destination);
  o.start(); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur); o.stop(ctx.currentTime + dur);
}
