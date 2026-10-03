// ------------------------------------------------------------
// POLITIQUE DE CONFIDENTIALITÉ (données personnelles)
// Modèle à faire relire par un juriste avant le lancement commercial.
// ------------------------------------------------------------
import Link from 'next/link';
import PageLegale from '@/components/site/PageLegale';
import { SOCIETE } from '@/config';

export const metadata = {
  title: 'Politique de confidentialité',
  description: 'Quelles données Kaisly utilise, pourquoi, combien de temps, avec qui elles sont partagées et comment exercer vos droits.',
  alternates: { canonical: '/confidentialite/' },
};

const mail = <a href={`mailto:${SOCIETE.emailDonnees}`}>{SOCIETE.emailDonnees}</a>;

const SECTIONS = [
  {
    id: 'qui',
    titre: 'Qui est responsable de vos données ?',
    contenu: (
      <>
        <p><b>{SOCIETE.nom}</b>, éditeur de Kaisly, est responsable des données des comptes (gérants, vendeurs), des abonnements et des visiteurs du site.</p>
        <p>Pour les données que le commerce enregistre sur <b>ses propres clients</b> (carnet de crédit, numéro pour l’envoi du ticket), le commerce est responsable du traitement et {SOCIETE.nom} agit comme sous-traitant : nous les hébergeons pour lui, sans les utiliser pour nous-mêmes.</p>
        <p>Contact pour toute question sur vos données : {mail}.</p>
      </>
    ),
  },
  {
    id: 'quelles',
    titre: 'Quelles données utilisons-nous ?',
    contenu: (
      <table className="tableau-legal">
        <tbody>
          <tr><th>Commerce</th><td>Nom, type, pays, ville, adresse, position sur la carte, téléphone, e-mail, logo, message du ticket.</td></tr>
          <tr><th>Utilisateurs</th><td>Nom, numéro de téléphone, rôle et droits, code PIN (enregistré sous forme chiffrée dans la version en ligne), dates de connexion.</td></tr>
          <tr><th>Activité</th><td>Articles, prix, ventes, tickets, remises, dépenses, stock, journées de caisse, vendeur ayant fait chaque opération.</td></tr>
          <tr><th>Clients du commerce</th><td>Nom, téléphone, note, achats à crédit et remboursements ; numéro du client pour l’envoi du ticket par WhatsApp.</td></tr>
          <tr><th>Abonnement</th><td>Offre, dates, montants et références de paiement. Les numéros de carte sont saisis chez le prestataire de paiement et ne nous sont jamais transmis.</td></tr>
          <tr><th>Technique</th><td>Type d’appareil et de navigateur, journaux de connexion et d’erreurs, adresse IP (sécurité et lutte contre la fraude).</td></tr>
        </tbody>
      </table>
    ),
  },
  {
    id: 'pourquoi',
    titre: 'Pourquoi ?',
    contenu: (
      <ul>
        <li><b>Fournir le service</b> : caisse, tickets, statistiques, synchronisation entre vos appareils (exécution du contrat).</li>
        <li><b>Gérer l’abonnement</b> : essai, paiements, reçus, relances (exécution du contrat, obligations comptables).</li>
        <li><b>Sécuriser les comptes</b> : vérification des connexions, détection des abus (intérêt légitime).</li>
        <li><b>Vous assister</b> : réponses au support, information sur les évolutions importantes du service (exécution du contrat).</li>
        <li><b>Améliorer Kaisly</b> : statistiques globales et anonymes d’utilisation (intérêt légitime).</li>
      </ul>
    ),
  },
  {
    id: 'jamais',
    titre: 'Ce que nous ne faisons jamais',
    contenu: (
      <ul>
        <li>Vendre ou louer vos données, ou celles de vos clients.</li>
        <li>Utiliser vos chiffres de vente ou votre fichier clients pour faire de la publicité ou démarcher vos clients.</li>
        <li>Afficher de la publicité dans Kaisly.</li>
      </ul>
    ),
  },
  {
    id: 'partage',
    titre: 'Avec qui sont-elles partagées ?',
    contenu: (
      <>
        <p>Uniquement avec les prestataires nécessaires au service, tenus à la confidentialité :</p>
        <ul>
          <li><b>Hébergeur</b> du site et des données (voir les <Link href="/mentions-legales/">mentions légales</Link>).</li>
          <li><b>Prestataires de paiement</b> (carte bancaire, mobile money, banque) pour les abonnements.</li>
          <li><b>Envoi de SMS ou de messages WhatsApp</b> pour les codes de vérification.</li>
          <li><b>Cartographie</b> : OpenStreetMap affiche la carte lorsque vous placez votre commerce.</li>
        </ul>
        <p>L’envoi d’un ticket par WhatsApp se fait depuis votre propre téléphone : c’est vous qui choisissez de l’envoyer.</p>
        <p>Nous pouvons aussi transmettre des données lorsque la loi l’impose (demande d’une autorité judiciaire, par exemple).</p>
      </>
    ),
  },
  {
    id: 'ou',
    titre: 'Où sont-elles stockées ?',
    contenu: (
      <p>Les données sont hébergées chez notre hébergeur, dans des centres de données sécurisés. Certains prestataires peuvent être situés hors de votre pays : nous choisissons des prestataires offrant des garanties de protection adaptées et nous respectons les règles de transfert prévues par la loi de votre pays.</p>
    ),
  },
  {
    id: 'duree',
    titre: 'Combien de temps ?',
    contenu: (
      <table className="tableau-legal">
        <tbody>
          <tr><th>Compte et activité</th><td>Tant que le compte est ouvert, puis 90 jours après la fin de l’abonnement (le temps de les exporter), avant suppression.</td></tr>
          <tr><th>Paiements d’abonnement</th><td>Durée imposée par la loi comptable de notre pays (en général 10 ans).</td></tr>
          <tr><th>Journaux techniques</th><td>12 mois maximum.</td></tr>
          <tr><th>Demandes de contact</th><td>3 ans après le dernier échange.</td></tr>
        </tbody>
      </table>
    ),
  },
  {
    id: 'droits',
    titre: 'Vos droits',
    contenu: (
      <>
        <p>Vous pouvez demander l’<b>accès</b> à vos données, leur <b>rectification</b>, leur <b>suppression</b>, la <b>limitation</b> ou l’<b>opposition</b> à leur utilisation, et leur <b>portabilité</b>. Le gérant peut déjà exporter les données de son commerce dans Réglages → Profil → Vos données.</p>
        <p>Écrivez à {mail} en précisant votre numéro de téléphone de connexion. Nous répondons dans un délai d’un mois. Nous pouvons vous demander de justifier votre identité.</p>
        <p>Les clients d’un commerce s’adressent d’abord au commerce, qui est responsable de leurs données ; nous l’aidons à répondre.</p>
        <p>Vous pouvez aussi saisir l’autorité de protection des données de votre pays, par exemple la CNDP au Maroc, l’ARTCI en Côte d’Ivoire, la CDP au Sénégal ou la CNIL en France.</p>
      </>
    ),
  },
  {
    id: 'securite',
    titre: 'Sécurité',
    contenu: (
      <p>Nous protégeons vos données par des mesures techniques et organisationnelles adaptées, décrites sur la page <Link href="/securite/">Sécurité</Link>. En cas de violation de données susceptible de vous toucher, nous vous prévenons dans les meilleurs délais.</p>
    ),
  },
  {
    id: 'demo',
    titre: 'Version de démonstration',
    contenu: (
      <p>Dans la démo en ligne, toutes les données restent <b>dans votre navigateur</b> (aucun envoi vers nos serveurs). Elles disparaissent si vous effacez les données du site. N’y saisissez pas de vraies données de clients.</p>
    ),
  },
  {
    id: 'mineurs',
    titre: 'Mineurs',
    contenu: <p>Kaisly est un outil professionnel destiné aux personnes majeures. Nous ne collectons pas sciemment de données sur des mineurs pour notre propre compte.</p>,
  },
  {
    id: 'changements',
    titre: 'Modifications',
    contenu: <p>Nous pouvons mettre à jour cette politique. La date en haut de page indique la dernière version ; les changements importants sont annoncés dans l’application.</p>,
  },
];

export default function Page() {
  return (
    <PageLegale
      titre="Confidentialité"
      intro="Quelles données Kaisly utilise, pourquoi, combien de temps, et comment exercer vos droits. Sans jargon."
      sections={SECTIONS}
    />
  );
}
