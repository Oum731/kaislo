// ------------------------------------------------------------
// Page "Logiciel de caisse pour restaurant" (référencement Google)
// ------------------------------------------------------------
import PageMetier from '@/components/site/PageMetier';
import { LIEN_DEMO_RESTO } from '@/components/site/Site';

const description =
  'Caisse pour restaurant, maquis, snack et café : tables, ticket cuisine, plats avec accompagnements, ticket imprimé en Bluetooth, clôture de caisse, marge par plat. Gratuit pour démarrer.';

export const metadata = {
  title: 'Logiciel de caisse pour restaurant et maquis — tables, cuisine, tickets',
  description,
  alternates: { canonical: '/caisse-restaurant/' },
};

const contenu = {
  variante: 'resto',
  lienDemo: LIEN_DEMO_RESTO,
  videos: ['restaurant', 'vendeurs'],
  titreVideo: 'Une commande complète, expliquée en une minute.',
  description,
  titre: 'Le logiciel de caisse pour restaurants, maquis et snacks.',
  capture: { src: '/captures/tables-ordi.webp', alt: 'Plan des tables du restaurant dans Kaisly' },
  captureMobile: { src: '/captures/caisse-mobile.webp', alt: 'Caisse du restaurant sur téléphone' },
  lignes: [
    {
      titre: 'Prendre la commande, envoyer en cuisine',
      texte: 'Ouvrez la table, ajoutez les plats avec leurs accompagnements : le ticket cuisine part sans les prix. Ajoutez des plats pendant le repas et encaissez à la fin.',
      points: ['Plan des tables, libres et occupées', 'Accompagnements et suppléments au bon prix', 'Vente à emporter ou client à distance'],
      capture: { src: '/captures/caisse-ordi.webp', alt: 'Caisse du restaurant avec accompagnements' },
    },
    {
      titre: 'Fermer la caisse sans recompter à la main',
      texte: 'Le soir, Kaisly indique les espèces attendues, le total vendu par plat et l’écart avec le montant compté. Chaque journée reste dans l’historique.',
      capture: { src: '/captures/fermeture-ordi.webp', alt: 'Fermeture de caisse avec le total vendu par plat' },
    },
  ],
  chapo: 'Tables, ticket cuisine, plats avec accompagnements, ticket client imprimé ou envoyé par WhatsApp : servez plus vite et sachez chaque soir ce que vous avez gagné.',
  garanties: ['Démo restaurant prête à tester', 'Sur téléphone ou tablette', 'Essai gratuit de 30 jours'],
  etiquette: 'Pour la salle et la cuisine',
  titreFonctions: 'Du premier plat à la clôture de caisse.',
  chapoFonctions: 'Chaque fonction répond à un vrai problème de restaurateur : les erreurs de commande, les tables oubliées, la recette à recompter le soir.',
  fonctions: [
    ['tables', 'Plan des tables', 'Voyez d’un coup d’œil les tables libres, occupées, et celles qui attendent depuis plus de 45 minutes.'],
    ['cuisine', 'Ticket cuisine', 'Les nouveaux plats partent en cuisine sans les prix, avec la table et l’heure. Ajoutez des plats pendant le repas.', true],
    ['caisse', 'Plats avec options', 'Attiéké + poisson grillé, poulet demi ou entier, suppléments alloco… le bon prix se calcule tout seul.'],
    ['imprimante', 'Ticket client', 'Ticket imprimé avec votre nom, la table, les promos et la remise éventuelle.'],
    ['accueil', 'Plats les plus vendus', 'Classement des plats et marge par plat : savez-vous lequel vous rapporte le plus ?', true],
    ['bouclier', 'Clôture de caisse', 'En fin de service, comptez les billets : Kaisly calcule l’attendu et affiche l’écart.'],
    ['depense', 'Dépenses du jour', 'Marché, gaz, transport : notez-les, et le solde du jour s’affiche sur le tableau de bord.'],
    ['clients', 'Serveurs et droits', 'Un code PIN par serveur. Annulations protégées par le code du gérant.'],
    ['carnet', 'Clients à crédit', 'Les bureaux voisins qui paient en fin de mois : tout est noté, avec l’historique.'],
  ],
  titreFaq: 'Questions des restaurateurs',
  questions: [
    ['Comment fonctionne le ticket cuisine ?', 'Ouvrez une table, ajoutez les plats puis touchez « Envoyer en cuisine ». Seuls les nouveaux plats sont envoyés, sans les prix, avec le nom de la table. Vous pouvez ajouter des plats plus tard et encaisser à la fin du repas.'],
    ['Puis-je gérer les accompagnements et les suppléments ?', 'Oui. Chaque plat peut avoir des groupes d’options : un choix obligatoire (accompagnement, portion) et des suppléments facultatifs, chacun avec son prix.'],
    ['Et pour la vente à emporter ?', 'Encaissez directement depuis la caisse, ou créez une table « À emporter » pour envoyer la commande en cuisine.'],
    ['Faut-il une imprimante ?', 'Non, c’est facultatif : l’aperçu du ticket s’affiche à l’écran. Pour imprimer, une imprimante thermique Bluetooth 58 ou 80 mm suffit.'],
    ['Puis-je envoyer l’addition par WhatsApp ?', 'Oui : pour une livraison ou une commande par téléphone, cochez « Client à distance » et le reçu s’ouvre dans WhatsApp, prêt à être envoyé.'],
    ['Combien ça coûte ?', 'Essai gratuit de 30 jours, puis un abonnement mensuel simple dans la monnaie de votre pays.'],
  ],
  titreFinal: 'Testez la démo restaurant de Kaisly.',
  texteFinal: 'Un restaurant de démonstration déjà rempli : tables occupées, plats, statistiques. Ou créez directement le vôtre.',
};

export default function PageRestaurant() {
  return <PageMetier c={contenu} />;
}
