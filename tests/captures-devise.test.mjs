import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { captureDevise } from '../src/lib/captures-devise.js';

test('FCFA : la capture d\'origine', () => assert.equal(captureDevise('/captures/vente-ordi.webp', 'FCFA'), '/captures/vente-ordi.webp'));
test('autres devises : capture dédiée', () => {
  assert.equal(captureDevise('/captures/vente-ordi.webp', 'EUR'), '/captures/vente-ordi-eur.webp');
  assert.equal(captureDevise('/captures/vente-mobile.webp', 'MAD'), '/captures/vente-mobile-mad.webp');
});
test('vidéos et affiches : version dédiée', () => {
  assert.equal(captureDevise('/videos/demo-restaurant.mp4', 'EUR'), '/videos/demo-restaurant-eur.mp4');
  assert.equal(captureDevise('/videos/demo-restaurant.webp', 'GNF'), '/videos/demo-restaurant-gnf.webp');
});
test('image hors captures et vidéos : inchangée', () => assert.equal(captureDevise('/icons/a.webp', 'EUR'), '/icons/a.webp'));
test('chaque capture existe dans chaque devise', () => {
  const noms = fs.readdirSync('public/captures').filter((f) => f.endsWith('.webp') && !/-\d+\.webp$/.test(f) && !/-(mad|gnf|eur|cad|usd)\.webp$/.test(f));
  assert.ok(noms.length >= 9);
  for (const n of noms) for (const d of ['MAD', 'GNF', 'EUR', 'CAD', 'USD']) {
    assert.ok(fs.existsSync('public' + captureDevise('/captures/' + n, d)), `${n} en ${d}`);
  }
});
test('chaque vidéo existe dans chaque devise', () => {
  const noms = fs.readdirSync('public/videos').filter((f) => f.endsWith('.mp4') && !/-(mad|gnf|eur|cad|usd)\.mp4$/.test(f));
  assert.ok(noms.length >= 5);
  for (const n of noms) for (const d of ['MAD', 'GNF', 'EUR', 'CAD', 'USD']) {
    assert.ok(fs.existsSync('public' + captureDevise('/videos/' + n, d)), `${n} en ${d}`);
    assert.ok(fs.existsSync('public' + captureDevise('/videos/' + n.replace('.mp4', '.webp'), d)), `affiche ${n} en ${d}`);
  }
});
