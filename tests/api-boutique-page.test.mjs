// Pages de boutique pour Google (/boutique/nom/) et plan du site des boutiques. Lancer : npm test
// DossierSite : dossier où le serveur trouve la vitrine statique (public/boutique/index.html une fois le site construit) ; ici une vitrine d'essai.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 6420 + (process.pid % 200);
const U = `http://127.0.0.1:${PORT}/api`;
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'kaislo-page-'));
const fichierEnv = path.join(dossier, '.env');
const fichierBase = path.join(dossier, 't.sqlite');
let serveur, gerant, autre;
const maintenant = () => new Date().toISOString();
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

const VITRINE = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Boutique | Kaislo</title><meta name="description" content="Commandez auprès de votre commerçant : choisissez vos articles et envoyez la commande sur WhatsApp."><meta name="robots" content="noindex, nofollow"><link rel="canonical" href="https://kaislo.com/boutique/"><meta property="og:title" content="Kaislo — Logiciel de caisse"><meta property="og:description" content="Commandez auprès de votre commerçant"><meta property="og:url" content="https://kaislo.com/"><meta property="og:image" content="https://kaislo.com/og-image.png"></head><body><div class="vitrine">Chargement…</div><script type="application/ld+json">[{"@type":"Organization","name":"Kaislo"}]</script></body></html>`;

async function api(methode, chemin, corps, jeton) {
  const r = await fetch(U + chemin, { method: methode, headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: 'Bearer ' + jeton } : {}) }, body: corps ? JSON.stringify(corps) : undefined });
  return { statut: r.status, ...(await r.json()) };
}
const page = async (chemin) => { const r = await fetch(U + chemin); return { statut: r.status, type: r.headers.get('content-type'), texte: await r.text() }; };
const donneesLd = (html) => [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => JSON.parse(m[1].replaceAll('<\\/', '</'))).flat();

async function creerCommerce(nom, tel, slug, { publique = true, articles = true } = {}) {
  const g = await api('POST', '/inscription', {
    commerce: { nom, type: 'epicerie', pays: 'CI', ville: 'Abidjan', quartier: 'Cocody', telephone: tel },
    gerant: { nom: 'Awa', telephone: tel.slice(0, -1) + '9', pin: '1234' }, conditionsAcceptees: true,
  });
  assert.equal(g.statut, 201, JSON.stringify(g));
  if (articles) {
    const r = await api('POST', '/donnees', { elements: [
      { type: 'categories', id: 'c1', modifieLe: maintenant(), contenu: { id: 'c1', nom: 'Épicerie' } },
      { type: 'produits', id: 'p1', modifieLe: maintenant(), contenu: { id: 'p1', nom: 'Riz <b>"parfumé"</b>', prix: 2500, categorieId: 'c1', actif: true, enLigne: true, groupes: [] } },
      { type: 'produits', id: 'p2', modifieLe: maintenant(), contenu: { id: 'p2', nom: 'Huile', prix: 1500, promo: 1200, categorieId: 'c1', actif: true, enLigne: true, groupes: [] } },
    ] }, g.jeton);
    assert.deepEqual(r.refuses, [], JSON.stringify(r));
  }
  const b = await api('POST', '/boutique', { actif: true, slug, whatsapp: tel.slice(0, -1) + '9', publique, conditionsAcceptees: true, description: 'Épicerie de quartier, livraison le jour même.' }, g.jeton);
  assert.equal(b.ok, true, JSON.stringify(b));
  return g;
}

before(async () => {
  fs.mkdirSync(path.join(dossier, 'boutique'));
  fs.writeFileSync(path.join(dossier, 'boutique', 'index.html'), VITRINE);
  fs.writeFileSync(fichierEnv, `DbDriver=sqlite\nDbFichier=${fichierBase}\nCleAdmin=cle-de-test-0123456789\nDossierSite=${dossier}\n`);
  serveur = spawn('php', ['-S', `127.0.0.1:${PORT}`, 'api/index.php'], { env: { ...process.env, KAISLO_ENV_FICHIER: fichierEnv }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await api('GET', '/sante')).ok) break; } catch { /* le serveur démarre */ }
    await attendre(100);
  }
  gerant = await creerCommerce('Chez Awa Page', '0712345851', 'chez-awa-page');
  await creerCommerce('Boutique cachée', '0712345861', 'boutique-cachee', { publique: false });
  autre = await creerCommerce('Boutique vide', '0712345871', 'boutique-vide', { articles: false });
});
after(() => { serveur?.kill(); fs.rmSync(dossier, { recursive: true, force: true }); });

test('boutique publique : titre, description, adresse, données structurées et articles dans la page', async () => {
  const r = await page('/page-boutique?b=chez-awa-page');
  assert.equal(r.statut, 200);
  assert.match(r.type, /text\/html/);
  assert.match(r.texte, /<title>Chez Awa Page · Épicerie à Abidjan \| Kaislo<\/title>/);
  assert.match(r.texte, /<meta name="description" content="Épicerie de quartier, livraison le jour même\. Épicerie à Cocody, Abidjan : 2 articles/);
  assert.match(r.texte, /<meta name="robots" content="index, follow/);
  assert.doesNotMatch(r.texte, /noindex/);
  assert.match(r.texte, /<link rel="canonical" href="https:\/\/[^"]+\/boutique\/chez-awa-page\/">/);
  assert.match(r.texte, /<meta property="og:url" content="https:\/\/[^"]+\/boutique\/chez-awa-page\/">/);
  // La vitrine d'origine est conservée (l'application la remplit ensuite), avec son contenu et ses données d'organisation
  assert.match(r.texte, /<div class="vitrine">Chargement…<\/div>/);
  // Contenu HTML : h1, articles, prix ; noms échappés
  assert.match(r.texte, /<div id="seo-boutique"/);
  assert.match(r.texte, /<h1>Chez Awa Page<\/h1>/);
  assert.match(r.texte, /Huile<\/b> — 1 ?200 FCFA/);
  assert.match(r.texte, /Riz &lt;b&gt;&quot;parfumé&quot;&lt;\/b&gt;/);
  assert.doesNotMatch(r.texte, /<b>"parfumé"<\/b>/);
  // Données structurées lisibles : commerce local, fil d'Ariane, liste d'articles avec prix en francs CFA (XOF)
  const ld = donneesLd(r.texte);
  const commerce = ld.find((x) => x['@type'] === 'GroceryStore');
  assert.equal(commerce.name, 'Chez Awa Page');
  assert.equal(commerce.address.addressLocality, 'Abidjan');
  assert.equal(commerce.address.addressCountry, 'CI');
  const liste = ld.find((x) => x['@type'] === 'ItemList');
  assert.equal(liste.itemListElement.length, 2);
  const huile = liste.itemListElement.find((e) => e.item.name === 'Huile').item;
  assert.equal(huile.offers.price, '1200');
  assert.equal(huile.offers.priceCurrency, 'XOF');
  assert.ok(ld.some((x) => x['@type'] === 'BreadcrumbList'));
  assert.ok(ld.some((x) => x['@type'] === 'Organization'));
});

test('le numéro WhatsApp du commerçant n\'est pas dans la page pour Google', async () => {
  const r = await page('/page-boutique?b=chez-awa-page');
  assert.doesNotMatch(r.texte, /0712345859|712345859/);
});

test('boutique cachée de l\'annuaire ou sans article : vitrine seule, toujours en noindex', async () => {
  for (const slug of ['boutique-cachee', 'boutique-vide']) {
    const r = await page('/page-boutique?b=' + slug);
    assert.equal(r.statut, 200, slug);
    assert.match(r.texte, /<meta name="robots" content="noindex, nofollow">/, slug);
    assert.doesNotMatch(r.texte, /seo-boutique/, slug);
  }
});

test('boutique inconnue : vraie erreur 404 avec la vitrine', async () => {
  for (const slug of ['inconnue', '..%2f..%2fetc', 'UN SLUG']) {
    const r = await page('/page-boutique?b=' + slug);
    assert.equal(r.statut, 404, slug);
    assert.match(r.texte, /noindex/);
  }
});

test('plan du site des boutiques : seulement les boutiques publiques avec articles', async () => {
  const r = await page('/plan-boutiques');
  assert.equal(r.statut, 200);
  assert.match(r.type, /xml/);
  assert.match(r.texte, /<loc>https:\/\/[^<]+\/boutique\/chez-awa-page\/<\/loc>/);
  assert.doesNotMatch(r.texte, /boutique-cachee|boutique-vide/);
});

test('adresses réécrites par .htaccess : le paramètre kaislo-page choisit la page', async () => {
  const r = await page('/nimporte-quoi?kaislo-page=boutique&b=chez-awa-page');
  assert.equal(r.statut, 200);
  assert.match(r.texte, /id="seo-boutique"/);
  const plan = await page('/nimporte-quoi?kaislo-page=plan-boutiques');
  assert.match(plan.texte, /chez-awa-page/);
});

test('boutique suspendue ou fermée : plus indexable', async () => {
  const b = await api('POST', '/boutique', { actif: false, slug: 'chez-awa-page', whatsapp: '0712345859' }, gerant.jeton);
  assert.equal(b.ok, true);
  assert.equal((await page('/page-boutique?b=chez-awa-page')).statut, 404);
  assert.doesNotMatch((await page('/plan-boutiques')).texte, /chez-awa-page/);
  void autre;
});
