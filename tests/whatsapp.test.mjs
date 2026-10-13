// Textes WhatsApp : résumé du soir pour le gérant, signature « Fait avec Kaislo » sur les messages aux clients. Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resumeJourneeTexte, signatureKaislo, lienWhatsApp } from '../src/lib/donnees/whatsapp.js';
import { ticketEnTexteWhatsApp } from '../src/lib/impression/ticket.js';
import { lienRappelWhatsApp } from '../src/lib/donnees/credit.js';

const prix = (n) => Number(n).toLocaleString('fr-FR').replace(/ | /g, ' ') + ' FCFA';
const cloture = {
  totalVentes: 76965, nbVentes: 15, nbAnnulees: 1, depensesCaisse: 5000, attendu: 40000, compte: 39500, ecart: -500,
  parPaiement: [{ mode: 'Espèces', total: 50000, nb: 10 }, { mode: 'Wave', total: 26965, nb: 5 }, { mode: 'Carte', total: 0, nb: 0 }],
  parArticle: [{ nom: 'Attiéké', quantite: 12 }, { nom: 'Bissap', quantite: 9 }, { nom: 'Poulet', quantite: 7 }, { nom: 'Alloco', quantite: 2 }],
};
const commerce = { nom: 'Chez Awa', pays: 'CI' };

test('résumé du soir : ventes, modes de paiement, plus vendus, caisse et crédits', () => {
  const t = resumeJourneeTexte({ cloture, commerce, creditTotal: 77500, prix, date: 'jeudi 9 octobre' });
  assert.match(t, /Chez Awa/);
  assert.match(t, /76 965 FCFA\* \(15 tickets\)/);
  assert.match(t, /Panier moyen : 5 131 FCFA/);
  assert.match(t, /Espèces : 50 000 FCFA \(10\)/);
  assert.doesNotMatch(t, /Carte/, 'un mode sans vente n\'apparaît pas');
  assert.match(t, /Attiéké \(12\), Bissap \(9\), Poulet \(7\)/);
  assert.doesNotMatch(t, /Alloco/, 'seulement les 3 plus vendus');
  assert.match(t, /Écart de caisse : -500 FCFA/);
  assert.match(t, /Crédits à récupérer : 77 500 FCFA/);
  assert.match(t, /Ventes annulées : 1/);
});

test('résumé du soir : caisse juste, sans crédit ni dépense', () => {
  const t = resumeJourneeTexte({ cloture: { ...cloture, ecart: 0, depensesCaisse: 0, nbAnnulees: 0 }, commerce, creditTotal: 0, prix, date: 'x' });
  assert.match(t, /Caisse juste/);
  assert.doesNotMatch(t, /Crédits|Dépenses|annulées/);
});

test('signature : ajoutée au reçu et au rappel de crédit seulement si on la demande', () => {
  const lignes = [{ texte: 'TOTAL  1 000' }];
  assert.ok(ticketEnTexteWhatsApp(lignes, commerce, signatureKaislo()).endsWith('_Fait avec Kaislo · kaislo.com_'));
  assert.ok(!ticketEnTexteWhatsApp(lignes, commerce).includes('Fait avec Kaislo'));
  const lien = decodeURIComponent(lienRappelWhatsApp({ nom: 'Mme K', telephone: '0707123456' }, 5000, commerce, '5 000 FCFA', signatureKaislo()));
  assert.match(lien, /Fait avec Kaislo · kaislo\.com/);
  assert.ok(!decodeURIComponent(lienRappelWhatsApp({ nom: 'Mme K', telephone: '0707123456' }, 5000, commerce, '5 000 FCFA')).includes('Fait avec'));
});

test('lien WhatsApp : numéro international et texte encodé', () => {
  const l = lienWhatsApp('07 07 12 34 56', 'CI', 'Bonjour *test*');
  assert.match(l, /^https:\/\/wa\.me\/2250707123456\?text=Bonjour%20\*test\*$/);
});
