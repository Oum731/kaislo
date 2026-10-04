// ------------------------------------------------------------
// COOKIES ET STOCKAGE SUR L'APPAREIL
// Liste à tenir à jour si l'on ajoute un outil (mesure d'audience,
// chat…) : il faudrait alors demander le consentement du visiteur.
// ------------------------------------------------------------
import PageLegale from '@/components/site/PageLegale';

export const metadata = {
  title: 'Cookies et stockage',
  description: 'Kaislo n’utilise ni cookies publicitaires ni mesure d’audience. Liste des éléments enregistrés sur votre appareil et à quoi ils servent.',
  alternates: { canonical: '/cookies/' },
};

const SECTIONS = [
  {
    id: 'resume',
    titre: 'En résumé',
    contenu: (
      <div className="encadre">
        <p><b>Pas de publicité, pas de pistage, pas de mesure d’audience.</b> Kaislo enregistre seulement sur votre appareil ce qui est indispensable pour faire fonctionner Kaislo. C’est pourquoi aucun bandeau de consentement ne vous est demandé.</p>
      </div>
    ),
  },
  {
    id: 'liste',
    titre: 'Ce qui est enregistré sur votre appareil',
    contenu: (
      <table className="tableau-legal">
        <thead>
          <tr><th>Nom</th><th>À quoi ça sert</th><th>Durée</th></tr>
        </thead>
        <tbody>
          <tr><td>kaislo:preferences</td><td>Commerce relié à l’appareil, session ouverte, derniers comptes utilisés, largeur du ticket, pays choisi pour la démo.</td><td>Jusqu’à la déconnexion de l’appareil</td></tr>
          <tr><td>kaislo:commerce:…</td><td>Données du commerce gardées sur l’appareil pour que Kaislo marche même avec une mauvaise connexion.</td><td>Jusqu’à suppression ou déconnexion</td></tr>
          <tr><td>kaislo:comptes</td><td>Liste des commerces enregistrés sur cet appareil.</td><td>Jusqu’à suppression</td></tr>
          <tr><td>kaislo-images</td><td>Photos des articles et logo, pour un affichage rapide.</td><td>Jusqu’à suppression</td></tr>
          <tr><td>kaislo-v… (cache)</td><td>Copie de l’application pour qu’elle s’ouvre vite et hors connexion.</td><td>Remplacée à chaque mise à jour</td></tr>
          <tr><td>kaislo:admin-jeton</td><td>Session de l’espace Amorac (équipe Amorac uniquement).</td><td>Fermeture de l’onglet</td></tr>
          <tr><td>kaislo:commercial-jeton</td><td>Session de l’espace des commerciaux Kaislo.</td><td>30 jours, ou « Sortir »</td></tr>
        </tbody>
      </table>
    ),
  },
  {
    id: 'tiers',
    titre: 'Services extérieurs',
    contenu: (
      <ul>
        <li><b>Carte OpenStreetMap</b> : affichée seulement quand le gérant place son commerce sur la carte (Réglages → Profil). OpenStreetMap peut alors enregistrer ses propres éléments techniques.</li>
        <li><b>WhatsApp et Google Maps</b> : ouverts uniquement quand vous touchez un bouton « Envoyer par WhatsApp » ou « Ouvrir dans Google Maps ». Leurs propres règles s’appliquent alors.</li>
        <li>Les polices de caractères sont servies par Kaislo lui-même : aucune requête vers Google Fonts.</li>
      </ul>
    ),
  },
  {
    id: 'version-en-ligne',
    titre: 'Version en ligne',
    contenu: (
      <p>Lorsque vos données sont synchronisées avec nos serveurs, un jeton de connexion sécurisé est aussi enregistré pour garder votre session ouverte. Il est indispensable au service et supprimé à la déconnexion.</p>
    ),
  },
  {
    id: 'effacer',
    titre: 'Comment tout effacer ?',
    contenu: (
      <>
        <p>Dans Kaislo : Réglages → Profil → « Déconnecter cet appareil du commerce ».</p>
        <p>Dans votre navigateur : paramètres → confidentialité → effacer les données du site. Attention : les ventes qui n’ont pas encore été synchronisées seraient perdues.</p>
      </>
    ),
  },
];

export default function Page() {
  return (
    <PageLegale
      titre="Cookies et stockage"
      intro="Ce que Kaislo enregistre sur votre téléphone ou votre ordinateur, et pourquoi."
      sections={SECTIONS}
    />
  );
}
