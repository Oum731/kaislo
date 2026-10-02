// ------------------------------------------------------------
// Données de DÉMONSTRATION : deux commerces prêts à présenter.
//  - un maquis à Abidjan (FCFA)
//  - une épicerie à Casablanca (MAD)
// Plus des ventes générées sur les 45 derniers jours pour avoir
// de belles statistiques dès la première ouverture.
// ------------------------------------------------------------
import { creerLigne } from './vente.js';
import { arrondir } from '../utils/format.js';
import { calculerCloture } from './cloture.js';

// Raccourcis pour écrire le catalogue de façon lisible
let compteur = 0;
const id = (p) => p + ++compteur;
const opt = (nom, prix = 0) => ({ id: id('o'), nom, prix });
const groupe = (nom, type, obligatoire, options) => ({ id: id('g'), nom, type, obligatoire, options });
const produit = (categorieId, nom, prix, emoji, extra = {}) => ({
  id: id('p'),
  categorieId,
  nom,
  prix,
  emoji,
  codeBarre: '',
  suiviStock: false,
  stock: 0,
  actif: true,
  groupes: [],
  ...extra,
});

// Modes de paiement proposés selon le pays
export const PAIEMENTS = {
  FCFA: ['Espèces', 'Wave', 'Orange Money', 'Carte'],
  MAD: ['Espèces', 'Carte'],
};

// ============ 1. Maquis (restaurant, Côte d'Ivoire) ============
function maquis() {
  const cPlats = id('c'), cGrill = id('c'), cBoissons = id('c'), cDesserts = id('c');
  return {
    commerce: {
      id: 'maquis',
      nom: 'Maquis Chez Tantie Awa',
      type: 'restaurant',
      devise: 'FCFA',
      ville: 'Abidjan',
      adresse: 'Cocody Angré, 7e tranche',
      telephone: '+225 07 00 00 00 00',
      piedTicket: 'Merci et à bientôt !',
      modesPaiement: PAIEMENTS.FCFA,
      fondDeCaisse: 10000, // monnaie laissée dans la caisse en début de journée
    },
    utilisateurs: [
      { id: 'u1', nom: 'Awa Koné', role: 'gerant', pin: '1234', actif: true },
      { id: 'u2', nom: 'Moussa Traoré', role: 'vendeur', pin: '0000', actif: true },
      { id: 'u3', nom: 'Fatou Bamba', role: 'vendeur', pin: '1111', actif: true },
    ],
    categories: [
      { id: cPlats, nom: 'Plats', couleur: 'vert' },
      { id: cGrill, nom: 'Grillades', couleur: 'terre' },
      { id: cBoissons, nom: 'Boissons', couleur: 'bleu' },
      { id: cDesserts, nom: 'Desserts', couleur: 'safran' },
    ],
    produits: [
      produit(cPlats, 'Attiéké', 1000, '🍚', {
        groupes: [
          groupe('Accompagnement', 'unique', true, [
            opt('Poisson grillé', 1500), opt('Soupe de poisson', 1000),
            opt('Soupe de mouton', 1500), opt('Poulet braisé', 2000),
          ]),
          groupe('Suppléments', 'multiple', false, [opt('Alloco', 500), opt('Œuf', 200), opt('Piment frais', 0)]),
        ],
      }),
      produit(cPlats, 'Garba', 1000, '🐟', {
        groupes: [groupe('Suppléments', 'multiple', false, [opt('Œuf', 200), opt('Alloco', 500), opt('Piment', 0)])],
      }),
      produit(cPlats, 'Riz sauce graine', 2000, '🍛', {
        groupes: [groupe('Viande', 'unique', true, [opt('Poisson'), opt('Bœuf', 500), opt('Poulet', 1000)])],
      }),
      produit(cPlats, 'Foutou sauce claire', 2500, '🍲'),
      produit(cPlats, 'Placali sauce kplala', 2000, '🥣'),
      produit(cGrill, 'Poulet braisé', 3000, '🍗', {
        groupes: [
          groupe('Portion', 'unique', true, [opt('Demi'), opt('Entier', 2500)]),
          groupe('Accompagnement', 'multiple', false, [opt('Attiéké', 500), opt('Alloco', 500), opt('Frites', 700)]),
        ],
      }),
      produit(cGrill, 'Carpe braisée', 3500, '🐠', {
        groupes: [groupe('Accompagnement', 'multiple', false, [opt('Attiéké', 500), opt('Alloco', 500)])],
      }),
      produit(cGrill, 'Brochettes de bœuf (x5)', 1500, '🍢'),
      produit(cGrill, 'Alloco portion', 500, '🍌'),
      produit(cBoissons, 'Bissap', 500, '🧃', {
        groupes: [groupe('Taille', 'unique', true, [opt('Petit'), opt('Grand', 300)])],
      }),
      produit(cBoissons, 'Gnamakoudji', 500, '🥤'),
      produit(cBoissons, 'Jus de passion', 700, '🍹'),
      produit(cBoissons, 'Soda 33cl', 600, '🥫'),
      produit(cBoissons, 'Eau minérale 1,5L', 500, '💧'),
      produit(cBoissons, 'Bière 66cl', 1000, '🍺'),
      produit(cDesserts, 'Dêguê', 500, '🥛'),
      produit(cDesserts, 'Salade de fruits', 1000, '🍉'),
    ],
  };
}

// ============ 2. Épicerie (Maroc) ============
function epicerie() {
  const cEpi = id('c'), cBoi = id('c'), cLait = id('c'), cHyg = id('c'), cFruits = id('c');
  // Les codes-barres sont fictifs (préfixe 611 = Maroc)
  const p = (cat, nom, prix, emoji, code, stock, extra = {}) =>
    produit(cat, nom, prix, emoji, { codeBarre: code, suiviStock: true, stock, ...extra });
  return {
    commerce: {
      id: 'epicerie',
      nom: 'Épicerie Al Baraka',
      type: 'epicerie',
      devise: 'MAD',
      ville: 'Casablanca',
      adresse: 'Rue Ibnou Mounir, Maârif',
      telephone: '+212 6 00 00 00 00',
      piedTicket: 'Merci pour votre visite !',
      modesPaiement: PAIEMENTS.MAD,
      fondDeCaisse: 200,
    },
    utilisateurs: [
      { id: 'u1', nom: 'Youssef Benali', role: 'gerant', pin: '1234', actif: true },
      { id: 'u2', nom: 'Karim Alaoui', role: 'vendeur', pin: '0000', actif: true },
      { id: 'u3', nom: 'Salma Idrissi', role: 'vendeur', pin: '1111', actif: true },
    ],
    categories: [
      { id: cEpi, nom: 'Épicerie', couleur: 'safran' },
      { id: cBoi, nom: 'Boissons', couleur: 'bleu' },
      { id: cLait, nom: 'Produits laitiers', couleur: 'vert' },
      { id: cHyg, nom: 'Hygiène', couleur: 'prune' },
      { id: cFruits, nom: 'Fruits & légumes', couleur: 'terre' },
    ],
    produits: [
      p(cEpi, 'Huile de table 1L', 24, '🫒', '6111000000011', 30),
      p(cEpi, 'Sucre en morceaux 1kg', 12.5, '🧊', '6111000000028', 42),
      p(cEpi, 'Thé vert 200g', 16, '🍵', '6111000000035', 4),
      p(cEpi, 'Farine 1kg', 9, '🌾', '6111000000042', 25),
      p(cEpi, 'Pâtes 500g', 7.5, '🍝', '6111000000059', 60),
      p(cEpi, 'Riz 1kg', 14, '🍚', '6111000000066', 3),
      p(cEpi, 'Pain rond', 1.5, '🥖', '', 80),
      p(cBoi, 'Eau minérale 1,5L', 6, '💧', '6111000000073', 48, {
        groupes: [groupe('Conditionnement', 'unique', true, [opt('Bouteille'), opt('Pack de 6', 30)])],
      }),
      p(cBoi, 'Soda 1L', 9, '🥤', '6111000000080', 24),
      p(cBoi, 'Jus d\'orange 1L', 11, '🍊', '6111000000097', 12),
      p(cLait, 'Lait 1L', 7.5, '🥛', '6111000000103', 36),
      p(cLait, 'Yaourt nature', 2.5, '🍶', '6111000000110', 50),
      p(cLait, 'Raïbi', 3, '🍓', '6111000000127', 2),
      p(cLait, 'Fromage portions x8', 13, '🧀', '6111000000134', 15),
      p(cHyg, 'Savon', 6, '🧼', '6111000000141', 20),
      p(cHyg, 'Dentifrice', 12, '🪥', '6111000000158', 10),
      p(cHyg, 'Lessive 1kg', 22, '🧺', '6111000000165', 8),
      p(cFruits, 'Tomates', 6, '🍅', '', 40, {
        groupes: [groupe('Quantité', 'unique', true, [opt('500 g', -3), opt('1 kg'), opt('2 kg', 6)])],
      }),
      p(cFruits, 'Pommes de terre', 5, '🥔', '', 60, {
        groupes: [groupe('Quantité', 'unique', true, [opt('1 kg'), opt('2 kg', 5), opt('5 kg', 20)])],
      }),
      p(cFruits, 'Oignons 1kg', 4, '🧅', '', 45),
    ],
  };
}

// ------------------------------------------------------------
// Générateur de ventes passées (pseudo-aléatoire mais reproductible)
// ------------------------------------------------------------
function aleatoire(graine) {
  let s = graine;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

function genererVentes(d, graine) {
  const rnd = aleatoire(graine);
  const choisir = (tab) => tab[Math.floor(rnd() * tab.length)];
  const { commerce, produits, categories } = d;
  const vendeurs = d.utilisateurs.filter((u) => u.role === 'vendeur');
  const resto = commerce.type === 'restaurant';

  // Heures de fréquentation : midi et soir pour le maquis, toute la journée pour l'épicerie
  const heures = resto
    ? [11, 12, 12, 12, 13, 13, 13, 14, 15, 18, 19, 19, 20, 20, 20, 21, 21, 22]
    : [8, 8, 9, 10, 11, 12, 12, 13, 16, 17, 18, 18, 19, 19, 20, 20, 21, 22];
  // Poids des modes de paiement (même ordre que commerce.modesPaiement)
  const poidsPaiement = resto ? [0.55, 0.25, 0.15, 0.05] : [0.82, 0.18];

  const ventes = [];
  const maintenant = new Date();
  let numero = 0;

  for (let jour = 45; jour >= 0; jour--) {
    const date = new Date(maintenant);
    date.setDate(date.getDate() - jour);
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    const nb = Math.floor((resto ? 22 : 30) + rnd() * 18 + (weekend ? 10 : 0));

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
        lignes.push(creerLigne(prod, choix, rnd() < 0.8 ? 1 : 2, commerce.devise, cat?.nom));
      }

      let r = rnd(), idx = 0;
      while (idx < poidsPaiement.length - 1 && r > poidsPaiement[idx]) r -= poidsPaiement[idx++];

      const vendeur = choisir(vendeurs);
      ventes.push({
        id: 'v' + ventes.length,
        numero: 0,
        date: h.toISOString(),
        vendeurId: vendeur.id,
        vendeurNom: vendeur.nom,
        paiement: commerce.modesPaiement[idx],
        lignes,
        total: arrondir(lignes.reduce((s, x) => s + x.total, 0), commerce.devise),
      });
    }
  }
  // Numéros de ticket dans l'ordre chronologique
  ventes.sort((a, b) => a.date.localeCompare(b.date));
  for (const v of ventes) v.numero = ++numero;
  return ventes;
}

// Liste des commerces de démo (affichée sur l'écran d'accueil)
export const COMMERCES_DEMO = [
  { id: 'maquis', nom: 'Maquis Chez Tantie Awa', sousTitre: 'Restaurant · Abidjan · FCFA', emoji: '🍽️' },
  { id: 'epicerie', nom: 'Épicerie Al Baraka', sousTitre: 'Épicerie · Casablanca · DH', emoji: '🛒' },
];

// Catégories de dépenses proposées au gérant
export const CATEGORIES_DEPENSES = ['Achats / marchandises', 'Gaz / charbon', 'Transport', 'Salaires', 'Loyer / électricité', 'Autre'];

// Dépenses de démo : achats au marché, gaz, transport, loyer…
function genererDepenses(d, graine) {
  const rnd = aleatoire(graine);
  const resto = d.commerce.type === 'restaurant';
  const gerant = d.utilisateurs.find((u) => u.role === 'gerant');
  const depenses = [];
  const maintenant = new Date();
  const ajouter = (date, h, montant, categorie, note, depuisCaisse) => {
    const t = new Date(date);
    t.setHours(h, Math.floor(rnd() * 60), 0, 0);
    if (t > maintenant) return;
    depenses.push({ id: 'd' + depenses.length, date: t.toISOString(), montant, categorie, note, depuisCaisse, utilisateurNom: gerant.nom });
  };
  for (let jour = 45; jour >= 0; jour--) {
    const date = new Date(maintenant);
    date.setDate(date.getDate() - jour);
    if (resto) {
      ajouter(date, 9, Math.round((15000 + rnd() * 15000) / 500) * 500, 'Achats / marchandises', 'Marché : poisson, poulet, légumes', false); // payé avec la recette de la veille
      ajouter(date, 10, 1000 + Math.round(rnd() * 2) * 500, 'Transport', 'Taxi marché', true);
      if (jour % 5 === 0) ajouter(date, 11, 6500, 'Gaz / charbon', 'Bouteille de gaz', true);
      if (date.getDate() === 1) ajouter(date, 18, 180000, 'Salaires', 'Salaires du mois', false);
      if (date.getDate() === 5) ajouter(date, 12, 150000, 'Loyer / électricité', 'Loyer du local', false);
    } else {
      if (jour % 3 === 0) ajouter(date, 10, Math.round(400 + rnd() * 800), 'Achats / marchandises', 'Grossiste Derb Omar', false);
      if (jour % 3 === 0) ajouter(date, 11, 30, 'Transport', 'Livraison marchandises', true);
      if (date.getDate() === 1) ajouter(date, 18, 3000, 'Loyer / électricité', 'Loyer du local', false);
      if (date.getDate() === 10) ajouter(date, 12, 450, 'Loyer / électricité', 'Facture électricité', false);
    }
  }
  return depenses;
}

// Quelques ventes annulées et les clôtures des 10 derniers jours
function genererAnnulationsEtClotures(d, graine) {
  const rnd = aleatoire(graine);
  const gerant = d.utilisateurs.find((u) => u.role === 'gerant');
  for (const v of d.ventes) {
    if (rnd() < 0.008) v.annulee = { date: v.date, par: gerant.nom, motif: 'Erreur de saisie' };
  }
  const clotures = [];
  const vendeurs = d.utilisateurs.filter((u) => u.role === 'vendeur');
  const pas = d.commerce.devise === 'MAD' ? 1 : 100;
  for (let jour = 10; jour >= 1; jour--) {
    const debut = new Date();
    debut.setDate(debut.getDate() - jour);
    debut.setHours(0, 0, 0, 0);
    const fin = new Date(debut);
    fin.setHours(23, 15, 0, 0);
    const calcul = calculerCloture(d, debut, fin, d.commerce.fondDeCaisse);
    // La plupart du temps la caisse est juste, parfois il manque un peu
    const r = rnd();
    const ecart = r < 0.6 ? 0 : r < 0.85 ? -pas * (1 + Math.floor(rnd() * 10)) : pas * (1 + Math.floor(rnd() * 3));
    clotures.push({
      id: 'z' + clotures.length,
      date: fin.toISOString(),
      utilisateurNom: vendeurs[jour % vendeurs.length].nom,
      ...calcul,
      compte: calcul.attendu + ecart,
      ecart,
    });
  }
  return clotures;
}

// Crée les données complètes d'un commerce de démo
export function creerDonneesDemo(commerceId) {
  const d = commerceId === 'epicerie' ? epicerie() : maquis();
  const graine = commerceId === 'epicerie' ? 777 : 2024;
  d.version = VERSION_DONNEES;
  d.ventes = genererVentes(d, graine);
  d.prochainNumero = d.ventes.length + 1;
  d.depenses = genererDepenses(d, graine + 1);
  d.clotures = genererAnnulationsEtClotures(d, graine + 2);
  return d;
}

// À augmenter quand la structure des données change : la démo est alors recréée
export const VERSION_DONNEES = 3;
