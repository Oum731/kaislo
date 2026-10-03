// ------------------------------------------------------------
// STOCKAGE des données.
//
// Toutes les données sont gardées DANS L'APPAREIL (localStorage) : la caisse
// marche sans internet. Pour les commerces inscrits en ligne, synchro.js
// envoie les modifications au serveur (API PHP) et récupère celles des autres appareils.
// ------------------------------------------------------------
import { creerDonneesDemo, VERSION_DONNEES, COMMERCES_DEMO } from './demo.js';
import { CATEGORIES_DEPART, TABLES_DEPART, paysParId, typeCommerce, cleTelephone } from './modeles.js';
import { genId } from '../utils/format.js';
import { nouvelAbonnement } from './abonnement.js';
import { migrerClotures } from './cloture.js';

const PREFIXE = 'kaislo:';
const ANCIEN_PREFIXE = 'kaisly:'; // nom de l'application avant octobre 2026

// Données enregistrées avant le changement de nom (Kaisly -> Kaislo) : recopiées une seule fois
export function migrerAncienNom() {
  if (typeof window === 'undefined') return;
  try {
    for (const cle of Object.keys(localStorage)) {
      if (!cle.startsWith(ANCIEN_PREFIXE)) continue;
      const nouvelle = PREFIXE + cle.slice(ANCIEN_PREFIXE.length);
      if (localStorage.getItem(nouvelle) === null) localStorage.setItem(nouvelle, localStorage.getItem(cle));
      localStorage.removeItem(cle);
    }
  } catch { /* stockage bloqué : rien à faire */ }
}

function lire(cle) {
  if (typeof window === 'undefined') return null;
  try {
    const brut = localStorage.getItem(PREFIXE + cle);
    return brut ? JSON.parse(brut) : null;
  } catch {
    return null; // navigation privée, stockage bloqué…
  }
}

function ecrire(cle, valeur) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PREFIXE + cle, JSON.stringify(valeur));
  } catch (e) {
    console.warn('Impossible d’enregistrer', e);
  }
}

// Accès direct pour les autres modules (file d'attente de synchronisation…)
export const lireLocal = lire;
export const ecrireLocal = ecrire;

function effacer(cle) {
  try {
    localStorage.removeItem(PREFIXE + cle);
  } catch { /* rien */ }
}

// Les deux commerces d'exemple (restaurant, épicerie)
export function estDemo(commerceId) {
  return COMMERCES_DEMO.some((c) => c.id === commerceId);
}

// Pays choisi pour les démos (devise, ville, paiements)
export function paysDesDemos() {
  return chargerPreferences().paysDemo || 'MA';
}

// Charge les données d'un commerce.
// Commerce de démo : créé la 1re fois, ou recréé si la démo a changé de version
// ou si le visiteur a choisi un autre pays.
// Commerce créé par un client : null s'il n'existe pas.
export function chargerCommerce(commerceId) {
  let donnees = lire('commerce:' + commerceId);
  if (estDemo(commerceId)) {
    const pays = paysDesDemos();
    if (!donnees || donnees.version !== VERSION_DONNEES || donnees.commerce.pays !== pays) {
      donnees = creerDonneesDemo(commerceId, pays);
      ecrire('commerce:' + commerceId, donnees);
    }
  } else if (donnees && (!donnees.commerce.code || !donnees.commerce.abonnement || !donnees.sessionsCaisse || donnees.utilisateurs.some((u) => u.role === 'gerant' && !u.telephone && donnees.commerce.telephone))) {
    // Commerces créés avant le code, les abonnements et l'ouverture de caisse : on les complète
    donnees.commerce.code ||= nouveauCode();
    donnees.commerce.abonnement ||= nouvelAbonnement(new Date(donnees.commerce.creeLe || Date.now()));
    migrerClotures(donnees); // anciennes clôtures -> journées de caisse
    const gerant = donnees.utilisateurs.find((u) => u.role === 'gerant');
    if (gerant && !gerant.telephone && donnees.commerce.telephone) gerant.telephone = donnees.commerce.telephone;
    ecrire('commerce:' + commerceId, donnees);
    majCompte(donnees.commerce);
  }
  return donnees;
}

export function enregistrerCommerce(donnees) {
  ecrire('commerce:' + donnees.commerce.id, donnees);
}

// Remet le commerce de démo à zéro
export function reinitialiserCommerce(commerceId) {
  const donnees = creerDonneesDemo(commerceId, paysDesDemos());
  ecrire('commerce:' + commerceId, donnees);
  return donnees;
}

// ---------- Comptes créés par les commerçants ----------

// Liste des commerces créés (sert à retrouver un commerce par son code
// et à l'espace Amorac). Jamais affichée aux commerçants.
export function listeComptes() {
  return lire('comptes') || [];
}

// Code du commerce : 6 chiffres, unique (pour relier un nouvel appareil)
function nouveauCode() {
  const pris = new Set([...listeComptes().map((c) => c.code), ...COMMERCES_DEMO.map((c) => c.code)]);
  let code;
  do code = String(Math.floor(200000 + Math.random() * 800000));
  while (pris.has(code));
  return code;
}

// Retrouve un commerce à partir de son code (null si inconnu)
// Dans la vraie app : recherche sur le serveur, depuis n'importe quel appareil.
export function trouverParCode(code) {
  const propre = String(code || '').replace(/\D/g, '');
  const demo = COMMERCES_DEMO.find((c) => c.code === propre);
  if (demo) return demo.id;
  return listeComptes().find((c) => c.code === propre)?.id || null;
}

/**
 * Inscription d'un nouveau commerce.
 * infos = { type, nom, pays, ville, telephone, gerantNom, gerantPin }
 * Dans la vraie app : appel à l'API (POST /inscription).
 */
export function creerCommerce(infos, serveur = null) {
  const pays = paysParId(infos.pays);
  // Commerce inscrit en ligne : identifiants et code donnés par le serveur
  const id = serveur?.commerce.id || genId('com');
  const donnees = {
    version: VERSION_DONNEES,
    commerce: {
      id,
      code: serveur?.commerce.code || nouveauCode(),
      ...(serveur ? { serveur: true } : {}),
      nom: infos.nom,
      type: infos.type,
      pays: pays.id,
      devise: pays.devise,
      ville: infos.ville,
      adresse: '',
      telephone: infos.telephone || infos.gerantTelephone,
      piedTicket: 'Merci et à bientôt !',
      modesPaiement: pays.paiements,
      fondDeCaisse: 0,
      tables: typeCommerce(infos.type).tables ? TABLES_DEPART : [],
      creeLe: new Date().toISOString(),
      gerantNom: infos.gerantNom,
      conditionsAccepteesLe: infos.conditionsAccepteesLe || null, // date d'acceptation des conditions d'utilisation
      abonnement: serveur ? { ...nouvelAbonnement(), ...serveur.commerce.abonnement } : nouvelAbonnement(), // essai gratuit de 30 jours
    },
    // En ligne, le code PIN reste sur le serveur (chiffré) : jamais dans l'appareil
    utilisateurs: serveur
      ? [serveur.utilisateur]
      : [{ id: genId('u'), nom: infos.gerantNom, role: 'gerant', telephone: infos.gerantTelephone, pin: infos.gerantPin, actif: true }],
    categories: (CATEGORIES_DEPART[infos.type] || CATEGORIES_DEPART.autre).map((c) => ({ ...c, id: genId('c') })),
    produits: [],
    ventes: [],
    depenses: [],
    sessionsCaisse: [], // journées de caisse (ouverture / fermeture)
    clients: [],
    remboursements: [],
    mouvements: [],
    commandes: [],
    prochainNumero: 1,
  };
  ecrire('commerce:' + id, donnees);
  ecrire('comptes', [...listeComptes().filter((c) => c.id !== id), resumeCompte(donnees.commerce)]);
  return donnees;
}

/**
 * Commerce inscrit en ligne, ouvert sur un nouvel appareil : copie locale vide,
 * remplie ensuite par la synchronisation. rep = réponse de /api/connexion.
 */
export function commerceDepuisServeur(rep) {
  const existant = lire('commerce:' + rep.commerce.id);
  if (existant) return existant;
  const c = rep.commerce;
  const pays = paysParId(c.pays);
  const donnees = {
    version: VERSION_DONNEES,
    commerce: {
      id: c.id, code: c.code, serveur: true, nom: c.nom, type: c.type, pays: c.pays, devise: c.devise, ville: c.ville,
      adresse: '', telephone: c.telephone, piedTicket: 'Merci et à bientôt !', modesPaiement: pays.paiements, fondDeCaisse: 0,
      tables: [], creeLe: c.creeLe, conditionsAccepteesLe: c.conditionsAccepteesLe, abonnement: { ...nouvelAbonnement(), ...c.abonnement },
    },
    utilisateurs: [rep.utilisateur],
    categories: [], produits: [], ventes: [], depenses: [], sessionsCaisse: [], clients: [], remboursements: [], mouvements: [], commandes: [],
    prochainNumero: 1,
  };
  ecrire('commerce:' + c.id, donnees);
  ecrire('comptes', [...listeComptes().filter((x) => x.id !== c.id), resumeCompte(donnees.commerce)]);
  return donnees;
}

function resumeCompte(commerce) {
  const t = typeCommerce(commerce.type);
  return { id: commerce.id, code: commerce.code, nom: commerce.nom, sousTitre: t.nom + ' · ' + commerce.ville, emoji: t.emoji, logo: commerce.logo || null };
}

// Met à jour le résumé du commerce (nom, ville, logo…)
export function majCompte(commerce) {
  ecrire('comptes', listeComptes().map((c) => (c.id === commerce.id ? resumeCompte(commerce) : c)));
}

export function supprimerCommerce(commerceId) {
  effacer('commerce:' + commerceId);
  ecrire('comptes', listeComptes().filter((c) => c.id !== commerceId));
}

// ---------- Connexion par téléphone ----------
// Le numéro de téléphone identifie la personne ET son commerce.
// Dans la vraie app : recherche sur le serveur (numéro unique dans tout Kaislo).

// Renvoie { d, utilisateur } pour ce numéro, ou null
export function trouverParTelephone(telephone) {
  const cle = cleTelephone(telephone);
  if (!cle) return null;
  for (const d of tousLesCommerces()) {
    const u = d.utilisateurs.find((x) => cleTelephone(x.telephone) === cle);
    if (u) return { d, utilisateur: u };
  }
  return null;
}

// Ce numéro est-il déjà utilisé par quelqu'un d'autre ?
export function telephoneDejaUtilise(telephone, sauf = null) {
  const trouve = trouverParTelephone(telephone);
  return !!trouve && trouve.utilisateur.id + '@' + trouve.d.commerce.id !== sauf;
}

// Tous les commerces (espace Amorac). Dans la vraie app : liste venant du serveur.
export function tousLesCommerces() {
  const ids = [...COMMERCES_DEMO.map((c) => c.id), ...listeComptes().map((c) => c.id)];
  return ids.map((id) => chargerCommerce(id)).filter(Boolean);
}

// ---------- Préférences de l'appareil ----------

// Largeur du ticket, commerce relié à cet appareil, pays des démos…
export function chargerPreferences() {
  return { largeurTicket: 58, accents: true, ...(lire('preferences') || {}) };
}

export function enregistrerPreferences(prefs) {
  ecrire('preferences', prefs);
}

