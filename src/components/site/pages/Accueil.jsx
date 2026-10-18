// ------------------------------------------------------------
// PAGE D'ACCUEIL DU SITE (la plus importante pour Google)
// Les images viennent de public/captures/ (vraies captures de l'application).
// ------------------------------------------------------------
import Link from 'next/link';
import { chemin } from '@/config';
import { ACTIVITES } from '@/components/site/activites';
import ApercuBoutiques from '@/components/site/ApercuBoutiques';
import { metaPage } from '@/lib/seo';
import { tr, choisirLangue } from '@/lib/i18n';
import { alternates, lien } from '@/lib/site-routes';
import { SCRIPT_REDIRECTION_ESPACE } from '@/lib/espace';
import RedirectionEspace from '@/components/site/RedirectionEspace';
import AvisClients from '@/components/site/AvisClients';
import {
  EnTeteSite, PiedSite, Capture, Faq, AppelFinal, DonneesLogiciel,
  LIEN_DEMO_RESTO, LIEN_DEMO_EPICERIE, LIEN_INSCRIPTION,
} from '@/components/site/Site';

export function meta(lang) {
  choisirLangue(lang);
  return metaPage({
    title: lang === 'en' ? { absolute: tr('Kaislo — Logiciel de caisse et de gestion de stock') } : tr('Kaislo — Logiciel de caisse et de gestion de stock'),
    description:
      tr('Logiciel de caisse et de gestion de stock pour commerces : ventes, inventaire, crédit clients, ticket WhatsApp, mobile money. Sur téléphone. Essai gratuit 30 jours.'),
    alternates: alternates('/', lang),
    langue: lang,
  });
}

const QUESTIONS = () => ([
  [tr('Faut-il acheter du matériel ?'), tr('Non. Kaislo fonctionne sur le téléphone, la tablette ou l’ordinateur que vous avez déjà. L’imprimante est facultative : le ticket peut être envoyé par WhatsApp ou simplement gardé dans l’historique.')],
  [tr('Combien coûte Kaislo ?'), tr('Vous commencez par un essai gratuit de 30 jours, sans engagement. Ensuite, un abonnement mensuel simple, dans la monnaie de votre pays. Contactez-nous pour connaître le tarif chez vous.')],
  [tr('Kaislo encaisse-t-il l’argent de mes clients ?'), tr('Non, jamais. Votre client vous paie directement : en espèces, par Wave, Orange Money, MTN MoMo, par carte sur votre propre terminal… L’argent ne passe pas par Kaislo. Dans Kaislo, vous choisissez seulement le mode de paiement utilisé pour que vos comptes soient justes à la fermeture.')],
  [tr('Kaislo est-il un appareil de caisse enregistreuse soumis aux lois sur les caisses ?'), tr('Kaislo est un outil de gestion : il note vos ventes, suit votre stock et vos crédits, et prépare vos comptes du soir. Il ne reçoit pas de paiements et n’est pas un terminal de paiement. Les règles sur les caisses enregistreuses et la facturation changent d’un pays à l’autre et selon l’activité : si votre pays impose un appareil ou un logiciel certifié, vous restez libre de le garder en plus de Kaislo, pour faire vos comptes plus simplement. Renseignez-vous auprès de votre administration fiscale ou de votre comptable, nous vous aidons volontiers à organiser vos données.')],
  [tr('Kaislo convient-il à mon type de commerce ?'), tr('Oui : restaurants et maquis, bars, boulangeries, épiceries, grossistes et dépôts, boutiques, quincailleries, salons de beauté, téléphonie, librairies et papeteries… À l’inscription, Kaislo prépare les catégories et l’unité de vente de votre métier (pièce, kg, litre, mètre, carton…), et vous pouvez tout modifier.')],
  [tr('Est-ce que ça marche sur iPhone et sur ordinateur ?'), tr('Oui, Kaislo fonctionne sur Android, iPhone, Windows et Mac. L’impression Bluetooth depuis le navigateur fonctionne avec Chrome (Android et ordinateur) ; l’application mobile Kaislo l’apportera aussi sur iPhone.')],
]);

// Questions réservées au français (boutiques en ligne)
const QUESTIONS_BOUTIQUES = [
  ['Kaislo est-il responsable de ce que vendent les boutiques ?', 'Non. Kaislo est un outil de gestion (ventes, stock, inventaire) et un pont entre les boutiques et leurs clients. Chaque boutique est indépendante et seule responsable de ses articles, de ses prix et de ses livraisons. Kaislo n’est pas le vendeur et n’encaisse aucun paiement.'],
  ['Comment commander dans une boutique ?', 'Choisissez vos articles, indiquez votre nom et votre adresse, puis confirmez : la commande s’ouvre dans WhatsApp, prête à être envoyée à la boutique. Vous payez la boutique directement.'],
];

const ETAPES_CLIENT = [
  ['1', 'Choisissez une boutique', 'Près de chez vous, par rayon.'],
  ['2', 'Remplissez votre panier', 'Touchez les articles que vous voulez.'],
  ['3', 'Confirmez sur WhatsApp', 'La commande part à la boutique.'],
];

const TUILES_COMMERCANT = () => ([
  [tr('Vendre en quelques touches'), tr('Le prix se calcule tout seul.'), '/captures/vente-ordi.webp', tr('Kaislo : articles et panier')],
  [tr('Suivre le stock'), tr('Alertes avant la rupture.'), '/captures/stock-ordi.webp', tr('Gestion du stock et de l’inventaire')],
  [tr('Remplacer le cahier de crédit'), tr('Chaque client a son compte.'), '/captures/credit-ordi.webp', tr('Carnet de crédit des clients')],
  [tr('Fermer la journée'), tr('Les comptes sont faits le soir.'), '/captures/fermeture-ordi.webp', tr('Fermeture de la journée : articles vendus et espèces attendues')],
]);

export default function Accueil({ lang }) {
  choisirLangue(lang);
  const fr = lang === 'fr';
  return (
    <div className="site">
      {/* Quelqu'un déjà connecté arrive directement dans son espace, pas sur cette page publique (?site=1 pour la voir) */}
      <script dangerouslySetInnerHTML={{ __html: SCRIPT_REDIRECTION_ESPACE }} />
      <RedirectionEspace />
      <EnTeteSite lang={lang} />
      <main>
        <section className="hero accueil-hero">
          <div className="site-largeur">
            <h1>{fr ? 'Le pont entre les boutiques et leurs clients.' : tr('Gérez les ventes et le stock de votre commerce, partout dans le monde.')}</h1>
            <p className="chapo">{fr ? 'Commandez dans une boutique près de chez vous, ou gérez vos ventes et votre stock avec Kaislo.' : tr('Restaurants, épiceries, boutiques, bars, boulangeries : enregistrez vos ventes en quelques touches, suivez votre stock, votre inventaire et le crédit de vos clients, et retrouvez vos comptes chaque soir.')}</p>
            <div className={`choix-cartes ${fr ? '' : 'une'}`}>
              {fr && (
                <Link href="/boutiques/" className="choix-carte client">
                  <img src={chemin('/images/boutique-mobile-390.webp')} alt="Une boutique Kaislo sur téléphone" width={390} height={844} decoding="async" fetchPriority="high" />
                  <div>
                    <h2>Je cherche une boutique</h2>
                    <p>Commandez sur WhatsApp, près de chez vous.</p>
                    <span className="btn grand">Voir les boutiques →</span>
                  </div>
                </Link>
              )}
              <div className="choix-carte commerce">
                <Capture src="/captures/vente-mobile.webp" alt={tr('Écran de vente Kaislo sur téléphone')} telephone largeur={390} hauteur={844} priorite />
                <div>
                  <h2>{tr('J’ai un commerce')}</h2>
                  <p>{tr('Ventes, stock et crédit sur votre téléphone.')}</p>
                  <div className="boutons">
                    <Link href={LIEN_INSCRIPTION} className="btn grand">{tr('Essayer gratuitement 30 jours')}</Link>
                    <Link href={LIEN_DEMO_RESTO} className="btn secondaire grand">{tr('Voir la démo')}</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {fr && <ApercuBoutiques />}

        {fr && (
          <section className="section claire">
            <div className="site-largeur">
              <h2>Commander, c’est simple.</h2>
              <div className="etapes-images">
                {ETAPES_CLIENT.map(([n, t, d]) => (
                  <div key={n} className="etape-image"><span className="numero">{n}</span><h3>{t}</h3><p className="muet">{d}</p></div>
                ))}
              </div>
              <p className="muet petit accueil-pont">Kaislo est un outil et un pont entre les boutiques et leurs clients. Chaque boutique est seule responsable de ce qu’elle vend. <Link href="/conditions-utilisation/#boutiques-en-ligne">Lire les règles des boutiques en ligne</Link></p>
            </div>
          </section>
        )}

        <section className="section" id="fonctions">
          <div className="site-largeur">
            <span className="etiquette">{tr('Pour les commerçants')}</span>
            <h2>{tr('Votre commerce, simple à gérer.')}</h2>
            <div className="tuiles-commercant">
              {TUILES_COMMERCANT().map(([t, d, src, alt]) => (
                <div key={t} className="tuile-commercant">
                  <Capture src={src} alt={alt} largeur={1440} hauteur={900} />
                  <h3>{t}</h3>
                  <p className="muet">{d}</p>
                </div>
              ))}
            </div>
            <p className="muet" style={{ marginTop: 18 }}>{tr('Vos clients vous paient comme d’habitude : Kaislo n’encaisse jamais l’argent.')}</p>
            <p className="liens-activites">{Object.values(ACTIVITES()).map((a) => <Link key={a.lien} href={lien(a.lien)}>{tr('Gestion pour {0} →', [a.nom.toLowerCase()])}</Link>)}</p>
          </div>
        </section>

        <AvisClients />

        <section className="section claire" id="questions">
          <div className="site-largeur">
            <span className="etiquette">{tr('Questions fréquentes')}</span>
            <h2>{tr('Vous vous demandez peut-être…')}</h2>
            <Faq questions={fr ? [...QUESTIONS_BOUTIQUES, ...QUESTIONS()] : QUESTIONS()} />
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
