// ------------------------------------------------------------
// Données de DÉMONSTRATION : deux commerces prêts à présenter
// (tous les prix en dirhams) :
//  - restaurant (id "resto-ivoire") et épicerie (id "chez-sentinelle"),
//    tous les noms affichés sont "Amorac Kaislo"
// Avec 45 jours de ventes, des dépenses, des clôtures, des clients
// à crédit, des tables occupées et des entrées de stock.
// ------------------------------------------------------------
import { creerLigne, sousTotal, montantRemise } from './vente.js';
import { arrondir } from '../utils/format.js';
import { calculerCloture } from './cloture.js';
import { CREDIT, paysParId } from './modeles.js';
import { symbole } from '../utils/format.js';

// À augmenter quand la structure des données change : la démo est alors recréée
export const VERSION_DONNEES = 11;

// Raccourcis pour écrire le catalogue de façon lisible
let compteur = 0;
const id = (p) => p + ++compteur;
const opt = (nom, prix = 0) => ({ id: id('o'), nom, prix });
const groupe = (nom, type, obligatoire, options) => ({ id: id('g'), nom, type, obligatoire, options });
// Photos des produits de démo (public/demo/produits/), libres de droits : voir credits-photos.json
const PHOTOS = {
  'Attiéké': 'attieke', 'Garba': 'garba', 'Riz sauce graine': 'riz-sauce-graine', 'Foutou sauce claire': 'foutou-sauce-claire',
  'Placali sauce kplala': 'placali', 'Poulet braisé': 'poulet-braise', 'Carpe braisée': 'carpe-braisee', 'Brochettes de bœuf (x5)': 'brochettes-boeuf',
  'Alloco portion': 'alloco', 'Bissap': 'bissap', 'Gnamakoudji': 'gnamakoudji', 'Jus de passion': 'jus-passion', 'Soda 33cl': 'soda-33cl',
  'Eau minérale 1,5L': 'eau-minerale', 'Malta': 'malta', 'Dêguê': 'degue', 'Salade de fruits': 'salade-fruits',
  'Huile de table 1L': 'huile', 'Sucre en morceaux 1kg': 'sucre', 'Thé vert 200g': 'the-vert', 'Farine 1kg': 'farine', 'Pâtes 500g': 'pates',
  'Riz 1kg': 'riz', 'Pain rond': 'pain-rond', 'Soda 1L': 'soda-1l', 'Jus d’orange 1L': 'jus-orange', 'Lait 1L': 'lait', 'Yaourt nature': 'yaourt',
  'Raïbi': 'raibi', 'Fromage portions x8': 'fromage', 'Savon': 'savon', 'Dentifrice': 'dentifrice', 'Lessive 1kg': 'lessive',
  'Tomates': 'tomates', 'Pommes de terre': 'pommes-de-terre', 'Oignons 1kg': 'oignons',
};
const photo = (nom) => (PHOTOS[nom] ? '/demo/produits/' + PHOTOS[nom] + '.webp' : null);

const produit = (categorieId, nom, prix, prixAchat, emoji, extra = {}) => ({
  id: id('p'),
  categorieId,
  nom,
  prix,
  promo: null, // prix promotionnel (facultatif)
  prixAchat, // pour calculer la marge
  emoji,
  image: photo(nom),
  codeBarre: '',
  suiviStock: false,
  stock: 0,
  seuilAlerte: 5, // alerte quand le stock descend à ce niveau
  actif: true,
  groupes: [],
  ...extra,
});

// ============ 1. Restaurant de démo ============
function restoIvoire() {
  const cPlats = id('c'), cGrill = id('c'), cBoissons = id('c'), cDesserts = id('c');
  return {
    commerce: {
      id: 'resto-ivoire',
      nom: 'Amorac Kaislo',
      type: 'restaurant',
      pays: 'MA',
      devise: 'MAD',
      ville: 'Casablanca',
      adresse: '12 rue Mustapha El Maani, Centre-ville',
      telephone: '+212 6 12 34 56 78',
      piedTicket: 'Akwaba ! Merci et à bientôt.',
      email: 'bonjour@resto-ivoire.ma',
      logo: '/demo/logo-resto-ivoire.svg',
      logoSurTicket: false,
      localisation: { lat: 33.5935, lng: -7.6186 },
      modesPaiement: ['Espèces', 'Carte'],
      fondDeCaisse: 200, // monnaie laissée dans la caisse en début de journée
      tables: ['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5', 'Table 6', 'Terrasse 1', 'Terrasse 2', 'À emporter'],
    },
    utilisateurs: [
      { id: 'u1', nom: 'Amorac Kaislo', role: 'gerant', telephone: '06 00 00 00 01', pin: '1234', actif: true },
      { id: 'u2', nom: 'Amorac Kaislo', role: 'vendeur', telephone: '06 00 00 00 02', pin: '0000', actif: true, peutGererProduits: false, peutFaireRemises: true },
      { id: 'u3', nom: 'Amorac Kaislo', role: 'vendeur', telephone: '06 00 00 00 03', pin: '1111', actif: true, peutGererProduits: true, peutFaireRemises: false },
    ],
    categories: [
      { id: cPlats, nom: 'Plats', couleur: 'vert' },
      { id: cGrill, nom: 'Grillades', couleur: 'terre' },
      { id: cBoissons, nom: 'Boissons', couleur: 'bleu' },
      { id: cDesserts, nom: 'Desserts', couleur: 'safran' },
    ],
    produits: [
      produit(cPlats, 'Attiéké', 25, 8, '🍚', {
        groupes: [
          groupe('Accompagnement', 'unique', true, [
            opt('Poisson grillé', 35), opt('Soupe de poisson', 25), opt('Soupe de mouton', 35), opt('Poulet braisé', 45),
          ]),
          groupe('Suppléments', 'multiple', false, [opt('Alloco', 10), opt('Œuf', 5), opt('Piment frais', 0)]),
        ],
      }),
      produit(cPlats, 'Garba', 30, 12, '🐟', {
        groupes: [groupe('Suppléments', 'multiple', false, [opt('Œuf', 5), opt('Alloco', 10), opt('Piment', 0)])],
      }),
      produit(cPlats, 'Riz sauce graine', 45, 18, '🍛', {
        groupes: [groupe('Viande', 'unique', true, [opt('Poisson'), opt('Bœuf', 10), opt('Poulet', 15)])],
      }),
      produit(cPlats, 'Foutou sauce claire', 60, 22, '🍲'),
      produit(cPlats, 'Placali sauce kplala', 50, 18, '🥣'),
      produit(cGrill, 'Poulet braisé', 60, 25, '🍗', {
        groupes: [
          groupe('Portion', 'unique', true, [opt('Demi'), opt('Entier', 50)]),
          groupe('Accompagnement', 'multiple', false, [opt('Attiéké', 10), opt('Alloco', 10), opt('Frites', 12)]),
        ],
      }),
      produit(cGrill, 'Carpe braisée', 80, 35, '🐠', {
        groupes: [groupe('Accompagnement', 'multiple', false, [opt('Attiéké', 10), opt('Alloco', 10)])],
      }),
      produit(cGrill, 'Brochettes de bœuf (x5)', 35, 15, '🍢'),
      produit(cGrill, 'Alloco portion', 15, 5, '🍌'),
      produit(cBoissons, 'Bissap', 12, 3, '🧃', {
        groupes: [groupe('Taille', 'unique', true, [opt('Petit'), opt('Grand', 6)])],
      }),
      produit(cBoissons, 'Gnamakoudji', 12, 3, '🥤'),
      produit(cBoissons, 'Jus de passion', 15, 5, '🍹', { promo: 12 }),
      produit(cBoissons, 'Soda 33cl', 10, 5, '🥫'),
      produit(cBoissons, 'Eau minérale 1,5L', 8, 4, '💧'),
      produit(cBoissons, 'Malta', 15, 7, '🍺'),
      produit(cDesserts, 'Dêguê', 15, 5, '🥛'),
      produit(cDesserts, 'Salade de fruits', 20, 8, '🍉'),
    ],
    clients: [
      { id: 'k1', nom: 'Amorac Kaislo', telephone: '+212600000001', note: 'Déjeuners de l’équipe, paie le 5 du mois' },
      { id: 'k2', nom: 'Amorac Kaislo', telephone: '+212600000002', note: '' },
    ],
  };
}

// ============ 2. Épicerie de démo ============
function chezSentinelle() {
  const cEpi = id('c'), cBoi = id('c'), cLait = id('c'), cHyg = id('c'), cFruits = id('c');
  // Les codes-barres sont fictifs (préfixe 611 = Maroc)
  const p = (cat, nom, prix, achat, emoji, code, stock, extra = {}) =>
    produit(cat, nom, prix, achat, emoji, { codeBarre: code, suiviStock: true, stock, ...extra });
  return {
    commerce: {
      id: 'chez-sentinelle',
      nom: 'Amorac Kaislo',
      type: 'epicerie',
      pays: 'MA',
      devise: 'MAD',
      ville: 'Casablanca',
      adresse: '45 boulevard Ghandi, Maârif',
      telephone: '+212 6 98 76 54 32',
      piedTicket: 'Merci pour votre visite ! Livraison gratuite dans le quartier.',
      email: 'chezsentinelle@gmail.com',
      logo: '/demo/logo-chez-sentinelle.svg',
      logoSurTicket: false,
      localisation: { lat: 33.5786, lng: -7.6431 },
      modesPaiement: ['Espèces', 'Carte'],
      fondDeCaisse: 200,
      tables: [],
    },
    utilisateurs: [
      { id: 'u1', nom: 'Amorac Kaislo', role: 'gerant', telephone: '06 00 00 00 11', pin: '1234', actif: true },
      { id: 'u2', nom: 'Amorac Kaislo', role: 'vendeur', telephone: '06 00 00 00 12', pin: '0000', actif: true, peutGererProduits: true, peutFaireRemises: false },
      { id: 'u3', nom: 'Amorac Kaislo', role: 'vendeur', telephone: '06 00 00 00 13', pin: '1111', actif: true, peutGererProduits: false, peutFaireRemises: false },
    ],
    categories: [
      { id: cEpi, nom: 'Épicerie', couleur: 'safran' },
      { id: cBoi, nom: 'Boissons', couleur: 'bleu' },
      { id: cLait, nom: 'Produits laitiers', couleur: 'vert' },
      { id: cHyg, nom: 'Hygiène', couleur: 'prune' },
      { id: cFruits, nom: 'Fruits & légumes', couleur: 'terre' },
    ],
    produits: [
      p(cEpi, 'Huile de table 1L', 24, 20.5, '🫒', '6111000000011', 30),
      p(cEpi, 'Sucre en morceaux 1kg', 12.5, 10.8, '🧊', '6111000000028', 42),
      p(cEpi, 'Thé vert 200g', 16, 12.5, '🍵', '6111000000035', 4),
      p(cEpi, 'Farine 1kg', 9, 7.4, '🌾', '6111000000042', 25),
      p(cEpi, 'Pâtes 500g', 7.5, 5.9, '🍝', '6111000000059', 60),
      p(cEpi, 'Riz 1kg', 14, 11, '🍚', '6111000000066', 3),
      p(cEpi, 'Pain rond', 1.5, 1.1, '🥖', '', 80, { seuilAlerte: 20 }),
      p(cBoi, 'Eau minérale 1,5L', 6, 4.6, '💧', '6111000000073', 48, {
        groupes: [groupe('Conditionnement', 'unique', true, [opt('Bouteille'), opt('Pack de 6', 30)])],
      }),
      p(cBoi, 'Soda 1L', 9, 6.8, '🥤', '6111000000080', 24, { promo: 8 }),
      p(cBoi, 'Jus d’orange 1L', 11, 8.5, '🍊', '6111000000097', 12),
      p(cLait, 'Lait 1L', 7.5, 6.6, '🥛', '6111000000103', 36, { seuilAlerte: 10 }),
      p(cLait, 'Yaourt nature', 2.5, 1.9, '🍶', '6111000000110', 50, { seuilAlerte: 12 }),
      p(cLait, 'Raïbi', 3, 2.3, '🍓', '6111000000127', 2),
      p(cLait, 'Fromage portions x8', 13, 10.2, '🧀', '6111000000134', 15),
      p(cHyg, 'Savon', 6, 4.2, '🧼', '6111000000141', 20),
      p(cHyg, 'Dentifrice', 12, 8.9, '🪥', '6111000000158', 10),
      p(cHyg, 'Lessive 1kg', 22, 17, '🧺', '6111000000165', 8),
      p(cFruits, 'Tomates', 6, 3.5, '🍅', '', 40, {
        groupes: [groupe('Quantité', 'unique', true, [opt('500 g', -3), opt('1 kg'), opt('2 kg', 6)])],
      }),
      p(cFruits, 'Pommes de terre', 5, 3, '🥔', '', 60, {
        groupes: [groupe('Quantité', 'unique', true, [opt('1 kg'), opt('2 kg', 5), opt('5 kg', 20)])],
      }),
      p(cFruits, 'Oignons 1kg', 4, 2.4, '🧅', '', 45),
    ],
    clients: [
      { id: 'k1', nom: 'Amorac Kaislo', telephone: '+212600000011', note: 'Paie en fin de mois' },
      { id: 'k2', nom: 'Amorac Kaislo', telephone: '+212600000012', note: '' },
      { id: 'k3', nom: 'Amorac Kaislo', telephone: '+212600000013', note: '' },
      { id: 'k4', nom: 'Amorac Kaislo', telephone: '+212600000014', note: 'Plafond conseillé : 300 DH' },
      { id: 'k5', nom: 'Amorac Kaislo', telephone: '+212600000015', note: 'Achats pour le café' },
      { id: 'k6', nom: 'Amorac Kaislo', telephone: '+212600000016', note: '' },
    ],
  };
}

// ------------------------------------------------------------
// Générateurs (pseudo-aléatoires mais reproductibles)
// ------------------------------------------------------------
function aleatoire(graine) {
  let s = graine;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

function genererVentes(d, graine) {
  const rnd = aleatoire(graine);
  const choisir = (tab) => tab[Math.floor(rnd() * tab.length)];
  const { commerce, produits, categories } = d;
  const dev = commerce.devise;
  const vendeurs = d.utilisateurs.filter((u) => u.role === 'vendeur');
  const resto = commerce.type === 'restaurant';

  // Heures de fréquentation : midi et soir pour le resto, toute la journée pour l'épicerie
  const heures = resto
    ? [12, 12, 13, 13, 13, 14, 14, 15, 19, 20, 20, 21, 21, 21, 22, 22, 23]
    : [8, 8, 9, 10, 11, 12, 12, 13, 16, 17, 18, 18, 19, 19, 20, 20, 21, 22];
  // Espèces, Carte, Crédit
  // Répartition des paiements : surtout des espèces, le reste partagé entre
  // les moyens de paiement du pays (Wave, Orange Money, carte…), un peu de crédit
  const partEspeces = resto ? 0.62 : 0.72;
  const partCredit = resto ? 0.04 : 0.12;
  const autresModes = commerce.modesPaiement.filter((m) => m !== 'Espèces');

  const ventes = [];
  const maintenant = new Date();
  for (let jour = 45; jour >= 0; jour--) {
    const date = new Date(maintenant);
    date.setDate(date.getDate() - jour);
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    const nb = Math.floor((resto ? 24 : 34) + rnd() * 16 + (weekend ? 10 : 0));

    for (let i = 0; i < nb; i++) {
      const h = new Date(date);
      h.setHours(choisir(heures), Math.floor(rnd() * 60), Math.floor(rnd() * 60), 0);
      if (h > maintenant) continue; // pas de ventes dans le futur

      const lignes = [];
      const nbLignes = 1 + Math.floor(rnd() * (resto ? 3 : 4));
      for (let l = 0; l < nbLignes; l++) {
        // Les premiers produits sont un peu plus vendus (effet "best-seller")
        const prod = produits[Math.floor(Math.pow(rnd(), 1.6) * produits.length)];
        const choix = {};
        for (const g of prod.groupes) {
          if (g.obligatoire || rnd() < 0.3) choix[g.id] = [choisir(g.options).id];
        }
        const cat = categories.find((c) => c.id === prod.categorieId);
        lignes.push(creerLigne(prod, choix, rnd() < 0.8 ? 1 : 2, dev, cat?.nom));
      }

      const r = rnd();
      const paiement = r < partEspeces ? 'Espèces' : r < 1 - partCredit ? autresModes[Math.floor(rnd() * autresModes.length)] || 'Espèces' : CREDIT;
      const client = paiement === CREDIT ? choisir(d.clients) : null;
      // De temps en temps, une petite remise
      const remise = rnd() < 0.04 ? { type: 'pourcent', valeur: 10 } : null;
      const st = sousTotal(lignes, dev);
      const montant = montantRemise(remise, st, dev);
      const vendeur = choisir(vendeurs);
      ventes.push({
        id: 'v' + ventes.length,
        numero: 0,
        date: h.toISOString(),
        vendeurId: vendeur.id,
        vendeurNom: vendeur.nom,
        paiement,
        clientId: client?.id || null,
        clientNom: client?.nom || null,
        table: resto && rnd() < 0.85 ? choisir(commerce.tables) : null,
        lignes,
        sousTotal: st,
        remise: montant,
        remiseInfo: remise,
        total: arrondir(st - montant, dev),
      });
    }
  }
  // Numéros de ticket dans l'ordre chronologique
  ventes.sort((a, b) => a.date.localeCompare(b.date));
  ventes.forEach((v, i) => (v.numero = i + 1));
  return ventes;
}

// Dépenses de démo : achats au marché, gaz, transport, loyer…
function genererDepenses(d, graine) {
  const rnd = aleatoire(graine);
  const resto = d.commerce.type === 'restaurant';
  const gerant = d.utilisateurs.find((u) => u.role === 'gerant');
  const depenses = [];
  const maintenant = new Date();
  const ajouter = (date, h, montantDH, categorie, note, depuisCaisse) => {
    const montant = convertirDepuisDirham(montantDH, d.commerce.devise);
    const t = new Date(date);
    t.setHours(h, Math.floor(rnd() * 60), 0, 0);
    if (t > maintenant) return;
    depenses.push({ id: 'd' + depenses.length, date: t.toISOString(), montant, categorie, note, depuisCaisse, utilisateurNom: gerant.nom });
  };
  for (let jour = 45; jour >= 0; jour--) {
    const date = new Date(maintenant);
    date.setDate(date.getDate() - jour);
    if (resto) {
      // payé avec la recette de la veille, donc pas avec la caisse du jour
      ajouter(date, 9, Math.round((300 + rnd() * 300) / 10) * 10, 'Achats / marchandises', 'Marché : poisson, poulet, légumes', false);
      ajouter(date, 10, 20 + Math.round(rnd() * 2) * 10, 'Transport', 'Taxi marché', true);
      if (jour % 5 === 0) ajouter(date, 11, 120, 'Gaz / charbon', 'Bouteille de gaz', true);
      if (date.getDate() === 1) ajouter(date, 18, 6000, 'Salaires', 'Salaires du mois', false);
      if (date.getDate() === 5) ajouter(date, 12, 5000, 'Loyer / électricité', 'Loyer du local', false);
    } else {
      if (jour % 3 === 0) ajouter(date, 10, 30, 'Transport', 'Livraison marchandises', true);
      if (date.getDate() === 1) ajouter(date, 18, 3000, 'Loyer / électricité', 'Loyer du local', false);
      if (date.getDate() === 10) ajouter(date, 12, 450, 'Loyer / électricité', 'Facture électricité', false);
    }
  }
  return depenses;
}

// Entrées de marchandise (épicerie) : réapprovisionnement chez le grossiste
function genererMouvements(d, graine) {
  if (d.commerce.type === 'restaurant') return [];
  const rnd = aleatoire(graine);
  const gerant = d.utilisateurs.find((u) => u.role === 'gerant');
  const mouvements = [];
  const fournisseurs = ['Grossiste Derb Omar', 'Centrale laitière', 'Marché de gros'];
  for (let jour = 30; jour >= 1; jour -= 3) {
    const date = new Date();
    date.setDate(date.getDate() - jour);
    date.setHours(10, 15, 0, 0);
    for (let i = 0; i < 3; i++) {
      const prod = d.produits[Math.floor(rnd() * d.produits.length)];
      mouvements.push({
        id: 'm' + mouvements.length,
        date: date.toISOString(),
        produitId: prod.id,
        produitNom: prod.nom,
        type: 'entree',
        quantite: 6 * (1 + Math.floor(rnd() * 4)),
        prixAchat: prod.prixAchat,
        fournisseur: fournisseurs[Math.floor(rnd() * fournisseurs.length)],
        note: '',
        utilisateurNom: gerant.nom,
      });
    }
  }
  return mouvements;
}

// Remboursements des clients à crédit (environ 70 % de ce qu'ils doivent)
function genererRemboursements(d, graine) {
  const rnd = aleatoire(graine);
  const remboursements = [];
  for (const c of d.clients) {
    const achats = d.ventes.filter((v) => v.clientId === c.id && v.paiement === CREDIT);
    const total = achats.reduce((s, v) => s + v.total, 0);
    let rembourse = 0;
    for (let jour = 40; jour >= 2; jour -= 7 + Math.floor(rnd() * 5)) {
      const dejaAchete = achats.filter((v) => new Date(v.date) < new Date(Date.now() - jour * 86400000)).reduce((s, v) => s + v.total, 0);
      const montant = Math.floor(Math.max(0, dejaAchete * 0.7 - rembourse) / 10) * 10;
      if (montant < 20 || rembourse + montant > total) continue;
      rembourse += montant;
      const date = new Date();
      date.setDate(date.getDate() - jour);
      date.setHours(18, Math.floor(rnd() * 60), 0, 0);
      remboursements.push({ id: 'r' + remboursements.length, date: date.toISOString(), clientId: c.id, montant, mode: 'Espèces', utilisateurNom: 'Comptoir' });
    }
  }
  return remboursements;
}

// Quelques ventes annulées et les clôtures des 10 derniers jours
function genererAnnulationsEtClotures(d, graine) {
  const rnd = aleatoire(graine);
  const gerant = d.utilisateurs.find((u) => u.role === 'gerant');
  for (const v of d.ventes) {
    if (rnd() < 0.008) v.annulee = { date: v.date, par: gerant.nom, motif: 'Erreur de saisie' };
  }
  // Journées de vente : ouverture le matin, fermeture le soir
  const sessions = [];
  const vendeurs = d.utilisateurs.filter((u) => u.role === 'vendeur');
  const [hOuv, mOuv] = d.commerce.type === 'restaurant' ? [11, 0] : [7, 30];
  const fond = d.commerce.fondDeCaisse;
  for (let jour = 10; jour >= 1; jour--) {
    const debut = new Date();
    debut.setDate(debut.getDate() - jour);
    debut.setHours(hOuv, mOuv + Math.floor(rnd() * 15), 0, 0);
    const fin = new Date(debut);
    fin.setHours(23, 45, 0, 0);
    const calcul = calculerCloture(d, debut, fin, fond);
    // La plupart du temps la compte est juste, parfois il manque un peu
    const r = rnd();
    const pas = convertirDepuisDirham(5, d.commerce.devise);
    const ecart = arrondir(r < 0.6 ? 0 : r < 0.85 ? -(1 + Math.floor(rnd() * 10)) * pas : (1 + Math.floor(rnd() * 3)) * pas, d.commerce.devise);
    const ouvreur = vendeurs[(jour + 1) % vendeurs.length].nom;
    const fermeur = vendeurs[jour % vendeurs.length].nom;
    sessions.push({
      id: 's' + sessions.length,
      ouverteLe: debut.toISOString(),
      ouvertePar: ouvreur,
      fondDeCaisse: fond,
      fermeLe: fin.toISOString(),
      fermePar: fermeur,
      cloture: { id: 'z' + sessions.length, date: fin.toISOString(), utilisateurNom: fermeur, ouvertePar: ouvreur, ...calcul, compte: arrondir(calcul.attendu + ecart, d.commerce.devise), ecart },
    });
  }
  // Aujourd'hui : la caisse est ouverte (pour pouvoir vendre tout de suite dans la démo)
  const ouverture = new Date();
  ouverture.setHours(hOuv, mOuv, 0, 0);
  if (ouverture > new Date()) ouverture.setTime(Date.now() - 5 * 60000);
  sessions.push({ id: 's' + sessions.length, ouverteLe: ouverture.toISOString(), ouvertePar: vendeurs[0].nom, fondDeCaisse: fond, fermeLe: null, fermePar: null, cloture: null });
  return sessions;
}

// Commandes en cours sur des tables (restaurant)
function genererCommandes(d) {
  if (d.commerce.type !== 'restaurant') return [];
  const dev = d.commerce.devise;
  const p = (nom) => d.produits.find((x) => x.nom === nom);
  const premierChoix = (prod) => Object.fromEntries(prod.groupes.filter((g) => g.obligatoire).map((g) => [g.id, [g.options[0].id]]));
  const ligne = (nom, q) => ({ ...creerLigne(p(nom), premierChoix(p(nom)), q, dev, ''), envoyee: true });
  const il_y_a = (min) => new Date(Date.now() - min * 60000).toISOString();
  return [
    { id: 'cmd1', table: 'Table 2', ouverteLe: il_y_a(35), vendeurId: 'u2', vendeurNom: 'Amorac Kaislo', lignes: [ligne('Attiéké', 2), ligne('Bissap', 2)] },
    { id: 'cmd2', table: 'Terrasse 1', ouverteLe: il_y_a(12), vendeurId: 'u3', vendeurNom: 'Amorac Kaislo', lignes: [ligne('Poulet braisé', 1), ligne('Soda 33cl', 3)] },
    { id: 'cmd3', table: 'Table 5', ouverteLe: il_y_a(4), vendeurId: 'u2', vendeurNom: 'Amorac Kaislo', lignes: [ligne('Garba', 1)] },
  ];
}

// Liste des commerces de démo (affichée sur l'écran d'accueil)
// "code" : code du commerce, pour relier un appareil (voir Profil)
export const COMMERCES_DEMO = [
  {
    id: 'resto-ivoire', code: '100001', nom: 'Amorac Kaislo', sousTitre: 'Restaurant · cuisine africaine', emoji: '🍽️', logo: '/demo/logo-resto-ivoire.svg',
    comptes: [['Amorac Kaislo', 'Gérant', '06 00 00 00 01', '1234'], ['Amorac Kaislo', 'Vendeur', '06 00 00 00 02', '0000'], ['Amorac Kaislo', 'Vendeur', '06 00 00 00 03', '1111']],
  },
  {
    id: 'chez-sentinelle', code: '100002', nom: 'Amorac Kaislo', sousTitre: 'Épicerie de quartier', emoji: '🛒', logo: '/demo/logo-chez-sentinelle.svg',
    comptes: [['Amorac Kaislo', 'Gérant', '06 00 00 00 11', '1234'], ['Amorac Kaislo', 'Vendeur', '06 00 00 00 12', '0000'], ['Amorac Kaislo', 'Vendeur', '06 00 00 00 13', '1111']],
  },
];

// ------------------------------------------------------------
// Adaptation des démos au pays choisi par le visiteur
// (le catalogue est écrit en dirhams puis converti avec des arrondis réalistes)
// ------------------------------------------------------------

// Arrondit à un "pas" (0,10 €, 50 FCFA…) en gardant les centimes propres
const arrondiPas = (x, pas) => Math.round(Math.round(x / pas) * pas * 100) / 100;

export function convertirDepuisDirham(x, devise) {
  if (!x) return x;
  const signe = x < 0 ? -1 : 1;
  const v = Math.abs(x);
  let r;
  if (devise === 'FCFA') r = arrondiPas(v * 60, v * 60 < 500 ? 25 : 50);
  else if (devise === 'GNF') r = arrondiPas(v * 860, 500);
  // Euro et dollars : selon le niveau des prix locaux (un plat à 60 DH ≈ 12 €)
  else if (devise === 'EUR') r = arrondiPas(v / 5, v < 50 ? 0.1 : 0.5);
  else if (devise === 'CAD') r = arrondiPas(v / 3.6, v < 50 ? 0.1 : 0.5);
  else if (devise === 'USD') r = arrondiPas(v / 5, v < 50 ? 0.1 : 0.5);
  else r = v; // MAD
  return signe * (r || (devise === 'FCFA' ? 25 : 0.1));
}

// Adresses de démonstration par pays (les autres pays utilisent la capitale)
const LIEUX = {
  MA: { resto: ['12 rue Mustapha El Maani, Centre-ville', 33.5935, -7.6186], epicerie: ['45 boulevard Ghandi, Maârif', 33.5786, -7.6431], tel: ['6 12 34 56 78', '6 98 76 54 32'] },
  CI: { resto: ['Rue des Jardins, Cocody Deux-Plateaux', 5.3637, -3.9894], epicerie: ['Boulevard Latrille, Cocody', 5.3533, -3.9867], tel: ['07 07 12 34 56', '05 05 98 76 54'] },
  SN: { resto: ['Rue Carnot, Plateau', 14.6681, -17.4386], epicerie: ['Avenue Cheikh Anta Diop, Fann', 14.69, -17.461], tel: ['77 123 45 67', '78 987 65 43'] },
  FR: { resto: ['Rue du Faubourg Saint-Denis, 10e', 48.8722, 2.3539], epicerie: ['Rue de la Goutte d’Or, 18e', 48.8854, 2.3532], tel: ['6 12 34 56 78', '7 98 76 54 32'] },
};

// Noms des clients à crédit de l'épicerie, selon la région
const CLIENTS_EPICERIE = {
  MA: ['Amorac Kaislo', 'Amorac Kaislo', 'Amorac Kaislo', 'Amorac Kaislo', 'Amorac Kaislo', 'Amorac Kaislo'],
  autre: ['Amorac Kaislo', 'Amorac Kaislo', 'Amorac Kaislo', 'Amorac Kaislo', 'Amorac Kaislo', 'Amorac Kaislo'],
};

function adapterAuPays(d, paysId) {
  const pays = paysParId(paysId);
  const dev = pays.devise;
  const c = (x) => convertirDepuisDirham(x, dev);
  const lieux = LIEUX[pays.id];
  const estResto = d.commerce.type === 'restaurant';
  const [adresse, lat, lng] = lieux ? lieux[estResto ? 'resto' : 'epicerie'] : ['Avenue principale, centre-ville', null, null];
  const telLocal = lieux ? lieux.tel[estResto ? 0 : 1] : '00 00 00 00';

  Object.assign(d.commerce, {
    pays: pays.id,
    devise: dev,
    ville: pays.ville || 'Centre-ville',
    adresse,
    telephone: (pays.indicatif ? '+' + pays.indicatif + ' ' : '') + telLocal,
    email: 'contact@kaislo.com',
    localisation: lat !== null ? { lat, lng } : null,
    modesPaiement: pays.paiements,
    fondDeCaisse: c(200),
  });
  for (const p of d.produits) {
    p.prix = c(p.prix);
    p.promo = p.promo ? c(p.promo) : null;
    p.prixAchat = c(p.prixAchat);
    for (const g of p.groupes) for (const o of g.options) o.prix = c(o.prix);
  }
  const noms = CLIENTS_EPICERIE[pays.id === 'MA' ? 'MA' : 'autre'];
  d.clients = d.clients.map((k, i) => ({
    ...k,
    nom: estResto ? k.nom : noms[i] || k.nom,
    telephone: (pays.indicatif ? '+' + pays.indicatif : '') + '60000000' + (i + 1),
    note: k.note.includes('Plafond') ? 'Plafond conseillé : ' + c(300) + ' ' + symbole(dev) : k.note,
  }));
}

// Crée les données complètes d'un commerce de démo, adaptées au pays choisi
export function creerDonneesDemo(commerceId, paysId = 'MA') {
  const d = commerceId === 'chez-sentinelle' ? chezSentinelle() : restoIvoire();
  const graine = commerceId === 'chez-sentinelle' ? 777 : 2024;
  // Restaurant : le stock des boissons est suivi (montre la gestion du stock et de l'inventaire)
  if (commerceId === 'resto-ivoire') {
    const STOCK_BOISSONS = { 'Bissap': 40, 'Gnamakoudji': 35, 'Jus de passion': 18, 'Soda 33cl': 8, 'Eau minérale 1,5L': 60, 'Malta': 24 };
    d.commerce.gestionStock = true;
    d.produits = d.produits.map((p) => (p.nom in STOCK_BOISSONS ? { ...p, suiviStock: true, stock: STOCK_BOISSONS[p.nom], seuilAlerte: 12 } : p));
  }
  adapterAuPays(d, paysId);
  d.commerce.code = COMMERCES_DEMO.find((x) => x.id === commerceId).code;
  // Les démos ont un abonnement Pro actif (pour montrer l'espace Amorac)
  const ilYa = (j) => new Date(Date.now() - j * 86400000).toISOString();
  d.commerce.abonnement = {
    offre: 'pro',
    statut: 'actif',
    debut: ilYa(75),
    essaiFin: ilYa(45),
    periodeFin: new Date(Date.now() + 14 * 86400000).toISOString(),
    paiements: [
      { id: 'pa1', date: ilYa(45), montant: convertirDepuisDirham(199, d.commerce.devise), devise: d.commerce.devise, mois: 1, note: 'Premier mois' },
      { id: 'pa2', date: ilYa(16), montant: convertirDepuisDirham(199, d.commerce.devise), devise: d.commerce.devise, mois: 1, note: '' },
    ],
    notes: 'Commerce de démonstration',
  };
  d.version = VERSION_DONNEES;
  d.ventes = genererVentes(d, graine);
  d.prochainNumero = d.ventes.length + 1;
  d.depenses = genererDepenses(d, graine + 1);
  d.remboursements = genererRemboursements(d, graine + 3);
  d.sessionsCaisse = genererAnnulationsEtClotures(d, graine + 2);
  d.mouvements = genererMouvements(d, graine + 4);
  d.commandes = genererCommandes(d);
  return d;
}
