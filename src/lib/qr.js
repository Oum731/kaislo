// ------------------------------------------------------------
// CODE QR créé dans l'appareil (sans service extérieur) : renvoie une image (adresse « data: ») à mettre dans <img src>.
// Sert au paiement : le code d'un lien Wave contenant le montant de la formule du commerce (voir FeuilleVirement.jsx).
// ------------------------------------------------------------
import qrcode from 'qrcode-generator';

/** Image SVG (data:) du code QR de ce texte. Niveau de correction « M », marge de 4 modules (comme la norme). */
export function qrDataUrl(texte, { cellule = 6 } = {}) {
  const q = qrcode(0, 'M');
  q.addData(String(texte));
  q.make();
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(q.createSvgTag({ cellSize: cellule, margin: 4, scalable: true }));
}
