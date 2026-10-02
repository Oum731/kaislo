// ------------------------------------------------------------
// Construction d'une ligne de vente et calcul des totaux.
// Utilisé par la caisse ET par le générateur de ventes de démo.
// ------------------------------------------------------------
import { arrondir } from '../utils/format.js';

// Prix de base d'un produit : le prix promo s'il existe, sinon le prix normal
export function prixDeBase(produit) {
  return produit.promo !== null && produit.promo !== undefined && produit.promo !== '' && produit.promo < produit.prix
    ? Number(produit.promo)
    : produit.prix;
}

/**
 * choix = { [groupeId]: [optionId, optionId, ...] }
 *
 * Règle d'affichage sur le ticket :
 *  - les options à choix UNIQUE complètent le nom : « Attiéké – Poisson grillé »
 *  - les options à choix MULTIPLE apparaissent en dessous : « + Alloco »
 *
 * La ligne garde une COPIE des noms et des prix au moment de la vente :
 * si le gérant change un prix demain, les anciennes ventes restent justes.
 * Elle garde aussi le prix d'achat (coutUnitaire) pour calculer la marge.
 */
export function creerLigne(produit, choix, quantite, devise, categorieNom = '') {
  const morceauxNom = [produit.nom];
  const details = [];
  const optionsChoisies = [];
  const base = prixDeBase(produit);
  let prixUnitaire = base;
  let prixNormal = produit.prix;

  for (const groupe of produit.groupes || []) {
    const ids = choix[groupe.id] || [];
    for (const option of groupe.options) {
      if (!ids.includes(option.id)) continue;
      prixUnitaire += option.prix;
      prixNormal += option.prix;
      optionsChoisies.push({ groupe: groupe.nom, nom: option.nom, prix: option.prix });
      if (groupe.type === 'unique') morceauxNom.push(option.nom);
      else details.push('+ ' + option.nom);
    }
  }

  prixUnitaire = arrondir(prixUnitaire, devise);
  return {
    produitId: produit.id,
    produitNom: produit.nom,
    categorieNom,
    nom: morceauxNom.join(' – '),
    details,
    options: optionsChoisies,
    prixUnitaire,
    // prix sans la promo (pour afficher « au lieu de » sur le ticket)
    prixNormal: base < produit.prix ? arrondir(prixNormal, devise) : null,
    coutUnitaire: produit.prixAchat > 0 ? Number(produit.prixAchat) : null,
    quantite,
    total: arrondir(prixUnitaire * quantite, devise),
  };
}

// Vérifie que tous les groupes obligatoires ont une option choisie.
export function choixComplets(produit, choix) {
  return (produit.groupes || []).every(
    (g) => !g.obligatoire || (choix[g.id] && choix[g.id].length > 0)
  );
}

// Clé qui permet de regrouper deux fois le même article avec les mêmes options.
export function cleLigne(ligne) {
  return ligne.produitId + '|' + ligne.options.map((o) => o.groupe + ':' + o.nom).join(',');
}

export function sousTotal(lignes, devise) {
  return arrondir(lignes.reduce((s, l) => s + l.total, 0), devise);
}

/**
 * Montant de la remise sur toute la vente.
 * remise = { type: 'pourcent' | 'montant', valeur } ou null
 */
export function montantRemise(remise, sousTot, devise) {
  if (!remise || !(remise.valeur > 0)) return 0;
  const m = remise.type === 'pourcent' ? (sousTot * Math.min(100, remise.valeur)) / 100 : remise.valeur;
  return arrondir(Math.min(m, sousTot), devise);
}

// Coût d'achat total d'une vente (null si aucun prix d'achat connu)
export function coutVente(vente) {
  let cout = 0, connu = false;
  for (const l of vente.lignes) {
    if (l.coutUnitaire !== null && l.coutUnitaire !== undefined) {
      cout += l.coutUnitaire * l.quantite;
      connu = true;
    }
  }
  return connu ? cout : null;
}
