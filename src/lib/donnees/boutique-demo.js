// ------------------------------------------------------------
// BOUTIQUE EN LIGNE DANS LA DÉMO : la vitrine lit les articles de la démo (ceux cochés « Vendre en ligne »),
// la commande du visiteur est gardée dans l'appareil et apparaît dans Compte → Commandes en ligne de l'application de démo.
// Rien n'est envoyé à un vrai commerçant : le message WhatsApp est à envoyer à soi-même ou à un proche pour voir le résultat.
// ------------------------------------------------------------
import { chargerCommerce, estDemo, lireLocal, ecrireLocal, initialiserStockage } from './stockage.js';
import { prixArticleBoutique, nomsOptions } from './boutique.js';

export { estDemo };
export const lienBoutiqueDemo = (commerceId) => '/boutique/?demo=' + commerceId;
const cle = (commerceId) => 'commandes-demo:' + commerceId;

/** Boutique de la démo, au même format que la réponse de l'API publique. */
export async function boutiqueDemo(commerceId) {
  await initialiserStockage();
  const d = chargerCommerce(commerceId);
  if (!d) return null;
  const publies = d.produits.filter((p) => p.enLigne && p.actif !== false);
  const utilisees = new Set(publies.map((p) => p.categorieId));
  return {
    slug: 'demo-' + commerceId, demo: true, logo: d.commerce.logo || null, nom: d.commerce.nom, ville: d.commerce.ville, quartier: '', devise: d.commerce.devise, pays: d.commerce.pays,
    description: d.commerce.type === 'restaurant' ? 'Boutique de démonstration : plats et boissons à emporter.' : 'Boutique de démonstration : produits du quotidien.',
    livraison: 'Livraison à domicile selon le quartier (exemple).', whatsapp: '',
    categories: d.categories.filter((c) => utilisees.has(c.id)).map((c) => ({ id: c.id, nom: c.nom })),
    produits: publies.map((p) => ({
      id: p.id, nom: p.nom, prix: p.prix, promo: p.promo && p.promo < p.prix ? p.promo : null, categorieId: p.categorieId, emoji: p.emoji || '', image: p.image || null,
      unite: p.unite || '', groupes: p.groupes || [],
    })),
  };
}

const maintenant = () => new Date().toISOString();

/** Commandes d'exemple : deux déjà reçues, pour montrer à quoi ressemble la liste. */
function exemples(d) {
  const produits = d.produits.filter((p) => p.actif !== false).slice(0, 4);
  if (produits.length < 2) return [];
  const ligne = (p, quantite) => ({ produitId: p.id, nom: p.nom, options: [], optionIds: [], quantite, prixUnitaire: p.promo && p.promo < p.prix ? p.promo : p.prix, total: (p.promo && p.promo < p.prix ? p.promo : p.prix) * quantite, photo: null });
  const fabrique = (numero, statut, jours, nom, tel, adresse, lignes) => ({
    id: 'demo-cmd-' + numero, numero, statut, creeLe: new Date(Date.now() - jours * 86400000).toISOString(), client: { nom, telephone: tel, adresse }, note: '',
    lignes, total: lignes.reduce((n, l) => n + l.total, 0), devise: d.commerce.devise,
  });
  return [
    fabrique(2, 'nouvelle', 0.02, 'Aminata K.', '+225 07 00 00 00 21', 'Cocody Riviera 2, près de la pharmacie', [ligne(produits[0], 2), ligne(produits[1], 1)]),
    fabrique(1, 'livree', 2, 'Moussa T.', '+225 05 00 00 00 22', 'Marcory Zone 4', [ligne(produits[2] || produits[0], 3)]),
  ];
}

export async function commandesDemo(commerceId) {
  await initialiserStockage();
  let liste = lireLocal(cle(commerceId));
  const d = chargerCommerce(commerceId);
  // Le visiteur a changé de pays (donc de devise) : on repart des exemples
  if (liste && d && liste.some((c) => c.devise !== d.commerce.devise)) liste = null;
  if (!liste) {
    liste = d ? exemples(d) : [];
    ecrireLocal(cle(commerceId), liste);
  }
  return liste;
}

export async function changerStatutDemo(commerceId, id, statut) {
  const liste = (await commandesDemo(commerceId)).map((c) => (c.id === id ? { ...c, statut } : c));
  ecrireLocal(cle(commerceId), liste);
  return liste;
}

/** Modification d'une commande de démo : mêmes règles que l'API (quantité 0 = article retiré, total recalculé). */
export async function modifierCommandeDemo(commerceId, { id, client, note, lignes }) {
  const liste = (await commandesDemo(commerceId)).map((c) => {
    if (c.id !== id) return c;
    const nouvelles = c.lignes
      .map((l, i) => {
        const q = lignes.find((x) => x.index === i)?.quantite ?? l.quantite;
        return { ...l, quantite: q, total: l.prixUnitaire * q };
      })
      .filter((l) => l.quantite > 0);
    return { ...c, client: { ...c.client, ...client }, note: note || '', lignes: nouvelles, total: nouvelles.reduce((n, l) => n + l.total, 0) };
  });
  ecrireLocal(cle(commerceId), liste);
  return liste;
}

/** Commande du visiteur sur la vitrine de démo : enregistrée dans l'appareil, au format de l'API. */
export async function passerCommandeDemo(commerceId, boutique, panier, client, note) {
  const liste = await commandesDemo(commerceId);
  const numero = 1 + Math.max(0, ...liste.map((c) => c.numero));
  const d = chargerCommerce(commerceId);
  const lignes = panier.map((l) => {
    const p = d.produits.find((x) => x.id === l.produitId);
    const prix = p ? prixArticleBoutique({ ...p, groupes: p.groupes || [] }, l.optionIds) : l.prixUnitaire;
    return { produitId: l.produitId, nom: l.nom, options: p ? nomsOptions({ groupes: p.groupes || [] }, l.optionIds) : l.options, optionIds: l.optionIds, quantite: l.quantite, prixUnitaire: prix, total: prix * l.quantite, photo: null };
  });
  const commande = {
    id: 'demo-cmd-' + numero + '-' + Date.now(), numero, statut: 'nouvelle', creeLe: maintenant(), client, note: note || '', lignes,
    total: lignes.reduce((n, l) => n + l.total, 0), devise: boutique.devise,
  };
  ecrireLocal(cle(commerceId), [commande, ...liste]);
  return { ...commande, whatsapp: '', boutique: boutique.nom };
}
