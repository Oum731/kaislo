// Le script de garde des barres du bas (cookies, installation) décide comme les composants. Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCRIPT_GARDE_BARRES, STYLE_GARDE_BARRES } from '../src/lib/garde-barres.js';
import { doitProposer } from '../src/lib/installer-pwa.js';

const JOUR = 86400000;
// Exécute le script comme un navigateur : renvoie les attributs posés sur <html>
function jouer({ mesure = null, installation = null, standalone = false, iosStandalone = false } = {}) {
  const attributs = {};
  const styles = [];
  const stockage = { 'kaislo-mesure': mesure, kaislo_installation: installation === null ? null : JSON.stringify(installation) };
  const env = {
    document: { documentElement: { setAttribute: (k, v) => { attributs[k] = v; } }, createElement: () => ({}), head: { appendChild: (e) => styles.push(e.textContent) } },
    localStorage: { getItem: (k) => stockage[k] ?? null },
    window: {}, matchMedia: () => ({ matches: standalone }), navigator: { standalone: iosStandalone },
  };
  env.window.matchMedia = env.matchMedia;
  new Function('document', 'localStorage', 'window', 'matchMedia', 'navigator', 'Date', SCRIPT_GARDE_BARRES)(env.document, env.localStorage, env.window, env.matchMedia, env.navigator, Date);
  Object.defineProperty(attributs, '__styles', { value: styles, enumerable: false });
  return attributs;
}

test('cookies : la barre est cachée seulement si le visiteur a répondu (oui ou non)', () => {
  assert.deepEqual(jouer(), {});
  assert.equal(jouer({ mesure: 'oui' })['data-mesure'], 'fait');
  assert.equal(jouer({ mesure: 'non' })['data-mesure'], 'fait');
  assert.equal(jouer({ mesure: 'peut-être' })['data-mesure'], undefined);
});

test('installation : première visite et appareil non installé, la barre reste', () => {
  assert.equal(jouer()['data-install'], undefined);
  assert.equal(jouer({ installation: {} })['data-install'], undefined);
});

test('installation : déjà installé ou ouvert comme une application, la barre est cachée', () => {
  assert.equal(jouer({ installation: { installe: true } })['data-install'], 'non');
  assert.equal(jouer({ standalone: true })['data-install'], 'non');
  assert.equal(jouer({ iosStandalone: true })['data-install'], 'non');
});

test('installation : le script suit exactement la règle de doitProposer (3 jours, 30 jours, jamais après 3 refus)', () => {
  const maintenant = Date.now();
  const cas = [
    { refus: 1, dernier: maintenant - 1 * JOUR }, { refus: 1, dernier: maintenant - 4 * JOUR },
    { refus: 2, dernier: maintenant - 10 * JOUR }, { refus: 2, dernier: maintenant - 31 * JOUR },
    { refus: 3, dernier: maintenant - 90 * JOUR }, { refus: 5, dernier: maintenant - 400 * JOUR },
    { refus: 0 }, { installe: true, refus: 1 },
  ];
  for (const etat of cas) {
    const attendu = doitProposer(etat, maintenant) ? undefined : 'non';
    assert.equal(jouer({ installation: etat })['data-install'], attendu, JSON.stringify(etat));
  }
});

test('un stockage illisible ne casse rien : les barres restent affichées', () => {
  const attributs = {};
  const doc = { documentElement: { setAttribute: (k, v) => { attributs[k] = v; } } };
  const lance = new Function('document', 'localStorage', 'window', 'matchMedia', 'navigator', 'Date', SCRIPT_GARDE_BARRES);
  lance(doc, { getItem: () => { throw new Error('bloqué'); } }, {}, () => ({ matches: false }), {}, Date);
  assert.deepEqual(attributs, {});
});

test('le script pose lui-même le style dans <head> (une seule fois), même quand rien ne doit être caché', () => {
  const a = jouer();
  assert.equal(a.__styles.length, 1);
  assert.equal(a.__styles[0], STYLE_GARDE_BARRES);
  assert.equal(jouer({ mesure: 'oui', installation: { installe: true } }).__styles.length, 1);
});

test('le style de garde cache la barre des cookies (déjà répondu), celle de l\'installation (installé ou refusé) et celle de l\'installation sur ordinateur', () => {
  assert.match(STYLE_GARDE_BARRES, /html\[data-mesure="fait"\] \.bandeau-mesure/);
  assert.match(STYLE_GARDE_BARRES, /html\[data-install="non"\] \.proposer-install/);
  assert.match(STYLE_GARDE_BARRES, /@media \(min-width:900px\),\(hover:hover\) and \(pointer:fine\)\{\.proposer-install\{display:none!important\}\}/);
});
