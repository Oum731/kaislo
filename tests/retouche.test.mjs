import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyserFond, trouverArticle, cadrageCarre, corrigerCouleurs, retoucher, FOND_PROPRE } from '../src/lib/donnees/retouche.js';

// Image de test : fond uni (r,g,b) avec un rectangle d'une autre couleur
function image(w, h, fond, rect, couleur, bruit = 0) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const dans = rect && x >= rect.x && x < rect.x + rect.l && y >= rect.y && y < rect.y + rect.h;
    const c = dans ? couleur : fond;
    const b = bruit ? ((x * 7 + y * 13) % (2 * bruit + 1)) - bruit : 0;
    data[i] = c[0] + b; data[i + 1] = c[1] + b; data[i + 2] = c[2] + b; data[i + 3] = 255;
  }
  return { data, w, h };
}
const pixel = (img, x, y) => Array.from(img.data.slice((y * img.w + x) * 4, (y * img.w + x) * 4 + 3));

test('retouche : un fond uni est reconnu, un fond chargé non', () => {
  assert.equal(analyserFond(image(120, 90, [200, 190, 180])).uniforme, true);
  const chargé = image(120, 90, [200, 190, 180]);
  for (let i = 0; i < chargé.data.length; i += 4) chargé.data[i] = (i / 4) % 7 * 36; // rayures fortes
  assert.equal(analyserFond(chargé).uniforme, false);
});

test('retouche : l’article est trouvé et le carré se centre dessus', () => {
  const img = image(200, 150, [210, 205, 195], { x: 30, y: 40, l: 60, h: 60 }, [180, 40, 30]);
  const fond = analyserFond(img);
  const a = trouverArticle(img, fond.couleur);
  assert.deepEqual([a.x, a.y, a.l, a.h], [30, 40, 60, 60]);
  const c = cadrageCarre(200, 150, a);
  assert.ok(c.cote >= 60 && c.cote <= 150);
  assert.ok(c.x <= 30 && c.x + c.cote >= 90, 'le carré contient l’article en largeur');
  assert.ok(c.y <= 40 && c.y + c.cote >= 100, 'le carré contient l’article en hauteur');
  // Sans article trouvé : centre de la photo
  assert.deepEqual(cadrageCarre(200, 150, null), { x: 25, y: 0, cote: 150 });
});

test('retouche : une photo sombre est éclaircie, une photo claire n’est pas assombrie', () => {
  const sombre = image(60, 60, [40, 38, 36], { x: 10, y: 10, l: 30, h: 30 }, [90, 40, 30], 6);
  const r = corrigerCouleurs(sombre).img;
  assert.ok(pixel(r, 2, 2)[0] >= pixel(sombre, 2, 2)[0], 'fond plus clair ou égal');
  assert.ok(pixel(r, 20, 20)[0] > pixel(sombre, 20, 20)[0] + 20, 'l’article ressort nettement');
  const claire = image(60, 60, [235, 232, 228], { x: 10, y: 10, l: 30, h: 30 }, [200, 120, 90], 5);
  const rc = corrigerCouleurs(claire).img;
  assert.ok(pixel(rc, 2, 2)[0] >= 225, 'le fond clair reste clair');
});

test('retouche : fond uni → blanc cassé net, article intact', () => {
  const img = image(160, 120, [205, 198, 185], { x: 50, y: 30, l: 60, h: 60 }, [170, 40, 30], 3);
  const { img: sortie, infos } = retoucher(img);
  assert.equal(sortie.w, sortie.h, 'photo carrée');
  assert.equal(infos.recadre, true);
  assert.equal(infos.fondRemplace, true);
  const coin = pixel(sortie, 1, 1);
  for (let c = 0; c < 3; c++) assert.ok(Math.abs(coin[c] - FOND_PROPRE[c]) <= 6, `fond ${coin}`);
  const centre = pixel(sortie, Math.floor(sortie.w / 2), Math.floor(sortie.h / 2));
  assert.ok(centre[0] > centre[1] + 60, 'l’article rouge garde sa couleur');
});

test('retouche : fond chargé → recadrage au centre, aucun fond remplacé', () => {
  const img = image(160, 120, [200, 190, 180]);
  for (let i = 0; i < img.data.length; i += 4) { img.data[i] = (i / 4) % 5 * 50; img.data[i + 1] = (i / 4) % 3 * 80; }
  const { img: sortie, infos } = retoucher(img);
  assert.equal(sortie.w, 120);
  assert.equal(infos.recadre, false);
  assert.equal(infos.fondRemplace, false);
});
