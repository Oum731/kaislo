// ------------------------------------------------------------
// Page "Logiciel de gestion de stock et d'inventaire" (référencement Google)
// Kaislo présenté comme outil de gestion : stock, inventaire, achats,
// dépenses, statistiques — avec ou sans ticket imprimé.
// ------------------------------------------------------------
import PageMetier from '@/components/site/PageMetier';
import { LIEN_DEMO_EPICERIE } from '@/components/site/Site';
import { metaPage } from '@/lib/seo';
import { tr, choisirLangue } from '@/lib/i18n';
import { alternates, lien } from '@/lib/site-routes';

const description =
  () => (tr('Logiciel de gestion de stock et d’inventaire pour commerces : stock en temps réel, entrées de marchandise, inventaire, alertes de rupture, valeur du stock, marges, dépenses et statistiques. Sur téléphone et ordinateur, imprimante facultative.'));

export function meta(lang) {
  choisirLangue(lang);
  return metaPage({
    title: tr('Logiciel de gestion de stock et d’inventaire'),
    description: description(),
    alternates: alternates('/gestion-stock/', lang),
    langue: lang,
  });
}

const contenu = () => ({
  lien: '/gestion-stock/', nomFil: tr('Gestion de stock et inventaire'),
  variante: 'stock',
  lienDemo: LIEN_DEMO_EPICERIE,
  videos: ['produits'],
  vignettes: ['presentation', 'epicerie', 'vendeurs'],
  titreVideo: tr('Ajouter un article et suivre son stock, en une minute.'),
  description: description(),
  titre: tr('Gérez votre stock et votre inventaire, simplement.'),
  chapo: tr('Quantités en temps réel, entrées de marchandise, inventaire, alertes de rupture et valeur du stock. Kaislo sert aussi d’outil de gestion au quotidien : achats, dépenses, marges et statistiques. Avec ou sans imprimante.'),
  garanties: [tr('Imprimante facultative'), tr('Export Excel de l’inventaire'), tr('Essai gratuit de 30 jours')],
  capture: { src: '/captures/stock-ordi.webp', alt: tr('Gestion du stock et de l’inventaire dans Kaislo') },
  captureMobile: { src: '/captures/epicerie-mobile.webp', alt: tr('Articles et stock sur téléphone') },
  etiquette: tr('Gestion de stock et d’inventaire'),
  titreFonctions: tr('Sachez à tout moment ce que vous avez, ce qui part et ce que ça vaut.'),
  chapoFonctions: tr('Pour les épiceries, grossistes et dépôts, boutiques, quincailleries, téléphonie, librairies, bars, restaurants (boissons, ingrédients)… Chaque article a son unité : pièce, kg, litre, mètre, carton, sac, bouteille.'),
  lignes: [
    {
      titre: tr('Un inventaire toujours à jour'),
      texte: tr('Chaque vente fait baisser le stock. Enregistrez la marchandise reçue avec son prix d’achat et son fournisseur, corrigez après comptage, et gardez l’historique de chaque mouvement.'),
      points: [tr('Alertes de stock bas et de rupture'), tr('Valeur du stock au prix d’achat et à la vente'), tr('Inventaire exporté en Excel (CSV) en un clic')],
      capture: { src: '/captures/stock-ordi.webp', alt: tr('Liste du stock avec alertes et valeur') },
    },
    {
      titre: tr('Et toute la gestion du commerce'),
      texte: tr('Chiffre d’affaires, marges par article, dépenses, crédit des clients, journées de vente : le tableau de bord résume votre activité, jour après jour.'),
      points: [tr('Statistiques par jour, semaine, mois et année'), tr('Dépenses et solde du jour'), tr('Ventes et sauvegarde complète exportables')],
      capture: { src: '/captures/tableau-ordi.webp', alt: tr('Tableau de bord : chiffre d’affaires, marge et dépenses') },
    },
  ],
  fonctions: [
    ['stock', tr('Stock en temps réel'), tr('Le stock baisse à chaque vente, depuis tous les appareils du commerce.')],
    ['plus', tr('Entrées de marchandise'), tr('Quantité reçue, prix d’achat et fournisseur : le stock et la marge se mettent à jour.')],
    ['reglages', 'Inventaire', tr('Comptez, corrigez la quantité réelle : l’écart est gardé dans l’historique.')],
    ['alerte', tr('Alertes de rupture'), tr('Un seuil par article : Kaislo vous prévient avant qu’il ne manque.')],
    ['scan', 'Code-barres', tr('Retrouvez un article en le scannant avec la caméra ou un lecteur.')],
    ['accueil', tr('Marges et valeur'), tr('Marge par article et valeur totale du stock, au prix d’achat et à la vente.')],
    ['depense', tr('Dépenses'), tr('Achats, transport, loyer… le solde du jour s’affiche sur le tableau de bord.')],
    ['installer', tr('Export Excel'), tr('Inventaire, ventes et sauvegarde complète téléchargeables à tout moment.')],
    ['imprimante', tr('Imprimante facultative'), tr('Le ticket peut être imprimé, envoyé par WhatsApp, ou simplement gardé dans l’historique.')],
  ],
  titreFaq: tr('Questions sur la gestion de stock'),
  questions: [
    [tr('Faut-il une imprimante pour utiliser Kaislo ?'), tr('Non. L’impression est facultative : chaque vente est enregistrée, le ticket reste consultable dans l’historique et peut être envoyé par WhatsApp. Vous pouvez même utiliser Kaislo uniquement pour le stock et l’inventaire.')],
    [tr('Comment faire l’inventaire ?'), tr('Dans Stock, touchez l’article et indiquez la quantité comptée : Kaislo corrige le stock et garde l’écart dans l’historique. Exportez ensuite l’inventaire complet en Excel.')],
    [tr('Plusieurs vendeurs ou appareils peuvent-ils mettre à jour le stock ?'), tr('Oui. Le stock est partagé entre tous les appareils du commerce et se synchronise dès qu’il y a internet, même après une coupure.')],
    [tr('Je vends au kilo, au mètre ou au carton : est-ce possible ?'), tr('Oui : choisissez l’unité de chaque article (pièce, kg, g, litre, mètre, carton, sac, paquet, boîte, bouteille…). Le stock, les ventes et l’inventaire Excel l’affichent partout.')],
    [tr('Est-ce adapté à un restaurant ?'), tr('Oui : activez « Gestion du stock et de l’inventaire » dans les réglages pour suivre les boissons et les ingrédients, en plus des plats.')],
    [tr('Combien ça coûte ?'), tr('Essai gratuit de 30 jours, puis un abonnement selon votre métier : au prix de votre pays (voir la page Tarifs), 1 poste et 5 vendeurs inclus, 2 mois offerts à l’année. Détail sur la page Tarifs.')],
  ],
  titreFinal: tr('Testez la gestion de stock de Kaislo.'),
  texteFinal: tr('La démo épicerie contient déjà un stock complet avec alertes. Ou créez votre commerce et ajoutez vos articles.'),
});

export default function Stock({ lang }) {
  choisirLangue(lang);
  return <PageMetier c={contenu()} lang={lang} />;
}
