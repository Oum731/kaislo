// ------------------------------------------------------------
// Construction d'une ligne de vente à partir d'un produit + options choisies.
// Utilisé par la caisse ET par le générateur de ventes de démo.
// ------------------------------------------------------------
import { arrondir } from '../utils/format.js';

/**
 * choix = { [groupeId]: [optionId, optionId, ...] }
 *
 * Règle d'affichage sur le ticket :
 *  - les options à choix UNIQUE complètent le nom : « Attiéké – Poisson grillé »
 *  - les options à choix MULTIPLE apparaissent en dessous : « + Alloco »
 *
 * La ligne garde une COPIE des noms et des prix au moment de la vente :
 * si le gérant change un prix demain, les anciennes ventes restent justes.
 */
export function creerLigne(produit, choix, quantite, devise, categorieNom = '') {
  const morceauxNom = [produit.nom];
  const details = [];
  const optionsChoisies = [];
  let prixUnitaire = produit.prix;

  for (const groupe of produit.groupes || []) {
    const ids = choix[groupe.id] || [];
    for (const option of groupe.options) {
      if (!ids.includes(option.id)) continue;
      prixUnitaire += option.prix;
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
