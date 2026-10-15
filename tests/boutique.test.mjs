// Boutique en ligne : panier du client, texte de la commande WhatsApp, reprise dans la caisse.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prixArticleBoutique, nomsOptions, cleLignePanier, totalPanier, nombreArticles, erreurOptions, messageCommande, lienCommandeWhatsApp, choixDepuisCommande } from '../src/lib/donnees/boutique.js';

const jus = { id: 'p1', nom: 'Jus', prix: 1000, promo: null, groupes: [
  { id: 'g1', nom: 'Taille', type: 'unique', obligatoire: true, options: [{ id: 'o1', nom: 'Petit', prix: 0 }, { id: 'o2', nom: 'Grand', prix: 500 }] },
  { id: 'g2', nom: 'Suppléments', type: 'multiple', obligatoire: false, options: [{ id: 'o3', nom: 'Glace', prix: 100 }] },
] };

test('prix de l\'article avec promo et options', () => {
  assert.equal(prixArticleBoutique(jus, ['o2', 'o3']), 1600);
  assert.equal(prixArticleBoutique({ ...jus, promo: 800 }, ['o1']), 800);
  assert.deepEqual(nomsOptions(jus, ['o3', 'o2']), ['Grand', 'Glace']);
});

test('même article et mêmes options : même ligne du panier', () => {
  assert.equal(cleLignePanier('p1', ['o3', 'o2']), cleLignePanier('p1', ['o2', 'o3']));
  assert.notEqual(cleLignePanier('p1', ['o2']), cleLignePanier('p1', ['o1']));
  const panier = [{ prixUnitaire: 1600, quantite: 2 }, { prixUnitaire: 500, quantite: 3 }];
  assert.equal(totalPanier(panier), 4700);
  assert.equal(nombreArticles(panier), 5);
});

test('les options obligatoires et uniques sont contrôlées', () => {
  assert.match(erreurOptions(jus, []), /Taille/);
  assert.match(erreurOptions(jus, ['o1', 'o2']), /Une seule/);
  assert.equal(erreurOptions(jus, ['o2']), null);
});

const commande = {
  numero: 7, boutique: 'Chez Awa', devise: 'FCFA', total: 4700, whatsapp: '2250712345603',
  lignes: [{ nom: 'Jus', options: ['Grand', 'Glace'], quantite: 2, total: 3200 }, { nom: 'Eau', options: [], quantite: 3, total: 1500 }],
  client: { nom: 'Koffi', telephone: '+225 07 01 02 03 04', adresse: 'Cocody Angré' }, note: 'Sans sucre',
};

test('le message WhatsApp reprend les articles, le total et les coordonnées du client', () => {
  const t = messageCommande(commande);
  assert.match(t, /commande n° 7/);
  assert.match(t, /2 × Jus \(Grand, Glace\)/);
  assert.match(t, /3 × Eau/);
  assert.match(t, /Total : 4[  ]700 FCFA/);
  assert.match(t, /Nom : Koffi/);
  assert.match(t, /Adresse : Cocody Angré/);
  assert.match(t, /Note : Sans sucre/);
  const lien = lienCommandeWhatsApp(commande);
  assert.ok(lien.startsWith('https://wa.me/2250712345603?text='));
  assert.equal(decodeURIComponent(lien.split('?text=')[1]), t);
});

test('les options d\'une commande reçue redeviennent le choix de la caisse', () => {
  assert.deepEqual(choixDepuisCommande(jus, ['o2', 'o3']), { g1: ['o2'], g2: ['o3'] });
  assert.deepEqual(choixDepuisCommande(jus, []), {});
});
