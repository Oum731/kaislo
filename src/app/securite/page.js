// ------------------------------------------------------------
// SÉCURITÉ : mesures de protection, conseils, signalement de faille
// Garder ce texte fidèle à ce qui est réellement en place.
// ------------------------------------------------------------
import PageLegale from '@/components/site/PageLegale';
import { SOCIETE } from '@/config';

export const metadata = {
  title: 'Sécurité',
  description: 'Comment Kaislo protège votre caisse et vos données : codes PIN personnels, droits des vendeurs, chiffrement, sauvegardes, et comment signaler une faille.',
  alternates: { canonical: '/securite/' },
};

const SECTIONS = [
  {
    id: 'caisse',
    titre: 'Dans votre caisse',
    contenu: (
      <ul>
        <li><b>Un compte par personne</b> : chaque vendeur se connecte avec son numéro de téléphone et son propre code PIN. Chaque vente indique qui l’a faite.</li>
        <li><b>Droits par vendeur</b> : le gérant décide qui peut modifier les articles et les prix, ou faire des remises.</li>
        <li><b>Annulation protégée</b> : une vente ne peut être annulée qu’avec le code du gérant, avec un motif, et elle reste visible dans l’historique.</li>
        <li><b>Ouverture et fermeture de caisse</b> : fond de caisse, espèces attendues, écart, qui a ouvert et qui a fermé. Chaque journée est gardée.</li>
        <li><b>Vendeur désactivé = accès coupé</b> immédiatement, sans perdre l’historique de ses ventes.</li>
        <li><b>Chaque commerce ne voit que ses propres données.</b></li>
      </ul>
    ),
  },
  {
    id: 'serveur',
    titre: 'Sur nos serveurs (version en ligne)',
    contenu: (
      <ul>
        <li>Connexions chiffrées (HTTPS) entre vos appareils et nos serveurs.</li>
        <li>Codes PIN jamais stockés en clair (hachage) et blocage temporaire après plusieurs codes faux.</li>
        <li>Code de vérification par SMS ou WhatsApp lors de la connexion d’un nouvel appareil ; le gérant voit les appareils reliés et peut en retirer un.</li>
        <li>Séparation stricte des données entre commerces, contrôlée à chaque requête.</li>
        <li>Sauvegardes automatiques quotidiennes, conservées dans un lieu distinct.</li>
        <li>Accès de l’équipe Amorac limité au strict nécessaire (support, abonnements), avec double authentification et journal des actions.</li>
        <li>Paiements traités par des prestataires agréés : nous ne voyons ni ne stockons les numéros de carte.</li>
      </ul>
    ),
  },
  {
    id: 'conseils',
    titre: 'Nos conseils',
    contenu: (
      <ul>
        <li>Ne partagez jamais votre code PIN ; évitez 1234, 0000 ou votre année de naissance.</li>
        <li>Donnez à chaque vendeur son propre compte, et désactivez-le dès son départ.</li>
        <li>Verrouillez le téléphone ou la tablette de caisse avec un code.</li>
        <li>Faites la fermeture de caisse chaque soir et regardez les écarts.</li>
        <li>Téléchargez régulièrement une copie de vos données (Réglages → Profil → Vos données).</li>
        <li>Méfiez-vous des messages qui vous demandent votre code : l’équipe Amorac ne vous le demandera <b>jamais</b>.</li>
      </ul>
    ),
  },
  {
    id: 'incident',
    titre: 'En cas de problème',
    contenu: (
      <p>Téléphone perdu ou code divulgué : changez les codes PIN concernés dans Réglages → Équipe, retirez l’appareil, et prévenez-nous. Si une violation de données vous concerne, nous vous en informons dans les meilleurs délais, ainsi que l’autorité compétente lorsque la loi l’exige.</p>
    ),
  },
  {
    id: 'faille',
    titre: 'Signaler une faille',
    contenu: (
      <>
        <p>Vous avez trouvé une faille de sécurité ? Écrivez à <a href={`mailto:${SOCIETE.emailSecurite}`}>{SOCIETE.emailSecurite}</a> avec une description et les étapes pour la reproduire. Nous répondons rapidement et vous tenons informé de la correction.</p>
        <p>Merci de ne pas accéder aux données d’autres commerces, de ne pas perturber le service et de nous laisser le temps de corriger avant toute publication.</p>
      </>
    ),
  },
];

export default function Page() {
  return (
    <PageLegale
      titre="Sécurité"
      intro="Comment Kaislo protège votre caisse, votre argent et vos données."
      sections={SECTIONS}
    />
  );
}
