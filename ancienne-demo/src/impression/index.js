// ------------------------------------------------------------
// POINT D'ENTRÉE UNIQUE de l'impression.
// Le reste de l'application n'utilise QUE ce fichier.
// Pour l'application mobile, on changera seulement l'import ci-dessous
// (bluetooth-web.js -> bluetooth-natif.js).
// ------------------------------------------------------------
import * as bluetooth from './bluetooth-web.js';
import { construireTicket, construireTicketCloture, ticketTest } from './ticket.js';
import { versEscPos } from './escpos.js';

export { construireTicket, construireTicketCloture };
export const etatImprimante = bluetooth.etat;
export const surChangementImprimante = bluetooth.surChangement;
export const connecterImprimante = bluetooth.connecter;
export const deconnecterImprimante = bluetooth.deconnecter;

export async function imprimerVente(vente, commerce, prefs) {
  const lignes = construireTicket(vente, commerce, prefs.largeurTicket);
  await bluetooth.envoyer(versEscPos(lignes, prefs.accents));
}

export async function imprimerCloture(cloture, commerce, prefs) {
  const lignes = construireTicketCloture(cloture, commerce, prefs.largeurTicket);
  await bluetooth.envoyer(versEscPos(lignes, prefs.accents));
}

export async function imprimerTest(commerce, prefs) {
  await bluetooth.envoyer(versEscPos(ticketTest(commerce, prefs.largeurTicket), prefs.accents));
}
