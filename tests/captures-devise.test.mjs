import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { captureDevise } from '../src/lib/captures-devise.js';

test('FCFA : la capture d\'origine', () => assert.equal(captureDevise('/captures/vente-ordi.webp', 'FCFA'), '/captures/vente-ordi.webp'));
test('autres devises : capture dédiée', () => {
  assert.equal(captureDevise('/captures/vente-ordi.webp', 'EUR'), '/captures/vente-ordi-eur.webp');
  assert.equal(captureDevise('/captures/vente-mobile.webp', 'MAD'), '/captures/vente-mobile-mad.webp');
});
test('image hors captures : inchangée', () => assert.equal(captureDevise('/videos/a.webp', 'EUR'), '/videos/a.webp'));
test('chaque capture existe dans chaque devise', () => {
  const noms = fs.readdirSync('public/captures').filter((f) => f.endsWith('.webp') && !/-\d+\.webp$/.test(f) && !/-(mad|gnf|eur|cad|usd)\.webp$/.test(f));
  assert.ok(noms.length >= 9);
  for (const n of noms) for (const d of ['MAD', 'GNF', 'EUR', 'CAD', 'USD']) {
    assert.ok(fs.existsSync('public' + captureDevise('/captures/' + n, d)), `${n} en ${d}`);
  }
});
