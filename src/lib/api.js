// ------------------------------------------------------------
// APPELS À L'API PHP (dossier api/, sur Hostinger).
//
// API_ACTIVE est faux pour la version de test GitHub Pages (pas de serveur) :
// les comptes restent alors dans le navigateur, comme dans la démo.
// ------------------------------------------------------------
import { chemin } from '@/config';

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
  if (!API_ACTIVE) throw new ErreurApi('Serveur non disponible dans cette version', 0, true);
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new ErreurApi('Pas de connexion internet', 0, true);
  const controle = new AbortController();
  const minuterie = setTimeout(() => controle.abort(), DELAI_MS);
  let reponse;
  try {
    reponse = await fetch(chemin('/api' + adresse), {
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
  } catch {
    throw new ErreurApi('Pas de connexion internet', 0, true);
  } finally {
    clearTimeout(minuterie);
  }
  const json = await reponse.json().catch(() => null);
  if (!reponse.ok || !json?.ok) {
    // Serveur en panne (502, 503…) : traité comme « hors ligne », on réessaiera
    const panne = !json && reponse.status >= 500;
    throw new ErreurApi(json?.erreur || 'Le serveur ne répond pas correctement', reponse.status, panne);
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
