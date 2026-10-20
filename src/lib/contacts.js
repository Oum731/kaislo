// ------------------------------------------------------------
// CONTACTS DU TÉLÉPHONE : choisir le numéro d'un client dans son répertoire au lieu de le taper.
//
// Utilise l'API « sélecteur de contacts » du navigateur (Chrome sur Android, y compris l'application installée) :
//   - Kaislo NE LIT PAS le répertoire : le téléphone ouvre sa propre fenêtre, la vendeuse touche UN contact, et seuls
//     son nom et ses numéros sont transmis à l'application, pour ce client seulement ;
//   - rien n'est copié ni envoyé ailleurs que dans la fiche ou le reçu en cours ;
//   - iPhone (Safari) et ordinateurs : l'API n'existe pas, le bouton n'apparaît pas et la saisie reste comme avant.
// ------------------------------------------------------------

export const contactsDisponibles = () =>
  typeof navigator !== 'undefined' && typeof window !== 'undefined' && 'ContactsManager' in window && typeof navigator.contacts?.select === 'function';

const nettoyerNumero = (t) => String(t).trim().replace(/[^\d+]/g, ''); // « 07 12-34.56 78 » → « 0712345678 »

/**
 * Réponse du sélecteur ([{ name: [...], tel: [...] }]) → { nom, numeros: [...] }, ou null si rien n'a été choisi.
 * Les numéros identiques (écrits différemment) ne sont gardés qu'une fois.
 */
export function contactDepuisSelection(selection) {
  const c = Array.isArray(selection) ? selection[0] : null;
  if (!c) return null;
  const nom = (c.name || []).map((n) => String(n).trim()).find(Boolean) || '';
  const numeros = [...new Set((c.tel || []).map(nettoyerNumero).filter((n) => n.replace(/\D/g, '').length >= 6))];
  return { nom, numeros };
}

/** Ouvre le sélecteur du téléphone (à appeler depuis un appui). Renvoie { nom, numeros } ou null si la personne annule. */
export async function choisirContact() {
  try {
    return contactDepuisSelection(await navigator.contacts.select(['name', 'tel'], { multiple: false }));
  } catch (e) {
    if (e?.name === 'AbortError' || e?.name === 'NotAllowedError') return null; // annulé, ou refusé
    throw e;
  }
}
