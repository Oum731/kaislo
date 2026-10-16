// ------------------------------------------------------------
// LISTE UNIQUE DES PAYS : le fichier api/lib/pays.json (lu aussi par le serveur PHP).
// POUR AJOUTER UN PAYS, c'est le seul fichier à modifier. Chaque pays y décrit :
//   id, nom, devise, indicatif, ville, paiements    : inscription, devises, modes de paiement
//   telephone { longueurs, zeroNational, groupes, exemple } : règles des numéros (absent = pas de règle)
//   fuseaux     : fuseaux horaires qui permettent de deviner le pays du visiteur
//   article     : « en » ou « au » (en Côte d'Ivoire, au Mali)
//   seo { slug, commerces } : page /pays/<slug>/ et commerces courants (absent = pas de page)
//   en { nom, slug } : nom et adresse anglais
//   restauration : règles propres aux restaurants, cafés et bars (caisse certifiée…) :
//                  « avis »     = l'inscription demande de confirmer que Kaislo est un outil de gestion et que le commerçant reste seul responsable ;
//                  « desactive » = les commerces à tables (restaurant, maquis, bar) ne sont pas proposés dans ce pays ;
//                  absent       = aucune restriction particulière. À faire valider par un juriste ou un comptable du pays.
// Les devises nouvelles demandent en plus des prix (tarifs.js et api/lib/tarifs.php).
// ------------------------------------------------------------
import donneesPays from '../../../api/lib/pays.json' with { type: 'json' };

export const DONNEES_PAYS = donneesPays;

/** « en » ou « au » devant le nom d'un pays (« en Côte d’Ivoire », « au Mali ») ; « en » par défaut. */
export const articlePays = (id) => DONNEES_PAYS.find((p) => p.id === id)?.article || 'en';
