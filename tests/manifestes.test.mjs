// Chaque espace (commerces, équipe Amorac, commerciaux) a son manifeste : l'application installée depuis une page s'ouvre sur cette page.
// Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const lire = (nom) => JSON.parse(fs.readFileSync(`public/${nom}`, 'utf8'));

test('manifestes : chaque espace s\'ouvre sur sa propre page, dans son périmètre', () => {
  for (const [fichier, segment] of [['manifest.webmanifest', 'app'], ['manifest-admin.webmanifest', 'admin'], ['manifest-commercial.webmanifest', 'commercial']]) {
    const m = lire(fichier);
    assert.equal(m.start_url, `./${segment}/`, fichier);
    assert.equal(m.id, `./${segment}/`, fichier);
    assert.ok(m.start_url.startsWith(m.scope === './' ? './' : m.scope), `${fichier} : start_url hors du périmètre`);
    assert.equal(m.display, 'standalone');
    assert.ok(m.icons.some((i) => i.sizes === '512x512'), `${fichier} : icône 512`);
  }
  // Identifiants distincts : installer les trois applications est possible
  assert.equal(new Set(['manifest.webmanifest', 'manifest-admin.webmanifest', 'manifest-commercial.webmanifest'].map((f) => lire(f).id)).size, 3);
});

test('les pages /admin et /commercial pointent vers leur manifeste (site construit)', { skip: !fs.existsSync('out/admin/index.html') }, () => {
  const lien = (page) => /<link rel="manifest" href="([^"]*)"/.exec(fs.readFileSync(`out/${page}/index.html`, 'utf8'))?.[1];
  assert.match(lien('admin'), /manifest-admin\.webmanifest$/);
  assert.match(lien('commercial'), /manifest-commercial\.webmanifest$/);
  assert.match(lien('app'), /manifest\.webmanifest$/);
});
