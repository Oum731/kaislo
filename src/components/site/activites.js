// ------------------------------------------------------------
// Contenu des pages « Caisse pour … » par activité (référencement Google).
// Chaque page utilise le modèle PageMetier. Pour ajouter une activité :
// une entrée ici + un dossier src/app/<lien>/page.js de 3 lignes.
// ------------------------------------------------------------
// Pas d'import de Site.jsx ici : Site.jsx importe ce fichier (pied de page)
const LIEN_DEMO_EPICERIE = '/app/?demo=chez-sentinelle';

const LIEN_DEMO_RESTO = '/app/?demo=resto-ivoire';

// Captures communes (stock, caisse, crédit)
const STOCK = { src: '/captures/stock-ordi.webp', alt: 'Gestion du stock et de l’inventaire dans Kaislo' };
const CAISSE = { src: '/captures/epicerie-ordi.webp', alt: 'Caisse Kaislo sur ordinateur' };
const MOBILE = { src: '/captures/epicerie-mobile.webp', alt: 'Caisse Kaislo sur téléphone' };
const CREDIT = { src: '/captures/credit-ordi.webp', alt: 'Carnet de crédit des clients' };

// Fonctions présentes sur toutes les pages
const COMMUNES = [
  ['imprimante', 'Ticket imprimé ou WhatsApp', 'Imprimante thermique facultative : le ticket peut aussi partir par WhatsApp ou rester dans l’historique.'],
  ['bouclier', 'Clôture de caisse', 'Le soir, l’écart entre les espèces attendues et comptées s’affiche immédiatement.'],
  ['clients', 'Vendeurs et droits', 'Un code PIN par vendeur. Vous décidez qui peut modifier les prix ou faire des remises.'],
];
const QUESTIONS_COMMUNES = [
  ['Faut-il une imprimante ?', 'Non. Le ticket peut être envoyé par WhatsApp ou simplement gardé dans l’historique. Une imprimante thermique Bluetooth ou USB reste possible.'],
  ['Et sans internet ?', 'La caisse continue de fonctionner. Les ventes sont envoyées au serveur dès que la connexion revient.'],
  ['Combien ça coûte ?', 'Essai gratuit de 30 jours sans engagement, puis un abonnement mensuel simple dans la monnaie de votre pays.'],
];

function page({ lien, nom, titreSeo, description, titre, chapo, etiquette, titreFonctions, chapoFonctions, lignes, fonctions, questions, lienDemo = LIEN_DEMO_EPICERIE, capture = CAISSE }) {
  return {
    lien, nom,
    metadata: { title: titreSeo, description, alternates: { canonical: lien } },
    contenu: {
      lienDemo, videos: ['produits'], vignettes: ['presentation', 'epicerie', 'vendeurs'],
      titreVideo: 'Ajoutez vos articles en quelques secondes.',
      description, titre, chapo, capture, captureMobile: MOBILE,
      garanties: ['Essai gratuit de 30 jours', 'Téléphone, tablette ou ordinateur', 'Imprimante facultative'],
      etiquette, titreFonctions, chapoFonctions, lignes,
      fonctions: [...fonctions, ...COMMUNES],
      titreFaq: 'Questions fréquentes', questions: [...questions, ...QUESTIONS_COMMUNES],
      titreFinal: `Essayez Kaislo pour votre ${nom.toLowerCase()}.`,
      texteFinal: 'Créez votre commerce en deux minutes : catégories et unités de votre métier déjà prêtes. Ou testez d’abord la démo.',
    },
  };
}

export const ACTIVITES = {
  boutique: page({
    lien: '/caisse-boutique/', nom: 'Boutique',
    titreSeo: 'Caisse pour boutique — vêtements, cosmétiques, accessoires',
    description: 'Logiciel de caisse et de stock pour boutique de vêtements, chaussures, cosmétiques et accessoires : tailles et couleurs, stock par article, promotions, crédit client, tickets WhatsApp. Essai gratuit.',
    titre: 'La caisse et le stock de votre boutique.',
    chapo: 'Vêtements, chaussures, cosmétiques, accessoires : chaque taille et chaque couleur a son prix et son stock. Vous savez ce qui se vend et ce qu’il faut racheter.',
    etiquette: 'Pour les boutiques', titreFonctions: 'Vendez plus, sans perdre le fil du stock.',
    chapoFonctions: 'Fini les articles introuvables et les ruptures sur les meilleures tailles.',
    lignes: [{ titre: 'Le stock de chaque article', texte: 'Le stock baisse à chaque vente. Enregistrez les arrivages avec le prix d’achat et voyez la valeur de votre boutique.', points: ['Alertes de stock bas', 'Inventaire exporté en Excel', 'Marge par article'], capture: STOCK }],
    fonctions: [
      ['produits', 'Tailles et couleurs', 'Options par article (S, M, L ou couleurs), chacune avec son prix.', true],
      ['remise', 'Promotions et soldes', 'Prix barré à la caisse, remises en pourcentage ou en montant.'],
      ['carnet', 'Crédit client', 'Les clients fidèles paient plus tard : achats, remboursements et rappel WhatsApp.'],
      ['scan', 'Code-barres', 'Scannez les étiquettes avec la caméra du téléphone ou un lecteur.'],
      ['stock', 'Stock et inventaire', 'Entrées de marchandise, corrections et historique.', true],
      ['accueil', 'Meilleures ventes', 'Les articles qui rapportent le plus, par jour, semaine ou mois.'],
    ],
    questions: [['Puis-je gérer les tailles et les couleurs ?', 'Oui : ajoutez des options à un article (tailles, couleurs, modèles), chacune avec son propre prix.']],
  }),
  quincaillerie: page({
    lien: '/caisse-quincaillerie/', nom: 'Quincaillerie',
    titreSeo: 'Caisse pour quincaillerie — vente au mètre, au kg, au sac',
    description: 'Logiciel de caisse et de gestion de stock pour quincaillerie et matériaux : vente à la pièce, au mètre, au kg, au sac ou au carton, inventaire, prix d’achat et marges, crédit client. Essai gratuit.',
    titre: 'La caisse et le stock de votre quincaillerie.',
    chapo: 'Vis à la pièce, câble au mètre, ciment au sac, peinture au litre : chaque article a son unité, son prix et son stock.',
    etiquette: 'Pour les quincailleries et matériaux', titreFonctions: 'Des milliers de références, enfin bien rangées.',
    chapoFonctions: 'Outillage, plomberie, électricité, peinture, matériaux : vos catégories sont prêtes dès l’inscription.',
    lignes: [{ titre: 'Chaque unité de vente', texte: 'Choisissez l’unité de chaque article : pièce, mètre, kg, litre, sac, carton. Le stock, la caisse et l’inventaire l’affichent partout.', points: ['Ciment au sac, câble au mètre', 'Inventaire Excel avec unités', 'Valeur du stock au prix d’achat'], capture: STOCK }],
    fonctions: [
      ['stock', 'Unités de vente', 'Pièce, mètre, kg, litre, sac, carton, lot : chaque article a la sienne.', true],
      ['scan', 'Recherche et code-barres', 'Retrouvez un article par son nom ou scannez son code.'],
      ['carnet', 'Crédit des artisans', 'Les plombiers et maçons paient plus tard : chaque compte est suivi.'],
      ['depense', 'Prix d’achat et fournisseurs', 'Entrées de marchandise avec prix d’achat et fournisseur.'],
      ['alerte', 'Alertes de rupture', 'Un seuil par article : réapprovisionnez avant de manquer.', true],
      ['remise', 'Remises pros', 'Remises en pourcentage ou en montant pour les gros clients.'],
    ],
    questions: [['Puis-je vendre au mètre ou au sac ?', 'Oui : chaque article a son unité (pièce, mètre, kg, litre, sac, carton…). Le stock se compte dans cette unité.']],
  }),
  pharmacie: page({
    lien: '/caisse-pharmacie/', nom: 'Pharmacie',
    titreSeo: 'Caisse et stock pour pharmacie et parapharmacie',
    description: 'Logiciel de caisse et de gestion de stock pour pharmacie, parapharmacie et dépôt pharmaceutique : stock par boîte, alertes de rupture, inventaire, prix d’achat, vendeurs avec code PIN. Essai gratuit.',
    titre: 'La caisse et le stock de votre pharmacie.',
    chapo: 'Médicaments, parapharmacie, hygiène : suivez le stock boîte par boîte, soyez prévenu avant la rupture et contrôlez la caisse de chaque vendeur.',
    etiquette: 'Pour les pharmacies et parapharmacies', titreFonctions: 'Moins de ruptures, plus de contrôle.',
    chapoFonctions: 'Un outil simple pour la caisse et le stock. Kaislo n’est pas un logiciel de dossier patient ni de tiers payant.',
    lignes: [{ titre: 'Le stock à la boîte près', texte: 'Le stock baisse à chaque vente. Enregistrez les livraisons du grossiste avec le prix d’achat et faites vos inventaires.', points: ['Alertes de stock bas', 'Historique des entrées', 'Inventaire exporté en Excel'], capture: STOCK }],
    fonctions: [
      ['alerte', 'Alertes de rupture', 'Un seuil par produit : commandez à temps.', true],
      ['scan', 'Code-barres', 'Scannez les boîtes avec la caméra ou un lecteur.'],
      ['stock', 'Livraisons et inventaire', 'Entrées avec prix d’achat et fournisseur, corrections après inventaire.'],
      ['accueil', 'Marges et chiffre d’affaires', 'Par jour, semaine ou mois, avec les meilleures ventes.'],
      ['carnet', 'Crédit client', 'Suivi des clients qui paient plus tard.', true],
      ['remise', 'Remises', 'Remises contrôlées : seuls les vendeurs autorisés peuvent en faire.'],
    ],
    questions: [['Kaislo gère-t-il les ordonnances ?', 'Non : Kaislo est une caisse et un outil de stock. Il ne gère ni dossier patient, ni tiers payant, ni ordonnances.']],
  }),
  boulangerie: page({
    lien: '/caisse-boulangerie/', nom: 'Boulangerie',
    titreSeo: 'Caisse pour boulangerie et pâtisserie',
    description: 'Logiciel de caisse pour boulangerie et pâtisserie : vente rapide au comptoir, pains, viennoiseries, gâteaux, crédit client, clôture de caisse, stock des ingrédients. Essai gratuit.',
    titre: 'La caisse rapide de votre boulangerie.',
    chapo: 'Pains, viennoiseries, gâteaux : encaissez en un geste aux heures de pointe, et sachez chaque soir ce qui s’est vendu.',
    etiquette: 'Pour les boulangeries et pâtisseries', titreFonctions: 'Le comptoir va vite, la caisse suit.',
    chapoFonctions: 'Des grandes tuiles avec photo pour vendre vite, et des chiffres clairs le soir.',
    capture: { src: '/captures/caisse-ordi.webp', alt: 'Caisse rapide avec tuiles et photos' },
    lignes: [{ titre: 'Ce qui se vend, heure par heure', texte: 'Voyez les ventes par heure et les meilleurs produits pour mieux préparer la fournée du lendemain.', capture: { src: '/captures/tableau-ordi.webp', alt: 'Tableau de bord des ventes' } }],
    fonctions: [
      ['caisse', 'Vente en un geste', 'Grandes tuiles avec photos : un pain, deux croissants, encaissé.', true],
      ['etoile', 'Commandes de gâteaux', 'Options de taille et de parfum, chacune avec son prix.'],
      ['carnet', 'Crédit des habitués', 'Les clients réguliers paient en fin de semaine.'],
      ['stock', 'Stock des ingrédients', 'Farine, sucre, beurre : suivez ce qui reste et ce que vous achetez.'],
      ['accueil', 'Ventes par heure', 'Préparez la bonne quantité au bon moment.', true],
      ['depense', 'Dépenses', 'Achats du jour notés pour connaître votre vrai résultat.'],
    ],
    questions: [['Peut-on vendre très vite aux heures de pointe ?', 'Oui : chaque produit est une grande tuile, un toucher l’ajoute au ticket et l’encaissement prend deux secondes.']],
  }),
  bar: page({
    lien: '/caisse-bar/', nom: 'Bar',
    titreSeo: 'Caisse pour bar, café et lounge — tables et stock des boissons',
    description: 'Logiciel de caisse pour bar, café, lounge et maquis : commandes par table, stock des bouteilles, alertes de rupture, vendeurs avec code PIN, clôture de caisse. Essai gratuit.',
    titre: 'La caisse et le stock de votre bar.',
    chapo: 'Commandes par table, stock des bouteilles et des casiers, et une caisse de serveur contrôlée chaque soir.',
    etiquette: 'Pour les bars, cafés et lounges', titreFonctions: 'Chaque bouteille comptée, chaque table encaissée.',
    chapoFonctions: 'Le stock des boissons baisse à chaque vente : les écarts sautent aux yeux.',
    lienDemo: LIEN_DEMO_RESTO,
    capture: { src: '/captures/tables-ordi.webp', alt: 'Plan des tables du bar' },
    lignes: [{ titre: 'Le stock des boissons', texte: 'Bouteilles, casiers, fûts : enregistrez les livraisons et comparez le stock réel au stock attendu.', points: ['Alertes de rupture', 'Inventaire en fin de mois', 'Marge par boisson'], capture: STOCK }],
    fonctions: [
      ['tables', 'Commandes par table', 'Ouvrez une table, ajoutez au fil de la soirée, encaissez à la fin.', true],
      ['stock', 'Stock des bouteilles', 'À la bouteille ou au casier, avec alertes de rupture.'],
      ['clients', 'Caisse par serveur', 'Chaque serveur a son code : vous savez qui a vendu quoi.'],
      ['remise', 'Happy hour', 'Prix promo et remises contrôlées.'],
      ['accueil', 'Soirées en chiffres', 'Ventes par heure et meilleures boissons.', true],
      ['carnet', 'Ardoises', 'Les ardoises des habitués, suivies comme un carnet de crédit.'],
    ],
    questions: [['Puis-je suivre les bouteilles et les casiers ?', 'Oui : choisissez l’unité de chaque article (bouteille, casier…), enregistrez les livraisons et faites l’inventaire.']],
  }),
  grossiste: page({
    lien: '/logiciel-grossiste/', nom: 'Commerce de gros',
    titreSeo: 'Logiciel de stock et de caisse pour grossiste et dépôt',
    description: 'Logiciel de gestion de stock et de caisse pour grossiste, demi-grossiste, dépôt de boissons et distributeur : vente au carton, au sac ou au lot, inventaire, crédit clients revendeurs, marges. Essai gratuit.',
    titre: 'Le stock et la caisse de votre dépôt.',
    chapo: 'Cartons, sacs, palettes, lots : suivez ce qui entre et ce qui sort, et le crédit de chaque revendeur.',
    etiquette: 'Pour les grossistes et dépôts', titreFonctions: 'Un stock juste, même avec de gros volumes.',
    chapoFonctions: 'Dépôts de boissons, grossistes alimentaires, distributeurs : les catégories sont prêtes à l’inscription.',
    capture: STOCK,
    lignes: [{ titre: 'Le crédit des revendeurs', texte: 'Chaque revendeur a son compte : marchandise prise, versements, solde. Rappel WhatsApp en un clic.', capture: CREDIT }],
    fonctions: [
      ['stock', 'Vente au carton ou au sac', 'Carton, sac, lot, paquet : chaque article a son unité.', true],
      ['depense', 'Entrées fournisseurs', 'Arrivages avec prix d’achat et fournisseur.'],
      ['carnet', 'Crédit revendeurs', 'Solde de chaque client professionnel, à jour en temps réel.'],
      ['alerte', 'Alertes de rupture', 'Réapprovisionnez avant de manquer.', true],
      ['ventes', 'Inventaire Excel', 'Export du stock et de sa valeur en un clic.'],
      ['remise', 'Prix par quantité', 'Options par article : unité, carton, lot, chacune avec son prix.'],
    ],
    questions: [['Puis-je vendre à l’unité et au carton ?', 'Oui : ajoutez des options à l’article (unité, carton de 12, pack…), chacune avec son prix.']],
  }),
};
