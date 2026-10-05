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

// Petit script placé tout en haut de la page d'accueil du site : redirige avant l'affichage (pas de flash).
// Ajouter ?site=1 à l'adresse pour voir quand même la page publique.
export const SCRIPT_REDIRECTION_ESPACE =
  `try{var e=localStorage.getItem('${CLE}'),a=${JSON.stringify(ADRESSES_ESPACES)};if(e&&a[e]&&!/[?&]site\\b/.test(location.search))location.replace('${BASE_PATH}'+a[e])}catch(_){}`;
