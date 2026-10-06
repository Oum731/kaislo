// ------------------------------------------------------------
// SUIVI DES INSCRIPTIONS (Google Ads)
// Sert à savoir quelles publicités amènent de vrais commerces. Respecte le choix du visiteur :
//  - aucun identifiant (GOOGLE_ADS_ID vide) : le module ne fait rien du tout ;
//  - identifiant rempli : la balise Google ne se charge QU'APRÈS l'accord du visiteur (bandeau), et un refus est gardé ;
//  - jamais dans les espaces /admin/ et /commercial/ (équipe) ;
//  - la balise se charge sans bloquer l'affichage (après le chargement de la page, au repos), pour ne pas ralentir le site.
// Les données de vente et de clients de Kaislo ne sont JAMAIS envoyées : seulement « une inscription a eu lieu ».
// ------------------------------------------------------------
import { GOOGLE_ADS_ID, GOOGLE_ADS_INSCRIPTION } from '../config.js';

const CLE = 'kaislo-mesure'; // 'oui' | 'non' (absent = pas encore répondu)
const PAGES_SANS_MESURE = /^\/(admin|commercial)(\/|$)/;

export const mesureActive = () => !!GOOGLE_ADS_ID;
export const pageSansMesure = (chemin) => PAGES_SANS_MESURE.test(chemin || '');

export function choixMesure() {
  try { const v = localStorage.getItem(CLE); return v === 'oui' || v === 'non' ? v : null; } catch { return null; }
}

function memoriser(valeur) {
  try { localStorage.setItem(CLE, valeur); } catch { /* stockage bloqué : le choix ne sera pas gardé */ }
}

let chargee = false;

// Prépare gtag et charge le script Google (une seule fois)
export function chargerBalise() {
  if (!mesureActive() || chargee || typeof window === 'undefined' || choixMesure() !== 'oui') return false;
  chargee = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GOOGLE_ADS_ID, { allow_enhanced_conversions: false });
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GOOGLE_ADS_ID);
  document.head.appendChild(s);
  return true;
}

// Charge la balise sans gêner l'affichage : après le chargement de la page, quand le navigateur est au repos
export function chargerBaliseAuRepos() {
  if (!mesureActive() || typeof window === 'undefined' || choixMesure() !== 'oui') return;
  const lancer = () => (window.requestIdleCallback ? window.requestIdleCallback(chargerBalise, { timeout: 4000 }) : setTimeout(chargerBalise, 2000));
  if (document.readyState === 'complete') lancer();
  else window.addEventListener('load', lancer, { once: true });
}

export function accepterMesure() {
  memoriser('oui');
  chargerBaliseAuRepos();
}

export function refuserMesure() {
  memoriser('non');
  // Retire les cookies de mesure déjà posés (cookies Google Ads du site : _gcl_*)
  try {
    for (const c of document.cookie.split(';')) {
      const nom = c.split('=')[0].trim();
      if (/^_gcl_/.test(nom)) document.cookie = nom + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    }
  } catch { /* rien */ }
}

/** Une inscription vient d'avoir lieu : la compter dans Google Ads (seulement si le visiteur a accepté). */
export function suivreInscription() {
  if (!mesureActive() || typeof window === 'undefined' || choixMesure() !== 'oui') return false;
  chargerBalise(); // s'assure que gtag existe (les événements attendent le script dans dataLayer)
  if (GOOGLE_ADS_INSCRIPTION) window.gtag('event', 'conversion', { send_to: GOOGLE_ADS_ID + '/' + GOOGLE_ADS_INSCRIPTION });
  window.gtag('event', 'sign_up', { method: 'kaislo' });
  return true;
}
