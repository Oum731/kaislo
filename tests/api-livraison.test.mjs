// Interrupteur de la commande et de la livraison : coupé par défaut, ouvert par « LivraisonActive=oui » dans le .env.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { portLibre } from './port-libre.mjs';

const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'kaislo-livraison-'));
const serveurs = [];

async function demarrer(extra) {
  const port = await portLibre();
  const env = path.join(dossier, `env-${port}`);
  fs.writeFileSync(env, `DbDriver=sqlite\nDbFichier=${path.join(dossier, `t-${port}.sqlite`)}\nCleAdmin=cle-de-test-0123456789\nDefi=non\n${extra}`);
  const s = spawn('php', ['-S', `127.0.0.1:${port}`, 'api/index.php'], { env: { ...process.env, KAISLO_ENV_FICHIER: env }, stdio: 'ignore' });
  serveurs.push(s);
  const url = `http://127.0.0.1:${port}/api`;
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(url + '/sante')).ok) break; } catch { /* le serveur démarre */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  return url;
}
after(() => { serveurs.forEach((s) => s.kill()); fs.rmSync(dossier, { recursive: true, force: true }); });

test('la livraison est coupée par défaut', async () => {
  const url = await demarrer('');
  const r = await fetch(url + '/livraison/etat');
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true, actif: false });
});

test('LivraisonActive=oui ouvre l’interrupteur ; une autre valeur le laisse coupé', async () => {
  const oui = await demarrer('LivraisonActive=oui\n');
  assert.equal((await (await fetch(oui + '/livraison/etat')).json()).actif, true);
  const non = await demarrer('LivraisonActive=peut-etre\n');
  assert.equal((await (await fetch(non + '/livraison/etat')).json()).actif, false);
});
