// Images du site : chaque capture a ses versions réduites (fabriquées par « npm run images »), de la bonne largeur,
// et les adresses des images portent le numéro de publication pour pouvoir être gardées 1 an.
// Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

process.env.NEXT_PUBLIC_BUILD_ID = 'abc123'; // avant tout import de src/config.js (lu une fois)

const originaux = ['public/captures', 'public/videos'].flatMap((d) => fs.readdirSync(d).filter((f) => f.endsWith('.webp') && !/-\d+\.webp$/.test(f)).map((f) => path.join(d, f)));

test('chaque capture et chaque affiche a ses versions réduites, plus légères que l\'original', async () => {
  assert.ok(originaux.length >= 14);
  for (const f of originaux) {
    const meta = await sharp(f).metadata();
    const largeurs = meta.height > meta.width ? [390, 600] : [480, 800, 1200];
    for (const l of largeurs) {
      const v = f.replace(/\.webp$/, `-${l}.webp`);
      assert.ok(fs.existsSync(v), `${v} manque : lancer « npm run images »`);
      const m = await sharp(v).metadata();
      assert.equal(m.width, l, v);
      assert.ok(fs.statSync(v).size < fs.statSync(f).size, `${v} devrait être plus léger que l'original`);
    }
  }
});

test('le srcset décrit des largeurs justes (celles des fichiers)', async () => {
  const { jeuDeTailles } = await import('../src/lib/images-site.js');
  assert.equal(jeuDeTailles('/captures/vente-ordi.webp'), '/captures/vente-ordi-480.webp?v=abc123 480w, /captures/vente-ordi-800.webp?v=abc123 800w, /captures/vente-ordi-1200.webp?v=abc123 1200w, /captures/vente-ordi.webp?v=abc123 1440w');
  assert.equal(jeuDeTailles('/captures/vente-mobile.webp', { telephone: true }), '/captures/vente-mobile-390.webp?v=abc123 390w, /captures/vente-mobile-600.webp?v=abc123 600w, /captures/vente-mobile.webp?v=abc123 780w');
  assert.equal(jeuDeTailles('/videos/presentation-kaislo.webp').endsWith('/videos/presentation-kaislo.webp?v=abc123 1280w'), true);
  assert.equal(jeuDeTailles('/og-image.png'), undefined);
  for (const f of originaux) {
    const meta = await sharp(f).metadata();
    const attendu = f.includes('/videos/') && meta.width > meta.height ? 1280 : meta.width > meta.height ? 1440 : 780;
    assert.equal(meta.width, attendu, `${f} : largeur de l'original différente de celle déclarée dans le srcset`);
  }
});

test('adresses des images versionnées avec le numéro de publication', async () => {
  const { chemin } = await import('../src/config.js');
  assert.equal(chemin('/captures/vente-ordi.webp'), '/captures/vente-ordi.webp?v=abc123');
  assert.equal(chemin('/videos/demo-restaurant.mp4'), '/videos/demo-restaurant.mp4?v=abc123');
  assert.equal(chemin('/icons/icone.svg'), '/icons/icone.svg?v=abc123');
  // Pas versionnés : page, script, manifeste, image de partage, API
  for (const p of ['/tarifs/', '/sw.js', '/manifest.webmanifest', '/og-image.png', '/api/pays', '/demo/photo.webp']) assert.equal(chemin(p), p, p);
});

test('affiche d\'une vidéo : version réduite qui existe', async () => {
  const { afficheVideo } = await import('../src/lib/images-site.js');
  assert.equal(afficheVideo('/videos/presentation-kaislo.webp'), '/videos/presentation-kaislo-1200.webp');
  assert.equal(afficheVideo('/videos/demo-epicerie.webp', true), '/videos/demo-epicerie-600.webp');
  for (const f of ['public/videos/presentation-kaislo-1200.webp', 'public/videos/demo-epicerie-600.webp']) assert.ok(fs.existsSync(f), f);
});
