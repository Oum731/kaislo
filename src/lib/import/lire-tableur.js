// ------------------------------------------------------------
// LECTURE D'UN TABLEUR choisi par l'utilisateur : Excel (.xlsx) ou texte (.csv, .txt).
// Renvoie un tableau de tableaux (la première feuille non vide). Excel est lu avec exceljs, chargé seulement à ce moment.
// Les anciens fichiers .xls ne sont pas lus : on demande de les enregistrer en .xlsx (ou .csv).
// ------------------------------------------------------------
import { lireCsv } from '../donnees/import-produits.js';

export const TAILLE_MAX_FICHIER = 5 * 1024 * 1024; // 5 Mo

// Valeur d'une cellule Excel en texte ou nombre simple (formules, textes enrichis, dates, liens)
function valeurCellule(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (v.result !== undefined) return valeurCellule(v.result); // formule : son résultat
    if (Array.isArray(v.richText)) return v.richText.map((r) => r.text).join('');
    if (v.text !== undefined) return String(v.text); // lien
    if (v.error) return '';
  }
  return v;
}

/** Lit le fichier. Lance une erreur avec un `code` : 'trop-gros' | 'format' | 'vide' | 'illisible'. */
export async function lireTableur(fichier) {
  const erreur = (code) => Object.assign(new Error(code), { code });
  if (fichier.size > TAILLE_MAX_FICHIER) throw erreur('trop-gros');
  const nom = (fichier.name || '').toLowerCase();
  if (/\.(csv|txt|tsv)$/.test(nom)) {
    const lignes = lireCsv(await fichier.text());
    if (!lignes.length) throw erreur('vide');
    return lignes;
  }
  if (!/\.xlsx$/.test(nom)) throw erreur('format');
  let classeur;
  try {
    const ExcelJS = (await import('exceljs')).default;
    classeur = new ExcelJS.Workbook();
    await classeur.xlsx.load(await fichier.arrayBuffer());
  } catch {
    throw erreur('illisible');
  }
  for (const feuille of classeur.worksheets) {
    const lignes = [];
    feuille.eachRow({ includeEmpty: false }, (ligne) => {
      const cellules = [];
      for (let c = 1; c <= Math.max(ligne.cellCount, 1); c++) cellules.push(valeurCellule(ligne.getCell(c).value));
      lignes.push(cellules);
    });
    if (lignes.length) return lignes;
  }
  throw erreur('vide');
}

/** Modèle d'import à remplir (Excel) : titres, quelques exemples, et une feuille d'aide. `textes` : libellés dans la langue de l'application. */
export async function octetsModeleImport(textes) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const f = wb.addWorksheet(textes.feuille);
  f.columns = textes.colonnes.map((c) => ({ header: c.titre, key: c.cle, width: c.largeur }));
  const entete = f.getRow(1);
  entete.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  entete.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E5B43' } };
  entete.alignment = { vertical: 'middle' };
  entete.height = 22;
  for (const ligne of textes.exemples) f.addRow(ligne);
  f.views = [{ state: 'frozen', ySplit: 1 }];
  const aide = wb.addWorksheet(textes.feuilleAide);
  aide.columns = [{ width: 110 }];
  for (const l of textes.aide) aide.addRow([l]);
  aide.getRow(1).font = { bold: true, size: 13 };
  return wb.xlsx.writeBuffer();
}
