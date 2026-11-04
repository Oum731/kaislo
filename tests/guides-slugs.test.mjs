// Le fichier léger des adresses de guides (src/lib/guides-slugs.json) doit refléter exactement la liste des guides. Lancer : npm test
// S'il est périmé : npm run guides-slugs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GUIDES } from '../src/lib/guides.js';

test('guides-slugs.json est à jour : une paire (français, anglais) par guide, dans le même ordre', () => {
  const fichier = JSON.parse(fs.readFileSync(new URL('../src/lib/guides-slugs.json', import.meta.url), 'utf8'));
  assert.deepEqual(fichier, GUIDES.map((g) => [g.fr.slug, g.en.slug]), 'fichier périmé : lancez « npm run guides-slugs » puis enregistrez le résultat');
});

test('chaque adresse de guide est unique dans sa langue', () => {
  const fichier = JSON.parse(fs.readFileSync(new URL('../src/lib/guides-slugs.json', import.meta.url), 'utf8'));
  assert.equal(new Set(fichier.map((p) => p[0])).size, fichier.length);
  assert.equal(new Set(fichier.map((p) => p[1])).size, fichier.length);
});
