// Tests des achats et fournisseurs côté serveur : réservés au gérant (un vendeur ne peut ni les écrire ni les modifier).
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
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'kaislo-achats-'));
const fichierBase = path.join(dossier, 'test.sqlite');
const fichierEnv = path.join(dossier, '.env');
let serveur;

async function api(methode, chemin, corps, jeton) {
  const r = await fetch(U + chemin, {
    method: methode,
    headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: 'Bearer ' + jeton } : {}) },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  return { statut: r.status, ...(await r.json()) };
}

const maintenant = () => new Date().toISOString();
const sql = (requete) => execFileSync('php', ['-r', `$p = new PDO('sqlite:${fichierBase}'); $p->exec(${JSON.stringify(requete)});`]);
const lire = (requete) => Number(execFileSync('php', ['-r', `$p = new PDO('sqlite:${fichierBase}'); echo $p->query(${JSON.stringify(requete)})->fetchColumn();`]).toString());
const envoyer = (jeton, elements) => api('POST', '/donnees', { elements }, jeton);
const element = (type, id, contenu) => ({ type, id, contenu, modifieLe: maintenant() });


let gerant, vendeur, idVendeur;

before(async () => {
  fs.writeFileSync(fichierEnv, `DbDriver=sqlite\nDbFichier=${fichierBase}\nCleAdmin=cle-de-test-0123456789\n`);
  serveur = spawn('php', ['-S', `127.0.0.1:${PORT}`, 'api/index.php'], { env: { ...process.env, KAISLO_ENV_FICHIER: fichierEnv }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await api('GET', '/sante')).ok) break; } catch { /* le serveur démarre */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  const ins = await api('POST', '/inscription', {
    commerce: { nom: 'Chez Retour', type: 'epicerie', pays: 'CI', ville: 'Abidjan', quartier: 'Cocody', telephone: '0712345611' },
    gerant: { nom: 'Gérant Test', telephone: '0712345612', pin: '1234' }, conditionsAcceptees: true,
  });
  assert.equal(ins.ok, true, JSON.stringify(ins));
  gerant = ins.jeton;
  const cree = await api('POST', '/utilisateurs', { nom: 'Awa', telephone: '0712345613', pin: '5678', actif: true }, gerant);
  assert.equal(cree.ok, true, JSON.stringify(cree));
  idVendeur = cree.id;
  const conn = await api('POST', '/connexion', { telephone: '0712345613', pays: 'CI', pin: '5678' });
  assert.equal(conn.ok, true, JSON.stringify(conn));
  vendeur = conn.jeton;
});

after(() => { serveur?.kill(); fs.rmSync(dossier, { recursive: true, force: true }); });


const achat = { id: 'ac1', date: maintenant(), fournisseurId: 'f1', fournisseurNom: 'Grossiste', lignes: [{ produitId: 'p1', produitNom: 'Riz', quantite: 2, prixAchat: 500, total: 1000 }], total: 1000, paye: 0 };

test('le gérant enregistre fournisseurs, achats et règlements ; un vendeur est refusé', async () => {
  const f = { id: 'f1', nom: 'Grossiste', telephone: '', note: '' };
  const r = { id: 'rf1', date: maintenant(), fournisseurId: 'f1', montant: 400, mode: 'Espèces' };
  const gerantOk = await envoyer(gerant, [element('fournisseurs', 'f1', f), element('achats', 'ac1', achat), element('reglementsFournisseurs', 'rf1', r)]);
  assert.deepEqual(gerantOk.refuses, []);
  assert.equal(gerantOk.acceptes.length, 3);
  for (const [type, id, contenu] of [['fournisseurs', 'f9', { ...f, id: 'f9' }], ['achats', 'ac9', { ...achat, id: 'ac9' }], ['reglementsFournisseurs', 'rf9', { ...r, id: 'rf9' }]]) {
    const refus = await envoyer(vendeur, [element(type, id, contenu)]);
    assert.match(refus.refuses[0].raison, /réservé au gérant/, type);
  }
  // Un vendeur ne peut pas non plus supprimer
  const sup = await envoyer(vendeur, [{ type: 'achats', id: 'ac1', supprime: true, modifieLe: maintenant() }]);
  assert.equal(sup.refuses.length, 1);
  // Les données du gérant sont bien là
  const lu = await api('GET', '/donnees', null, gerant);
  assert.deepEqual(lu.elements.filter((e) => ['fournisseurs', 'achats', 'reglementsFournisseurs'].includes(e.type)).map((e) => e.id).sort(), ['ac1', 'f1', 'rf1']);
});
