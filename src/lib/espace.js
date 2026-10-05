// ------------------------------------------------------------
// MON ESPACE : retient où la personne est connectée sur cet appareil (application, espace Amorac ou espace commercial)
// pour qu'elle arrive directement chez elle, et non sur la page d'accueil publique du site.
// Seul le NOM de l'espace est gardé (jamais de code ni de jeton). Effacé à la déconnexion.
// ------------------------------------------------------------
import { BASE_PATH } from '@/config';

const CLE = 'kaislo-espace';
export const ADRESSES_ESPACES = { app: '/app/', admin: '/admin/', commercial: '/commercial/' };

export function memoriserEspace(espace) {
  try { if (ADRESSES_ESPACES[espace]) localStorage.setItem(CLE, espace); } catch { /* stockage bloqué */ }
}

// Efface le souvenir (seulement s'il concerne cet espace, pour ne pas écraser un autre espace connecté)
export function oublierEspace(espace) {
  try { if (!espace || localStorage.getItem(CLE) === espace) localStorage.removeItem(CLE); } catch { /* stockage bloqué */ }
}

export function espaceMemorise() {
  try { const e = localStorage.getItem(CLE); return ADRESSES_ESPACES[e] ? e : null; } catch { return null; }
}

// Kaislo ouvert comme une application installée (écran d'accueil du téléphone, Chrome/Edge « Installer », Safari « Sur l'écran d'accueil »)
export const enModeApplication = () => typeof window !== 'undefined' && (!!window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);

// Petit script placé tout en haut de la page d'accueil du site : redirige avant l'affichage (pas de flash).
//  - application installée : toujours dans l'application (sur iPhone, l'icône garde l'adresse de la page où on l'a ajoutée, souvent l'accueil du site)
//  - quelqu'un de connecté : dans son espace
// Ajouter ?site=1 à l'adresse pour voir quand même la page publique.
export const SCRIPT_REDIRECTION_ESPACE =
  `try{var s=(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true,e=localStorage.getItem('${CLE}'),a=${JSON.stringify(ADRESSES_ESPACES)};if(s)location.replace('${BASE_PATH}/app/');else if(e&&a[e]&&!/[?&]site\\b/.test(location.search))location.replace('${BASE_PATH}'+a[e])}catch(_){}`;
