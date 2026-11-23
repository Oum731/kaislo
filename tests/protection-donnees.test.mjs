// Lois et autorités de protection des données par pays : les pays vérifiés sont présents, chaque entrée est complète
// Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PROTECTION_DONNEES } from '../src/lib/donnees/protection-donnees.js';

test('Maroc, Côte d’Ivoire, Sénégal, Burkina Faso, Congo, France et Belgique sont renseignés, avec loi et autorité', () => {
  const pays = PROTECTION_DONNEES.map((p) => p.pays);
  for (const p of ['Maroc', 'Côte d’Ivoire', 'Sénégal', 'Burkina Faso', 'Congo (Brazzaville)', 'France', 'Belgique']) assert.ok(pays.includes(p), p);
  for (const p of PROTECTION_DONNEES) {
    assert.ok(p.loi.length > 10 && p.autorite.length > 3, p.pays);
    if (p.site) assert.match(p.site, /^https:\/\/www\./, p.pays);
  }
  assert.equal(new Set(pays).size, pays.length);
});

test('la page Confidentialité affiche la table des pays et les conditions de vente des boutiques sont reliées au pied de page et à la commande', () => {
  assert.match(fs.readFileSync('src/app/(fr)/confidentialite/page.js', 'utf8'), /PROTECTION_DONNEES/);
  assert.match(fs.readFileSync('src/components/site/Site.jsx', 'utf8'), /\/conditions-vente-boutiques\//);
  const boutique = fs.readFileSync('src/components/site/Boutique.jsx', 'utf8');
  assert.match(boutique, /conditions-vente-boutiques/);
  assert.match(boutique, /if \(!accepte\)/); // la commande exige la case cochée
});
