// ------------------------------------------------------------
// POINT D'ENTRÉE UNIQUE de l'impression.
// Le reste de l'application n'utilise QUE ce fichier.
// Pour l'application mobile, on changera seulement l'import ci-dessous
// (bluetooth-web.js -> bluetooth-natif.js).
// ------------------------------------------------------------
import * as bluetooth from './bluetooth-web.js';
import { versEscPos, logoEnRaster } from './escpos.js';
import { lireImage } from '../donnees/images.js';

export {
  construireTicket,
  construireTicketCloture,
  construireTicketCuisine,
  construireTicketRemboursement,
  ticketEnTexteWhatsApp,
  ticketTest,
} from './ticket.js';

export const etatImprimante = bluetooth.etat;
export const surChangementImprimante = bluetooth.surChangement;
export const connecterImprimante = bluetooth.connecter;
export const deconnecterImprimante = bluetooth.deconnecter;

// Imprime n'importe quel ticket déjà mis en page (liste de lignes)
export async function imprimerLignes(lignes, prefs) {
  // Le logo (s'il y en a un) est converti en points noirs avant l'envoi
  let logo = null;
  const ligneLogo = lignes.find((l) => l.logo);
  if (ligneLogo) {
    try {
      const src = await lireImage(ligneLogo.ref);
      if (src) logo = await logoEnRaster(src, prefs.largeurTicket);
    } catch {
      logo = null; // logo illisible : on imprime le ticket sans
    }
  }
  await bluetooth.envoyer(versEscPos(lignes, prefs.accents, logo));
}
