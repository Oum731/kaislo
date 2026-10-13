// Bonus hebdomadaire des commerciaux : clients démarrés dans la semaine (3 articles + 1 vente), règles modifiables.
// Lancer : npm test (PHP 8.1 ou plus doit être installé)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 5190 + (process.pid % 200);
const U = `http://127.0.0.1:${PORT}/api`;
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'kaislo-bonus-'));
const fichierEnv = path.join(dossier, '.env');
let serveur, admin, commercial, jetonCommercial;

async function api(methode, chemin, corps, jeton) {
  const r = await fetch(U + chemin, {
    method: methode,
    headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: 'Bearer ' + jeton } : {}) },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  return { statut: r.status, ...(await r.json()) };
}


before(async () => {
  fs.writeFileSync(fichierEnv, `DbDriver=sqlite\nDbFichier=${path.join(dossier, 't.sqlite')}\nCleAdmin=cle-de-test-0123456789\n`);
  serveur = spawn('php', ['-S', `127.0.0.1:${PORT}`, 'api/index.php'], { env: { ...process.env, KAISLO_ENV_FICHIER: fichierEnv }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await api('GET', '/sante')).ok) break; } catch { /* le serveur démarre */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  admin = (await api('POST', '/admin/installer', { cle: 'cle-de-test-0123456789', nom: 'Équipe', email: 'equipe@kaislo.test', motDePasse: 'MotDePasse2026' })).jeton;
  const r = await api('POST', '/admin/commercial', { nom: 'Awa Commercial', telephone: '0712349900', pays: 'CI', taux: 25, actif: true, pin: '123456' }, admin);
  assert.equal(r.ok, true, JSON.stringify(r));
  commercial = (await api('GET', '/admin/commerciaux', null, admin)).commerciaux[0];
  jetonCommercial = (await api('POST', '/commercial/connexion', { telephone: '0712349900', pays: 'CI', pin: '123456' })).jeton;
});

after(() => { serveur?.kill(); fs.rmSync(dossier, { recursive: true, force: true }); });

const inscrire = (nom, tel) => api('POST', '/inscription', {
  commerce: { nom, type: 'epicerie', pays: 'CI', ville: 'Abidjan', quartier: 'Cocody', telephone: tel }, gerant: { nom: 'Gérant ' + nom, telephone: tel, pin: '1234' }, conditionsAcceptees: true, codeParrain: commercial.code,
});
const maintenant = () => new Date().toISOString();
const demarrer = async (c, articles = 3, ventes = 1) => {
  const elements = [];
  for (let i = 0; i < articles; i++) elements.push({ type: 'produits', id: 'p' + i, contenu: { id: 'p' + i, nom: 'Article ' + i, prix: 500 }, modifieLe: maintenant() });
  for (let i = 0; i < ventes; i++) elements.push({ type: 'ventes', id: 'v' + i, contenu: { id: 'v' + i, date: maintenant(), lignes: [{ quantite: 2, prixUnitaire: 500, total: 1000 }], sousTotal: 1000, total: 1000 }, modifieLe: maintenant() });
  const r = await api('POST', '/donnees', { elements }, c.jeton);
  assert.deepEqual(r.refuses, [], JSON.stringify(r));
  return r;
};
const semaines = async () => (await api('GET', '/commercial/moi', null, jetonCommercial)).bonusHebdo;

test('seuls les clients démarrés comptent pour le bonus de la semaine', async () => {
  const clients = [];
  for (let i = 0; i < 5; i++) clients.push(await inscrire('Boutique ' + i, '07123450' + String(10 + i)));
  for (const c of clients) assert.equal(c.statut, 201, JSON.stringify(c));
  let s = (await semaines())[0];
  assert.equal(s.inscrits, 5);
  assert.equal(s.clients, 0);
  assert.equal(s.montant, 10000);
  assert.equal(s.devise, 'FCFA');
  // 4 clients démarrés (3 articles + 1 vente), le 5e n'a que 2 articles : le seuil de 5 n'est pas atteint
  for (const c of clients.slice(0, 4)) assert.equal((await demarrer(c)).ok, true);
  assert.equal((await demarrer(clients[4], 2)).ok, true);
  s = (await semaines())[0];
  assert.equal(s.clients, 4);
  assert.equal(s.atteint, false);
  // le 5e complète ses articles et fait une vente
  await demarrer(clients[4], 3);
  s = (await semaines())[0];
  assert.equal(s.clients, 5);
  assert.equal(s.atteint, true);
  // La semaine en cours n'est pas encore payable
  assert.equal(s.terminee, false);
  assert.equal(s.payable, false);
  const trop = await api('POST', '/admin/commissions', { action: 'bonus', commercialId: commercial.id, semaine: s.semaine }, admin);
  assert.equal(trop.statut, 400);
});

test('règles du bonus modifiables et vues par l\'équipe', async () => {
  const f = await api('GET', '/admin/commercial?id=' + commercial.id, null, admin);
  assert.equal(f.bonusHebdo.length, 8);
  const r = await api('POST', '/admin/programme', { taux: 25, dureeMois: 12, moisValidation: 6, primes: [], bonusHebdo: { clients: 3, montant: { FCFA: 12000, MAD: 0 } } }, admin);
  assert.equal(r.ok, true);
  const s = (await semaines())[0];
  assert.equal(s.requis, 3);
  assert.equal(s.montant, 12000);
});

test('le bonus d\'une semaine terminée se verse une seule fois', async () => {
  // On recule de 8 jours l'inscription des clients et leurs ventes : ils tombent dans la semaine précédente
  const { DatabaseSync } = await import('node:sqlite');
  const bd = new DatabaseSync(path.join(dossier, 't.sqlite'));
  const recule = (iso) => new Date(new Date(iso).getTime() - 8 * 86400000).toISOString();
  for (const c of bd.prepare('SELECT id, cree_le FROM commerces').all()) bd.prepare('UPDATE commerces SET cree_le = ? WHERE id = ?').run(recule(c.cree_le), c.id);
  for (const e of bd.prepare("SELECT commerce_id, id, contenu FROM elements WHERE type = 'ventes'").all()) {
    const v = JSON.parse(e.contenu); v.date = recule(v.date);
    bd.prepare("UPDATE elements SET contenu = ? WHERE commerce_id = ? AND type = 'ventes' AND id = ?").run(JSON.stringify(v), e.commerce_id, e.id);
  }
  bd.close();
  const passee = (await semaines())[1];
  assert.equal(passee.clients, 5);
  assert.equal(passee.terminee, true);
  assert.equal(passee.payable, true);
  const r = await api('POST', '/admin/commissions', { action: 'bonus', commercialId: commercial.id, semaine: passee.semaine, moyen: 'Wave' }, admin);
  assert.equal(r.ok, true, JSON.stringify(r));
  const apres = (await semaines())[1];
  assert.equal(apres.payable, false);
  assert.ok(apres.payeLe);
  assert.equal((await api('POST', '/admin/commissions', { action: 'bonus', commercialId: commercial.id, semaine: passee.semaine }, admin)).statut, 400);
});

test('contrat du commercial : mis à disposition après validation, accepté par le commercial', async () => {
  // Compte en attente : pas de contrat
  const ins = await api('POST', '/commercial/inscription', { nom: 'Koffi Contrat', telephone: '0712349911', pays: 'CI', ville: 'Abidjan', quartier: 'Marcory', pin: '654321', conditionsAcceptees: true });
  assert.equal(ins.statut, 201, JSON.stringify(ins));
  const liste = (await api('GET', '/admin/commerciaux', null, admin)).commerciaux;
  const k = liste.find((c) => c.nom === 'Koffi Contrat');
  assert.equal((await api('POST', '/admin/commercial-contrat', { id: k.id }, admin)).statut, 400);
  assert.equal((await api('POST', '/admin/commercial-validation', { id: k.id, action: 'valider' }, admin)).ok, true);
  const conn = await api('POST', '/commercial/connexion', { telephone: '0712349911', pays: 'CI', pin: '654321' });
  assert.equal((await api('GET', '/commercial/moi', null, conn.jeton)).contrat, null);
  assert.equal((await api('POST', '/commercial/contrat-accepter', null, conn.jeton)).statut, 400);
  // L'équipe met le contrat à disposition : numéro, règles figées
  const m = await api('POST', '/admin/commercial-contrat', { id: k.id }, admin);
  assert.equal(m.ok, true, JSON.stringify(m));
  assert.match(m.contrat.numero, /^KC-\d{4}-\d{4}$/);
  assert.equal(m.contrat.conditions.taux, 25);
  assert.equal(m.contrat.accepteLe, null);
  const vu = (await api('GET', '/commercial/moi', null, conn.jeton)).contrat;
  assert.equal(vu.numero, m.contrat.numero);
  // Le commercial accepte ; ensuite l'équipe ne peut plus le changer
  const ok = await api('POST', '/commercial/contrat-accepter', null, conn.jeton);
  assert.equal(ok.ok, true);
  assert.ok(ok.contrat.accepteLe);
  assert.equal((await api('POST', '/admin/commercial-contrat', { id: k.id }, admin)).statut, 400);
  const fiche = await api('GET', '/admin/commercial?id=' + k.id, null, admin);
  assert.ok(fiche.contrat.accepteLe);
  assert.ok(fiche.commercial.contratAccepteLe);
});
