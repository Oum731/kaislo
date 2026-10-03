// ------------------------------------------------------------
// Page "Logiciel de gestion de stock et d'inventaire" (référencement Google)
// Kaisly présenté comme outil de gestion : stock, inventaire, achats,
// dépenses, statistiques — avec ou sans ticket imprimé.
// ------------------------------------------------------------
import PageMetier from '@/components/site/PageMetier';
import { LIEN_DEMO_EPICERIE } from '@/components/site/Site';

const description =
  'Logiciel de gestion de stock et d’inventaire pour commerces : stock en temps réel, entrées de marchandise, inventaire, alertes de rupture, valeur du stock, marges, dépenses et statistiques. Sur téléphone et ordinateur, imprimante facultative.';

export const metadata = {
  title: 'Gestion de stock et d’inventaire — logiciel simple pour commerces',
  description,
  alternates: { canonical: '/gestion-stock/' },
};

const contenu = {
  variante: 'stock',
  lienDemo: LIEN_DEMO_EPICERIE,
  videos: ['produits'],
  vignettes: ['presentation', 'epicerie', 'vendeurs'],
  titreVideo: 'Ajouter un article et suivre son stock, en une minute.',
  description,
  titre: 'Gérez votre stock et votre inventaire, simplement.',
  chapo: 'Quantités en temps réel, entrées de marchandise, inventaire, alertes de rupture et valeur du stock. Kaisly sert aussi d’outil de gestion au quotidien : achats, dépenses, marges et statistiques. Avec ou sans imprimante.',
  garanties: ['Imprimante facultative', 'Export Excel de l’inventaire', 'Essai gratuit de 30 jours'],
  capture: { src: '/captures/stock-ordi.webp', alt: 'Gestion du stock et de l’inventaire dans Kaisly' },
  captureMobile: { src: '/captures/epicerie-mobile.webp', alt: 'Articles et stock sur téléphone' },
  etiquette: 'Gestion de stock et d’inventaire',
  titreFonctions: 'Sachez à tout moment ce que vous avez, ce qui part et ce que ça vaut.',
  chapoFonctions: 'Pour les épiceries, boutiques, dépôts, restaurants (boissons, ingrédients) et tous les commerces qui achètent pour revendre.',
  lignes: [
    {
      titre: 'Un inventaire toujours à jour',
      texte: 'Chaque vente fait baisser le stock. Enregistrez la marchandise reçue avec son prix d’achat et son fournisseur, corrigez après comptage, et gardez l’historique de chaque mouvement.',
      points: ['Alertes de stock bas et de rupture', 'Valeur du stock au prix d’achat et à la vente', 'Inventaire exporté en Excel (CSV) en un clic'],
      capture: { src: '/captures/stock-ordi.webp', alt: 'Liste du stock avec alertes et valeur' },
    },
    {
      titre: 'Et toute la gestion du commerce',
      texte: 'Chiffre d’affaires, marges par article, dépenses, crédit des clients, journées de caisse : le tableau de bord résume votre activité, jour après jour.',
      points: ['Statistiques par jour, semaine, mois et année', 'Dépenses et solde du jour', 'Ventes et sauvegarde complète exportables'],
      capture: { src: '/captures/tableau-ordi.webp', alt: 'Tableau de bord : chiffre d’affaires, marge et dépenses' },
    },
  ],
  fonctions: [
    ['stock', 'Stock en temps réel', 'Le stock baisse à chaque vente, depuis tous les appareils du commerce.'],
    ['plus', 'Entrées de marchandise', 'Quantité reçue, prix d’achat et fournisseur : le stock et la marge se mettent à jour.'],
    ['reglages', 'Inventaire', 'Comptez, corrigez la quantité réelle : l’écart est gardé dans l’historique.'],
    ['alerte', 'Alertes de rupture', 'Un seuil par article : Kaisly vous prévient avant qu’il ne manque.'],
    ['scan', 'Code-barres', 'Retrouvez un article en le scannant avec la caméra ou un lecteur.'],
    ['accueil', 'Marges et valeur', 'Marge par article et valeur totale du stock, au prix d’achat et à la vente.'],
    ['depense', 'Dépenses', 'Achats, transport, loyer… le solde du jour s’affiche sur le tableau de bord.'],
    ['installer', 'Export Excel', 'Inventaire, ventes et sauvegarde complète téléchargeables à tout moment.'],
    ['imprimante', 'Imprimante facultative', 'Le ticket peut être imprimé, envoyé par WhatsApp, ou simplement gardé dans l’historique.'],
  ],
  titreFaq: 'Questions sur la gestion de stock',
  questions: [
    ['Faut-il une imprimante pour utiliser Kaisly ?', 'Non. L’impression est facultative : chaque vente est enregistrée, le ticket reste consultable dans l’historique et peut être envoyé par WhatsApp. Vous pouvez même utiliser Kaisly uniquement pour le stock et l’inventaire.'],
    ['Comment faire l’inventaire ?', 'Dans Stock, touchez l’article et indiquez la quantité comptée : Kaisly corrige le stock et garde l’écart dans l’historique. Exportez ensuite l’inventaire complet en Excel.'],
    ['Plusieurs vendeurs ou appareils peuvent-ils mettre à jour le stock ?', 'Oui. Le stock est partagé entre tous les appareils du commerce et se synchronise dès qu’il y a internet, même après une coupure.'],
    ['Est-ce adapté à un restaurant ?', 'Oui : activez « Gestion du stock et de l’inventaire » dans les réglages pour suivre les boissons et les ingrédients, en plus des plats.'],
    ['Combien ça coûte ?', 'Essai gratuit de 30 jours, puis un abonnement mensuel simple dans la monnaie de votre pays.'],
  ],
  titreFinal: 'Testez la gestion de stock de Kaisly.',
  texteFinal: 'La démo épicerie contient déjà un stock complet avec alertes. Ou créez votre commerce et ajoutez vos articles.',
};

export default function PageGestionStock() {
  return <PageMetier c={contenu} />;
}
