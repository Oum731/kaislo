// Suivi des inscriptions Google Ads : rien sans identifiant, rien sans accord du visiteur, jamais dans les espaces de l'équipe.
// Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';

function navigateurFactice() {
  const stock = {};
  const scripts = [];
  globalThis.window = { dataLayer: undefined, addEventListener: () => {}, location: { pathname: '/', search: '' } };
  globalThis.localStorage = { getItem: (k) => stock[k] ?? null, setItem: (k, v) => { stock[k] = String(v); }, removeItem: (k) => { delete stock[k]; } };
  globalThis.document = { readyState: 'complete', cookie: '', head: { appendChild: (s) => scripts.push(s) }, createElement: () => ({}) };
  return { stock, scripts };
}
const evenements = () => (window.dataLayer || []).map((a) => Array.from(a));

test('avec identifiant : rien avant l\'accord, la conversion seulement après', async () => {
  process.env.NEXT_PUBLIC_GOOGLE_ADS_ID = 'AW-123456789';
  process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID = '2023668061621044';
  process.env.NEXT_PUBLIC_GOOGLE_ADS_INSCRIPTION = 'AbC-D_efG';
  const { scripts, stock } = navigateurFactice();
  const m = await import('../src/lib/mesure.js');
  assert.equal(m.mesureActive(), true);
  // Pas encore répondu : rien n'est envoyé ni chargé
  assert.equal(m.choixMesure(), null);
  assert.equal(m.suivreInscription(), false);
  assert.equal(scripts.length, 0);
  // Refus : toujours rien
  m.refuserMesure();
  assert.equal(stock['kaislo-mesure'], 'non');
  assert.equal(m.suivreInscription(), false);
  assert.equal(scripts.length, 0);
  // Accord : la balise se charge et la conversion est comptée avec le bon identifiant
  m.accepterMesure();
  assert.equal(stock['kaislo-mesure'], 'oui');
  assert.equal(scripts.length, 2, 'les balises se chargent tout de suite après « Accepter »');
  assert.equal(m.suivreInscription(), true);
  assert.equal(scripts.length, 2); // balise Google + pixel Meta
  assert.match(scripts[0].src, /^https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=AW-123456789$/);
  assert.equal(scripts[1].src, 'https://connect.facebook.net/en_US/fbevents.js');
  // Pixel Meta : détection automatique des boutons et formulaires coupée, page vue puis inscription
  const fb = Array.from(window.fbq.queue).map((a) => Array.from(a));
  assert.deepEqual(fb[0], ['set', 'autoConfig', false, '2023668061621044']);
  assert.deepEqual(fb[1], ['init', '2023668061621044']);
  assert.deepEqual(fb[2], ['track', 'PageView']);
  assert.deepEqual(fb[3], ['track', 'CompleteRegistration']);
  assert.ok(!JSON.stringify(fb).match(/telephone|nom|ville|montant/i));
  const ev = evenements();
  assert.ok(ev.some((e) => e[0] === 'event' && e[1] === 'conversion' && e[2].send_to === 'AW-123456789/AbC-D_efG'));
  // Seulement un signal d'inscription : aucune donnée du commerce
  assert.ok(!JSON.stringify(ev).match(/telephone|nom|ville|montant/i));
});

test('jamais de mesure dans les espaces de l\'équipe', async () => {
  const m = await import('../src/lib/mesure.js');
  for (const p of ['/admin/', '/admin', '/commercial/']) assert.equal(m.pageSansMesure(p), true, p);
  for (const p of ['/', '/app/', '/tarifs/', '/en/', '/administration/']) assert.equal(m.pageSansMesure(p), false, p);
});
