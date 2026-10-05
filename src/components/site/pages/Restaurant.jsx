// ------------------------------------------------------------
// Page "Logiciel de gestion des ventes pour restaurant" (référencement Google)
// ------------------------------------------------------------
import PageMetier from '@/components/site/PageMetier';
import { LIEN_DEMO_RESTO } from '@/components/site/Site';
import { metaPage } from '@/lib/seo';
import { tr, choisirLangue } from '@/lib/i18n';
import { alternates, lien } from '@/lib/site-routes';

const description =
  () => (tr('Gestion pour restaurant, maquis, snack et café : tables, ticket cuisine, plats avec accompagnements, ticket imprimé en Bluetooth, clôture de la journée, marge par plat. Gratuit pour démarrer.'));

export function meta(lang) {
  choisirLangue(lang);
  return metaPage({
    title: tr('Logiciel de gestion pour restaurant et maquis'),
    description: description(),
    alternates: alternates('/gestion-restaurant/', lang),
    langue: lang,
  });
}

const contenu = () => ({
  lien: '/gestion-restaurant/', nomFil: tr('Gestion pour restaurant'),
  variante: 'resto',
  lienDemo: LIEN_DEMO_RESTO,
  videos: ['restaurant', 'vendeurs'],
  vignettes: ['presentation', 'produits', 'epicerie'],
  titreVideo: tr('Une commande complète, expliquée en une minute.'),
  description: description(),
  titre: tr('Le logiciel de gestion des ventes pour restaurants, maquis et snacks.'),
  capture: { src: '/captures/tables-ordi.webp', alt: tr('Plan des tables du restaurant dans Kaislo') },
  captureMobile: { src: '/captures/vente-mobile.webp', alt: tr('Écran de vente du restaurant sur téléphone') },
  lignes: [
    {
      titre: tr('Prendre la commande, envoyer en cuisine'),
      texte: tr('Ouvrez la table, ajoutez les plats avec leurs accompagnements : le ticket cuisine part sans les prix. Ajoutez des plats pendant le repas et validez la vente à la fin.'),
      points: [tr('Plan des tables, libres et occupées'), tr('Accompagnements et suppléments au bon prix'), tr('Vente à emporter ou client à distance')],
      capture: { src: '/captures/vente-ordi.webp', alt: tr('Écran de vente du restaurant avec accompagnements') },
    },
    {
      titre: tr('Fermer la journée sans recompter à la main'),
      texte: tr('Le soir, Kaislo indique les espèces attendues, le total vendu par plat et l’écart avec le montant compté. Chaque journée reste dans l’historique.'),
      capture: { src: '/captures/fermeture-ordi.webp', alt: tr('Fermeture de la journée avec le total vendu par plat') },
    },
  ],
  chapo: tr('Tables, ticket cuisine, plats avec accompagnements, ticket client imprimé ou envoyé par WhatsApp : servez plus vite et sachez chaque soir ce que vous avez gagné.'),
  garanties: [tr('Démo restaurant prête à tester'), tr('Sur téléphone ou tablette'), tr('Essai gratuit de 30 jours')],
  etiquette: tr('Pour la salle et la cuisine'),
  titreFonctions: tr('Du premier plat à la clôture de la journée.'),
  chapoFonctions: tr('Chaque fonction répond à un vrai problème de restaurateur : les erreurs de commande, les tables oubliées, la recette à recompter le soir.'),
  fonctions: [
    ['tables', tr('Plan des tables'), tr('Voyez d’un coup d’œil les tables libres, occupées, et celles qui attendent depuis plus de 45 minutes.')],
    ['cuisine', tr('Ticket cuisine'), tr('Les nouveaux plats partent en cuisine sans les prix, avec la table et l’heure. Ajoutez des plats pendant le repas.'), true],
    ['caisse', tr('Plats avec options'), tr('Attiéké + poisson grillé, poulet demi ou entier, suppléments alloco… le bon prix se calcule tout seul.')],
    ['imprimante', tr('Ticket client'), tr('Ticket imprimé avec votre nom, la table, les promos et la remise éventuelle.')],
    ['accueil', tr('Plats les plus vendus'), tr('Classement des plats et marge par plat : savez-vous lequel vous rapporte le plus ?'), true],
    ['bouclier', tr('Clôture de la journée'), tr('En fin de service, comptez les billets : Kaislo calcule l’attendu et affiche l’écart.')],
    ['depense', tr('Dépenses du jour'), tr('Marché, gaz, transport : notez-les, et le solde du jour s’affiche sur le tableau de bord.')],
    ['clients', tr('Serveurs et droits'), tr('Un code PIN par serveur. Annulations protégées par le code du gérant.')],
    ['carnet', tr('Clients à crédit'), tr('Les bureaux voisins qui paient en fin de mois : tout est noté, avec l’historique.')],
  ],
  titreFaq: tr('Questions des restaurateurs'),
  questions: [
    [tr('Comment fonctionne le ticket cuisine ?'), tr('Ouvrez une table, ajoutez les plats puis touchez « Envoyer en cuisine ». Seuls les nouveaux plats sont envoyés, sans les prix, avec le nom de la table. Vous pouvez ajouter des plats plus tard et valider la vente à la fin du repas.')],
    [tr('Puis-je gérer les accompagnements et les suppléments ?'), tr('Oui. Chaque plat peut avoir des groupes d’options : un choix obligatoire (accompagnement, portion) et des suppléments facultatifs, chacun avec son prix.')],
    [tr('Et pour la vente à emporter ?'), tr('Validez directement la vente depuis l’écran de vente, ou créez une table « À emporter » pour envoyer la commande en cuisine.')],
    [tr('Faut-il une imprimante ?'), tr('Non, c’est facultatif : l’aperçu du ticket s’affiche à l’écran. Pour imprimer, une imprimante thermique Bluetooth 58 ou 80 mm suffit.')],
    [tr('Puis-je envoyer l’addition par WhatsApp ?'), tr('Oui : pour une livraison ou une commande par téléphone, cochez « Client à distance » et le reçu s’ouvre dans WhatsApp, prêt à être envoyé.')],
    [tr('Combien ça coûte ?'), tr('Essai gratuit de 30 jours, puis un abonnement selon votre métier : au prix de votre pays (voir la page Tarifs), 1 poste et 5 vendeurs inclus, 2 mois offerts à l’année. Détail sur la page Tarifs.')],
  ],
  titreFinal: tr('Testez la démo restaurant de Kaislo.'),
  texteFinal: tr('Un restaurant de démonstration déjà rempli : tables occupées, plats, statistiques. Ou créez directement le vôtre.'),
});

export default function Restaurant({ lang }) {
  choisirLangue(lang);
  return <PageMetier c={contenu()} lang={lang} />;
}
