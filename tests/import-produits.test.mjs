// Import d'articles depuis un tableur : colonnes, nombres, erreurs. Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lireNombre, reperer, analyserImport, lireCsv, normaliserTitre } from '../src/lib/donnees/import-produits.js';

test('nombres écrits par des personnes : milliers, décimales, monnaie', () => {
  assert.equal(lireNombre('1 500'), 1500);
  assert.equal(lireNombre('1 500'), 1500); // espace insécable
  assert.equal(lireNombre('1.500'), 1500);
  assert.equal(lireNombre('1.500,50'), 1500.5);
  assert.equal(lireNombre('1,500.50'), 1500.5);
  assert.equal(lireNombre('12,5'), 12.5);
  assert.equal(lireNombre('0,75'), 0.75);
  assert.equal(lireNombre('2 500 FCFA'), 2500);
  assert.equal(lireNombre('3500 F'), 3500);
  assert.equal(lireNombre(4200), 4200);
  assert.equal(lireNombre(''), null);
  assert.equal(lireNombre('abc'), null);
  assert.equal(lireNombre(null), null);
  assert.equal(lireNombre('-5'), -5);
});

test('titres de colonnes : accents, majuscules, anglais, apostrophes', () => {
  assert.equal(normaliserTitre('Prix d’achat'), 'prix d achat');
  assert.equal(normaliserTitre('  CATÉGORIE '), 'categorie');
  const r = reperer([['Name', 'Selling price', 'Purchase price', 'Category', 'Stock', 'Barcode', 'Notes']]);
  assert.deepEqual(r.colonnes, { nom: 0, prix: 1, prixAchat: 2, categorie: 3, stock: 4, codeBarre: 5 });
  assert.deepEqual(r.inconnues, ['Notes']);
  const f = reperer([['Désignation', 'PV', 'Famille', 'Qté']]);
  assert.deepEqual(f.colonnes, { nom: 0, prix: 1, categorie: 2, stock: 3 });
});

test('la ligne de titres peut être précédée de lignes de présentation', () => {
  const r = reperer([['Liste de mes articles'], [], ['Article', 'Prix']]);
  assert.equal(r.entete, 2);
  assert.equal(reperer([['Foo', 'Bar']]), null);
  assert.equal(reperer([['Nom', 'Couleur']]), null, 'sans colonne prix : refusé');
});

test('analyse : nouveaux, déjà présents, erreurs, doublons du fichier', () => {
  const lignes = [
    ['Nom', 'Prix de vente', 'Prix d’achat', 'Catégorie', 'Stock', 'Code-barres', 'Prix promo'],
    ['Riz 5 kg', '5 000', '4 200', 'Épicerie', 24, 6111252421012, ''],
    ['Eau 1,5 L', 500, 350, 'Boissons', '', '', ''],
    ['Savon', 'gratuit', '', '', '', '', ''],   // prix illisible
    ['', 100, '', '', '', '', ''],              // sans nom
    ['riz 5 KG', 5200, '', '', '', '', ''],     // doublon dans le fichier (même nom, casse différente)
    ['Huile 1L', 1500, '', 'Épicerie', 10, '', 2000], // promo plus chère : ignorée
    ['Sucre', -3, '', '', '', '', ''],
    [],
  ];
  const r = analyserImport(lignes, [{ id: 'p1', nom: 'eau 1,5 l' }], 'pièce');
  assert.equal(r.articles.length, 3);
  const [riz, eau, huile] = r.articles;
  assert.deepEqual([riz.nom, riz.prix, riz.prixAchat, riz.categorie, riz.stock, riz.codeBarre, riz.etat], ['Riz 5 kg', 5000, 4200, 'Épicerie', 24, '6111252421012', 'nouveau']);
  assert.equal(eau.etat, 'existant');
  assert.equal(eau.ancienId, 'p1');
  assert.equal(eau.stock, null);
  assert.equal(huile.promo, null);
  assert.equal(r.erreurs.length, 4);
  assert.deepEqual(r.erreurs.map((e) => [e.ligne, e.raison]), [[4, 'prix'], [5, 'nom'], [6, 'doublon'], [8, 'prixNegatif']]);
});

test('CSV : point-virgule, virgule, tabulation, guillemets, BOM', () => {
  assert.deepEqual(lireCsv('Nom;Prix\nRiz;5000\n'), [['Nom', 'Prix'], ['Riz', '5000']]);
  assert.deepEqual(lireCsv('Nom,Prix\r\n"Riz, 5 kg",5000'), [['Nom', 'Prix'], ['Riz, 5 kg', '5000']]);
  assert.deepEqual(lireCsv('Nom\tPrix\nRiz\t5000'), [['Nom', 'Prix'], ['Riz', '5000']]);
  assert.deepEqual(lireCsv('﻿Nom;Prix\n"Le ""bon"" riz";1'), [['Nom', 'Prix'], ['Le "bon" riz', '1']]);
  const r = analyserImport(lireCsv('Nom;Prix;Stock\nRiz;5 000;3\nEau;500;'), [], 'pièce');
  assert.equal(r.articles.length, 2);
  assert.equal(r.articles[0].stock, 3);
  assert.equal(r.articles[1].stock, null);
});

test('fichier de plus de 2 000 lignes : lu en partie et signalé', () => {
  const lignes = [['Nom', 'Prix']];
  for (let i = 0; i < 2100; i++) lignes.push(['Article ' + i, i + 1]);
  const r = analyserImport(lignes, [], 'pièce');
  assert.equal(r.articles.length, 2000);
  assert.equal(r.trop, true);
});

test('vrai fichier Excel : le modèle fabriqué se relit et donne ses articles d’exemple', async () => {
  const { octetsModeleImport, lireTableur } = await import('../src/lib/import/lire-tableur.js');
  const octets = await octetsModeleImport({
    feuille: 'Articles', feuilleAide: 'Aide',
    colonnes: [{ cle: 'nom', titre: 'Nom', largeur: 20 }, { cle: 'prix', titre: 'Prix de vente', largeur: 12 }, { cle: 'stock', titre: 'Stock', largeur: 8 }, { cle: 'cat', titre: 'Catégorie', largeur: 12 }],
    exemples: [['Riz', 5000, 24, 'Épicerie'], ['Eau', 500, '', 'Boissons']],
    aide: ['Aide'],
  });
  const fichier = new File([octets], 'modele.xlsx');
  const lignes = await lireTableur(fichier);
  const r = analyserImport(lignes, [], 'pièce');
  assert.deepEqual(r.articles.map((a) => [a.nom, a.prix, a.stock, a.categorie]), [['Riz', 5000, 24, 'Épicerie'], ['Eau', 500, null, 'Boissons']]);
  await assert.rejects(lireTableur(new File(['x'], 'ancien.xls')), { code: 'format' });
  await assert.rejects(lireTableur(new File(['pas un classeur'], 'faux.xlsx')), { code: 'illisible' });
  await assert.rejects(lireTableur(new File([''], 'vide.csv')), { code: 'vide' });
});
