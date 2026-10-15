import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { DONNEES_PAYS } from '../src/lib/donnees/liste-pays.js';
import { PAYS } from '../src/lib/donnees/modeles.js';
import { REGLES_TELEPHONE } from '../src/lib/donnees/telephone.js';
import { PAYS_SEO } from '../src/lib/pays-seo.js';
import { EN } from '../src/lib/guides-pays.js';
import { FORMULES } from '../src/lib/donnees/tarifs.js';

test('chaque pays de pays.json est complet et sa devise a des prix', () => {
  assert.equal(PAYS.length, DONNEES_PAYS.length);
  for (const p of DONNEES_PAYS) {
    assert.match(p.id, /^[A-Z]{2}$/);
    assert.ok(p.nom && p.devise && Array.isArray(p.paiements), p.id);
    assert.ok(FORMULES.every((f) => f.prix[p.devise] > 0), `prix manquants en ${p.devise} (${p.id})`);
    if (p.id === 'XX') continue;
    assert.ok(p.indicatif && p.ville, p.id);
    assert.ok(REGLES_TELEPHONE[p.id], `règles de téléphone de ${p.id}`);
    assert.ok(['en', 'au'].includes(p.article), `article de ${p.id}`);
    assert.ok(p.fuseaux?.length, `fuseau horaire de ${p.id}`);
    assert.ok(p.seo?.slug && p.seo.commerces.length, `page SEO de ${p.id}`);
    assert.ok(EN[p.id]?.nom && EN[p.id]?.slug, `nom anglais de ${p.id}`);
  }
  assert.equal(PAYS_SEO.length, DONNEES_PAYS.filter((p) => p.seo).length);
});

test('le serveur PHP lit la même liste de pays que le site', () => {
  const php = JSON.parse(execFileSync('php', ['-r', 'require "api/lib/outils.php"; require "api/lib/telephone.php"; echo json_encode(["pays" => PAYS, "tel" => REGLES_TELEPHONE]);']).toString());
  assert.deepEqual(php.pays, Object.fromEntries(DONNEES_PAYS.map((p) => [p.id, p.devise])));
  for (const [id, r] of Object.entries(REGLES_TELEPHONE)) {
    assert.deepEqual({ ...php.tel[id], zero: undefined }, { indicatif: r.indicatif, longueurs: r.longueurs, zero: undefined, groupes: r.groupes, exemple: r.exemple }, id);
    assert.equal(php.tel[id].zero, r.zeroNational, id);
  }
});
