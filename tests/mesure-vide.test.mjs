// Suivi des inscriptions Google Ads : rien sans identifiant, rien sans accord du visiteur, jamais dans les espaces de l'équipe.
// (fichier à part : la configuration est lue une fois par processus). Lancer : npm test
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

test('sans identifiant (Google Ads, pixel Meta) : le module ne fait rien du tout', async () => {
  delete process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
  process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID = ''; // pixel Meta désactivé aussi
  const { scripts } = navigateurFactice();
  const m = await import('../src/lib/mesure.js');
  assert.equal(m.mesureActive(), false);
  localStorage.setItem('kaislo-mesure', 'oui');
  assert.equal(m.suivreInscription(), false);
  assert.equal(m.chargerBalise(), false);
  assert.equal(scripts.length, 0);
  assert.equal(window.dataLayer, undefined);
});

