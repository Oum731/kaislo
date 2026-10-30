// ------------------------------------------------------------
// INVITATION À DONNER SON AVIS sur Kaislo : proposée au gérant qui a utilisé Kaislo au moins 3 jours différents.
// Un jour d'usage = un jour où il a ouvert son commerce dans l'application (compté sur ce téléphone).
// « Plus tard » : on ne redemande qu'après 7 jours, puis 30 jours, puis plus jamais ; « Ne plus demander » et l'envoi d'un avis arrêtent tout.
// Fonctions pures (testées dans tests/invitation-avis.test.mjs) ; l'affichage est dans components/app/InvitationAvis.jsx.
// ------------------------------------------------------------

export const JOURS_AVANT_INVITATION = 3;
const JOUR = 86400000;

const jourDe = (date) => new Date(date).toISOString().slice(0, 10);

/** Ajoute aujourd'hui aux jours d'usage (sans doublon, les 10 derniers). Renvoie la même liste si le jour est déjà noté. */
export function noterJourUsage(jours = [], maintenant = Date.now()) {
  const j = jourDe(maintenant);
  return jours.includes(j) ? jours : [...jours, j].sort().slice(-10);
}

/**
 * Faut-il proposer l'avis maintenant ?
 * jours : jours d'usage · invitation : { refus, dernier, fait, jamais } · avisDonne : le serveur a déjà un avis de ce commerce
 */
export function doitInviter({ jours = [], invitation = {}, avisDonne = false }, maintenant = Date.now()) {
  if (avisDonne || invitation.fait || invitation.jamais) return false;
  if (jours.length < JOURS_AVANT_INVITATION) return false;
  const refus = invitation.refus || 0;
  if (refus === 0) return true;
  if (refus >= 3) return false;
  return maintenant - (invitation.dernier || 0) >= (refus === 1 ? 7 : 30) * JOUR;
}
