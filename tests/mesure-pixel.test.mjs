// Pixel Meta seul (sans Google Ads) : rien avant l'accord du visiteur, jamais dans les espaces de l'équipe, pas de suivi des boutons ni des formulaires.
// (fichier à part : la configuration est lue une fois par processus). Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';

function navigateurFactice() {
  const stock = {};
  const scripts = [];
  globalThis.window = { addEventListener: () => {}, location: { pathname: '/', search: '' } };
  globalThis.localStorage = { getItem: (k) => stock[k] ?? null, setItem: (k, v) => { stock[k] = String(v); }, removeItem: (k) => { delete stock[k]; } };
  const ecrits = [];
  globalThis.document = { readyState: 'complete', get cookie() { return '_fbp=fb.1.123; _gcl_au=1; kaislo_pays=CI'; }, set cookie(v) { ecrits.push(v); }, ecrits, head: { appendChild: (s) => scripts.push(s) }, createElement: () => ({}) };
  return { stock, scripts };
}

test('pixel Meta : rien avant l\'accord, puis page vue + inscription sans aucune donnée du commerce', async () => {
  delete process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
  delete process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID; // identifiant par défaut du projet
  const { scripts, stock } = navigateurFactice();
  const m = await import('../src/lib/mesure.js');
  assert.equal(m.mesureActive(), true);
  assert.equal(m.suivreInscription(), false);
  assert.equal(m.chargerBalise(), false);
  assert.equal(scripts.length, 0);
  assert.equal(window.fbq, undefined);
  m.accepterMesure();
  assert.equal(stock['kaislo-mesure'], 'oui');
  assert.equal(m.suivreInscription(), true);
  assert.equal(window.gtag, undefined, 'pas de balise Google sans identifiant Google');
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].src, 'https://connect.facebook.net/en_US/fbevents.js');
  const fb = Array.from(window.fbq.queue).map((a) => Array.from(a));
  assert.deepEqual(fb, [['set', 'autoConfig', false, '2023668061621044'], ['init', '2023668061621044'], ['track', 'PageView'], ['track', 'CompleteRegistration']]);
  // Un refus efface les cookies du pixel (et de Google), pas les autres
  m.refuserMesure();
  const effaces = document.ecrits.map((c) => c.split('=')[0]);
  assert.deepEqual(effaces.sort(), ['_fbp', '_gcl_au']);
});

test('jamais de pixel dans les espaces de l\'équipe', async () => {
  const m = await import('../src/lib/mesure.js');
  for (const p of ['/admin/', '/commercial/']) assert.equal(m.pageSansMesure(p), true, p);
});
