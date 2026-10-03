// ------------------------------------------------------------
// PAGE D'ACCUEIL DU SITE (la plus importante pour Google)
// Les images viennent de public/captures/ (vraies captures de l'application).
// ------------------------------------------------------------
import Link from 'next/link';
import ExempleJournee from '@/components/site/ExempleJournee';
import {
  EnTeteSite, PiedSite, Hero, FonctionLigne, ListeFonctions, Faq, AppelFinal, DonneesLogiciel, SectionVideos,
  LIEN_DEMO_RESTO, LIEN_DEMO_EPICERIE, LIEN_INSCRIPTION,
} from '@/components/site/Site';

export const metadata = {
  title: 'Kaislo — Caisse, gestion de stock et d’inventaire pour restaurants, épiceries et boutiques',
  description:
    'Caisse et outil de gestion sur téléphone, tablette et ordinateur : ventes, gestion de stock et d’inventaire, carnet de crédit, tables, marges, dépenses, ouverture et fermeture de caisse. Ticket imprimé, envoyé par WhatsApp ou sans impression. Toutes les devises. Essai gratuit.',
  alternates: { canonical: '/' },
};

const AUTRES_FONCTIONS = [
  ['Stock et inventaire', 'Prix d’achat, entrées de marchandise, inventaire, alertes de rupture, valeur du stock et export Excel.'],
  ['Vendeurs et droits', 'Chaque vendeur se connecte avec son numéro et son code PIN. Vous décidez qui modifie les prix ou fait des remises.'],
  ['Ticket facultatif', 'Imprimé (Bluetooth, AirPrint, USB), envoyé par WhatsApp ou simplement gardé dans l’historique : l’imprimante n’est pas obligatoire.'],
  ['Toutes les devises', 'Franc CFA, dirham, euro, dollar… et les moyens de paiement locaux : Wave, Orange Money, MTN MoMo, carte.'],
  ['Statistiques', 'Chiffre d’affaires du jour, de la semaine, du mois et de l’année, par article, par vendeur et par paiement.'],
  ['Dépenses', 'Marché, gaz, transport : le solde du jour s’affiche sur le tableau de bord.'],
  ['Photos et catégories', 'Ajoutez la photo de vos plats et articles, organisez-les en catégories.'],
  ['Remises et promotions', 'Prix promotionnel barré à la caisse, remise en pourcentage ou en montant.'],
  ['Téléphone, tablette, ordinateur', 'Le même compte sur tous vos appareils, utilisable au clavier sur ordinateur.'],
];

const QUESTIONS = [
  ['Faut-il acheter du matériel ?', 'Non. Kaislo fonctionne sur le téléphone, la tablette ou l’ordinateur que vous avez déjà. L’imprimante est facultative : le ticket peut être envoyé par WhatsApp ou simplement gardé dans l’historique. Si vous voulez imprimer, une petite imprimante thermique d’entrée de gamme suffit.'],
  ['Puis-je utiliser Kaislo seulement pour gérer mon stock ?', 'Oui. Kaislo sert aussi d’outil de gestion : stock, inventaire, entrées de marchandise, dépenses et statistiques, avec ou sans encaissement au comptoir.'],
  ['Combien coûte Kaislo ?', 'Vous commencez par un essai gratuit de 30 jours, sans engagement. Ensuite, un abonnement mensuel simple, dans la monnaie de votre pays. Contactez-nous pour connaître le tarif chez vous.'],
  ['Dans quels pays fonctionne Kaislo ?', 'Partout. Kaislo gère le franc CFA, le dirham, l’euro, le dollar et d’autres devises, avec les moyens de paiement de chaque pays : espèces, carte, Wave, Orange Money, MTN MoMo…'],
  ['Comment se connectent mes vendeurs ?', 'Chacun avec son numéro de téléphone et son code PIN à 4 chiffres. Vous les créez vous-même dans Réglages → Équipe, et vous pouvez les désactiver à tout moment.'],
  ['Puis-je envoyer le ticket au client par WhatsApp ?', 'Oui. Pour une livraison ou une commande par téléphone, cochez « Client à distance » et indiquez son numéro : le reçu complet s’ouvre dans WhatsApp, prêt à être envoyé.'],
  ['Est-ce que ça marche sur iPhone et sur ordinateur ?', 'Oui, la caisse fonctionne sur Android, iPhone, Windows et Mac. L’impression Bluetooth depuis le navigateur fonctionne avec Chrome (Android et ordinateur) ; l’application mobile Kaislo l’apportera aussi sur iPhone.'],
  ['Comment fonctionne le carnet de crédit ?', 'Au moment d’encaisser, choisissez « À crédit » et le client. Kaislo garde l’historique de ses achats et de ses remboursements, affiche ce qu’il doit, et prépare un rappel WhatsApp.'],
  ['Kaislo convient-il à mon type de commerce ?', 'Kaislo est pensé pour les restaurants, maquis, snacks, cafés, épiceries, supérettes et petites boutiques. Les options (accompagnements, tailles, conditionnements) s’adaptent à chaque métier.'],
];

export default function PageAccueil() {
  return (
    <div className="site">
      <EnTeteSite />
      <main>
        <Hero
          titre="La caisse et la gestion de stock des restaurants, épiceries et boutiques."
          chapo="Encaissez, gérez votre stock et votre inventaire, suivez le crédit de vos clients et fermez la caisse sans erreur. Ticket imprimé, envoyé par WhatsApp ou pas de ticket du tout : c’est vous qui choisissez. Sur téléphone, tablette ou ordinateur."
          lienDemo={LIEN_DEMO_RESTO}
          garanties={['Essai gratuit de 30 jours', 'Sans engagement', 'Imprimante facultative']}
          capture={{ src: '/captures/tableau-ordi.webp', alt: 'Tableau de bord Kaislo : chiffre d’affaires, marge, dépenses, crédit en cours' }}
          captureMobile={{ src: '/captures/caisse-mobile.webp', alt: 'Écran de caisse Kaislo sur téléphone' }}
        />

        <SectionVideos vedette="presentation" vignettes={["restaurant", "epicerie", "produits", "vendeurs"]} toutes />

        <section className="section" id="fonctions">
          <div className="site-largeur">
            <span className="etiquette">Fonctions</span>
            <h2>Ce que Kaislo fait pour vous, au quotidien.</h2>
            <FonctionLigne
              titre="Encaisser en quelques touches"
              texte="Touchez l’article, choisissez l’accompagnement ou la taille, encaissez. Le prix se calcule tout seul et le ticket part à l’imprimante."
              points={['Recherche et lecteur de code-barres', 'Remises et prix promotionnels', 'Client à distance : reçu envoyé par WhatsApp', 'Paiement en espèces avec calcul de la monnaie à rendre']}
              capture={{ src: '/captures/caisse-ordi.webp', alt: 'Caisse Kaislo : articles et panier' }}
            />
            <FonctionLigne
              inverse
              titre="Ouvrir et fermer la caisse chaque jour"
              texte="Le matin, on compte le fond de caisse. Le soir, Kaislo indique les espèces attendues, le total vendu par article et l’écart, puis imprime le ticket de fermeture."
              points={['Qui a ouvert, qui a fermé, à quelle heure', 'Historique de toutes les journées de caisse', 'Ventes annulées uniquement avec le code du gérant']}
              capture={{ src: '/captures/fermeture-ordi.webp', alt: 'Fermeture de caisse : articles vendus et espèces attendues' }}
            />
            <FonctionLigne
              titre="Remplacer le cahier de crédit"
              texte="Chaque client a son compte : achats à crédit, remboursements et total dû. Un reçu est imprimé à chaque remboursement et un rappel WhatsApp se prépare en un clic."
              capture={{ src: '/captures/credit-ordi.webp', alt: 'Carnet de crédit des clients' }}
            />
            <FonctionLigne
              inverse
              titre="Gérer le stock et faire l’inventaire"
              texte="Le stock baisse à chaque vente, sur tous vos appareils. Enregistrez la marchandise reçue, comptez, corrigez : Kaislo vous alerte avant la rupture et calcule la valeur de votre stock."
              points={['Entrées de marchandise avec prix d’achat et fournisseur', 'Inventaire exporté en Excel en un clic', 'Pour épiceries, boutiques, dépôts… et les boissons d’un restaurant']}
              capture={{ src: '/captures/stock-ordi.webp', alt: 'Gestion du stock et de l’inventaire' }}
            />
            <FonctionLigne
              titre="Gérer les tables et la cuisine"
              texte="Ouvrez une commande par table, ajoutez des plats pendant le repas : les nouveaux plats partent en cuisine sur un ticket sans prix. On encaisse à la fin."
              capture={{ src: '/captures/tables-ordi.webp', alt: 'Plan des tables du restaurant' }}
            />
            <ListeFonctions fonctions={AUTRES_FONCTIONS} />
          </div>
        </section>

        <section className="section claire">
          <div className="site-largeur">
            <span className="etiquette">Pour qui</span>
            <h2>Adapté à votre métier dès la création du compte.</h2>
            <div className="grille-pour-qui">
              <Link href="/caisse-restaurant/" className="pour-qui">
                <h3>Restaurants et maquis</h3>
                <ul><li>Tables et ticket cuisine</li><li>Plats avec accompagnements</li><li>Marge par plat</li></ul>
                <span className="suite">Caisse pour restaurant →</span>
              </Link>
              <Link href="/caisse-epicerie/" className="pour-qui">
                <h3>Épiceries et supérettes</h3>
                <ul><li>Code-barres et stock</li><li>Carnet de crédit clients</li><li>Alertes de rupture</li></ul>
                <span className="suite">Caisse pour épicerie →</span>
              </Link>
              <Link href={LIEN_INSCRIPTION} className="pour-qui">
                <h3>Boutiques et autres commerces</h3>
                <ul><li>Cosmétiques, quincaillerie, téléphonie, dépôts…</li><li>Stock, inventaire et prix d’achat</li><li>Vendeurs et droits</li></ul>
                <span className="suite">Créer mon commerce →</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="site-largeur">
            <span className="etiquette">Exemple</span>
            <h2>Une journée au restaurant, sans un seul calcul.</h2>
            <ExempleJournee />
          </div>
        </section>

        <section className="section claire">
          <div className="site-largeur">
            <span className="etiquette">Démarrer</span>
            <h2>Prêt à encaisser en quelques minutes.</h2>
            <div className="etapes-site">
              <div className="etape-site"><h3>Créez votre commerce</h3><p className="muet" style={{ marginTop: 6 }}>Nom, pays, ville, votre numéro de téléphone et votre code PIN.</p></div>
              <div className="etape-site"><h3>Ajoutez articles et vendeurs</h3><p className="muet" style={{ marginTop: 6 }}>Vos plats ou produits avec leurs prix, et un compte pour chaque vendeur.</p></div>
              <div className="etape-site"><h3>Ouvrez la caisse et encaissez</h3><p className="muet" style={{ marginTop: 6 }}>Connectez l’imprimante Bluetooth et faites votre première vente.</p></div>
            </div>
          </div>
        </section>

        <section className="section" id="questions">
          <div className="site-largeur">
            <span className="etiquette">Questions fréquentes</span>
            <h2>Vous vous demandez peut-être…</h2>
            <Faq questions={QUESTIONS} />
          </div>
        </section>

        <AppelFinal
          titre="Essayez Kaislo dans votre commerce."
          texte="Créez votre compte en deux minutes, ou testez la démo avec un restaurant et une épicerie déjà remplis."
          lienDemo={LIEN_DEMO_EPICERIE}
        />
      </main>
      <PiedSite />
      <DonneesLogiciel description="Logiciel de caisse et de gestion de stock pour restaurants, épiceries et boutiques : ventes, inventaire, tickets imprimés ou envoyés par WhatsApp, carnet de crédit, tables, marges, ouverture et fermeture de caisse." />
    </div>
  );
}
