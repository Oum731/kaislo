// ------------------------------------------------------------
// SYNCHRONISATION avec le serveur (commerces inscrits en ligne seulement).
//
// La caisse marche toujours avec la copie gardée dans l'appareil.
// Chaque modification est notée dans une FILE D'ATTENTE (gardée elle aussi
// dans l'appareil), envoyée dès qu'internet est là. Puis on récupère ce que
// les autres appareils du commerce ont envoyé.
//
// Règle en cas de conflit : la modification la plus récente gagne.
// Une modification locale pas encore envoyée n'est jamais écrasée.
// ------------------------------------------------------------
import { lireLocal, ecrireLocal } from './stockage.js';
import { enregistrerImage, lireImage } from './images.js';

// Listes du commerce synchronisées élément par élément
export const COLLECTIONS = ['postes', 'categories', 'produits', 'ventes', 'commandes', 'clients', 'remboursements', 'sessionsCaisse', 'depenses', 'mouvements'];
// Champs du commerce gérés par le serveur : jamais envoyés comme « réglages »
const CHAMPS_SERVEUR = ['id', 'code', 'abonnement', 'creeLe', 'conditionsAccepteesLe', 'serveur', 'tarif'];

export const estServeur = (d) => d?.commerce?.serveur === true;

// ---------- File d'attente ----------
// { 'produits:p123': { type, id, modifieLe, supprime? }, ... } — le contenu est relu au moment de l'envoi

export function chargerFile(commerceId) {
  return lireLocal('file:' + commerceId) || {};
}
export function enregistrerFile(commerceId, file) {
  ecrireLocal('file:' + commerceId, file);
}
export const tailleFile = (commerceId) => Object.keys(chargerFile(commerceId)).length;

const estImageLocale = (ref) => typeof ref === 'string' && ref.startsWith('img_');

// Compare l'ancienne et la nouvelle version des données et note ce qui a changé.
// (Les modifications créent de nouveaux objets : un objet différent = un élément modifié.)
export function noterChangements(ancien, nouveau) {
  if (!estServeur(nouveau)) return 0;
  const file = chargerFile(nouveau.commerce.id);
  const t = new Date().toISOString();
  const noter = (type, id, supprime = false) => { file[type + ':' + id] = { type, id, modifieLe: t, ...(supprime ? { supprime: true } : {}) }; };
  const noterImage = (avant, apres) => { if (estImageLocale(apres) && apres !== avant) noter('images', apres); };

  for (const col of COLLECTIONS) {
    const avant = new Map((ancien?.[col] || []).map((x) => [x.id, x]));
    const apres = nouveau[col] || [];
    if (ancien && avant.size === apres.length && ancien[col] === apres) continue; // liste inchangée
    for (const x of apres) {
      const vieux = avant.get(x.id);
      if (vieux !== x) {
        noter(col, x.id);
        noterImage(vieux?.image, x.image);
      }
      avant.delete(x.id);
    }
    for (const id of avant.keys()) noter(col, id, true); // supprimés
  }
  if (!ancien || ancien.commerce !== nouveau.commerce) {
    noter('reglages', 'commerce');
    noterImage(ancien?.commerce?.logo, nouveau.commerce.logo);
  }
  enregistrerFile(nouveau.commerce.id, file);
  return Object.keys(file).length;
}

// Tout le commerce à envoyer (juste après l'inscription)
export function noterTout(d) {
  return noterChangements(null, d);
}

// Prépare les éléments à envoyer (contenu lu dans les données actuelles)
export async function preparerEnvoi(d, file, max = 200) {
  const elements = [];
  for (const e of Object.values(file).slice(0, max)) {
    let contenu = null;
    if (e.type === 'reglages') {
      contenu = { ...d.commerce };
      for (const c of CHAMPS_SERVEUR) delete contenu[c];
    } else if (e.type === 'images') {
      const donnees = await lireImage(e.id);
      contenu = donnees ? { dataUrl: donnees } : null;
    } else if (!e.supprime) {
      contenu = (d[e.type] || []).find((x) => x.id === e.id) || null;
    }
    // Élément introuvable dans l'appareil (supprimé entre-temps) : envoyé comme supprimé
    const supprime = !!e.supprime || !contenu;
    elements.push({ ...e, contenu: supprime ? null : contenu, supprime });
  }
  return elements;
}

// Retire de la file ce qui a été accepté (sauf si modifié à nouveau entre-temps)
export function retirerDeLaFile(commerceId, envoyes, refuses = []) {
  const file = chargerFile(commerceId);
  const refusesCles = new Set(refuses.map((r) => r.cle));
  for (const e of envoyes) {
    const cle = e.type + ':' + e.id;
    if (file[cle]?.modifieLe === e.modifieLe) delete file[cle];
    // Refus définitif (droits, données invalides) : inutile de réessayer
    if (refusesCles.has(cle)) delete file[cle];
  }
  enregistrerFile(commerceId, file);
  return Object.keys(file).length;
}

// ---------- Réception ----------

// Applique les éléments reçus du serveur. Renvoie les nouvelles données.
export async function appliquerElements(d, elements) {
  if (!elements.length) return d;
  const file = chargerFile(d.commerce.id);
  const copie = { ...d };
  const listes = {};
  for (const e of elements) {
    if (file[e.type + ':' + e.id]) continue; // modification locale en attente : elle gagne
    if (e.type === 'reglages') {
      if (!e.supprime) copie.commerce = { ...copie.commerce, ...e.contenu, id: d.commerce.id, code: d.commerce.code, abonnement: d.commerce.abonnement, tarif: d.commerce.tarif, serveur: true };
    } else if (e.type === 'images') {
      if (!e.supprime && e.contenu?.dataUrl) await enregistrerImage(e.contenu.dataUrl, e.id).catch(() => {});
    } else if (COLLECTIONS.includes(e.type)) {
      const liste = (listes[e.type] ||= new Map((copie[e.type] || []).map((x) => [x.id, x])));
      if (e.supprime) liste.delete(e.id);
      else liste.set(e.id, e.contenu);
    }
  }
  for (const [col, liste] of Object.entries(listes)) copie[col] = [...liste.values()];
  return copie;
}

// Informations tenues par le serveur : abonnement, équipe (sans les codes PIN), numéro du prochain ticket
export function fusionServeur(d, rep) {
  const ab = rep.commerce?.abonnement;
  const numeroMax = Math.max(0, ...(d.ventes || []).map((v) => Number(v.numero) || 0));
  return {
    ...d,
    commerce: {
      ...d.commerce,
      // Numéro du commerce : tenu par le serveur (identifiant, changé seulement par l'équipe Amorac)
      ...(rep.commerce?.telephone ? { telephone: rep.commerce.telephone } : {}),
      ...(ab ? { abonnement: { ...(d.commerce.abonnement || {}), ...ab, paiements: d.commerce.abonnement?.paiements || [] } } : {}),
      // Formule, nombre de postes et prix de l'abonnement (calculés par le serveur)
      ...(rep.tarif ? { tarif: rep.tarif } : {}),
    },
    utilisateurs: rep.utilisateurs || d.utilisateurs,
    prochainNumero: Math.max(d.prochainNumero || 1, numeroMax + 1),
  };
}
