// ------------------------------------------------------------
// INSTALLER KAISLO sur le téléphone : quel parcours proposer, et quand.
// Presque personne ne sait qu'un site peut s'installer : on choisit le geste le plus court selon l'appareil et le navigateur.
//   bouton        Chrome/Edge (Android) : le navigateur a prévenu qu'il sait installer → un bouton « Installer »
//   android-menu  Android sans bouton possible (Chrome pas encore prêt, Samsung Internet…) : menu ⋮ → Installer l'application
//   ios           iPhone / iPad : Partager → Sur l'écran d'accueil
//   ouvrir        navigateur intégré (Facebook, Instagram, WhatsApp, TikTok…) : il ne sait pas installer → l'ouvrir dans Chrome ou Safari
//   null          ordinateur, ou rien à proposer
// Fonctions pures (testées dans tests/installer-pwa.test.mjs) ; le composant est src/components/site/ProposerInstallation.jsx.
// ------------------------------------------------------------

const JOUR = 86400000;

export function typeAppareil(ua = '', plateforme = '', pointsTactiles = 0) {
  if (/iPhone|iPad|iPod/.test(ua) || (plateforme === 'MacIntel' && pointsTactiles > 1)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'autre';
}

/** Navigateurs intégrés aux applications (publicités Facebook/Instagram, liens WhatsApp ou TikTok) : ils ne savent pas installer. */
export function estNavigateurIntegre(ua = '') {
  return /FBAN|FBAV|FB_IAB|Instagram|Messenger|MicroMessenger|Line\/|TikTok|musical_ly|Snapchat|LinkedInApp|Twitter|; wv\)/i.test(ua);
}

/** Parcours à proposer. proposition : le navigateur a-t-il annoncé qu'il sait installer (beforeinstallprompt) ? */
export function choisirParcours({ ua = '', plateforme = '', pointsTactiles = 0, proposition = false }) {
  const appareil = typeAppareil(ua, plateforme, pointsTactiles);
  if (appareil === 'autre') return null;
  if (estNavigateurIntegre(ua)) return 'ouvrir';
  if (appareil === 'ios') return 'ios';
  return proposition ? 'bouton' : 'android-menu';
}

/**
 * Faut-il proposer maintenant ? etat : { refus: nombre de « Plus tard », dernier: date du dernier refus (ms), installe: bool }.
 * Première visite : oui. Après un « Plus tard » : on attend 3 jours, puis 30 jours ; jamais après 3 refus ni après l'installation.
 */
export function doitProposer(etat, maintenant = Date.now()) {
  if (!etat) return true;
  if (etat.installe) return false;
  const refus = etat.refus || 0;
  if (refus === 0) return true;
  if (refus >= 3) return false;
  return maintenant - (etat.dernier || 0) >= (refus === 1 ? 3 : 30) * JOUR;
}
