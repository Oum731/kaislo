import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GUIDES, MODELES } from '../src/lib/guides.js';

test('chaque modèle Excel existe en français et en anglais', () => {
  for (const [cle, m] of Object.entries(MODELES)) {
    for (const lang of ['fr', 'en']) assert.ok(fs.existsSync('public/modeles/' + m[lang].fichier), `${cle} (${lang}) : fichier manquant`);
  }
});

test('chaque guide pointe vers un modèle qui existe', () => {
  for (const g of GUIDES) assert.ok(MODELES[g.modele], `guide ${g.cle} : modèle « ${g.modele} » inconnu`);
});
