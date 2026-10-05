// ------------------------------------------------------------
// STOCK CALCULÉ À PARTIR DES MOUVEMENTS
//
// Avant : le stock était un nombre dans la fiche du produit, réécrit à chaque vente. Deux appareils qui vendent
// sans internet s'écrasaient l'un l'autre (« la modification la plus récente gagne ») et le stock devenait faux.
//
// Maintenant, le stock se calcule :
//     stock = quantité de départ (stockBase)
//           + entrées de marchandise et corrections d'inventaire (mouvements) depuis stockDepuis
//           − articles vendus (ventes non annulées) depuis stockDepuis
// Ventes et mouvements ne changent jamais une fois enregistrés : quand les appareils se synchronisent, tout s'additionne
// sans conflit possible. La fiche du produit ne change plus à chaque vente.
//
//   stockBase    : quantité au moment de la création du produit (ou de la mise en suivi du stock)
//   stockDepuis  : date à partir de laquelle on compte les ventes et mouvements
//   stockActuel  : résultat du calcul, gardé dans l'appareil (jamais envoyé au serveur)
//   stock        : ancien champ — produits d'avant ce changement : sert de quantité de départ, comptée depuis DEPUIS_ANCIENS
// ------------------------------------------------------------

// Produits créés avant le stock par mouvements : leur ancien champ « stock » est la quantité de départ,
// et on compte ventes et mouvements à partir de cette date.
export const DEPUIS_ANCIENS = '2026-10-05T00:00:00.000Z';

export const stockDe = (p) => p.stockActuel ?? p.stock ?? 0;

export const baseDe = (p) => p.stockBase ?? p.stock ?? 0;
export const depuisDe = (p) => p.stockDepuis ?? DEPUIS_ANCIENS;

// Champs de stock à donner à un produit tout neuf (ou dont on commence à suivre le stock)
export const departStock = (quantite, maintenant = new Date().toISOString()) => ({ stockBase: Number(quantite) || 0, stockDepuis: maintenant });

let memo = null; // dernier calcul : mêmes listes en entrée → même résultat

/**
 * Renvoie les données avec « stockActuel » à jour sur chaque produit dont le stock est suivi.
 * Les produits dont le stock n'a pas changé gardent le même objet (rien n'est renvoyé au serveur pour rien).
 */
export function avecStocks(d) {
  if (!d?.produits) return d;
  if (memo && memo.produits === d.produits && memo.ventes === d.ventes && memo.mouvements === d.mouvements) {
    return memo.sortie === d.produits ? d : { ...d, produits: memo.sortie };
  }
  const suivis = new Map();
  for (const p of d.produits) if (p.suiviStock) suivis.set(p.id, { p, delta: 0 });

  for (const v of d.ventes || []) {
    if (v.annulee) continue;
    for (const l of v.lignes || []) {
      const s = suivis.get(l.produitId);
      if (s && v.date >= depuisDe(s.p)) s.delta -= Number(l.quantite) || 0;
    }
  }
  for (const m of d.mouvements || []) {
    const s = suivis.get(m.produitId);
    if (s && m.date >= depuisDe(s.p)) s.delta += Number(m.quantite) || 0;
  }

  let change = false;
  const produits = d.produits.map((p) => {
    const s = suivis.get(p.id);
    if (!s) return p;
    const stock = baseDe(p) + s.delta;
    if (p.stockActuel === stock) return p;
    change = true;
    return { ...p, stockActuel: stock };
  });
  const sortie = change ? produits : d.produits;
  memo = { produits: d.produits, ventes: d.ventes, mouvements: d.mouvements, sortie };
  return change ? { ...d, produits: sortie } : d;
}

// Deux versions d'un produit sont-elles identiques, hors stock calculé ? (le stock calculé ne part jamais au serveur)
export function memeProduit(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  const cles = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const c of cles) {
    if (c === 'stockActuel') continue;
    if (a[c] !== b[c] && JSON.stringify(a[c]) !== JSON.stringify(b[c])) return false;
  }
  return true;
}

// Produit tel qu'il est envoyé au serveur (sans le stock calculé)
export function produitPourServeur(p) {
  const { stockActuel, ...reste } = p; // eslint-disable-line no-unused-vars
  return reste;
}
