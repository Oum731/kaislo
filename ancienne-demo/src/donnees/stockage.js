// ------------------------------------------------------------
// STOCKAGE des données.
//
// Dans la démo, tout est enregistré DANS LE TÉLÉPHONE (localStorage).
// Dans la vraie application, seul ce fichier changera : ces fonctions
// appelleront l'API du serveur Laravel au lieu du localStorage.
// Le reste de l'application n'a pas besoin de savoir où vont les données.
// ------------------------------------------------------------
import { creerDonneesDemo, VERSION_DONNEES, COMMERCES_DEMO } from './demo.js';
import { CATEGORIES_DEPART, paysParId, typeCommerce } from './modeles.js';
import { genId } from '../utils/format.js';

const PREFIXE = 'kaisly-demo:';

function lire(cle) {
  try {
    const brut = localStorage.getItem(PREFIXE + cle);
    return brut ? JSON.parse(brut) : null;
  } catch {
    return null; // navigation privée, stockage bloqué…
  }
}

function ecrire(cle, valeur) {
  try {
    localStorage.setItem(PREFIXE + cle, JSON.stringify(valeur));
  } catch (e) {
    console.warn('Impossible d’enregistrer', e);
  }
}

function effacer(cle) {
  try {
    localStorage.removeItem(PREFIXE + cle);
  } catch { /* rien */ }
}

// Les deux commerces d'exemple (maquis, épicerie)
export function estDemo(commerceId) {
  return COMMERCES_DEMO.some((c) => c.id === commerceId);
}

// Charge les données d'un commerce.
// Commerce de démo : créé la 1re fois (ou recréé si la démo a changé de version).
// Commerce créé par un client : null s'il n'existe pas.
export function chargerCommerce(commerceId) {
  let donnees = lire('commerce:' + commerceId);
  if (estDemo(commerceId) && (!donnees || donnees.version !== VERSION_DONNEES)) {
    donnees = creerDonneesDemo(commerceId);
    ecrire('commerce:' + commerceId, donnees);
  }
  return donnees;
}

export function enregistrerCommerce(donnees) {
  ecrire('commerce:' + donnees.commerce.id, donnees);
}

// Remet le commerce de démo à zéro
export function reinitialiserCommerce(commerceId) {
  const donnees = creerDonneesDemo(commerceId);
  ecrire('commerce:' + commerceId, donnees);
  return donnees;
}

// ---------- Comptes créés par les commerçants ----------

// Liste courte des commerces créés sur ce téléphone (pour l'écran de connexion)
export function listeComptes() {
  return lire('comptes') || [];
}

/**
 * Inscription d'un nouveau commerce.
 * infos = { type, nom, pays, ville, telephone, gerantNom, gerantPin }
 * Dans la vraie app : appel à l'API (POST /inscription).
 */
export function creerCommerce(infos) {
  const pays = paysParId(infos.pays);
  const id = genId('com');
  const donnees = {
    version: VERSION_DONNEES,
    commerce: {
      id,
      nom: infos.nom,
      type: infos.type,
      pays: pays.id,
      devise: pays.devise,
      ville: infos.ville,
      adresse: '',
      telephone: infos.telephone,
      piedTicket: 'Merci et à bientôt !',
      modesPaiement: pays.paiements,
      fondDeCaisse: 0,
      creeLe: new Date().toISOString(),
    },
    utilisateurs: [
      { id: genId('u'), nom: infos.gerantNom, role: 'gerant', pin: infos.gerantPin, actif: true },
    ],
    categories: (CATEGORIES_DEPART[infos.type] || CATEGORIES_DEPART.autre).map((c) => ({ ...c, id: genId('c') })),
    produits: [],
    ventes: [],
    depenses: [],
    clotures: [],
    prochainNumero: 1,
  };
  ecrire('commerce:' + id, donnees);
  const t = typeCommerce(infos.type);
  ecrire('comptes', [...listeComptes(), { id, nom: infos.nom, sousTitre: t.nom + ' · ' + infos.ville, emoji: t.emoji }]);
  return donnees;
}

// Met à jour le nom affiché dans la liste des comptes
export function majCompte(commerce) {
  const t = typeCommerce(commerce.type);
  ecrire('comptes', listeComptes().map((c) =>
    c.id === commerce.id ? { ...c, nom: commerce.nom, sousTitre: t.nom + ' · ' + commerce.ville } : c
  ));
}

export function supprimerCommerce(commerceId) {
  effacer('commerce:' + commerceId);
  ecrire('comptes', listeComptes().filter((c) => c.id !== commerceId));
}

// ---------- Préférences de l'appareil ----------

// Largeur du ticket, dernier commerce ouvert…
export function chargerPreferences() {
  return { largeurTicket: 58, accents: true, ...(lire('preferences') || {}) };
}

export function enregistrerPreferences(prefs) {
  ecrire('preferences', prefs);
}
