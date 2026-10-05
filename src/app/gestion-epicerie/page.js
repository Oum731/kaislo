// ------------------------------------------------------------
// Page "Logiciel de gestion des ventes pour épicerie" (référencement Google)
// ------------------------------------------------------------
import PageMetier from '@/components/site/PageMetier';
import { LIEN_DEMO_EPICERIE } from '@/components/site/Site';
import { metaPage } from '@/lib/seo';

const description =
  'Gestion pour épicerie et supérette : code-barres, gestion de stock, alertes de rupture, carnet de crédit avec rappel WhatsApp, marge par produit, ticket imprimé. Gratuit pour démarrer.';

export const metadata = metaPage({
  title: 'Logiciel de gestion pour épicerie et supérette',
  description,
  alternates: { canonical: '/gestion-epicerie/' },
});

const contenu = {
  lien: '/gestion-epicerie/', nomFil: 'Gestion pour épicerie',
  variante: 'epicerie',
  lienDemo: LIEN_DEMO_EPICERIE,
  videos: ['epicerie'],
  vignettes: ['presentation', 'produits', 'vendeurs'],
  titreVideo: 'Une journée d’épicerie, expliquée en une minute.',
  description,
  titre: 'Le logiciel de gestion des ventes pour épiceries et supérettes.',
  capture: { src: '/captures/epicerie-ordi.webp', alt: 'Écran de vente de l’épicerie avec code-barres et stock' },
  captureMobile: { src: '/captures/epicerie-mobile.webp', alt: 'Écran de vente de l’épicerie sur téléphone' },
  lignes: [
    {
      titre: 'Le carnet de crédit, sans le cahier',
      texte: 'Chaque client a son compte : achats à crédit, remboursements et total dû. Reçu imprimé à chaque remboursement, rappel WhatsApp en un clic.',
      capture: { src: '/captures/credit-ordi.webp', alt: 'Carnet de crédit des clients de l’épicerie' },
    },
    {
      titre: 'Un stock qui se tient à jour',
      texte: 'Le stock baisse à chaque vente. Enregistrez la marchandise reçue avec son prix d’achat, faites l’inventaire, et voyez la valeur de votre stock.',
      points: ['Alertes de stock bas par article', 'Historique des entrées et corrections', 'Marge par article'],
      capture: { src: '/captures/stock-ordi.webp', alt: 'Gestion du stock de l’épicerie' },
    },
  ],
  chapo: 'Code-barres, stock, carnet de crédit numérique et marges : sachez ce que vous vendez, ce qui vous reste, et qui vous doit de l’argent.',
  garanties: ['Démo épicerie prête à tester', 'Scan avec la caméra du téléphone', 'Essai gratuit de 30 jours'],
  etiquette: 'Pour le comptoir et la réserve',
  titreFonctions: 'Tout ce qui se passe au comptoir, enfin sous contrôle.',
  chapoFonctions: 'Fini le cahier de crédit illisible et les ruptures découvertes devant le client.',
  fonctions: [
    ['carnet', 'Carnet de crédit', 'Chaque client a son compte : achats, remboursements, total dû. Rappel WhatsApp en un clic, reçu imprimé.', true],
    ['scan', 'Code-barres', 'Scannez avec la caméra du téléphone ou un lecteur USB/Bluetooth. Le produit s’ajoute tout seul.'],
    ['stock', 'Stock en temps réel', 'Le stock baisse à chaque vente. Entrées fournisseur, inventaire et historique des mouvements.'],
    ['alerte', 'Alertes de rupture', 'Choisissez le seuil de chaque produit : Kaislo vous prévient avant qu’il ne manque.', true],
    ['accueil', 'Marge par produit', 'Avec le prix d’achat, voyez la marge réelle de chaque article et la valeur de votre stock.'],
    ['remise', 'Promotions', 'Prix promo affiché barré au moment de la vente, remises en pourcentage ou en montant.'],
    ['imprimante', 'Ticket imprimé', 'Ticket clair avec vos coordonnées, et reçu pour chaque remboursement de crédit.'],
    ['bouclier', 'Clôture de la journée', 'Le soir, l’écart entre les espèces attendues et comptées s’affiche immédiatement.'],
    ['clients', 'Vendeurs et droits', 'Un code PIN par vendeur. Vous décidez qui peut ajouter des produits ou faire des remises.'],
  ],
  titreFaq: 'Questions des épiciers',
  questions: [
    ['Comment marche le carnet de crédit ?', 'Au moment de valider la vente, choisissez « À crédit » puis le client (ou créez-le en une seconde). Le ticket indique le total dû. Quand le client rembourse, vous enregistrez le montant et un reçu s’imprime.'],
    ['Puis-je scanner les codes-barres ?', 'Oui, avec la caméra du téléphone (Chrome sur Android) ou avec un lecteur de code-barres USB ou Bluetooth, qui fonctionne sur tous les appareils.'],
    ['Comment suivre mon stock ?', 'Activez « Suivre le stock » sur vos articles. Le stock baisse à chaque vente ; ajoutez la marchandise reçue avec le prix d’achat et le fournisseur, et corrigez après inventaire.'],
    ['Et les produits vendus au poids ou en pack ?', 'Utilisez les options : par exemple « 500 g / 1 kg / 2 kg » pour les tomates, ou « Bouteille / Pack de 6 » pour l’eau, chacun avec son prix.'],
    ['Combien ça coûte ?', 'Essai gratuit de 30 jours, puis un abonnement selon votre métier : au prix de votre pays (voir la page Tarifs), 1 poste et 5 vendeurs inclus, 2 mois offerts à l’année. Détail sur la page Tarifs.'],
  ],
  titreFinal: 'Testez la démo épicerie de Kaislo.',
  texteFinal: 'Une épicerie de démonstration avec stock, clients à crédit et statistiques. Ou créez directement la vôtre.',
};

export default function PageEpicerie() {
  return <PageMetier c={contenu} />;
}
