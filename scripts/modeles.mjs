// ------------------------------------------------------------
// MODÈLES EXCEL GRATUITS du site (public/modeles/), liés depuis les guides.
//   node scripts/modeles.mjs                → régénère les 8 fichiers (français et anglais)
//   node scripts/modeles.mjs facture        → seulement ce modèle (inventaire, ventes, facture ou livraison) : évite de réécrire les autres
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

// ---------- Facture et bon de livraison ----------
const TX = {
  fr: {
    facture: {
      fichier: 'modele-facture.xlsx', feuille: 'Facture', titre: 'FACTURE',
      aide: 'Remplissez les cellules jaunes. Les montants se calculent tout seuls. Gardez une numérotation continue (001, 002, 003…).',
      vendeur: 'Vendeur', client: 'Client', nom: 'Nom ou raison sociale', adresse: 'Adresse', tel: 'Téléphone', mail: 'E-mail', ident: 'N° d’identification (selon votre pays)',
      numero: 'Facture n°', date: 'Date', echeance: 'Échéance', paiement: 'Mode de paiement',
      cols: ['Désignation', 'Quantité', 'Unité', 'Prix unitaire', 'Remise (%)', 'Montant'],
      sousTotal: 'Sous-total', tauxTaxe: 'Taxe (%)', montantTaxe: 'Montant de la taxe', total: 'Total à payer', acompte: 'Acompte versé', reste: 'Reste à payer',
      notes: 'Conditions de paiement, coordonnées bancaires ou mobile money, remarques',
      legal: 'Les mentions obligatoires d’une facture varient selon les pays : vérifiez-les auprès de votre comptable ou de l’administration fiscale.',
      ex: [['Riz 25 kg', 10, 'sac', 15000, 0], ['Huile 5 L', 20, 'pièce', 5000, 5]],
    },
    livraison: {
      fichier: 'modele-bon-de-livraison.xlsx', feuille: 'Bon de livraison', titre: 'BON DE LIVRAISON',
      aide: 'Remplissez les cellules jaunes. Le reste à livrer se calcule tout seul. Faites signer le client à la réception.',
      vendeur: 'Expéditeur', client: 'Destinataire', nom: 'Nom ou raison sociale', adresse: 'Adresse', tel: 'Téléphone', mail: 'Adresse de livraison', ident: 'Personne à contacter',
      numero: 'Bon n°', date: 'Date de livraison', echeance: 'Commande n°', paiement: 'Livreur / véhicule',
      cols: ['Désignation', 'Unité', 'Qté commandée', 'Qté livrée', 'Reste à livrer', 'Observations'],
      total: 'Total livré', livrePar: 'Livré par (nom et signature)', recuPar: 'Reçu par (nom, date et signature)',
      reserve: 'Marchandise reçue en bon état, sauf réserves notées ci-dessus.',
      ex: [['Riz 25 kg', 'sac', 10, 10], ['Huile 5 L', 'pièce', 20, 18]],
    },
  },
  en: {
    facture: {
      fichier: 'invoice-template.xlsx', feuille: 'Invoice', titre: 'INVOICE',
      aide: 'Fill in the yellow cells. Amounts calculate themselves. Keep a continuous numbering (001, 002, 003…).',
      vendeur: 'Seller', client: 'Customer', nom: 'Name or company', adresse: 'Address', tel: 'Phone', mail: 'E-mail', ident: 'Registration / tax number (as required in your country)',
      numero: 'Invoice no.', date: 'Date', echeance: 'Due date', paiement: 'Payment method',
      cols: ['Description', 'Quantity', 'Unit', 'Unit price', 'Discount (%)', 'Amount'],
      sousTotal: 'Subtotal', tauxTaxe: 'Tax (%)', montantTaxe: 'Tax amount', total: 'Total due', acompte: 'Deposit paid', reste: 'Balance due',
      notes: 'Payment terms, bank or mobile money details, remarks',
      legal: 'The mandatory information on an invoice varies from country to country: check it with your accountant or the tax authority.',
      ex: [['Rice 25 kg', 10, 'bag', 15000, 0], ['Cooking oil 5 L', 20, 'piece', 5000, 5]],
    },
    livraison: {
      fichier: 'delivery-note-template.xlsx', feuille: 'Delivery note', titre: 'DELIVERY NOTE',
      aide: 'Fill in the yellow cells. The remaining quantity calculates itself. Have the customer sign on receipt.',
      vendeur: 'Sender', client: 'Recipient', nom: 'Name or company', adresse: 'Address', tel: 'Phone', mail: 'Delivery address', ident: 'Contact person',
      numero: 'Note no.', date: 'Delivery date', echeance: 'Order no.', paiement: 'Driver / vehicle',
      cols: ['Description', 'Unit', 'Qty ordered', 'Qty delivered', 'Still to deliver', 'Remarks'],
      total: 'Total delivered', livrePar: 'Delivered by (name and signature)', recuPar: 'Received by (name, date and signature)',
      reserve: 'Goods received in good condition, except for reservations noted above.',
      ex: [['Rice 25 kg', 'bag', 10, 10], ['Cooking oil 5 L', 'piece', 20, 18]],
    },
  },
};
const PIED = { fr: T.fr.pied, en: T.en.pied };
const bloc = (f, ligne, col, titre, L, largeur) => {
  // titre du bloc (col → col+largeur-1), puis 5 lignes « libellé : valeur à saisir »
  f.mergeCells(ligne, col, ligne, col + largeur - 1);
  const h = f.getCell(ligne, col); h.value = titre; h.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  h.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERT } };
  L.forEach((lib, i) => {
    const r = ligne + 1 + i;
    const e = f.getCell(r, col); e.value = lib; e.font = { size: 9, color: { argb: 'FF666666' } }; e.alignment = { vertical: 'middle', wrapText: true };
    f.mergeCells(r, col + 1, r, col + largeur - 1); saisie(f.getCell(r, col + 1));
  });
};
const champ2 = (f, r, col, lib, fmt) => {
  const e = f.getCell(r, col); e.value = lib; e.font = { size: 9, color: { argb: 'FF666666' } };
  const c = f.getCell(r, col + 1); saisie(c); if (fmt) c.numFmt = fmt;
};
function enTete(f, t, lang, largeurs) {
  largeurs.forEach((w, i) => { f.getColumn(i + 1).width = w; });
  f.getCell('A1').value = t.titre; f.getCell('A1').font = { bold: true, size: 20, color: { argb: VERT } };
  f.mergeCells('A2:F2'); f.getCell('A2').value = t.aide; f.getCell('A2').font = { italic: true, color: { argb: 'FF777777' } }; f.getCell('A2').alignment = { wrapText: true, vertical: 'top' }; f.getRow(2).height = 30;
  f.getCell('A3').value = PIED[lang]; f.getCell('A3').font = { size: 9, color: { argb: 'FF999999' } };
}
const tableau = (f, ligne, cols, n, formules, saisies, formats) => {
  entete(f, ligne, cols); f.getRow(ligne).height = 30;
  for (let r = ligne + 1; r <= ligne + n; r++) {
    formules(r);
    for (let c = 1; c <= 6; c++) (saisies.includes(c) ? saisie : calcule)(f.getCell(r, c));
    Object.entries(formats).forEach(([c, fmt]) => { f.getCell(r, Number(c)).numFmt = fmt; });
  }
};

async function facture(lang) {
  const t = TX[lang].facture, N = 20;
  const wb = new ExcelJS.Workbook(); wb.creator = 'Kaislo';
  const f = wb.addWorksheet(t.feuille);
  enTete(f, t, lang, [38, 11, 11, 16, 13, 18]);
  const lib = [t.nom, t.adresse, t.tel, t.mail, t.ident];
  bloc(f, 5, 1, t.vendeur, lib, 3); bloc(f, 5, 4, t.client, lib, 3);
  champ2(f, 12, 1, t.numero); f.mergeCells('B12:C12'); champ2(f, 12, 4, t.date, 'dd/mm/yyyy'); f.mergeCells('E12:F12');
  champ2(f, 13, 1, t.echeance, 'dd/mm/yyyy'); f.mergeCells('B13:C13'); champ2(f, 13, 4, t.paiement); f.mergeCells('E13:F13');
  const L0 = 15, debut = L0 + 1, fin = L0 + N;
  tableau(f, L0, t.cols, N, (r) => {
    t.ex[r - debut]?.forEach((v, i) => { f.getCell(r, i + 1).value = v; });
    f.getCell(r, 6).value = { formula: `IF(OR(B${r}="",D${r}=""),"",B${r}*D${r}*(1-N(E${r})/100))` };
  }, [1, 2, 3, 4, 5], { 2: '#,##0.##', 4: '#,##0.00', 5: '0.##', 6: '#,##0.00' });
  const ligneTotal = (r, lib, valeur, gras, saisieCell, fmt = '#,##0.00') => {
    f.mergeCells(r, 1, r, 5); const e = f.getCell(r, 1); e.value = lib; e.alignment = { horizontal: 'right' }; e.font = { bold: !!gras };
    const c = f.getCell(r, 6); if (valeur) c.value = { formula: valeur }; (saisieCell ? saisie : calcule)(c); c.numFmt = fmt; c.font = { bold: !!gras };
    if (gras) { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERT_CLAIR } }; }
  };
  const t0 = fin + 1;
  ligneTotal(t0, t.sousTotal, `SUM(F${debut}:F${fin})`);
  ligneTotal(t0 + 1, t.tauxTaxe, null, false, true, '0.##');
  ligneTotal(t0 + 2, t.montantTaxe, `F${t0}*N(F${t0 + 1})/100`);
  ligneTotal(t0 + 3, t.total, `F${t0}+F${t0 + 2}`, true);
  ligneTotal(t0 + 4, t.acompte, null, false, true);
  ligneTotal(t0 + 5, t.reste, `F${t0 + 3}-N(F${t0 + 4})`, true);
  const n0 = t0 + 7;
  f.getCell(n0, 1).value = t.notes; f.getCell(n0, 1).font = { size: 9, color: { argb: 'FF666666' } };
  f.mergeCells(n0 + 1, 1, n0 + 3, 6); saisie(f.getCell(n0 + 1, 1)); f.getCell(n0 + 1, 1).alignment = { wrapText: true, vertical: 'top' };
  f.mergeCells(n0 + 5, 1, n0 + 6, 6); f.getCell(n0 + 5, 1).value = t.legal; f.getCell(n0 + 5, 1).font = { italic: true, size: 9, color: { argb: 'FF777777' } }; f.getCell(n0 + 5, 1).alignment = { wrapText: true, vertical: 'top' };
  f.pageSetup = { orientation: 'portrait', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 1 };
  await wb.xlsx.writeFile('public/modeles/' + t.fichier);
}

async function livraison(lang) {
  const t = TX[lang].livraison, N = 20;
  const wb = new ExcelJS.Workbook(); wb.creator = 'Kaislo';
  const f = wb.addWorksheet(t.feuille);
  enTete(f, t, lang, [38, 11, 14, 14, 14, 24]);
  const lib = [t.nom, t.adresse, t.tel, t.mail, t.ident];
  bloc(f, 5, 1, t.vendeur, lib, 3); bloc(f, 5, 4, t.client, lib, 3);
  champ2(f, 12, 1, t.numero); f.mergeCells('B12:C12'); champ2(f, 12, 4, t.date, 'dd/mm/yyyy'); f.mergeCells('E12:F12');
  champ2(f, 13, 1, t.echeance); f.mergeCells('B13:C13'); champ2(f, 13, 4, t.paiement); f.mergeCells('E13:F13');
  const L0 = 15, debut = L0 + 1, fin = L0 + N;
  tableau(f, L0, t.cols, N, (r) => {
    t.ex[r - debut]?.forEach((v, i) => { f.getCell(r, i + 1).value = v; });
    f.getCell(r, 5).value = { formula: `IF(OR(C${r}="",D${r}=""),"",C${r}-D${r})` };
  }, [1, 2, 3, 4, 6], { 3: '#,##0.##', 4: '#,##0.##', 5: '#,##0.##;[Red]-#,##0.##' });
  const t0 = fin + 1;
  f.mergeCells(t0, 1, t0, 3); f.getCell(t0, 1).value = t.total; f.getCell(t0, 1).alignment = { horizontal: 'right' };
  f.getCell(t0, 4).value = { formula: `SUM(D${debut}:D${fin})` }; f.getCell(t0, 4).numFmt = '#,##0.##';
  f.getCell(t0, 5).value = { formula: `SUM(E${debut}:E${fin})` }; f.getCell(t0, 5).numFmt = '#,##0.##';
  for (let c = 1; c <= 6; c++) { const x = f.getCell(t0, c); x.font = { bold: true }; x.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERT_CLAIR } }; }
  const s0 = t0 + 2;
  f.mergeCells(s0, 1, s0, 6); f.getCell(s0, 1).value = t.reserve; f.getCell(s0, 1).font = { italic: true, size: 9, color: { argb: 'FF777777' } };
  f.mergeCells(s0 + 1, 1, s0 + 1, 3); f.getCell(s0 + 1, 1).value = t.livrePar; f.getCell(s0 + 1, 1).font = { size: 9, color: { argb: 'FF666666' } };
  f.mergeCells(s0 + 1, 4, s0 + 1, 6); f.getCell(s0 + 1, 4).value = t.recuPar; f.getCell(s0 + 1, 4).font = { size: 9, color: { argb: 'FF666666' } };
  f.mergeCells(s0 + 2, 1, s0 + 5, 3); f.mergeCells(s0 + 2, 4, s0 + 5, 6); saisie(f.getCell(s0 + 2, 1)); saisie(f.getCell(s0 + 2, 4));
  f.pageSetup = { orientation: 'portrait', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 1 };
  await wb.xlsx.writeFile('public/modeles/' + t.fichier);
}

fs.mkdirSync('public/modeles', { recursive: true });
const voulus = process.argv.slice(2);
const veut = (nom) => !voulus.length || voulus.includes(nom);
for (const lang of ['fr', 'en']) {
  if (veut('inventaire')) await inventaire(lang);
  if (veut('ventes')) await ventes(lang);
  if (veut('facture')) await facture(lang);
  if (veut('livraison')) await livraison(lang);
}
console.log('Modèles écrits dans public/modeles/');
