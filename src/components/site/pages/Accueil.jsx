// ------------------------------------------------------------
// PAGE D'ACCUEIL DU SITE (la plus importante pour Google)
// Les images viennent de public/captures/ (vraies captures de l'application).
// ------------------------------------------------------------
import Link from 'next/link';
import { TYPES_COMMERCE } from '@/lib/donnees/modeles';
import { ACTIVITES } from '@/components/site/activites';
import ExempleJournee from '@/components/site/ExempleJournee';
import { metaPage } from '@/lib/seo';
import { tr, tt, choisirLangue } from '@/lib/i18n';
import { alternates, lien } from '@/lib/site-routes';
import { SCRIPT_REDIRECTION_ESPACE } from '@/lib/espace';
import RedirectionEspace from '@/components/site/RedirectionEspace';
import {
  EnTeteSite, PiedSite, Hero, FonctionLigne, ListeFonctions, Faq, AppelFinal, DonneesLogiciel, SectionVideos,
  LIEN_DEMO_RESTO, LIEN_DEMO_EPICERIE, LIEN_INSCRIPTION,
} from '@/components/site/Site';

export function meta(lang) {
  choisirLangue(lang);
  return metaPage({
    title: lang === 'en' ? { absolute: tr('Kaislo — Gestion des ventes et du stock pour commerces') } : tr('Kaislo — Gestion des ventes et du stock pour commerces'),
    description:
      tr('Gérez vos ventes, votre stock, le crédit de vos clients et vos comptes du soir depuis votre téléphone. Restaurants, épiceries, boutiques. Essai gratuit 30 jours.'),
    alternates: alternates('/', lang),
    langue: lang,
  });
}

const AUTRES_FONCTIONS = () => ([
  [tr('Stock et inventaire'), tr('Prix d’achat, entrées de marchandise, inventaire, alertes de rupture, valeur du stock et export Excel.')],
  [tr('Vendeurs et droits'), tr('Chaque vendeur se connecte avec son numéro et son code PIN. Vous décidez qui modifie les prix ou fait des remises.')],
  [tr('Ticket facultatif'), tr('Imprimé (Bluetooth, AirPrint, USB), envoyé par WhatsApp ou simplement gardé dans l’historique : l’imprimante n’est pas obligatoire.')],
  [tr('Toutes les devises'), tr('Franc CFA, dirham, euro, dollar… Pour chaque vente, vous notez comment le client a payé (espèces, Wave, Orange Money, MTN MoMo, carte…) : le soir, vous voyez le total de chaque mode.')],
  ['Statistiques', tr('Chiffre d’affaires du jour, de la semaine, du mois et de l’année, par article, par vendeur et par paiement.')],
  [tr('Dépenses'), tr('Marché, gaz, transport : le solde du jour s’affiche sur le tableau de bord.')],
  [tr('Photos et catégories'), tr('Ajoutez la photo de vos plats et articles, organisez-les en catégories.')],
  [tr('Remises et promotions'), tr('Prix promotionnel barré au moment de la vente, remise en pourcentage ou en montant.')],
  [tr('Téléphone, tablette, ordinateur'), tr('Le même compte sur tous vos appareils, utilisable au clavier sur ordinateur.')],
]);

const QUESTIONS = () => ([
  [tr('Faut-il acheter du matériel ?'), tr('Non. Kaislo fonctionne sur le téléphone, la tablette ou l’ordinateur que vous avez déjà. L’imprimante est facultative : le ticket peut être envoyé par WhatsApp ou simplement gardé dans l’historique. Si vous voulez imprimer, une petite imprimante thermique d’entrée de gamme suffit.')],
  [tr('Puis-je utiliser Kaislo seulement pour gérer mon stock ?'), tr('Oui. Kaislo sert aussi d’outil de gestion : stock, inventaire, entrées de marchandise, dépenses et statistiques, avec ou sans vente au comptoir.')],
  [tr('Combien coûte Kaislo ?'), tr('Vous commencez par un essai gratuit de 30 jours, sans engagement. Ensuite, un abonnement mensuel simple, dans la monnaie de votre pays. Contactez-nous pour connaître le tarif chez vous.')],
  [tr('Kaislo encaisse-t-il l’argent de mes clients ?'), tr('Non, jamais. Votre client vous paie directement : en espèces, par Wave, Orange Money, MTN MoMo, par carte sur votre propre terminal… L’argent ne passe pas par Kaislo. Dans Kaislo, vous choisissez seulement le mode de paiement utilisé pour que vos comptes soient justes à la fermeture.')],
  [tr('Kaislo est-il un appareil de caisse enregistreuse soumis aux lois sur les caisses ?'), tr('Kaislo est un outil de gestion : il note vos ventes, suit votre stock et vos crédits, et prépare vos comptes du soir. Il ne reçoit pas de paiements et n’est pas un terminal de paiement. Les règles sur les caisses enregistreuses et la facturation changent d’un pays à l’autre et selon l’activité : si votre pays impose un appareil ou un logiciel certifié, vous restez libre de le garder en plus de Kaislo, pour faire vos comptes plus simplement. Renseignez-vous auprès de votre administration fiscale ou de votre comptable, nous vous aidons volontiers à organiser vos données.')],
  [tr('À quoi servent les modes de paiement dans Kaislo ?'), tr('À vous retrouver dans vos comptes. À chaque vente, vous indiquez comment le client a payé. À la fermeture, Kaislo vous donne le total vendu, le total des espèces, de Wave, d’Orange Money, etc., et les espèces qui doivent se trouver dans le tiroir. Ces totaux sont aussi sur le ticket de fermeture.')],
  [tr('Dans quels pays fonctionne Kaislo ?'), tr('Partout. Kaislo gère le franc CFA, le dirham, l’euro, le dollar et d’autres devises, avec les modes de paiement habituels de chaque pays : espèces, carte, Wave, Orange Money, MTN MoMo…')],
  [tr('Comment se connectent mes vendeurs ?'), tr('Chacun avec son numéro de téléphone et son code PIN à 4 chiffres. Vous les créez vous-même dans Réglages → Équipe, et vous pouvez les désactiver à tout moment.')],
  [tr('Puis-je envoyer le ticket au client par WhatsApp ?'), tr('Oui. Pour une livraison ou une commande par téléphone, cochez « Client à distance » et indiquez son numéro : le reçu complet s’ouvre dans WhatsApp, prêt à être envoyé.')],
  [tr('Est-ce que ça marche sur iPhone et sur ordinateur ?'), tr('Oui, Kaislo fonctionne sur Android, iPhone, Windows et Mac. L’impression Bluetooth depuis le navigateur fonctionne avec Chrome (Android et ordinateur) ; l’application mobile Kaislo l’apportera aussi sur iPhone.')],
  [tr('Comment fonctionne le carnet de crédit ?'), tr('Au moment de valider la vente, choisissez « À crédit » et le client. Kaislo garde l’historique de ses achats et de ses remboursements, affiche ce qu’il doit, et prépare un rappel WhatsApp.')],
  [tr('Kaislo convient-il à mon type de commerce ?'), tr('Oui : restaurants et maquis, bars, boulangeries, épiceries, grossistes et dépôts, boutiques, quincailleries, salons de beauté, téléphonie, librairies et papeteries… À l’inscription, Kaislo prépare les catégories et l’unité de vente de votre métier (pièce, kg, litre, mètre, carton…), et vous pouvez tout modifier.')],
]);

export default function Accueil({ lang }) {
  choisirLangue(lang);
  return (
    <div className="site">
      {/* Quelqu'un déjà connecté arrive directement dans son espace, pas sur cette page publique (?site=1 pour la voir) */}
      <script dangerouslySetInnerHTML={{ __html: SCRIPT_REDIRECTION_ESPACE }} />
      <RedirectionEspace />
      <EnTeteSite lang={lang} />
      <main>
        <Hero
          titre={tr('Gérez les ventes et le stock de votre commerce, partout dans le monde.')}
          chapo={tr('Restaurants, épiceries, boutiques, bars, boulangeries : enregistrez vos ventes en quelques touches, suivez votre stock, votre inventaire et le crédit de vos clients, et retrouvez vos comptes chaque soir. Toutes les devises et les moyens de paiement de votre pays (espèces, carte, mobile money). Vos clients vous paient comme d’habitude : Kaislo n’encaisse jamais l’argent. Sur téléphone, tablette ou ordinateur.')}
          lienDemo={LIEN_DEMO_RESTO}
          garanties={[tr('Essai gratuit de 30 jours'), tr('Vos clients vous paient directement'), tr('Imprimante facultative')]}
          capture={{ src: '/captures/tableau-ordi.webp', alt: tr('Tableau de bord Kaislo : chiffre d’affaires, marge, dépenses, crédit en cours') }}
          captureMobile={{ src: '/captures/vente-mobile.webp', alt: tr('Écran de vente Kaislo sur téléphone') }}
        />

        <SectionVideos vedette="presentation" vignettes={["restaurant", "epicerie", "produits", "vendeurs"]} toutes />

        <section className="section" id="fonctions">
          <div className="site-largeur">
            <span className="etiquette">{tr('Fonctions')}</span>
            <h2>{tr('Ce que Kaislo fait pour vous, au quotidien.')}</h2>
            <FonctionLigne
              titre={tr('Enregistrer une vente en quelques touches')}
              texte={tr('Touchez l’article, choisissez l’accompagnement ou la taille, validez. Le prix se calcule tout seul et le ticket part à l’imprimante.')}
              points={[tr('Recherche et lecteur de code-barres'), tr('Remises et prix promotionnels'), tr('Client à distance : reçu envoyé par WhatsApp'), tr('Paiement en espèces avec calcul de la monnaie à rendre')]}
              capture={{ src: '/captures/vente-ordi.webp', alt: tr('Kaislo : articles et panier') }}
            />
            <FonctionLigne
              inverse
              titre={tr('Ouvrir et fermer la journée chaque jour')}
              texte={tr('Le matin, on compte le fond de départ. Le soir, Kaislo donne le total vendu, le total reçu par mode de paiement (espèces, Wave, Orange Money…), les espèces attendues et l’écart, puis imprime le ticket de fermeture.')}
              points={[tr('Total par mode de paiement, pour vérifier chaque compte'), tr('Qui a ouvert, qui a fermé, à quelle heure'), tr('Historique de toutes les journées de vente'), tr('Ventes annulées uniquement avec le code du gérant')]}
              capture={{ src: '/captures/fermeture-ordi.webp', alt: tr('Fermeture de la journée : articles vendus et espèces attendues') }}
            />
            <FonctionLigne
              titre={tr('Remplacer le cahier de crédit')}
              texte={tr('Chaque client a son compte : achats à crédit, remboursements et total dû. Un reçu est imprimé à chaque remboursement et un rappel WhatsApp se prépare en un clic.')}
              capture={{ src: '/captures/credit-ordi.webp', alt: tr('Carnet de crédit des clients') }}
            />
            <FonctionLigne
              inverse
              titre={tr('Gérer le stock et faire l’inventaire')}
              texte={tr('Le stock baisse à chaque vente, sur tous vos appareils. Enregistrez la marchandise reçue, comptez, corrigez : Kaislo vous alerte avant la rupture et calcule la valeur de votre stock.')}
              points={[tr('Entrées de marchandise avec prix d’achat et fournisseur'), tr('Inventaire exporté en Excel en un clic'), tr('Pour épiceries, boutiques, dépôts… et les boissons d’un restaurant')]}
              capture={{ src: '/captures/stock-ordi.webp', alt: tr('Gestion du stock et de l’inventaire') }}
            />
            <FonctionLigne
              titre={tr('Gérer les tables et la cuisine')}
              texte={tr('Ouvrez une commande par table, ajoutez des plats pendant le repas : les nouveaux plats partent en cuisine sur un ticket sans prix. On valide la vente à la fin.')}
              capture={{ src: '/captures/tables-ordi.webp', alt: tr('Plan des tables du restaurant') }}
            />
            <ListeFonctions fonctions={AUTRES_FONCTIONS()} />
          </div>
        </section>

        <section className="section claire" id="role">
          <div className="site-largeur">
            <span className="etiquette">{tr('Ce que fait Kaislo')}</span>
            <h2>{tr('Un outil de gestion pour vos comptes, pas un système de paiement.')}</h2>
            <p className="muet" style={{ maxWidth: 760, marginTop: 14 }}>{tr('Dans votre commerce, rien ne change pour vos clients : ils vous paient comme d’habitude. Kaislo vous aide à noter, compter et vérifier.')}</p>
            <div className="etapes-site">
              <div className="etape-site"><h3>{tr('Le client vous paie directement')}</h3><p className="muet" style={{ marginTop: 6 }}>{tr('Espèces, Wave, Orange Money, MTN MoMo, carte sur votre terminal : l’argent va chez vous, jamais chez Kaislo.')}</p></div>
              <div className="etape-site"><h3>{tr('Vous notez le mode utilisé')}</h3><p className="muet" style={{ marginTop: 6 }}>{tr('En validant la vente, vous indiquez comment le client a payé. C’est une simple indication pour vos comptes.')}</p></div>
              <div className="etape-site"><h3>{tr('Le soir, les comptes sont faits')}</h3><p className="muet" style={{ marginTop: 6 }}>{tr('Total vendu, total espèces, total Wave, total Orange Money… et l’écart avec ce que vous avez compté.')}</p></div>
            </div>
            <p className="tres-petit muet" style={{ marginTop: 16, maxWidth: 760 }}>{tr('Kaislo ne reçoit aucun paiement de vos clients. Seul l’abonnement à Kaislo se paie en ligne. Les obligations fiscales et sur les caisses enregistreuses dépendent de votre pays : voir la question « Kaislo est-il un appareil de caisse enregistreuse… » plus bas.')}</p>
          </div>
        </section>

        <section className="section">
          <div className="site-largeur">
            <span className="etiquette">{tr('Pour qui')}</span>
            <h2>{tr('Adapté à votre métier dès la création du compte.')}</h2>
            <div className="grille-pour-qui">
              <Link href={lien('/gestion-restaurant/')} className="pour-qui">
                <h3>{tr('Restaurants et maquis')}</h3>
                <ul><li>{tr('Tables et ticket cuisine')}</li><li>{tr('Plats avec accompagnements')}</li><li>{tr('Marge par plat')}</li></ul>
                <span className="suite">{tr('Gestion pour restaurant →')}</span>
              </Link>
              <Link href={lien('/gestion-epicerie/')} className="pour-qui">
                <h3>{tr('Épiceries et supérettes')}</h3>
                <ul><li>{tr('Code-barres et stock')}</li><li>{tr('Carnet de crédit clients')}</li><li>{tr('Alertes de rupture')}</li></ul>
                <span className="suite">{tr('Gestion pour épicerie →')}</span>
              </Link>
              <Link href={LIEN_INSCRIPTION} className="pour-qui">
                <h3>{tr('Boutiques et autres commerces')}</h3>
                <ul><li>{tr('Cosmétiques, quincaillerie, téléphonie, dépôts…')}</li><li>{tr('Stock, inventaire et prix d’achat')}</li><li>{tr('Vendeurs et droits')}</li></ul>
                <span className="suite">{tr('Créer mon commerce →')}</span>
              </Link>
            </div>
            {/* Toutes les activités proposées à l'inscription (catégories et unité de vente prêtes) */}
            <p className="muet" style={{ marginTop: 20 }}>{tr('Activités prêtes à l’emploi : {0}.', [TYPES_COMMERCE.map((t) => tt(t.nom)).join(' · ')])}</p>
            <p className="liens-activites">{Object.values(ACTIVITES()).map((a) => <Link key={a.lien} href={lien(a.lien)}>{tr('Gestion pour {0} →', [a.nom.toLowerCase()])}</Link>)}</p>
          </div>
        </section>

        <section className="section claire">
          <div className="site-largeur">
            <span className="etiquette">{tr('Exemple')}</span>
            <h2>{tr('Une journée au restaurant, sans un seul calcul.')}</h2>
            <ExempleJournee />
          </div>
        </section>

        <section className="section">
          <div className="site-largeur">
            <span className="etiquette">{tr('Démarrer')}</span>
            <h2>{tr('Prêt à vendre en quelques minutes.')}</h2>
            <div className="etapes-site">
              <div className="etape-site"><h3>{tr('Créez votre commerce')}</h3><p className="muet" style={{ marginTop: 6 }}>{tr('Nom, pays, ville, votre numéro de téléphone et votre code PIN.')}</p></div>
              <div className="etape-site"><h3>{tr('Ajoutez articles et vendeurs')}</h3><p className="muet" style={{ marginTop: 6 }}>{tr('Vos plats ou produits avec leurs prix, et un compte pour chaque vendeur.')}</p></div>
              <div className="etape-site"><h3>{tr('Ouvrez la journée et vendez')}</h3><p className="muet" style={{ marginTop: 6 }}>{tr('Connectez l’imprimante Bluetooth et faites votre première vente.')}</p></div>
            </div>
          </div>
        </section>

        <section className="section claire" id="questions">
          <div className="site-largeur">
            <span className="etiquette">{tr('Questions fréquentes')}</span>
            <h2>{tr('Vous vous demandez peut-être…')}</h2>
            <Faq questions={QUESTIONS()} />
          </div>
        </section>

        <AppelFinal
          titre={tr('Essayez Kaislo dans votre commerce.')}
          texte={tr('Créez votre compte en deux minutes, ou testez la démo avec un restaurant et une épicerie déjà remplis.')}
          lienDemo={LIEN_DEMO_EPICERIE}
        />
      </main>
      <PiedSite />
      <DonneesLogiciel description={tr('Logiciel de gestion des ventes et de gestion de stock pour restaurants, épiceries, boutiques, quincailleries, grossistes et tous les commerces : ventes, inventaire, tickets imprimés ou envoyés par WhatsApp, carnet de crédit, tables, marges, ouverture et fermeture de la journée.')} />
    </div>
  );
}
