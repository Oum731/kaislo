// Majuscules et minuscules des noms, numéros visiblement faux : mêmes résultats en JavaScript (application) et en PHP (serveur).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { nomPropre, nomPropreSiUniforme, numeroFactice, nomAvecLettres, majusculesPhrases } from '../src/lib/donnees/saisie.js';

const NOMS = [
  ['hassan', 'Hassan'], ['HASSAN BENALI', 'Hassan Benali'], ['  jean-pierre   d’AUBIGNÉ ', 'Jean-Pierre d’Aubigné'], ['marie-claire de la fontaine', 'Marie-Claire de la Fontaine'],
  ['de la croix', 'De la Croix'], ["o'brien", "O'Brien"], ['ÉPICERIE al baraka', 'Épicerie Al Baraka'], ['awa koné', 'Awa Koné'], ['saint-louis', 'Saint-Louis'], ['', ''],
];
const UNIFORMES = [['abidjan', 'Abidjan'], ['CASABLANCA', 'Casablanca'], ['iPhone Store', 'iPhone Store'], ['Épicerie du Coin', 'Épicerie du Coin'], ['bouaké', 'Bouaké'], ['  ', ''], ['épicerie AL BARAKA', 'Épicerie Al Baraka'], ['CHEZ awa', 'Chez Awa'], ['SOS Dépannage', 'SOS Dépannage'], ['KFC Express', 'KFC Express']];
const FACTICES = ['00000000', '0000000', '1111122', '111111111', '12345678', '1234567', '987654321', '1212121212', '123123123', '12341234', '0707070707', '600000000', '622222222'];
const REELS = ['612345601', '0612345601', '707123456', '77 158 42 63', '0145871236', '655234187', '698147253', '0712345601'].map((x) => x.replace(/\D/g, ''));

test('nomPropre et nomPropreSiUniforme', () => {
  for (const [entree, attendu] of NOMS) assert.equal(nomPropre(entree), attendu, entree);
  for (const [entree, attendu] of UNIFORMES) assert.equal(nomPropreSiUniforme(entree), attendu, entree);
});

test('numéros visiblement faux refusés, vrais numéros acceptés', () => {
  for (const f of FACTICES) assert.equal(numeroFactice(f), true, f);
  for (const r of REELS) assert.equal(numeroFactice(r), false, r);
  assert.equal(numeroFactice('12345'), false, 'trop court pour juger');
});

test('un nom contient au moins deux lettres', () => {
  assert.equal(nomAvecLettres('Awa'), true);
  assert.equal(nomAvecLettres('12345'), false);
  assert.equal(nomAvecLettres('?-'), false);
  assert.equal(nomAvecLettres('A'), false);
});

test('le serveur PHP donne les mêmes résultats que l’application', () => {
  const code = `require 'api/lib/saisie.php'; echo json_encode(['n' => array_map(fn($x) => nomPropre($x[0]), ${JSON.stringify(NOMS)}), 'u' => array_map(fn($x) => nomPropreSiUniforme($x[0]), ${JSON.stringify(UNIFORMES)}), 'f' => array_map('numeroFactice', ${JSON.stringify(FACTICES)}), 'r' => array_map('numeroFactice', ${JSON.stringify(REELS)})]);`;
  const r = JSON.parse(execFileSync('php', ['-r', code], { encoding: 'utf8' }));
  assert.deepEqual(r.n, NOMS.map((x) => x[1]));
  assert.deepEqual(r.u, UNIFORMES.map((x) => x[1]));
  assert.deepEqual(r.f, FACTICES.map(() => true));
  assert.deepEqual(r.r, REELS.map(() => false));
});

const PHRASES = [
  ['bonjour. avez-vous ce produit ? oui! merci', 'Bonjour. Avez-vous ce produit ? Oui! Merci'],
  ['premier point\ndeuxième point\n\n\n\ntroisième', 'Premier point\nDeuxième point\n\nTroisième'],
  ['voir www.kaislo.com et 3.5 kg. ok', 'Voir www.kaislo.com et 3.5 kg. Ok'],
  ['  été prêt… à midi  ', 'Été prêt… À midi'],
  ['déjà bien écrit. Gardé tel quel', 'Déjà bien écrit. Gardé tel quel'],
];

test('majusculesPhrases : majuscule après le point, retours à la ligne gardés, PHP identique', () => {
  for (const [entree, attendu] of PHRASES) assert.equal(majusculesPhrases(entree), attendu, entree);
  const code = `require 'api/lib/saisie.php'; echo json_encode(array_map(fn($x) => majusculesPhrases($x[0]), ${JSON.stringify(PHRASES)}));`;
  assert.deepEqual(JSON.parse(execFileSync('php', ['-r', code], { encoding: 'utf8' })), PHRASES.map((x) => x[1]));
});
