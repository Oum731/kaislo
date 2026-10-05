// ------------------------------------------------------------
// Page "Logiciel de gestion des ventes pour épicerie" (référencement Google)
// ------------------------------------------------------------
import PageMetier from '@/components/site/PageMetier';
import { LIEN_DEMO_EPICERIE } from '@/components/site/Site';
import { metaPage } from '@/lib/seo';
import { tr, choisirLangue } from '@/lib/i18n';
import { alternates, lien } from '@/lib/site-routes';

const description =
  () => (tr('Gestion pour épicerie et supérette : code-barres, gestion de stock, alertes de rupture, carnet de crédit avec rappel WhatsApp, marge par produit, ticket imprimé. Gratuit pour démarrer.'));

export function meta(lang) {
  choisirLangue(lang);
  return metaPage({
    title: tr('Logiciel de gestion pour épicerie et supérette'),
    description: description(),
    alternates: alternates('/gestion-epicerie/', lang),
    langue: lang,
  });
}

const contenu = () => ({
  lien: '/gestion-epicerie/', nomFil: tr('Gestion pour épicerie'),
  variante: 'epicerie',
  lienDemo: LIEN_DEMO_EPICERIE,
  videos: ['epicerie'],
  vignettes: ['presentation', 'produits', 'vendeurs'],
  titreVideo: tr('Une journée d’épicerie, expliquée en une minute.'),
  description: description(),
  titre: tr('Le logiciel de gestion des ventes pour épiceries et supérettes.'),
  capture: { src: '/captures/epicerie-ordi.webp', alt: tr('Écran de vente de l’épicerie avec code-barres et stock') },
  captureMobile: { src: '/captures/epicerie-mobile.webp', alt: tr('Écran de vente de l’épicerie sur téléphone') },
  lignes: [
    {
      titre: tr('Le carnet de crédit, sans le cahier'),
      texte: tr('Chaque client a son compte : achats à crédit, remboursements et total dû. Reçu imprimé à chaque remboursement, rappel WhatsApp en un clic.'),
      capture: { src: '/captures/credit-ordi.webp', alt: tr('Carnet de crédit des clients de l’épicerie') },
    },
    {
      titre: tr('Un stock qui se tient à jour'),
      texte: tr('Le stock baisse à chaque vente. Enregistrez la marchandise reçue avec son prix d’achat, faites l’inventaire, et voyez la valeur de votre stock.'),
      points: [tr('Alertes de stock bas par article'), tr('Historique des entrées et corrections'), tr('Marge par article')],
      capture: { src: '/captures/stock-ordi.webp', alt: tr('Gestion du stock de l’épicerie') },
    },
  ],
  chapo: tr('Code-barres, stock, carnet de crédit numérique et marges : sachez ce que vous vendez, ce qui vous reste, et qui vous doit de l’argent.'),
  garanties: [tr('Démo épicerie prête à tester'), tr('Scan avec la caméra du téléphone'), tr('Essai gratuit de 30 jours')],
  etiquette: tr('Pour le comptoir et la réserve'),
  titreFonctions: tr('Tout ce qui se passe au comptoir, enfin sous contrôle.'),
  chapoFonctions: tr('Fini le cahier de crédit illisible et les ruptures découvertes devant le client.'),
  fonctions: [
    ['carnet', tr('Carnet de crédit'), tr('Chaque client a son compte : achats, remboursements, total dû. Rappel WhatsApp en un clic, reçu imprimé.'), true],
    ['scan', 'Code-barres', tr('Scannez avec la caméra du téléphone ou un lecteur USB/Bluetooth. Le produit s’ajoute tout seul.')],
    ['stock', tr('Stock en temps réel'), tr('Le stock baisse à chaque vente. Entrées fournisseur, inventaire et historique des mouvements.')],
    ['alerte', tr('Alertes de rupture'), tr('Choisissez le seuil de chaque produit : Kaislo vous prévient avant qu’il ne manque.'), true],
    ['accueil', tr('Marge par produit'), tr('Avec le prix d’achat, voyez la marge réelle de chaque article et la valeur de votre stock.')],
    ['remise', 'Promotions', tr('Prix promo affiché barré au moment de la vente, remises en pourcentage ou en montant.')],
    ['imprimante', tr('Ticket imprimé'), tr('Ticket clair avec vos coordonnées, et reçu pour chaque remboursement de crédit.')],
    ['bouclier', tr('Clôture de la journée'), tr('Le soir, l’écart entre les espèces attendues et comptées s’affiche immédiatement.')],
    ['clients', tr('Vendeurs et droits'), tr('Un code PIN par vendeur. Vous décidez qui peut ajouter des produits ou faire des remises.')],
  ],
  titreFaq: tr('Questions des épiciers'),
  questions: [
    [tr('Comment marche le carnet de crédit ?'), tr('Au moment de valider la vente, choisissez « À crédit » puis le client (ou créez-le en une seconde). Le ticket indique le total dû. Quand le client rembourse, vous enregistrez le montant et un reçu s’imprime.')],
    [tr('Puis-je scanner les codes-barres ?'), tr('Oui, avec la caméra du téléphone (Chrome sur Android) ou avec un lecteur de code-barres USB ou Bluetooth, qui fonctionne sur tous les appareils.')],
    [tr('Comment suivre mon stock ?'), tr('Activez « Suivre le stock » sur vos articles. Le stock baisse à chaque vente ; ajoutez la marchandise reçue avec le prix d’achat et le fournisseur, et corrigez après inventaire.')],
    [tr('Et les produits vendus au poids ou en pack ?'), tr('Utilisez les options : par exemple « 500 g / 1 kg / 2 kg » pour les tomates, ou « Bouteille / Pack de 6 » pour l’eau, chacun avec son prix.')],
    [tr('Combien ça coûte ?'), tr('Essai gratuit de 30 jours, puis un abonnement selon votre métier : au prix de votre pays (voir la page Tarifs), 1 poste et 5 vendeurs inclus, 2 mois offerts à l’année. Détail sur la page Tarifs.')],
  ],
  titreFinal: tr('Testez la démo épicerie de Kaislo.'),
  texteFinal: tr('Une épicerie de démonstration avec stock, clients à crédit et statistiques. Ou créez directement la vôtre.'),
});

export default function Epicerie({ lang }) {
  choisirLangue(lang);
  return <PageMetier c={contenu()} lang={lang} />;
}
