// ------------------------------------------------------------
// VENTE EN GROS : un article peut aussi se vendre par carton (sac, colis…) à un prix de gros.
//
//   produit.gros = { prix, unite: 'carton', contenance: 24, minimum: 1 }
//     prix        : prix d'UN carton
//     contenance  : nombre d'unités de vente (pièces) dans un carton : le stock baisse de « contenance » par carton vendu
//     minimum     : nombre de cartons conseillé pour avoir le prix de gros (avertissement, pas un blocage)
//
//   À la caisse, le vendeur choisit « Détail » ou « Gros » : en mode gros, les articles qui ont un prix de gros se vendent
//   au carton, les autres restent à leur prix normal. Seul le prix du mode choisi est affiché : l'écran et le ticket ne montrent
//   jamais l'autre tarif.
//
//   La ligne de vente garde « contenance » : le stock (lib/donnees/stock.js) et la marge (prix d'achat × contenance) en tiennent compte.
// ------------------------------------------------------------

export const UNITES_GROS = ['carton', 'sac', 'colis', 'caisse', 'paquet'];

// Article vendable en gros : prix de gros et contenance valides, et pas d'options (accompagnements, suppléments)
export const aPrixGros = (p) => !!(p?.gros && Number(p.gros.prix) > 0 && Number(p.gros.contenance) >= 1 && !(p.groupes || []).length);

// La vente en gros est proposée dès qu'un article a un prix de gros
export const venteEnGros = (d) => (d?.produits || []).some(aPrixGros);

/**
 * L'article tel qu'il se vend dans le mode choisi.
 * Mode gros et article avec prix de gros : prix, unité et prix d'achat du carton ; le stock reste en unités (voir « contenance »).
 */
export function produitPourMode(p, gros) {
  if (!gros || !aPrixGros(p)) return p;
  const { prix, unite, contenance, minimum } = p.gros;
  return {
    ...p,
    prix: Number(prix),
    promo: null,
    prixAchat: p.prixAchat > 0 ? Number(p.prixAchat) * Number(contenance) : null,
    unite: unite || 'carton',
    // Stock affiché en cartons entiers (le stock réel reste en unités)
    ...(p.suiviStock ? { stockActuel: Math.floor((p.stockActuel ?? p.stock ?? 0) / Number(contenance)), seuilAlerte: Math.ceil((p.seuilAlerte ?? 5) / Number(contenance)) } : {}),
    _gros: { unite: unite || 'carton', contenance: Number(contenance), minimum: Math.max(1, Number(minimum) || 1) },
  };
}

// Vérifie et nettoie le bloc « gros » d'une fiche article (renvoie { gros } ou { erreur })
export function nettoyerGros(gros, tr = (t) => t) {
  if (!gros) return { gros: null };
  const prix = Number(gros.prix);
  const contenance = Math.floor(Number(gros.contenance));
  if (!(prix > 0)) return { erreur: tr('Indiquez le prix de gros') };
  if (!(contenance >= 1)) return { erreur: tr('Indiquez combien d’unités contient un carton') };
  const minimum = Math.max(1, Math.floor(Number(gros.minimum)) || 1);
  return { gros: { prix, unite: gros.unite || 'carton', contenance, minimum } };
}
