// ------------------------------------------------------------
// EMPREINTE DIGITALE / FACE ID dans le navigateur (norme WebAuthn).
//
// Le téléphone garde une clé secrète protégée par l'empreinte ou le visage ;
// le serveur ne reçoit que la clé publique (voir api/lib/biometrie.php).
// Fonctionne sur Android (Chrome) et iPhone (Safari, iOS 16 ou plus récent),
// sur un site en HTTPS.
// ------------------------------------------------------------
import { appelApi, nomAppareil } from './api.js';

const versOctets = (b64url) => Uint8Array.from(atob(b64url.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64url.length + 3) % 4)), (c) => c.charCodeAt(0));
const versTexte = (tampon) => btoa(String.fromCharCode(...new Uint8Array(tampon))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// Le téléphone a-t-il un lecteur d'empreinte ou Face ID utilisable ?
export async function biometrieDisponible() {
  try {
    return typeof window !== 'undefined' && !!window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
  } catch {
    return false;
  }
}

// Nom adapté au téléphone, pour les boutons
export function nomBiometrie() {
  if (typeof navigator === 'undefined') return 'l’empreinte';
  return /iPhone|iPad|Macintosh/.test(navigator.userAgent) ? 'Face ID / Touch ID' : 'l’empreinte digitale';
}

/**
 * Active l'empreinte pour la personne connectée (après une connexion par code PIN).
 * Renvoie l'identifiant de la clé, à garder dans l'appareil.
 */
export async function activerBiometrie(jeton) {
  const o = await appelApi('POST', '/biometrie/defi', { type: 'creation' }, jeton);
  const cle = await navigator.credentials.create({
    publicKey: {
      challenge: versOctets(o.defi),
      rp: { id: o.rpId, name: 'Kaislo' },
      user: { id: versOctets(o.utilisateur.id), name: o.utilisateur.telephone, displayName: o.utilisateur.nom },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
      attestation: 'none',
      timeout: 60000,
    },
  });
  const r = cle.response;
  if (!r.getPublicKey || !r.getAuthenticatorData) throw new Error('Navigateur trop ancien pour l’empreinte : mettez-le à jour');
  await appelApi('POST', '/biometrie/enregistrer', {
    credentialId: cle.id,
    clientDataJSON: versTexte(r.clientDataJSON),
    authenticatorData: versTexte(r.getAuthenticatorData()),
    publicKey: versTexte(r.getPublicKey()),
    alg: r.getPublicKeyAlgorithm(),
    appareil: nomAppareil(),
  }, jeton);
  return cle.id;
}

// Demande l'empreinte au téléphone (défi du serveur, ou défi local si pas d'internet)
async function signer(credentialId, defi, rpId) {
  return navigator.credentials.get({
    publicKey: {
      challenge: defi,
      ...(rpId ? { rpId } : {}),
      allowCredentials: [{ type: 'public-key', id: versOctets(credentialId) }],
      userVerification: 'required',
      timeout: 60000,
    },
  });
}

/**
 * Connexion par empreinte. Renvoie la réponse du serveur (jeton, utilisateur, commerce),
 * ou { horsLigne: true } si l'empreinte est reconnue par le téléphone mais qu'internet manque.
 */
export async function connexionBiometrie(credentialId) {
  let o;
  try {
    o = await appelApi('POST', '/biometrie/defi', { type: 'connexion' });
  } catch (e) {
    if (!e.horsLigne) throw e;
    // Sans internet : le téléphone vérifie quand même l'empreinte avant d'ouvrir la caisse
    await signer(credentialId, crypto.getRandomValues(new Uint8Array(32)));
    return { horsLigne: true };
  }
  const a = await signer(credentialId, versOctets(o.defi), o.rpId);
  return appelApi('POST', '/biometrie/connexion', {
    credentialId: a.id,
    clientDataJSON: versTexte(a.response.clientDataJSON),
    authenticatorData: versTexte(a.response.authenticatorData),
    signature: versTexte(a.response.signature),
    appareil: nomAppareil(),
  });
}
