import { test } from 'node:test';
import assert from 'node:assert/strict';
import { typeAppareil, estNavigateurIntegre, choisirParcours, doitProposer } from '../src/lib/installer-pwa.js';

const CHROME_ANDROID = 'Mozilla/5.0 (Linux; Android 13; SM-A135F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const SAMSUNG = 'Mozilla/5.0 (Linux; Android 13; SM-A135F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36';
const SAFARI_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const FACEBOOK_ANDROID = 'Mozilla/5.0 (Linux; Android 12; TECNO KG5; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/110.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/430.0.0.0;]';
const INSTAGRAM_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 300.0.0.0';
const BUREAU = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

test('installer : appareil et navigateur reconnus', () => {
  assert.equal(typeAppareil(CHROME_ANDROID), 'android');
  assert.equal(typeAppareil(SAFARI_IPHONE), 'ios');
  assert.equal(typeAppareil(BUREAU), 'autre');
  assert.equal(typeAppareil(BUREAU, 'MacIntel', 5), 'ios', 'iPad en mode « ordinateur »');
  assert.equal(estNavigateurIntegre(FACEBOOK_ANDROID), true);
  assert.equal(estNavigateurIntegre(INSTAGRAM_IPHONE), true);
  assert.equal(estNavigateurIntegre(CHROME_ANDROID), false);
  assert.equal(estNavigateurIntegre(SAFARI_IPHONE), false);
});

test('installer : le parcours le plus court selon l’appareil', () => {
  assert.equal(choisirParcours({ ua: CHROME_ANDROID, proposition: true }), 'bouton');
  assert.equal(choisirParcours({ ua: CHROME_ANDROID, proposition: false }), 'android-menu');
  assert.equal(choisirParcours({ ua: SAMSUNG, proposition: false }), 'android-menu');
  assert.equal(choisirParcours({ ua: SAFARI_IPHONE }), 'ios');
  assert.equal(choisirParcours({ ua: FACEBOOK_ANDROID, proposition: true }), 'ouvrir', 'la publicité Facebook ouvre un navigateur intégré');
  assert.equal(choisirParcours({ ua: INSTAGRAM_IPHONE }), 'ouvrir');
  assert.equal(choisirParcours({ ua: BUREAU, proposition: true }), null, 'rien à proposer sur ordinateur');
});

test('installer : première visite oui, puis de plus en plus rare, jamais après installation', () => {
  const t = Date.UTC(2026, 9, 23);
  assert.equal(doitProposer(null, t), true);
  assert.equal(doitProposer({ refus: 0 }, t), true);
  assert.equal(doitProposer({ refus: 1, dernier: t - 2 * 86400000 }, t), false, 'moins de 3 jours après le 1er « Plus tard »');
  assert.equal(doitProposer({ refus: 1, dernier: t - 3 * 86400000 }, t), true);
  assert.equal(doitProposer({ refus: 2, dernier: t - 10 * 86400000 }, t), false, '30 jours après le 2e');
  assert.equal(doitProposer({ refus: 2, dernier: t - 31 * 86400000 }, t), true);
  assert.equal(doitProposer({ refus: 3, dernier: 0 }, t), false);
  assert.equal(doitProposer({ refus: 0, installe: true }, t), false);
});
