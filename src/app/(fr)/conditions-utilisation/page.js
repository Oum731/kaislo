// ------------------------------------------------------------
// CONDITIONS GÉNÉRALES D'UTILISATION ET D'ABONNEMENT
// Modèle à faire relire par un juriste avant le lancement commercial.
// ------------------------------------------------------------
import Link from 'next/link';
import PageLegale from '@/components/site/PageLegale';
import { SOCIETE, CONTACT_EMAIL } from '@/config';
import { metaPage } from '@/lib/seo';

export const metadata = metaPage({
  title: 'Conditions d’utilisation et d’abonnement',
  description: 'Conditions générales d’utilisation et d’abonnement du logiciel de gestion des ventes Kaislo : compte, essai gratuit, paiement, résiliation, responsabilités.',
  alternates: { canonical: '/conditions-utilisation/' },
});

const SECTIONS = [
  {
    id: 'objet',
    titre: 'Objet',
    contenu: (
      <>
        <p>Les présentes conditions encadrent l’utilisation de <b>Kaislo</b>, logiciel de gestion des ventes en ligne édité par {SOCIETE.nom} (« Amorac », « nous »), accessible sur le site, sur téléphone, tablette et ordinateur.</p>
        <p>Kaislo s’adresse aux professionnels : restaurants, épiceries, boutiques et autres commerces (« le Commerce », « vous »). En créant un compte, vous déclarez agir pour les besoins de votre activité professionnelle et accepter ces conditions.</p>
      </>
    ),
  },
  {
    id: 'plusieurs-commerces',
    titre: 'Plusieurs commerces, une activité = un abonnement',
    contenu: (
      <>
        <p>Un gérant peut gérer plusieurs commerces avec le même numéro et le même code PIN. <b>Chaque activité correspond à un abonnement</b> : stock, ventes, comptes et vendeurs restent séparés pour chaque commerce, et le total des abonnements se règle en une fois.</p>
        <ul>
          <li>À partir du <b>2<sup>e</sup> commerce</b>, une remise de <b>10 %</b> est appliquée sur son abonnement.</li>
          <li>Il est interdit de regrouper plusieurs activités distinctes (par exemple une épicerie et la vente de plats cuisinés) dans un seul commerce pour payer une formule moins chère. Le type de commerce déclaré doit correspondre à l’activité réelle.</li>
          <li>Amorac peut vérifier la cohérence entre l’activité déclarée et les articles enregistrés (noms et catalogue uniquement, jamais les chiffres de vente), vous demander de créer un commerce distinct, et appliquer la formule correspondant à l’activité réelle.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'compte',
    titre: 'Création du compte et accès',
    contenu: (
      <>
        <p>Le compte est créé par le gérant du Commerce, qui fournit des informations exactes (nom du commerce, pays, ville, téléphone) et les tient à jour.</p>
        <ul>
          <li>Chaque utilisateur se connecte avec <b>son propre numéro de téléphone et son code PIN</b>. Le code PIN est personnel et ne doit pas être communiqué.</li>
          <li>Le gérant crée les comptes de ses vendeurs, définit leurs droits (articles, remises) et peut les désactiver à tout moment. Il est responsable de l’usage fait des comptes qu’il crée.</li>
          <li>En cas de perte d’un appareil ou de soupçon d’utilisation frauduleuse, le gérant change les codes concernés et prévient Amorac sans délai.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'service',
    titre: 'Description du service',
    contenu: (
      <>
        <p>Kaislo permet notamment d’enregistrer les ventes, d’imprimer ou d’envoyer un ticket, de suivre le crédit des clients, le stock, les dépenses, les journées de vente et les statistiques. Les fonctions disponibles dépendent de l’offre choisie.</p>
        <p>Nous faisons évoluer le service pour l’améliorer. Si une évolution retire une fonction importante de votre offre, nous vous prévenons au moins 30 jours à l’avance.</p>
        <p>Le service est accessible 24 h/24, sauf maintenance, panne du réseau ou cas de force majeure. Nous faisons nos meilleurs efforts pour limiter les interruptions et prévenir des maintenances programmées.</p>
      </>
    ),
  },
  {
    id: 'essai',
    titre: 'Essai gratuit',
    contenu: (
      <p>Chaque nouveau Commerce bénéficie d’un <b>essai gratuit de 30 jours</b>, avec toutes les fonctions, sans moyen de paiement demandé et sans engagement. À la fin de l’essai, il suffit de payer la formule de votre métier pour continuer. Sans abonnement, l’accès peut être limité, mais vos données restent conservées selon l’article « Fin du contrat ».</p>
    ),
  },
  {
    id: 'role',
    titre: 'Rôle de Kaislo : outil de gestion, pas un système de paiement',
    contenu: (
      <>
        <p>Kaislo permet au Commerce de noter ses ventes, de suivre son stock et ses crédits et de préparer ses comptes de fin de journée. <b>Kaislo ne reçoit, ne détient et ne transmet aucun paiement entre le Commerce et ses clients</b> : ceux-ci paient directement le Commerce. Les modes de paiement indiqués dans l’application (espèces, mobile money, carte…) servent uniquement à répartir les totaux dans les comptes du Commerce.</p>
        <p>Le Commerce reste responsable du respect des règles qui s’appliquent à son activité dans son pays (comptabilité, fiscalité, facturation, appareils ou logiciels de caisse certifiés lorsqu’ils sont exigés). Kaislo ne remplace pas ces obligations ; il peut être utilisé en complément d’un appareil ou d’un logiciel imposé par la loi.</p>
      </>
    ),
  },
  {
    id: 'abonnement',
    titre: 'Abonnement, prix et paiement',
    contenu: (
      <>
        <p>Le prix dépend de votre métier (voir la page <Link href="/tarifs/">Tarifs</Link>) et de la devise de votre pays. Chaque formule comprend <b>un poste</b> (un appareil relié à une imprimante) avec <b>5 vendeurs au maximum</b>, plus le gérant ; chaque poste supplémentaire est facturé en plus, au prix indiqué. L’abonnement est payable <b>d’avance</b>, au mois ou à l’année (deux mois offerts sur l’année).</p>
        <p>Le tarif fondateur, réservé aux premiers clients désignés par Amorac, donne droit à une remise à vie tant que l’abonnement est payé sans interruption.</p>
        <p>Moyens de paiement acceptés, selon les pays : carte bancaire (Visa, Mastercard…), paiement mobile (Orange Money, Wave, MTN MoMo…), virement bancaire. Les paiements par carte et par mobile sont traités par des prestataires de paiement agréés : <b>Amorac n’enregistre jamais les numéros de carte</b>.</p>
        <ul>
          <li>Un reçu est disponible pour chaque paiement.</li>
          <li>Les prix peuvent évoluer. Toute hausse est annoncée au moins 30 jours avant de s’appliquer à votre prochaine échéance ; vous pouvez résilier avant cette date.</li>
          <li>Les taxes applicables dans votre pays s’ajoutent le cas échéant.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'retard',
    titre: 'Retard ou défaut de paiement',
    contenu: (
      <p>Si une échéance n’est pas réglée, nous vous prévenons dans l’application et par message. Sans régularisation <b>7 jours après l’échéance</b>, l’accès au compte peut être suspendu. Vos données ne sont pas supprimées pendant la suspension, et l’accès est rétabli dès le paiement reçu.</p>
    ),
  },
  {
    id: 'remboursement',
    titre: 'Résiliation et remboursement',
    contenu: (
      <>
        <p>Vous pouvez arrêter votre abonnement à tout moment, depuis l’application ou en nous écrivant. L’arrêt prend effet à la fin de la période déjà payée, sans frais.</p>
        <p>Les périodes commencées ne sont pas remboursées, sauf : erreur de facturation, double paiement, ou interruption du service de notre fait pendant plus de 72 heures consécutives (remboursement ou prolongation au prorata).</p>
      </>
    ),
  },
  {
    id: 'obligations',
    titre: 'Vos obligations',
    contenu: (
      <>
        <ul>
          <li>Utiliser Kaislo de façon loyale et conforme aux lois de votre pays.</li>
          <li>Ne pas tenter d’accéder aux données d’un autre commerce, de contourner les protections du service ou de le perturber.</li>
          <li>Informer vos clients lorsque vous enregistrez leurs coordonnées (carnet de crédit, envoi du ticket par WhatsApp) et ne les utiliser que pour votre relation commerciale avec eux.</li>
          <li>Respecter vos <b>obligations fiscales et comptables</b> : déclaration du chiffre d’affaires, conservation des documents, et, lorsque la loi de votre pays l’exige, utilisation d’un logiciel ou d’un matériel de caisse certifié. Kaislo vous aide à tenir vos comptes mais ne remplace pas votre comptable.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'donnees',
    titre: 'Vos données',
    contenu: (
      <>
        <p>Les données que vous saisissez (articles, ventes, clients, dépenses…) <b>vous appartiennent</b>. Amorac les héberge et les traite uniquement pour fournir le service, selon notre <Link href="/confidentialite/">politique de confidentialité</Link>.</p>
        <p>Pour les données de vos clients et de vos vendeurs, vous êtes responsable du traitement et Amorac agit comme sous-traitant, sur vos instructions. Vous pouvez à tout moment exporter vos données.</p>
      </>
    ),
  },
  {
    id: 'responsabilite',
    titre: 'Responsabilité',
    contenu: (
      <>
        <p>Amorac s’engage à fournir le service avec soin (obligation de moyens). Nous ne sommes pas responsables des dommages indirects (perte de chiffre d’affaires, de clientèle…), ni des problèmes liés à votre matériel, votre connexion Internet, votre imprimante ou une mauvaise utilisation des comptes et codes PIN.</p>
        <p>Vérifiez les montants affichés et vérifiez vos comptes : les calculs de Kaislo reposent sur les informations saisies par vos équipes.</p>
        <p>Dans tous les cas, notre responsabilité est limitée au montant payé pour l’abonnement au cours des 12 derniers mois.</p>
      </>
    ),
  },
  {
    id: 'propriete',
    titre: 'Propriété intellectuelle',
    contenu: (
      <p>Kaislo, son nom, son logo, son code et ses contenus appartiennent à Amorac. L’abonnement vous donne un droit d’utilisation personnel et non transférable pendant sa durée. Vous conservez tous les droits sur vos propres contenus (logo, photos, articles), que vous nous autorisez à héberger et afficher pour faire fonctionner le service.</p>
    ),
  },
  {
    id: 'fin',
    titre: 'Fin du contrat',
    contenu: (
      <>
        <p>Après l’arrêt de l’abonnement ou la fin de l’essai sans abonnement, vos données restent disponibles à l’export pendant <b>90 jours</b>, puis elles sont supprimées définitivement (sauf obligation légale de conservation).</p>
        <p>Amorac peut suspendre ou fermer un compte en cas de manquement grave à ces conditions (fraude, tentative d’intrusion, usage illégal), après avoir demandé de corriger la situation, sauf urgence.</p>
      </>
    ),
  },
  {
    id: 'modifications',
    titre: 'Modification des conditions',
    contenu: (
      <p>Nous pouvons modifier ces conditions, par exemple pour suivre l’évolution du service ou de la loi. Les changements importants vous sont annoncés au moins 30 jours à l’avance dans l’application. Si vous n’êtes pas d’accord, vous pouvez arrêter votre abonnement avant leur entrée en vigueur.</p>
    ),
  },
  {
    id: 'litiges',
    titre: 'Droit applicable et litiges',
    contenu: (
      <p>En cas de désaccord, écrivez-nous d’abord à <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> : nous cherchons une solution amiable dans les 30 jours. À défaut, le litige est soumis aux tribunaux compétents du lieu du siège d’Amorac, sauf disposition légale impérative contraire.</p>
    ),
  },
];

export default function Page() {
  return (
    <PageLegale
      titre="Conditions d’utilisation"
      intro="Les règles d’utilisation de Kaislo et de l’abonnement : compte, essai gratuit, paiement, résiliation et responsabilités."
      sections={SECTIONS}
    />
  );
}
