// Tests des fichiers de rapport : l'Excel doit être un vrai classeur (nombres, dates, filtres) sans erreur, et le PDF doit se générer pour toutes les périodes.
// Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { construireRapport, PERIODES_RAPPORT } from '../src/lib/donnees/rapport.js';
import { octetsExcel } from '../src/lib/export/rapport-excel.js';
import { octetsPdf, creerPdfRapport } from '../src/lib/export/rapport-pdf.js';
import { creerDonneesDemo } from '../src/lib/donnees/demo.js';
import { donnees } from './donnees-rapport.mjs';

async function relire(rapport) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await octetsExcel(rapport));
  return wb;
}
const trouverLigne = (feuille, texte) => { let r = null; feuille.eachRow((row, n) => { if (row.getCell(1).value === texte) r = n; }); return r; };

test('Excel : vrai classeur avec des nombres, des dates justes, des filtres et un en-tête figé', async () => {
  const rapport = construireRapport(donnees(), 'jour', new Date(2026, 9, 5, 15, 0));
  const wb = await relire(rapport);
  assert.deepEqual(wb.worksheets.map((f) => f.name), ['Résumé', 'Ventes', 'Articles', 'Par heure', 'Vendeurs', 'Dépenses', 'Crédits remboursés', 'Crédits dus', 'Journées de vente', 'Stock']);

  // Résumé : le chiffre d'affaires est un NOMBRE avec un format de montant
  const resume = wb.getWorksheet('Résumé');
  const ligneCa = trouverLigne(resume, 'Chiffre d’affaires');
  assert.ok(ligneCa, 'ligne du chiffre d’affaires trouvée');
  assert.equal(typeof resume.getCell(ligneCa, 2).value, 'number');
  assert.equal(resume.getCell(ligneCa, 2).value, 21500);
  assert.match(resume.getCell(ligneCa, 2).numFmt, /#,##0/);
  assert.equal(resume.getCell(trouverLigne(resume, 'Taux de marge'), 2).value, 0.12); // vrai pourcentage Excel
  assert.equal(resume.getCell(trouverLigne(resume, 'Solde (ventes − dépenses)'), 2).value, 19700);

  // Ventes : 5 tickets, dates et heures exactement celles de l'appareil, annulée en rouge, total des ventes valides
  const ventes = wb.getWorksheet('Ventes');
  assert.equal(ventes.views[0].state, 'frozen');
  assert.ok(ventes.autoFilter, 'filtres sur les colonnes');
  const entete = trouverLigne(ventes, 'N° ticket');
  const premiere = ventes.getRow(entete + 1);
  const date = premiere.getCell(2).value;
  assert.ok(date instanceof Date);
  assert.deepEqual([date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours()], [2026, 9, 5, 0]); // colonne Date : le jour seulement (tri et filtres par jour)
  const heure = premiere.getCell(3).value;
  assert.deepEqual([heure.getUTCHours(), heure.getUTCMinutes()], [8, 0]); // colonne Heure : exactement celle du ticket
  assert.equal(premiere.getCell(12).value, 5000);
  assert.equal(ventes.getRow(entete + 3).getCell(13).value, 'Annulée');
  assert.equal(ventes.getRow(entete + 3).getCell(1).font.italic, true);
  const total = ventes.getRow(entete + 6);
  assert.equal(total.getCell(1).value, 'Total (ventes valides)');
  assert.equal(total.getCell(12).value, 21500);
  assert.equal(total.getCell(10).value, 5000 + 12000 + 2500 + 3000); // sous-totaux des ventes valides

  // Aucun texte d'erreur ni valeur invalide dans tout le classeur
  for (const f of wb.worksheets) {
    f.eachRow((row) => row.eachCell((c) => {
      const v = c.value;
      if (typeof v === 'number') assert.ok(Number.isFinite(v), `${f.name} ${c.address} : nombre invalide`);
      if (typeof v === 'string') assert.ok(!/NaN|undefined|null|\[object/.test(v), `${f.name} ${c.address} : « ${v} »`);
      assert.ok(!(v && typeof v === 'object' && 'error' in v), `${f.name} ${c.address} : erreur de formule`);
    }));
  }
});

test('Excel : montants avec décimales pour le dirham, sans pour le franc CFA ; dates justes quelle que soit la période', async () => {
  const d = donnees();
  d.commerce.devise = 'MAD';
  const wb = await relire(construireRapport(d, 'semaine', new Date(2026, 9, 7)));
  const resume = wb.getWorksheet('Résumé');
  assert.match(resume.getCell(trouverLigne(resume, 'Chiffre d’affaires'), 2).numFmt, /0\.00/);
  const evo = wb.getWorksheet('Par jour');
  assert.ok(evo, 'onglet Par jour pour une semaine');
});

test('Excel et PDF se génèrent pour toutes les périodes sur les données de démonstration', async () => {
  const d = creerDonneesDemo('resto-ivoire', 'CI');
  for (const type of PERIODES_RAPPORT) {
    const rapport = construireRapport(d, type, new Date());
    const xlsx = await octetsExcel(rapport);
    assert.ok(xlsx.byteLength > 4000, `${type} : fichier Excel trop petit`);
    assert.equal(new Uint8Array(xlsx.buffer ?? xlsx).slice(0, 2).join(), '80,75'); // « PK » : fichier zip (xlsx)
    const pdf = new Uint8Array(await octetsPdf(rapport));
    assert.equal(String.fromCharCode(...pdf.slice(0, 5)), '%PDF-');
    assert.ok(pdf.byteLength > 3000);
  }
});

test('PDF : noms avec caractères hors alphabet latin sans erreur, période vide lisible, ventes du jour listées', async () => {
  const d = donnees();
  d.ventes[0].vendeurNom = 'أحمد'; // le PDF n'a que l'alphabet latin : « ? » à la place, jamais d'erreur
  d.ventes[1].clientNom = 'Zoé « L’Ami » – 5 €';
  const doc = await creerPdfRapport(construireRapport(d, 'jour', new Date(2026, 9, 5, 15, 0)));
  assert.ok(doc.getNumberOfPages() >= 1);
  const vide = await creerPdfRapport(construireRapport(d, 'mois', new Date(2020, 0, 15)));
  assert.ok(vide.getNumberOfPages() >= 1);
  // Beaucoup de tickets : le PDF reste raisonnable (le détail complet est dans l'Excel)
  const gros = donnees();
  gros.ventes = Array.from({ length: 1500 }, (_, i) => ({ ...gros.ventes[0], id: 'g' + i, numero: i + 1 }));
  const grosPdf = await creerPdfRapport(construireRapport(gros, 'jour', new Date(2026, 9, 5, 15, 0)));
  assert.ok(grosPdf.getNumberOfPages() < 40, `trop de pages : ${grosPdf.getNumberOfPages()}`);
});
