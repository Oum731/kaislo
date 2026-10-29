// ------------------------------------------------------------
// BOUTIQUE EN LIGNE : fonctions pures (panier du client, message WhatsApp de la commande, reprise dans la caisse).
// Le serveur recalcule toujours les prix (api/lib/boutique.php) : ceux d'ici servent seulement à l'affichage.
// ------------------------------------------------------------
import { tr } from '../i18n/index.js';
import { formatPrix } from '../utils/format.js';

/** Prix d'un article pour le client : prix promo s'il y en a un, plus les options choisies. */
export function prixArticleBoutique(produit, optionIds = []) {
  const base = produit.promo !== null && produit.promo !== undefined && produit.promo < produit.prix ? produit.promo : produit.prix;
  let prix = base;
  for (const g of produit.groupes || []) for (const o of g.options) if (optionIds.includes(o.id)) prix += o.prix;
  return prix;
}

/** Noms des options choisies, dans l'ordre des groupes. */
export const nomsOptions = (produit, optionIds) => (produit.groupes || []).flatMap((g) => g.options.filter((o) => optionIds.includes(o.id)).map((o) => o.nom));

/** Clé d'une ligne du panier : même article avec les mêmes options = même ligne. */
export const cleLignePanier = (produitId, optionIds) => produitId + '|' + [...optionIds].sort().join(',');

export const totalPanier = (panier) => panier.reduce((n, l) => n + l.prixUnitaire * l.quantite, 0);
export const nombreArticles = (panier) => panier.reduce((n, l) => n + l.quantite, 0);

/** Vérifie que chaque groupe obligatoire a un choix ; renvoie le texte de l'erreur ou null. */
export function erreurOptions(produit, optionIds) {
  for (const g of produit.groupes || []) {
    const choisies = g.options.filter((o) => optionIds.includes(o.id));
    if (g.obligatoire && !choisies.length) return `Choisissez : ${g.nom}`;
    if (g.type === 'unique' && choisies.length > 1) return `Une seule option : ${g.nom}`;
  }
  return null;
}

/**
 * Texte de la commande envoyé sur le WhatsApp du commerçant (réponse du serveur : commande enregistrée).
 * Un lien WhatsApp ne peut pas joindre de fichier : la photo de chaque article est donnée par son adresse (WhatsApp en affiche un aperçu).
 * liensPhotos: false quand les photos sont jointes pour de vrai (partage avec fichiers).
 */
export const PHOTOS_MAX_DANS_LE_MESSAGE = 8;
export function messageCommande(c, { liensPhotos = true } = {}) {
  const lignes = [];
  lignes.push(`Bonjour ${c.boutique}, je souhaite passer la commande n° ${c.numero} :`);
  lignes.push('');
  for (const l of c.lignes) {
    const options = l.options?.length ? ` (${l.options.join(', ')})` : '';
    lignes.push(`• ${l.quantite} × ${l.nom}${options} : ${formatPrix(l.total, c.devise)}`);
  }
  const photos = liensPhotos ? c.lignes.filter((l) => l.photo).slice(0, PHOTOS_MAX_DANS_LE_MESSAGE) : [];
  if (photos.length) {
    lignes.push('');
    lignes.push('Photos des articles :');
    for (const l of photos) lignes.push(`📷 ${l.nom} : ${l.photo}`);
  }
  lignes.push('');
  lignes.push(`*Total : ${formatPrix(c.total, c.devise)}*`);
  lignes.push('');
  lignes.push(`Nom : ${c.client.nom}`);
  lignes.push(`Téléphone : ${c.client.telephone}`);
  if (c.client.adresse) lignes.push(`Adresse : ${c.client.adresse}`);
  if (c.note) lignes.push(`Note : ${c.note}`);
  lignes.push('');
  lignes.push('Merci de me confirmer la disponibilité et la livraison.');
  return lignes.join('\n');
}

export const lienCommandeWhatsApp = (c) => 'https://wa.me/' + (c.whatsapp || '') + '?text=' + encodeURIComponent(messageCommande(c));

/** Adresses des photos de la commande (une par article, sans doublon). */
export const photosCommande = (c) => [...new Set(c.lignes.map((l) => l.photo).filter(Boolean))];

/** Choix d'options d'une ligne de commande reçue, au format de la caisse : { groupeId: [optionId, …] }. */
export function choixDepuisCommande(produit, optionIds = []) {
  const choix = {};
  for (const g of produit.groupes || []) {
    const ids = g.options.filter((o) => optionIds.includes(o.id)).map((o) => o.id);
    if (ids.length) choix[g.id] = ids;
  }
  return choix;
}

export const STATUTS_COMMANDE = [
  ['nouvelle', 'Nouvelle'], ['confirmee', 'Confirmée'], ['prete', 'Prête'], ['livree', 'Livrée'], ['annulee', 'Annulée'],
];

// ---------- Annuaire des boutiques (kaislo.com/boutiques/) ----------
// Les métiers sont regroupés en rayons que les clients comprennent. L'ordre est celui de l'affichage.
export const CATEGORIES_ANNUAIRE = [
  { id: 'restauration', nom: 'Restaurants, maquis et cafés', emoji: '🍽️', types: ['restaurant', 'maquis', 'bar'] },
  { id: 'alimentation', nom: 'Alimentation et boulangeries', emoji: '🛒', types: ['epicerie', 'grossiste', 'boulangerie'] },
  { id: 'mode', nom: 'Mode, beauté et cosmétiques', emoji: '👗', types: ['boutique', 'beaute'] },
  { id: 'telephonie', nom: 'Téléphonie et électronique', emoji: '📱', types: ['telephonie'] },
  { id: 'maison', nom: 'Maison, outillage et matériaux', emoji: '🔧', types: ['quincaillerie'] },
  { id: 'papeterie', nom: 'Livres et papeterie', emoji: '📚', types: ['librairie'] },
  { id: 'autres', nom: 'Autres boutiques', emoji: '🛍️', types: ['autre'] },
];

export const categorieAnnuaire = (type) => CATEGORIES_ANNUAIRE.find((c) => c.types.includes(type)) || CATEGORIES_ANNUAIRE[CATEGORIES_ANNUAIRE.length - 1];

/** Boutiques filtrées (texte, pays) puis rangées par rayon : [{ categorie, boutiques }], rayons vides retirés. */
export function grouperBoutiques(boutiques, { texte = '', pays = '', categorie = '' } = {}) {
  const normalise = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const q = normalise(texte).trim();
  const garde = boutiques.filter((b) => {
    if (pays && b.pays !== pays) return false;
    if (categorie && categorieAnnuaire(b.type).id !== categorie) return false;
    if (!q) return true;
    return [b.nom, b.ville, b.quartier, b.description, ...b.exemples.map((e) => e.nom)].some((t) => normalise(t).includes(q));
  });
  return CATEGORIES_ANNUAIRE
    .map((c) => ({ categorie: c, boutiques: garde.filter((b) => categorieAnnuaire(b.type).id === c.id) }))
    .filter((g) => g.boutiques.length);
}

// ---------- Publier les articles en ligne ----------
/** Articles qu'on peut publier d'un geste : actifs, avec un nom et un prix, pas encore « Vendre en ligne ». */
export const articlesAPublier = (produits = []) => produits.filter((p) => !p.enLigne && p.actif !== false && String(p.nom || '').trim() && Number(p.prix) > 0);

/** Message au gérant : où en est sa boutique par rapport à la liste kaislo.com/boutiques (raison envoyée par le serveur). */
export function messageAnnuaire(b) {
  if (!b) return null;
  if (b.dansAnnuaire) return { ok: true, texte: tr('Votre boutique est dans la liste kaislo.com/boutiques : les clients de votre pays la trouvent.') };
  const raisons = {
    aucunArticle: tr('Votre boutique n’est pas encore dans la liste kaislo.com/boutiques : aucun article n’est publié en ligne. Publiez au moins un article.'),
    desactivee: tr('Votre boutique n’est pas dans la liste kaislo.com/boutiques : elle est désactivée. Cochez « Boutique en ligne activée », puis Enregistrer.'),
    privee: tr('Votre boutique n’est pas dans la liste kaislo.com/boutiques : vous avez choisi de ne pas l’afficher. Cochez « Afficher ma boutique sur kaislo.com/boutiques », puis Enregistrer.'),
    abonnement: tr('Votre boutique est fermée : l’abonnement est expiré. Réglez-le pour qu’elle revienne dans la liste.'),
    suspendu: tr('Votre commerce est suspendu : contactez Kaislo.'),
    pasDeBoutique: tr('Votre boutique n’est pas encore créée : activez-la et enregistrez.'),
  };
  return raisons[b.raisonAnnuaire] ? { ok: false, raison: b.raisonAnnuaire, texte: raisons[b.raisonAnnuaire] } : null;
}
