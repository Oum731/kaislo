// Tests des factures d'abonnement (Amorac → abonnés) : une par paiement, numéros sans trou, TVA selon le pays, droits, paiements anciens.
// Lancer : npm test (PHP 8.1 ou plus doit être installé)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { portLibre } from './port-libre.mjs';

const PORT = await portLibre();
const U = `http://127.0.0.1:${PORT}/api`;
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'kaislo-factures-'));
const fichierBase = path.join(dossier, 'test.sqlite');
const fichierEnv = path.join(dossier, '.env');
let serveur, admin, support, maroc, ivoire;
const annee = new Date().getUTCFullYear();

async function api(methode, chemin, corps, jeton) {
  const r = await fetch(U + chemin, {
    method: methode,
    headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: 'Bearer ' + jeton } : {}) },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  return { statut: r.status, ...(await r.json()) };
}
const sql = (requete) => execFileSync('php', ['-r', `$p = new PDO('sqlite:${fichierBase}'); $p->exec(${JSON.stringify(requete)});`]);
const inscrire = (nom, tel, pays, ville) => api('POST', '/inscription', {
  commerce: { nom, type: 'epicerie', pays, ville, quartier: 'Centre', telephone: tel },
  gerant: { nom: 'Gérant ' + nom, telephone: tel.replace(/.$/, '9'), pin: '1234' }, conditionsAcceptees: true,
});
const payer = (commerce, montant, extra = {}) => api('POST', '/admin/paiement', { commerceId: commerce.commerce.id, mois: 1, postes: 1, montant, moyen: 'Virement', ...extra }, admin);

before(async () => {
  fs.writeFileSync(fichierEnv, `DbDriver=sqlite\nDbFichier=${fichierBase}\nCleAdmin=cle-de-test-0123456789\n`);
  serveur = spawn('php', ['-S', `127.0.0.1:${PORT}`, 'api/index.php'], { env: { ...process.env, KAISLO_ENV_FICHIER: fichierEnv }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await api('GET', '/sante')).ok) break; } catch { /* le serveur démarre */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  maroc = await inscrire('Épicerie Awa', '0612345701', 'MA', 'Casablanca');
  ivoire = await inscrire('Boutique Bako', '0712345711', 'CI', 'Abidjan');
  assert.equal(maroc.ok && ivoire.ok, true, JSON.stringify([maroc, ivoire]));
  const install = await api('POST', '/admin/installer', { cle: 'cle-de-test-0123456789', nom: 'Équipe', email: 'equipe@kaislo.test', motDePasse: 'MotDePasse2026' });
  assert.equal(install.ok, true, JSON.stringify(install));
  admin = install.jeton;
  assert.equal((await api('POST', '/admin/equipe', { nom: 'Aide', email: 'aide@kaislo.test', role: 'support', motDePasse: 'MotDePasse2026' }, admin)).ok, true);
  support = (await api('POST', '/admin/connexion', { email: 'aide@kaislo.test', motDePasse: 'MotDePasse2026' })).jeton;
});

after(() => { serveur?.kill(); fs.rmSync(dossier, { recursive: true, force: true }); });

test('un paiement crée sa facture : numéro, TVA comprise au Maroc, mention d’exportation ailleurs', async () => {
  const a = await payer(maroc, 1200);
  assert.equal(a.ok, true, JSON.stringify(a));
  const b = await payer(ivoire, 15000);
  assert.equal(b.ok, true, JSON.stringify(b));
  const l = await api('GET', '/admin/factures', null, admin);
  assert.deepEqual(l.factures.map((f) => f.numero).sort(), [`FAC-${annee}-0001`, `FAC-${annee}-0002`]);
  const fm = l.factures.find((f) => f.commerceId === maroc.commerce.id);
  assert.deepEqual([fm.totalHt, fm.tva, fm.totalTtc, fm.tvaTaux, fm.devise], [1000, 200, 1200, 20, 'MAD']);
  assert.equal(fm.mentionTva, '');
  assert.equal(fm.client.nom, 'Épicerie Awa');
  assert.equal(fm.client.pays, 'Maroc');
  assert.equal(fm.emetteur.identifiants.ICE, '003786356000083');
  assert.match(fm.lignes[0].designation, /Abonnement Kaislo/);
  assert.ok(fm.periode.au > fm.periode.du);
  const fc = l.factures.find((f) => f.commerceId === ivoire.commerce.id);
  assert.deepEqual([fc.totalHt, fc.tva, fc.totalTtc, fc.tvaTaux, fc.devise], [15000, 0, 15000, 0, 'FCFA']);
  assert.match(fc.mentionTva, /exportation de services/);
  assert.equal(fc.client.pays, 'Côte d’Ivoire');
});

test('numéros sans trou et sans doublon, une facture par paiement', async () => {
  const c = await payer(maroc, 1200);
  assert.equal(c.ok, true);
  const noms = (await api('GET', '/admin/factures', null, admin)).factures.map((f) => f.numero).sort();
  assert.deepEqual(noms, [`FAC-${annee}-0001`, `FAC-${annee}-0002`, `FAC-${annee}-0003`]);
  // Le détail des paiements indique le numéro de facture
  const fiche = await api('GET', '/admin/commerces', null, admin);
  const m = fiche.commerces.find((x) => x.commerce.id === maroc.commerce.id);
  assert.ok(m.commerce.abonnement.paiements.every((p) => /^FAC-/.test(p.facture)));
});

test('un gérant ne voit que ses factures ; le support lit mais ne crée pas', async () => {
  const deMaroc = await api('GET', '/factures', null, maroc.jeton);
  assert.equal(deMaroc.factures.length, 2);
  assert.ok(deMaroc.factures.every((f) => f.commerceId === maroc.commerce.id));
  assert.equal((await api('GET', '/factures', null, ivoire.jeton)).factures.length, 1);
  assert.equal((await api('GET', '/factures')).statut, 401);
  assert.equal((await api('GET', '/admin/factures', null, maroc.jeton)).statut, 401);
  assert.equal((await api('GET', '/admin/factures', null, support)).ok, true);
  assert.equal((await api('POST', '/admin/facture', { paiementId: 'x' }, support)).statut, 403);
  const filtre = await api('GET', `/admin/factures?commerceId=${ivoire.commerce.id}`, null, admin);
  assert.equal(filtre.factures.length, 1);
});

test('paiement d’avant les factures : la facture se crée à la demande, une seule fois, avec le numéro suivant', async () => {
  const fiche = await api('GET', '/admin/commerces', null, admin);
  const p = fiche.commerces.find((x) => x.commerce.id === ivoire.commerce.id).commerce.abonnement.paiements[0];
  sql(`DELETE FROM factures WHERE paiement_id = '${p.id}'`);
  const premiere = await api('POST', '/admin/facture', { paiementId: p.id }, admin);
  assert.equal(premiere.statut, 201, JSON.stringify(premiere));
  assert.equal(premiere.facture.numero, `FAC-${annee}-0004`); // suite après le plus grand numéro déjà émis
  const seconde = await api('POST', '/admin/facture', { paiementId: p.id }, admin);
  assert.equal(seconde.statut, 200);
  assert.equal(seconde.facture.numero, premiere.facture.numero);
  assert.equal((await api('POST', '/admin/facture', { paiementId: 'inconnu' }, admin)).statut, 404);
});

test('l’émetteur de la facture est celui de src/config.js', () => {
  const config = fs.readFileSync('src/config.js', 'utf8');
  for (const v of ['690767', '003786356000083', '68391830', '34215251', '5 Rue Annoussour, RDC, 20250 Casablanca, Maroc']) assert.ok(config.includes(v), v);
  assert.doesNotMatch(config, /formeJuridique: '[^']/); // le capital n'est affiché nulle part
});
