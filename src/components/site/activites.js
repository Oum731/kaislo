// ------------------------------------------------------------
// Contenu des pages « Gestion pour … » par activité (référencement Google).
// Chaque page utilise le modèle PageMetier. Pour ajouter une activité :
// une entrée ici + un dossier src/app/<lien>/page.js de 3 lignes.
// ------------------------------------------------------------
import { metaPage } from '@/lib/seo';
import { tr } from '@/lib/i18n';
import { alternates } from '@/lib/site-routes';
// Pas d'import de Site.jsx ici : Site.jsx importe ce fichier (pied de page)
const LIEN_DEMO_EPICERIE = '/app/?demo=chez-sentinelle';

const LIEN_DEMO_RESTO = '/app/?demo=resto-ivoire';

// Captures communes (stock, caisse, crédit)
const STOCK = () => ({ src: '/captures/stock-ordi.webp', alt: tr('Gestion du stock et de l’inventaire dans Kaislo') });
const CAISSE = () => ({ src: '/captures/epicerie-ordi.webp', alt: tr('Kaislo sur ordinateur') });
const MOBILE = () => ({ src: '/captures/epicerie-mobile.webp', alt: tr('Kaislo sur téléphone') });
const CREDIT = () => ({ src: '/captures/credit-ordi.webp', alt: tr('Carnet de crédit des clients') });

// Fonctions présentes sur toutes les pages
const COMMUNES = () => ([
  ['imprimante', tr('Ticket imprimé ou WhatsApp'), tr('Imprimante thermique facultative : le ticket peut aussi partir par WhatsApp ou rester dans l’historique.')],
  ['bouclier', tr('Clôture de la journée'), tr('Le soir, l’écart entre les espèces attendues et comptées s’affiche immédiatement.')],
  ['clients', tr('Vendeurs et droits'), tr('Un code PIN par vendeur. Vous décidez qui peut modifier les prix ou faire des remises.')],
]);
const QUESTIONS_COMMUNES = () => ([
  [tr('Faut-il une imprimante ?'), tr('Non. Le ticket peut être envoyé par WhatsApp ou simplement gardé dans l’historique. Une imprimante thermique Bluetooth ou USB reste possible.')],
  [tr('Et sans internet ?'), tr('Kaislo continue de fonctionner. Les ventes sont envoyées au serveur dès que la connexion revient.')],
  [tr('Combien ça coûte ?'), tr('Essai gratuit de 30 jours, puis un abonnement selon votre métier : au prix de votre pays (voir la page Tarifs), 1 poste et 5 vendeurs inclus, 2 mois offerts à l’année. Détail sur la page Tarifs.')],
]);

function page({ lien, nom, titreSeo, description, titre, chapo, etiquette, titreFonctions, chapoFonctions, lignes, fonctions, questions, lienDemo = LIEN_DEMO_EPICERIE, capture = CAISSE() }) {
  return {
    lien, nom: tr(nom),
    metadata: (lang) => metaPage({ title: titreSeo, description, alternates: alternates(lien, lang), langue: lang }),
    contenu: {
      lien, nom: tr(nom), lienDemo, videos: ['produits'], vignettes: ['presentation', 'epicerie', 'vendeurs'],
      titreVideo: tr('Ajoutez vos articles en quelques secondes.'),
      description, titre, chapo, capture, captureMobile: MOBILE(),
      garanties: [tr('Essai gratuit de 30 jours'), tr('Téléphone, tablette ou ordinateur'), tr('Imprimante facultative')],
      etiquette, titreFonctions, chapoFonctions, lignes,
      fonctions: [...fonctions, ...COMMUNES()],
      titreFaq: tr('Questions fréquentes'), questions: [...questions, ...QUESTIONS_COMMUNES()],
      titreFinal: tr('Essayez Kaislo pour votre {0}.', [tr(nom).toLowerCase()]),
      texteFinal: tr('Créez votre commerce en deux minutes : catégories et unités de votre métier déjà prêtes. Ou testez d’abord la démo.'),
    },
  };
}

export const ACTIVITES = () => ({
  caisse: page({
    lien: '/logiciel-de-caisse/', nom: 'Caisse',
    titreSeo: tr('Logiciel de caisse sur téléphone, avec ou sans internet'),
    description: tr('Logiciel de caisse sur téléphone, tablette et ordinateur : encaissement rapide, ticket WhatsApp ou imprimé, stock à jour, clôture du soir, même sans internet. Essai gratuit 30 jours.'),
    titre: tr('Un logiciel de caisse simple, sur votre téléphone.'),
    chapo: tr('Encaissez en quelques touches, rendez la monnaie sans calcul, envoyez le ticket par WhatsApp et retrouvez vos comptes le soir. Pas de caisse enregistreuse à acheter : un téléphone suffit.'),
    etiquette: tr('Logiciel de caisse'), titreFonctions: tr('Encaisser vite, sans erreur de caisse.'),
    chapoFonctions: tr('Tout ce que fait une caisse enregistreuse, avec le stock et le crédit clients en plus.'),
    lignes: [{ titre: tr('Une vente en quelques touches'), texte: tr('Touchez les articles, choisissez le mode de paiement, validez : le total, la monnaie à rendre et le stock sont mis à jour tout de suite.'), points: [tr('Espèces, carte et mobile money'), tr('Remises et prix promotionnels'), tr('Ticket imprimé ou envoyé par WhatsApp')], capture: CAISSE() }],
    fonctions: [
      ['accueil', tr('Encaissement rapide'), tr('Le total et la monnaie à rendre se calculent tout seuls : plus d’erreur de rendu.'), true],
      ['scan', 'Code-barres', tr('Scannez les produits avec la caméra du téléphone ou un lecteur.')],
      ['remise', tr('Remises et promotions'), tr('Prix barré au moment de la vente, remises en pourcentage ou en montant.')],
      ['stock', tr('Stock à jour à chaque vente'), tr('Chaque encaissement diminue le stock : vous voyez les ruptures avant qu’elles arrivent.'), true],
    ],
    questions: [
      [tr('Peut-on encaisser sans internet ?'), tr('Oui. Kaislo enregistre les ventes sans connexion et les envoie au serveur dès que le réseau revient.')],
      [tr('Faut-il acheter une caisse enregistreuse ?'), tr('Non. Un téléphone, une tablette ou un ordinateur suffit ; l’imprimante de tickets reste facultative.')],
      [tr('Quels modes de paiement peut-on noter ?'), tr('Espèces, carte, mobile money (Wave, Orange Money, MTN MoMo…) : vous notez le mode, et le total de chacun s’affiche le soir.')],
    ],
  }),
  boutique: page({
    lien: '/gestion-boutique/', nom: 'Boutique',
    titreSeo: tr('Logiciel de gestion pour boutique'),
    description: tr('Logiciel de gestion des ventes et de stock pour boutique de vêtements, chaussures, cosmétiques et accessoires : tailles et couleurs, stock par article, promotions, crédit client, tickets WhatsApp. Essai gratuit.'),
    titre: tr('La gestion des ventes et du stock de votre boutique.'),
    chapo: tr('Vêtements, chaussures, cosmétiques, accessoires : chaque taille et chaque couleur a son prix et son stock. Vous savez ce qui se vend et ce qu’il faut racheter.'),
    etiquette: tr('Pour les boutiques'), titreFonctions: tr('Vendez plus, sans perdre le fil du stock.'),
    chapoFonctions: tr('Fini les articles introuvables et les ruptures sur les meilleures tailles.'),
    lignes: [{ titre: tr('Le stock de chaque article'), texte: tr('Le stock baisse à chaque vente. Enregistrez les arrivages avec le prix d’achat et voyez la valeur de votre boutique.'), points: [tr('Alertes de stock bas'), tr('Inventaire exporté en Excel'), tr('Marge par article')], capture: STOCK() }],
    fonctions: [
      ['produits', tr('Tailles et couleurs'), tr('Options par article (S, M, L ou couleurs), chacune avec son prix.'), true],
      ['remise', tr('Promotions et soldes'), tr('Prix barré au moment de la vente, remises en pourcentage ou en montant.')],
      ['carnet', tr('Crédit client'), tr('Les clients fidèles paient plus tard : achats, remboursements et rappel WhatsApp.')],
      ['scan', 'Code-barres', tr('Scannez les étiquettes avec la caméra du téléphone ou un lecteur.')],
      ['stock', tr('Stock et inventaire'), tr('Entrées de marchandise, corrections et historique.'), true],
      ['accueil', tr('Meilleures ventes'), tr('Les articles qui rapportent le plus, par jour, semaine ou mois.')],
    ],
    questions: [[tr('Puis-je gérer les tailles et les couleurs ?'), tr('Oui : ajoutez des options à un article (tailles, couleurs, modèles), chacune avec son propre prix.')]],
  }),
  quincaillerie: page({
    lien: '/gestion-quincaillerie/', nom: 'Quincaillerie',
    titreSeo: tr('Logiciel de gestion pour quincaillerie'),
    description: tr('Logiciel de gestion des ventes et de gestion de stock pour quincaillerie et matériaux : vente à la pièce, au mètre, au kg, au sac ou au carton, inventaire, prix d’achat et marges, crédit client. Essai gratuit.'),
    titre: tr('La gestion des ventes et du stock de votre quincaillerie.'),
    chapo: tr('Vis à la pièce, câble au mètre, ciment au sac, peinture au litre : chaque article a son unité, son prix et son stock.'),
    etiquette: tr('Pour les quincailleries et matériaux'), titreFonctions: tr('Des milliers de références, enfin bien rangées.'),
    chapoFonctions: tr('Outillage, plomberie, électricité, peinture, matériaux : vos catégories sont prêtes dès l’inscription.'),
    lignes: [{ titre: tr('Chaque unité de vente'), texte: tr('Choisissez l’unité de chaque article : pièce, mètre, kg, litre, sac, carton. Le stock, les ventes et l’inventaire l’affichent partout.'), points: [tr('Ciment au sac, câble au mètre'), tr('Inventaire Excel avec unités'), tr('Valeur du stock au prix d’achat')], capture: STOCK() }],
    fonctions: [
      ['stock', tr('Unités de vente'), tr('Pièce, mètre, kg, litre, sac, carton, lot : chaque article a la sienne.'), true],
      ['scan', tr('Recherche et code-barres'), tr('Retrouvez un article par son nom ou scannez son code.')],
      ['carnet', tr('Crédit des artisans'), tr('Les plombiers et maçons paient plus tard : chaque compte est suivi.')],
      ['depense', tr('Prix d’achat et fournisseurs'), tr('Entrées de marchandise avec prix d’achat et fournisseur.')],
      ['alerte', tr('Alertes de rupture'), tr('Un seuil par article : réapprovisionnez avant de manquer.'), true],
      ['remise', tr('Remises pros'), tr('Remises en pourcentage ou en montant pour les gros clients.')],
    ],
    questions: [[tr('Puis-je vendre au mètre ou au sac ?'), tr('Oui : chaque article a son unité (pièce, mètre, kg, litre, sac, carton…). Le stock se compte dans cette unité.')]],
  }),
  boulangerie: page({
    lien: '/gestion-boulangerie/', nom: 'Boulangerie',
    titreSeo: tr('Gestion pour boulangerie et pâtisserie'),
    description: tr('Logiciel de gestion des ventes pour boulangerie et pâtisserie : vente rapide au comptoir, pains, viennoiseries, gâteaux, crédit client, clôture de la journée, stock des ingrédients. Essai gratuit.'),
    titre: tr('La vente rapide dans votre boulangerie.'),
    chapo: tr('Pains, viennoiseries, gâteaux : validez une vente en un geste aux heures de pointe, et sachez chaque soir ce qui s’est vendu.'),
    etiquette: tr('Pour les boulangeries et pâtisseries'), titreFonctions: tr('Le comptoir va vite, les comptes suivent.'),
    chapoFonctions: tr('Des grandes tuiles avec photo pour vendre vite, et des chiffres clairs le soir.'),
    capture: { src: '/captures/vente-ordi.webp', alt: tr('Écran de vente rapide avec tuiles et photos') },
    lignes: [{ titre: tr('Ce qui se vend, heure par heure'), texte: tr('Voyez les ventes par heure et les meilleurs produits pour mieux préparer la fournée du lendemain.'), capture: { src: '/captures/tableau-ordi.webp', alt: tr('Tableau de bord des ventes') } }],
    fonctions: [
      ['caisse', tr('Vente en un geste'), tr('Grandes tuiles avec photos : un pain, deux croissants, validé.'), true],
      ['etoile', tr('Commandes de gâteaux'), tr('Options de taille et de parfum, chacune avec son prix.')],
      ['carnet', tr('Crédit des habitués'), tr('Les clients réguliers paient en fin de semaine.')],
      ['stock', tr('Stock des ingrédients'), tr('Farine, sucre, beurre : suivez ce qui reste et ce que vous achetez.')],
      ['accueil', tr('Ventes par heure'), tr('Préparez la bonne quantité au bon moment.'), true],
      ['depense', tr('Dépenses'), tr('Achats du jour notés pour connaître votre vrai résultat.')],
    ],
    questions: [[tr('Peut-on vendre très vite aux heures de pointe ?'), tr('Oui : chaque produit est une grande tuile, un toucher l’ajoute au ticket et la validation prend deux secondes.')]],
  }),
  bar: page({
    lien: '/gestion-bar/', nom: 'Bar',
    titreSeo: tr('Logiciel de gestion pour bar et café'),
    description: tr('Logiciel de gestion des ventes pour bar, café, lounge et maquis : commandes par table, stock des bouteilles, alertes de rupture, vendeurs avec code PIN, clôture de la journée. Essai gratuit.'),
    titre: tr('La gestion des ventes et du stock de votre bar.'),
    chapo: tr('Commandes par table, stock des bouteilles et des casiers, et les comptes de chaque serveur contrôlés chaque soir.'),
    etiquette: tr('Pour les bars, cafés et lounges'), titreFonctions: tr('Chaque bouteille comptée, chaque table réglée.'),
    chapoFonctions: tr('Le stock des boissons baisse à chaque vente : les écarts sautent aux yeux.'),
    lienDemo: LIEN_DEMO_RESTO,
    capture: { src: '/captures/tables-ordi.webp', alt: tr('Plan des tables du bar') },
    lignes: [{ titre: tr('Le stock des boissons'), texte: tr('Bouteilles, casiers, fûts : enregistrez les livraisons et comparez le stock réel au stock attendu.'), points: [tr('Alertes de rupture'), tr('Inventaire en fin de mois'), tr('Marge par boisson')], capture: STOCK() }],
    fonctions: [
      ['tables', tr('Commandes par table'), tr('Ouvrez une table, ajoutez au fil de la soirée, validez la vente à la fin.'), true],
      ['stock', tr('Stock des bouteilles'), tr('À la bouteille ou au casier, avec alertes de rupture.')],
      ['clients', tr('Comptes par serveur'), tr('Chaque serveur a son code : vous savez qui a vendu quoi.')],
      ['remise', tr('Happy hour'), tr('Prix promo et remises contrôlées.')],
      ['accueil', tr('Soirées en chiffres'), tr('Ventes par heure et meilleures boissons.'), true],
      ['carnet', 'Ardoises', tr('Les ardoises des habitués, suivies comme un carnet de crédit.')],
    ],
    questions: [[tr('Puis-je suivre les bouteilles et les casiers ?'), tr('Oui : choisissez l’unité de chaque article (bouteille, casier…), enregistrez les livraisons et faites l’inventaire.')]],
  }),
  grossiste: page({
    lien: '/logiciel-grossiste/', nom: tr('Commerce de gros'),
    titreSeo: tr('Logiciel de gestion pour grossiste et dépôt'),
    description: tr('Logiciel de gestion de stock et de gestion pour grossiste, demi-grossiste, dépôt de boissons et distributeur : vente au carton, au sac ou au lot, inventaire, crédit clients revendeurs, marges. Essai gratuit.'),
    titre: tr('Les ventes et le stock de votre dépôt.'),
    chapo: tr('Cartons, sacs, palettes, lots : suivez ce qui entre et ce qui sort, et le crédit de chaque revendeur.'),
    etiquette: tr('Pour les grossistes et dépôts'), titreFonctions: tr('Un stock juste, même avec de gros volumes.'),
    chapoFonctions: tr('Dépôts de boissons, grossistes alimentaires, distributeurs : les catégories sont prêtes à l’inscription.'),
    capture: STOCK(),
    lignes: [{ titre: tr('Le crédit des revendeurs'), texte: tr('Chaque revendeur a son compte : marchandise prise, versements, solde. Rappel WhatsApp en un clic.'), capture: CREDIT() }],
    fonctions: [
      ['stock', tr('Vente au carton ou au sac'), tr('Carton, sac, lot, paquet : chaque article a son unité.'), true],
      ['depense', tr('Entrées fournisseurs'), tr('Arrivages avec prix d’achat et fournisseur.')],
      ['carnet', tr('Crédit revendeurs'), tr('Solde de chaque client professionnel, à jour en temps réel.')],
      ['alerte', tr('Alertes de rupture'), tr('Réapprovisionnez avant de manquer.'), true],
      ['ventes', tr('Inventaire Excel'), tr('Export du stock et de sa valeur en un clic.')],
      ['remise', tr('Prix par quantité'), tr('Options par article : unité, carton, lot, chacune avec son prix.')],
    ],
    questions: [[tr('Puis-je vendre à l’unité et au carton ?'), tr('Oui : ajoutez des options à l’article (unité, carton de 12, pack…), chacune avec son prix.')]],
  }),
});
