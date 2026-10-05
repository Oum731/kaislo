// ------------------------------------------------------------
// Connexion à une imprimante thermique Bluetooth BLE via le navigateur
// (Web Bluetooth : Chrome sur Android uniquement).
//
// Dans la future application mobile, ce fichier sera remplacé par un
// fichier équivalent utilisant le Bluetooth natif du téléphone
// (iPhone + imprimantes Bluetooth "classique"). Les autres fichiers
// n'auront pas à changer.
// ------------------------------------------------------------

// Services BLE utilisés par les imprimantes thermiques les plus courantes
import { tr } from '../i18n/index.js';
const SERVICES_CONNUS = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '0000ae30-0000-1000-8000-00805f9b34fb',
  '0000fee7-0000-1000-8000-00805f9b34fb',
];

const TAILLE_PAQUET = 100; // on envoie les données par petits morceaux

let appareil = null;
let caracteristique = null;
const ecouteurs = new Set();

function prevenir() {
  for (const cb of ecouteurs) cb(etat());
}

export function etat() {
  return {
    disponible: typeof navigator !== "undefined" && !!navigator.bluetooth,
    connectee: !!(appareil && appareil.gatt.connected && caracteristique),
    nom: appareil ? appareil.name || 'Imprimante' : '',
  };
}

export function surChangement(cb) {
  ecouteurs.add(cb);
  return () => ecouteurs.delete(cb);
}

// Cherche une "caractéristique" sur laquelle on peut écrire (= l'entrée de l'imprimante)
async function trouverCaracteristique(serveur) {
  const services = await serveur.getPrimaryServices();
  for (const service of services) {
    for (const c of await service.getCharacteristics()) {
      if (c.properties.write || c.properties.writeWithoutResponse) return c;
    }
  }
  throw new Error(tr('Cet appareil ne semble pas être une imprimante compatible.'));
}

async function ouvrirConnexion() {
  const serveur = await appareil.gatt.connect();
  caracteristique = await trouverCaracteristique(serveur);
  prevenir();
}

// Ouvre la fenêtre de choix de l'appareil Bluetooth
export async function connecter() {
  if (!navigator.bluetooth) {
    throw new Error(tr('Bluetooth indisponible : utilisez Chrome sur un téléphone Android.'));
  }
  appareil = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: SERVICES_CONNUS,
  });
  appareil.addEventListener('gattserverdisconnected', () => {
    caracteristique = null;
    prevenir();
  });
  await ouvrirConnexion();
}

export function deconnecter() {
  if (appareil?.gatt.connected) appareil.gatt.disconnect();
  appareil = null;
  caracteristique = null;
  prevenir();
}

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// Envoie les octets ESC/POS à l'imprimante
export async function envoyer(octets) {
  if (!appareil) throw new Error(tr('Aucune imprimante connectée.'));
  if (!appareil.gatt.connected || !caracteristique) await ouvrirConnexion(); // reconnexion auto

  const sansReponse = caracteristique.properties.writeWithoutResponse;
  for (let i = 0; i < octets.length; i += TAILLE_PAQUET) {
    const paquet = octets.slice(i, i + TAILLE_PAQUET);
    if (sansReponse) {
      await caracteristique.writeValueWithoutResponse(paquet);
      await pause(25); // laisse le temps à l'imprimante de suivre
    } else {
      await caracteristique.writeValueWithResponse(paquet);
    }
  }
}
