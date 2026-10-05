// ------------------------------------------------------------
// MODÈLES EXCEL GRATUITS du site (public/modeles/), liés depuis les guides.
//   node scripts/modeles.mjs      → régénère les 4 fichiers (français et anglais)
// Les fichiers sont versionnés : à relancer seulement si ce script change.
// ------------------------------------------------------------
import fs from 'node:fs';
import ExcelJS from 'exceljs';

const VERT = 'FF1E5B43', VERT_CLAIR = 'FFEAF2EE', SAISIE = 'FFFFF8E1';
const T = {
  fr: {
    inv: { feuille: 'Inventaire', titre: 'Inventaire de stock', aide: 'Remplissez les cellules jaunes. Les colonnes grises se calculent toutes seules.', cols: ['Article', 'Unité', 'Quantité attendue', 'Quantité comptée', 'Écart', 'Prix d’achat', 'Prix de vente', 'Valeur du stock (achat)', 'Marge unitaire', 'Remarque'], total: 'Total', unites: 'pièce,kg,litre,carton,sac' },
    ven: { feuille: 'Ventes', titre: 'Suivi des ventes et dépenses', aide: 'Une ligne par jour. Remplissez les cellules jaunes ; le reste se calcule.', cols: ['Date', 'Espèces', 'Mobile money', 'Carte', 'Crédit (non encaissé)', 'Total vendu', 'Dépenses', 'Solde du jour (vendu − dépenses)', 'Argent reçu (hors crédit)'], total: 'Total', pied: 'Modèle gratuit Kaislo — kaislo.com' },
    pied: 'Modèle gratuit Kaislo — kaislo.com', fichiers: ['modele-inventaire-stock.xlsx', 'modele-suivi-ventes-quotidien.xlsx'],
    ex: [['Riz 25 kg', 'sac', 20, 18, 12000, 15000], ['Huile 5 L', 'pièce', 30, 30, 4200, 5000]],
  },
  en: {
    inv: { feuille: 'Inventory', titre: 'Stock inventory', aide: 'Fill in the yellow cells. Grey columns calculate themselves.', cols: ['Item', 'Unit', 'Expected quantity', 'Counted quantity', 'Difference', 'Purchase price', 'Selling price', 'Stock value (purchase)', 'Unit margin', 'Notes'], total: 'Total' },
    ven: { feuille: 'Sales', titre: 'Daily sales and expenses tracker', aide: 'One row per day. Fill in the yellow cells; the rest calculates itself.', cols: ['Date', 'Cash', 'Mobile money', 'Card', 'Credit (not collected)', 'Total sold', 'Expenses', 'Day balance (sold − expenses)', 'Money received (excl. credit)'], total: 'Total' },
    pied: 'Free Kaislo template — kaislo.com', fichiers: ['stock-inventory-template.xlsx', 'daily-sales-tracker-template.xlsx'],
    ex: [['Rice 25 kg', 'bag', 20, 18, 12000, 15000], ['Cooking oil 5 L', 'piece', 30, 30, 4200, 5000]],
  },
};

const entete = (f, ligne, cols) => cols.forEach((c, i) => {
  const x = f.getCell(ligne, i + 1);
  x.value = c; x.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  x.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERT } };
  x.alignment = { wrapText: true, vertical: 'middle', horizontal: i ? 'center' : 'left' };
});
const saisie = (c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SAISIE } }; c.border = { bottom: { style: 'hair' } }; };
const calcule = (c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0EE' } }; c.border = { bottom: { style: 'hair' } }; };

async function inventaire(lang) {
  const t = T[lang], L = t.inv;
  const wb = new ExcelJS.Workbook(); wb.creator = 'Kaislo';
  const f = wb.addWorksheet(L.feuille, { views: [{ state: 'frozen', ySplit: 4 }] });
  f.getCell('A1').value = L.titre; f.getCell('A1').font = { bold: true, size: 16, color: { argb: VERT } };
  f.getCell('A2').value = L.aide; f.getCell('A2').font = { italic: true, color: { argb: 'FF777777' } };
  f.getCell('A3').value = t.pied; f.getCell('A3').font = { size: 9, color: { argb: 'FF999999' } };
  entete(f, 4, L.cols); f.getRow(4).height = 32;
  [34, 10, 14, 14, 12, 14, 14, 18, 14, 28].forEach((w, i) => { f.getColumn(i + 1).width = w; });
  const N = 200, debut = 5, fin = debut + N - 1;
  for (let r = debut; r <= fin; r++) {
    const ex = t.ex[r - debut];
    if (ex) { f.getCell(r, 1).value = ex[0]; f.getCell(r, 2).value = ex[1]; f.getCell(r, 3).value = ex[2]; f.getCell(r, 4).value = ex[3]; f.getCell(r, 6).value = ex[4]; f.getCell(r, 7).value = ex[5]; }
    f.getCell(r, 5).value = { formula: `IF(AND(C${r}="",D${r}=""),"",D${r}-C${r})` };
    f.getCell(r, 8).value = { formula: `IF(OR(D${r}="",F${r}=""),"",D${r}*F${r})` };
    f.getCell(r, 9).value = { formula: `IF(OR(F${r}="",G${r}=""),"",G${r}-F${r})` };
    [1, 2, 3, 4, 6, 7, 10].forEach((c) => saisie(f.getCell(r, c)));
    [5, 8, 9].forEach((c) => calcule(f.getCell(r, c)));
    [6, 7, 8, 9].forEach((c) => { f.getCell(r, c).numFmt = '#,##0.00'; });
    f.getCell(r, 5).numFmt = '#,##0.##;[Red]-#,##0.##';
  }
  const tot = fin + 1;
  f.getCell(tot, 1).value = t.inv.total;
  f.getCell(tot, 5).value = { formula: `SUM(E${debut}:E${fin})` };
  f.getCell(tot, 8).value = { formula: `SUM(H${debut}:H${fin})` };
  for (let c = 1; c <= 10; c++) { const x = f.getCell(tot, c); x.font = { bold: true }; x.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERT_CLAIR } }; }
  f.getCell(tot, 8).numFmt = '#,##0.00'; f.getCell(tot, 5).numFmt = '#,##0.##;[Red]-#,##0.##';
  f.autoFilter = { from: { row: 4, column: 1 }, to: { row: fin, column: 10 } };
  f.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '4:4' };
  await wb.xlsx.writeFile('public/modeles/' + t.fichiers[0]);
}

async function ventes(lang) {
  const t = T[lang], L = t.ven;
  const wb = new ExcelJS.Workbook(); wb.creator = 'Kaislo';
  const f = wb.addWorksheet(L.feuille, { views: [{ state: 'frozen', ySplit: 4 }] });
  f.getCell('A1').value = L.titre; f.getCell('A1').font = { bold: true, size: 16, color: { argb: VERT } };
  f.getCell('A2').value = L.aide; f.getCell('A2').font = { italic: true, color: { argb: 'FF777777' } };
  f.getCell('A3').value = t.pied; f.getCell('A3').font = { size: 9, color: { argb: 'FF999999' } };
  entete(f, 4, L.cols); f.getRow(4).height = 44;
  [14, 14, 14, 12, 18, 16, 14, 22, 20].forEach((w, i) => { f.getColumn(i + 1).width = w; });
  const N = 366, debut = 5, fin = debut + N - 1;
  for (let r = debut; r <= fin; r++) {
    f.getCell(r, 6).value = { formula: `SUM(B${r}:E${r})` };
    f.getCell(r, 8).value = { formula: `F${r}-G${r}` };
    f.getCell(r, 9).value = { formula: `B${r}+C${r}+D${r}` };
    [1, 2, 3, 4, 5, 7].forEach((c) => saisie(f.getCell(r, c)));
    [6, 8, 9].forEach((c) => calcule(f.getCell(r, c)));
    f.getCell(r, 1).numFmt = 'dd/mm/yyyy';
    for (let c = 2; c <= 9; c++) f.getCell(r, c).numFmt = '#,##0.00;[Red]-#,##0.00';
  }
  const tot = fin + 1;
  f.getCell(tot, 1).value = t.ven.total;
  for (let c = 2; c <= 9; c++) { const l = String.fromCharCode(64 + c); f.getCell(tot, c).value = { formula: `SUM(${l}${debut}:${l}${fin})` }; f.getCell(tot, c).numFmt = '#,##0.00;[Red]-#,##0.00'; }
  for (let c = 1; c <= 9; c++) { const x = f.getCell(tot, c); x.font = { bold: true }; x.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERT_CLAIR } }; }
  f.autoFilter = { from: { row: 4, column: 1 }, to: { row: fin, column: 9 } };
  f.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '4:4' };
  await wb.xlsx.writeFile('public/modeles/' + t.fichiers[1]);
}

fs.mkdirSync('public/modeles', { recursive: true });
for (const lang of ['fr', 'en']) { await inventaire(lang); await ventes(lang); }
console.log('Modèles écrits dans public/modeles/');
