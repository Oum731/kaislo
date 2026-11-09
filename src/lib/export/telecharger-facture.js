// Remet la facture en PDF : partage du téléphone ou téléchargement (voir livrer.js)
import { livrerFichier, MIME_PDF } from './livrer.js';

export async function telechargerFacture(facture) {
  const { octetsPdfFacture, nomFichierFacture } = await import('./facture-pdf.js');
  return livrerFichier(await octetsPdfFacture(facture), nomFichierFacture(facture), MIME_PDF);
}
