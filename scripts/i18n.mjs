// ------------------------------------------------------------
// VÉRIFICATION DES TRADUCTIONS (src/lib/i18n)
//
//   npm run i18n            liste les textes sans traduction anglaise et les textes français pas encore entourés de tr(…)
//   npm run i18n -- --strict   échoue (CI) s'il manque une traduction
//
// Les textes sont repérés dans le code : tr('texte français') → clé du dictionnaire src/lib/i18n/en.js.
// ------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { parse } = require('next/dist/compiled/babel/parser');
const { EN } = await import(path.resolve('src/lib/i18n/en.js'));

const strict = process.argv.includes('--strict');
const toutes = process.argv.includes('--tout');
// Site public : les pages traduites sont dans src/components/site/pages ; les pages légales, par pays et par activité suivront
const DOSSIERS = ['src/components', 'src/store', 'src/lib'];
// Espace équipe (français seulement), données de démonstration, dictionnaires
const IGNORES = [/src\/components\/admin\//, /src\/components\/site\/(PageLegale\.jsx|SelecteurLangueSite\.jsx)/, /src\/lib\/donnees\/demo\.js/, /src\/lib\/i18n\//, /credits-photos/];

function fichiers(dossier) {
  return fs.readdirSync(dossier, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dossier, e.name);
    return e.isDirectory() ? fichiers(p) : /\.(jsx?|mjs)$/.test(e.name) ? [p] : [];
  });
}

const cles = new Map(); // clé → [fichier:ligne]
const orphelins = [];
const TECHNIQUE = new Set(['className', 'id', 'type', 'href', 'src', 'key', 'nom', 'name', 'style', 'valeur', 'value', 'role', 'inputMode', 'autoComplete', 'rel', 'target', 'lang', 'htmlFor', 'accept', 'viewBox', 'd', 'fill', 'stroke']);

for (const f of DOSSIERS.flatMap(fichiers)) {
  if (IGNORES.some((r) => r.test(f))) continue;
  const src = fs.readFileSync(f, 'utf8');
  let ast;
  try { ast = parse(src, { sourceType: 'module', plugins: ['jsx'] }); } catch { continue; }
  const ligne = (n) => src.slice(0, n.start).split('\n').length;
  (function visiter(n, parent, dansTr) {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach((x) => visiter(x, parent, dansTr)); return; }
    if (typeof n.type !== 'string') return;
    let tr = dansTr;
    if (n.type === 'CallExpression' && n.callee.type === 'Identifier' && n.callee.name === 'tr') {
      const a = n.arguments[0];
      const cle = a?.type === 'StringLiteral' ? a.value : a?.type === 'TemplateLiteral' && !a.expressions.length ? a.quasis[0].value.cooked : null;
      if (cle !== null) { if (!cles.has(cle)) cles.set(cle, []); cles.get(cle).push(`${f}:${ligne(n)}`); }
      else orphelins.push(`${f}:${ligne(n)}  tr() avec un texte calculé`);
      tr = true;
    }
    const texte = n.type === 'StringLiteral' ? n.value : n.type === 'JSXText' ? n.value.trim() : null;
    if (texte && !tr && /^[A-ZÀ-Ý]|[àâçéèêëîïôûùüÿœ]/.test(texte) && /\p{L}{3,}/u.test(texte) && (/\s/.test(texte) || /[àâçéèêëîïôûùüÿœ]/.test(texte) || (['ConditionalExpression', 'LogicalExpression', 'JSXExpressionContainer'].includes(parent?.type) && /^[A-ZÀ-Ý][a-zà-ÿ]{3,}$/.test(texte)))) {
      const nomAttr = parent?.type === 'JSXAttribute' ? parent.name.name : parent?.type === 'ObjectProperty' && parent.key === n ? 'cle' : null;
      const importation = parent?.type === 'ImportDeclaration' || parent?.type === 'ExportNamedDeclaration' || parent?.type === 'ExportAllDeclaration';
      if (!TECHNIQUE.has(nomAttr) && !importation && !/^use /.test(texte)) orphelins.push(`${f}:${ligne(n)}  ${JSON.stringify(texte.length > 90 ? texte.slice(0, 90) + '…' : texte)}`);
    }
    for (const k of Object.keys(n)) if (k !== 'loc' && k !== 'extra' && k !== 'leadingComments' && k !== 'trailingComments') visiter(n[k], n, tr);
  })(ast.program, null, false);
}

const manquantes = [...cles.keys()].filter((c) => !(c in EN));
const inutiles = Object.keys(EN).filter((c) => !cles.has(c));
console.log(`${cles.size} textes à traduire · ${manquantes.length} sans traduction anglaise · ${inutiles.length} traductions inutilisées`);
if (manquantes.length) { console.log('\nSans traduction :'); for (const c of manquantes) console.log('  ' + JSON.stringify(c)); }
if (inutiles.length && toutes) { console.log('\nInutilisées :'); for (const c of inutiles) console.log('  ' + JSON.stringify(c)); }
if (orphelins.length) { console.log(`\nTextes français pas encore entourés de tr() (${orphelins.length}) — à vérifier :`); for (const o of orphelins) console.log('  ' + o); }
if (strict && manquantes.length) process.exit(1);
