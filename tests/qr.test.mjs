// Code QR créé dans l'appareil (src/lib/qr.js) : image SVG, différente pour chaque lien, sans service extérieur.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { qrDataUrl } from '../src/lib/qr.js';

const lien = (montant) => `https://pay.wave.com/m/M_ci_9JyOKoTX4xvQ/c/ci/?amount=${montant}`;

test('une image SVG, avec le texte codé dedans (un montant différent donne un code différent)', () => {
  const a = qrDataUrl(lien(13500));
  const b = qrDataUrl(lien(135000));
  assert.match(a, /^data:image\/svg\+xml;utf8,/);
  const svg = decodeURIComponent(a.replace('data:image/svg+xml;utf8,', ''));
  assert.match(svg, /^<svg /);
  assert.match(svg, /viewBox=/);
  assert.notEqual(a, b);
  assert.equal(qrDataUrl(lien(13500)), a); // même texte, même code
});

test('texte long ou accentué accepté (lien avec montant et paramètres)', () => {
  assert.match(qrDataUrl('https://pay.wave.com/m/M_ci_test/c/ci/?amount=135000&ref=KAISLO-123456&nom=Épicerie'), /^data:image\/svg/);
});
