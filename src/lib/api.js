// ------------------------------------------------------------
// APPELS À L'API PHP (dossier api/, sur Hostinger).
//
// API_ACTIVE est faux pour la version de test GitHub Pages (pas de serveur) :
// les comptes restent alors dans le navigateur, comme dans la démo.
// ------------------------------------------------------------
import { chemin } from '@/config';
import { tr } from './i18n/index.js';

export const API_ACTIVE = process.env.NEXT_PUBLIC_API !== 'non';
const DELAI_MS = 20000;

export class ErreurApi extends Error {
  /** statut : code HTTP (0 = pas de réponse) · horsLigne : pas d'internet ou serveur injoignable */
  constructor(message, statut = 0, horsLigne = false) {
    super(message);
    this.statut = statut;
    this.horsLigne = horsLigne;
  }
}

/**
 * appelApi('POST', '/connexion', { telephone, pin })
 * Renvoie la réponse JSON ; lève ErreurApi avec le message du serveur en cas d'erreur.
 */
export async function appelApi(methode, adresse, corps = null, jeton = null) {
  if (!API_ACTIVE) throw new ErreurApi(tr('Serveur non disponible dans cette version'), 0, true);
  // « navigator.onLine » se trompe parfois sur téléphone (application installée, changement de réseau) : on tente toujours la requête
  const controle = new AbortController();
  const minuterie = setTimeout(() => controle.abort(), DELAI_MS);
  const requete = () => fetch(chemin('/api' + adresse), {
    method: methode,
    headers: {
      'Content-Type': 'application/json',
      // Les deux en-têtes : certains hébergements masquent « Authorization »
      ...(jeton ? { Authorization: 'Bearer ' + jeton, 'X-Kaislo-Jeton': jeton } : {}),
    },
    body: corps ? JSON.stringify(corps) : undefined,
    signal: controle.signal,
    cache: 'no-store',
  });
  let reponse;
  try {
    try {
      reponse = await requete();
    } catch (e) {
      // Réseau qui se réveille (retour dans l'application, changement de Wi-Fi / 4G) : une seconde tentative, pour les lectures seulement
      if (methode !== 'GET' || controle.signal.aborted) throw e;
      await new Promise((r) => setTimeout(r, 1200));
      reponse = await requete();
    }
  } catch {
    throw new ErreurApi(tr('Pas de connexion internet'), 0, true);
  } finally {
    clearTimeout(minuterie);
  }
  const json = await reponse.json().catch(() => null);
  if (!reponse.ok || !json?.ok) {
    // Serveur en panne (502, 503…) : traité comme « hors ligne », on réessaiera
    const panne = !json && reponse.status >= 500;
    throw new ErreurApi(json?.erreur || tr('Le serveur ne répond pas correctement'), reponse.status, panne);
  }
  return json;
}

// Nom lisible de l'appareil (affiché au gérant dans la liste des appareils connectés)
export function nomAppareil() {
  if (typeof navigator === 'undefined') return '';
  const ua = navigator.userAgent;
  const systeme = /iPhone|iPad/.test(ua) ? 'iPhone / iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : 'Appareil';
  const navigateur = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /Firefox\//.test(ua) ? 'Firefox' : '';
  return [systeme, navigateur].filter(Boolean).join(' · ');
}
