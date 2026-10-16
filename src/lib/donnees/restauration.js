// ------------------------------------------------------------
// RESTAURATION ET RÈGLES LOCALES : dans certains pays (caisse enregistreuse certifiée pour les restaurants et cafés…),
// Kaislo n'est qu'un outil de gestion. Le réglage de chaque pays est le champ « restauration » de api/lib/pays.json
// (voir liste-pays.js) ; le serveur applique les mêmes règles (api/lib/outils.php, reglementRestauration).
// Types concernés : ceux qui ont des tables (restaurant, maquis / snack / fast-food, bar / café / lounge).
// ------------------------------------------------------------
import { DONNEES_PAYS } from './liste-pays.js';

export const TYPES_RESTAURATION = ['restaurant', 'maquis', 'bar'];

/** '' (rien de particulier) | 'avis' (confirmation obligatoire à l'inscription) | 'desactive' (non proposé) */
export function reglementRestauration(paysId, typeId) {
  if (!TYPES_RESTAURATION.includes(typeId)) return '';
  return DONNEES_PAYS.find((p) => p.id === paysId)?.restauration || '';
}
