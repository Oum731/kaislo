// ------------------------------------------------------------
// COOKIES ET STOCKAGE SUR L'APPAREIL
// Liste à tenir à jour si l'on ajoute un outil (mesure d'audience,
// chat…) : il faudrait alors demander le consentement du visiteur.
// ------------------------------------------------------------
import PageLegale from '@/components/site/PageLegale';

export const metadata = {
  title: 'Cookies et stockage',
  description: 'Kaisly n’utilise ni cookies publicitaires ni mesure d’audience. Liste des éléments enregistrés sur votre appareil et à quoi ils servent.',
  alternates: { canonical: '/cookies/' },
};

const SECTIONS = [
  {
    id: 'resume',
    titre: 'En résumé',
    contenu: (
      <div className="encadre">
        <p><b>Pas de publicité, pas de pistage, pas de mesure d’audience.</b> Kaisly enregistre seulement sur votre appareil ce qui est indispensable pour faire fonctionner la caisse. C’est pourquoi aucun bandeau de consentement ne vous est demandé.</p>
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
          <tr><td>kaisly:preferences</td><td>Commerce relié à l’appareil, session ouverte, derniers comptes utilisés, largeur du ticket, pays choisi pour la démo.</td><td>Jusqu’à la déconnexion de l’appareil</td></tr>
          <tr><td>kaisly:commerce:…</td><td>Données du commerce gardées sur l’appareil pour que la caisse marche même avec une mauvaise connexion.</td><td>Jusqu’à suppression ou déconnexion</td></tr>
          <tr><td>kaisly:comptes</td><td>Liste des commerces enregistrés sur cet appareil.</td><td>Jusqu’à suppression</td></tr>
          <tr><td>kaisly-images</td><td>Photos des articles et logo, pour un affichage rapide.</td><td>Jusqu’à suppression</td></tr>
          <tr><td>kaisly-v… (cache)</td><td>Copie de l’application pour qu’elle s’ouvre vite et hors connexion.</td><td>Remplacée à chaque mise à jour</td></tr>
          <tr><td>kaisly:admin</td><td>Session de l’espace Amorac (équipe Amorac uniquement).</td><td>Fermeture de l’onglet</td></tr>
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
        <li>Les polices de caractères sont servies par Kaisly lui-même : aucune requête vers Google Fonts.</li>
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
        <p>Dans Kaisly : Réglages → Profil → « Déconnecter cet appareil du commerce ».</p>
        <p>Dans votre navigateur : paramètres → confidentialité → effacer les données du site. Attention : les ventes qui n’ont pas encore été synchronisées seraient perdues.</p>
      </>
    ),
  },
];

export default function Page() {
  return (
    <PageLegale
      titre="Cookies et stockage"
      intro="Ce que Kaisly enregistre sur votre téléphone ou votre ordinateur, et pourquoi."
      sections={SECTIONS}
    />
  );
}
