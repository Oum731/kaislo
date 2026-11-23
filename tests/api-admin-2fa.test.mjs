// Double authentification de l'espace Kaislo (TOTP) : activation, connexion avec code, code de secours, pas de rejeu, désactivation, réinitialisation
// Lancer : npm test (PHP 8.1 ou plus doit être installé)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { portLibre } from './port-libre.mjs';

const PORT = await portLibre();
const U = `http://127.0.0.1:${PORT}/api`;
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'kaislo-2fa-'));
const fichierEnv = path.join(dossier, '.env');
let serveur, jeton, secret;
let codesSecours = [];

async function api(methode, chemin, corps, j) {
  const r = await fetch(U + chemin, { method: methode, headers: { 'Content-Type': 'application/json', ...(j ? { Authorization: 'Bearer ' + j } : {}) }, body: corps ? JSON.stringify(corps) : undefined });
  return { statut: r.status, ...(await r.json()) };
}
// Même calcul que les applications d'authentification (RFC 6238)
function base32(texte) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of texte) bits += alphabet.indexOf(c).toString(2).padStart(5, '0');
  const octets = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) octets.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(octets);
}
const code = (decalage = 0) => {
  const pas = Math.floor(Date.now() / 30000) + decalage;
  const tampon = Buffer.alloc(8); tampon.writeBigUInt64BE(BigInt(pas));
  const h = crypto.createHmac('sha1', base32(secret)).update(tampon).digest();
  const o = h[19] & 0x0f;
  return String(((h[o] & 0x7f) << 24 | h[o + 1] << 16 | h[o + 2] << 8 | h[o + 3]) % 1000000).padStart(6, '0');
};
const MDP = 'MotDePasse2026';

before(async () => {
  fs.writeFileSync(fichierEnv, `DbDriver=sqlite\nDbFichier=${path.join(dossier, 't.sqlite')}\nCleAdmin=cle-de-test-0123456789\nDefi=non\n`);
  serveur = spawn('php', ['-S', `127.0.0.1:${PORT}`, 'api/index.php'], { env: { ...process.env, KAISLO_ENV_FICHIER: fichierEnv }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await api('GET', '/sante')).ok) break; } catch { /* le serveur démarre */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  const install = await api('POST', '/admin/installer', { cle: 'cle-de-test-0123456789', nom: 'Équipe', email: 'equipe@kaislo.test', motDePasse: MDP });
  jeton = install.jeton;
  assert.ok(jeton);
});
after(() => { serveur?.kill(); fs.rmSync(dossier, { recursive: true, force: true }); });

test('sans double authentification, la connexion est inchangée', async () => {
  const r = await api('POST', '/admin/connexion', { email: 'equipe@kaislo.test', motDePasse: MDP });
  assert.ok(r.jeton);
  assert.equal(r.admin.deuxFacteurs, false);
});

test('activation : un mauvais code est refusé, le bon active et donne 8 codes de secours', async () => {
  const p = await api('POST', '/admin/2fa/preparer', {}, jeton);
  assert.equal(p.statut, 200, JSON.stringify(p));
  assert.match(p.secret, /^[A-Z2-7]{32}$/);
  assert.match(p.adresse, /^otpauth:\/\/totp\/Kaislo%3Aequipe%40kaislo\.test\?secret=/);
  secret = p.secret;
  assert.equal((await api('POST', '/admin/2fa/activer', { code: '000000' }, jeton)).statut, 400);
  const a = await api('POST', '/admin/2fa/activer', { code: code() }, jeton);
  assert.equal(a.statut, 200, JSON.stringify(a));
  assert.equal(a.codesSecours.length, 8);
  assert.match(a.codesSecours[0], /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  codesSecours = a.codesSecours;
  assert.equal((await api('POST', '/admin/2fa/preparer', {}, jeton)).statut, 409); // déjà activée
});

test('connexion : sans code, aucune session ; mauvais code refusé ; bon code accepté ; le même code ne sert pas deux fois', async () => {
  const sans = await api('POST', '/admin/connexion', { email: 'equipe@kaislo.test', motDePasse: MDP });
  assert.equal(sans.code2fa, true);
  assert.equal(sans.jeton, undefined);
  assert.equal((await api('POST', '/admin/connexion', { email: 'equipe@kaislo.test', motDePasse: 'Faux12345678', code: code(1) })).statut, 401);
  assert.equal((await api('POST', '/admin/connexion', { email: 'equipe@kaislo.test', motDePasse: MDP, code: '123456' })).statut, 401);
  const c = code(1); // la tranche suivante : l'activation a déjà consommé la tranche actuelle
  const ok = await api('POST', '/admin/connexion', { email: 'equipe@kaislo.test', motDePasse: MDP, code: c });
  assert.equal(ok.statut, 200, JSON.stringify(ok));
  assert.equal(ok.admin.deuxFacteurs, true);
  assert.equal(ok.admin.totp_secret, undefined);
  assert.equal((await api('POST', '/admin/connexion', { email: 'equipe@kaislo.test', motDePasse: MDP, code: c })).statut, 401); // rejeu
  assert.equal((await api('GET', '/admin/moi', null, ok.jeton)).admin.deuxFacteurs, true);
});

test('code de secours : accepté une seule fois', async () => {
  const [premier, second] = codesSecours;
  const ok = await api('POST', '/admin/connexion', { email: 'equipe@kaislo.test', motDePasse: MDP, code: premier.toLowerCase().replace('-', ' ') });
  assert.equal(ok.statut, 200, JSON.stringify(ok));
  assert.equal((await api('POST', '/admin/connexion', { email: 'equipe@kaislo.test', motDePasse: MDP, code: premier })).statut, 401);
  assert.ok((await api('POST', '/admin/connexion', { email: 'equipe@kaislo.test', motDePasse: MDP, code: second })).jeton);
});

test('un administrateur réinitialise la double authentification d’un collègue ; on peut aussi la désactiver soi-même', async () => {
  const [, , troisieme, quatrieme] = codesSecours;
  // Désactivation : mot de passe et code obligatoires
  assert.equal((await api('POST', '/admin/2fa/desactiver', { motDePasse: 'Faux12345678', code: troisieme }, jeton)).statut, 400);
  assert.equal((await api('POST', '/admin/2fa/desactiver', { motDePasse: MDP, code: troisieme }, jeton)).ok, true);
  const r = await api('POST', '/admin/connexion', { email: 'equipe@kaislo.test', motDePasse: MDP });
  assert.ok(r.jeton);
  // Un collègue active, puis l'administrateur la réinitialise
  const col = await api('POST', '/admin/equipe', { nom: 'Collègue', email: 'collegue@kaislo.test', role: 'support', motDePasse: 'AutreMdp2026' }, r.jeton);
  assert.equal(col.statut, 200, JSON.stringify(col));
  const c = (await api('POST', '/admin/connexion', { email: 'collegue@kaislo.test', motDePasse: 'AutreMdp2026' }));
  const p = await api('POST', '/admin/2fa/preparer', {}, c.jeton);
  secret = p.secret;
  assert.equal((await api('POST', '/admin/2fa/activer', { code: code() }, c.jeton)).statut, 200);
  assert.equal((await api('POST', '/admin/connexion', { email: 'collegue@kaislo.test', motDePasse: 'AutreMdp2026' })).code2fa, true);
  const id = col.equipe.find((x) => x.email === 'collegue@kaislo.test').id;
  assert.equal((await api('POST', '/admin/equipe', { id, nom: 'Collègue', email: 'collegue@kaislo.test', role: 'support', reinitialiser2fa: true }, r.jeton)).statut, 200);
  assert.ok((await api('POST', '/admin/connexion', { email: 'collegue@kaislo.test', motDePasse: 'AutreMdp2026' })).jeton);
  void quatrieme;
});
