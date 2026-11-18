import test from 'node:test';
import assert from 'node:assert/strict';
import { validerMembre, normTel, fmtTel, slugify } from '../src/lib/validate.js';

const ok = { nom: 'Sela', prenoms: 'Franck Uriel', naissance_date: '1997-12-30', naissance_lieu: 'Duékoué', telephone: '+212 606-715828', urgence_tel: '+212 630-975395' };

test('téléphone normalisé et affiché comme sur la carte', () => {
  assert.equal(normTel('+212 606-715828'), '+212606715828');
  assert.equal(fmtTel('+212606715828'), '+212 606-715828');
});
test('un dossier complet est valide, la fonction reste « Membre » pour le public', () => {
  const r = validerMembre({ ...ok, fonction: 'Président' });
  assert.ok(r.ok); assert.equal(r.data.fonction, 'Membre'); assert.equal(r.data.quartier, '—');
});
test('l’admin peut choisir la fonction', () => assert.equal(validerMembre({ ...ok, fonction: 'Trésorier' }, { admin: true }).data.fonction, 'Trésorier'));
test('dates et champs invalides refusés', () => {
  assert.ok(validerMembre({ ...ok, naissance_date: '2999-01-01' }).erreurs.naissance_date);
  assert.ok(validerMembre({ ...ok, naissance_date: '1999-02-31' }).erreurs.naissance_date);
  assert.ok(validerMembre({ ...ok, telephone: '12' }).erreurs.telephone);
});
test('slug sans accents', () => assert.equal(slugify('Soirée culturelle ivoirienne !'), 'soiree-culturelle-ivoirienne'));
