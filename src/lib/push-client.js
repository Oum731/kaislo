// ------------------------------------------------------------
// NOTIFICATIONS PUSH, côté appareil : autoriser, s'abonner, se désabonner (le serveur : api/lib/push.php ; l'affichage : public/sw.js).
// Ce fichier est appelé seulement à un clic du gérant (la permission du navigateur se demande après un geste de l'utilisateur).
// ------------------------------------------------------------
import { appelApi, nomAppareil } from './api.js';

export const pushSupporte = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

// iPhone et iPad : les notifications ne marchent qu'une fois Kaislo ajouté à l'écran d'accueil
export function iosNonInstalle() {
  if (typeof navigator === 'undefined') return false;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const installe = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
  return ios && !installe;
}

const versOctets = (base64url) => {
  const b = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
};

/** { supporte, permission: 'default'|'granted'|'denied', abonne } pour cet appareil */
export async function etatPush() {
  if (!pushSupporte()) return { supporte: false, permission: 'denied', abonne: false };
  let abonne = false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    abonne = !!(reg && (await reg.pushManager.getSubscription()));
  } catch { /* navigateur sans abonnement */ }
  return { supporte: true, permission: Notification.permission, abonne };
}

/** Demande l'autorisation, abonne cet appareil et le déclare au serveur. Lance une erreur avec un `code` : 'refuse' | 'indisponible'. */
export async function activerPush(clePublique, jeton) {
  const erreur = (code) => Object.assign(new Error(code), { code });
  if (!pushSupporte() || !clePublique) throw erreur('indisponible');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw erreur('refuse');
  const reg = await navigator.serviceWorker.ready;
  const abonnement = (await reg.pushManager.getSubscription())
    || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: versOctets(clePublique) }));
  await appelApi('POST', '/push/abonner', { endpoint: abonnement.endpoint, appareil: nomAppareil() }, jeton);
}

export async function desactiverPush(jeton) {
  const reg = await navigator.serviceWorker.getRegistration();
  const abonnement = reg && (await reg.pushManager.getSubscription());
  if (!abonnement) return;
  const endpoint = abonnement.endpoint;
  await abonnement.unsubscribe();
  await appelApi('POST', '/push/desabonner', { endpoint }, jeton).catch(() => {});
}
