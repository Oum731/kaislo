// ------------------------------------------------------------
// COOKIES ET STOCKAGE SUR L'APPAREIL
// Liste à tenir à jour si l'on ajoute un outil (mesure d'audience,
// chat…) : il faudrait alors demander le consentement du visiteur.
// ------------------------------------------------------------
import PageLegale from '@/components/site/PageLegale';
import { metaPage } from '@/lib/seo';
import { GOOGLE_ADS_ID, FACEBOOK_PIXEL_ID, REGIES_MESURE } from '@/config';

// Mesure des inscriptions (Google Ads, pixel Meta) : décrite sur cette page seulement quand elle est activée (src/config.js)
const MESURE = !!(GOOGLE_ADS_ID || FACEBOOK_PIXEL_ID);

export const metadata = metaPage({
  title: 'Cookies et stockage',
  description: MESURE
    ? 'Kaislo ne place de cookies de mesure publicitaire qu’avec votre accord. Liste des éléments enregistrés sur votre appareil et à quoi ils servent.'
    : 'Kaislo n’utilise ni cookies publicitaires ni mesure d’audience. Liste des éléments enregistrés sur votre appareil et à quoi ils servent.',
  alternates: { canonical: '/cookies/' },
});

const SECTIONS = [
  {
    id: 'resume',
    titre: 'En résumé',
    contenu: (
      MESURE ? (
        <div className="encadre">
          <p><b>Des cookies de mesure facultatifs, seulement avec votre accord.</b> Kaislo enregistre sur votre appareil ce qui est utile pour faire fonctionner Kaislo et se souvenir de vos choix (comme votre pays). Si vous l’acceptez dans le bandeau, Kaislo place en plus des cookies de mesure de {REGIES_MESURE}, pour savoir quelles publicités amènent de vrais commerces. Ils ne contiennent jamais vos ventes ni vos clients. Si vous refusez, rien n’est chargé et rien ne change dans Kaislo.</p>
        </div>
      ) : (
        <div className="encadre">
          <p><b>Pas de publicité, pas de pistage, pas de mesure d’audience.</b> Kaislo enregistre seulement sur votre appareil ce qui est utile pour faire fonctionner Kaislo et se souvenir de vos choix (comme votre pays). Aucun cookie ne sert à vous suivre d’un site à l’autre.</p>
        </div>
      )
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
          <tr><td>kaislo_pays (cookie)</td><td>Se souvenir du pays que vous avez choisi, pour afficher les tarifs dans la monnaie de votre pays. Contient seulement un code de pays (par exemple « CI »).</td><td>1 an</td></tr>
          {MESURE && <tr><td>kaislo-mesure</td><td>Se souvenir de votre réponse au bandeau de mesure (accepté ou refusé).</td><td>Jusqu’à suppression</td></tr>}
          {!!GOOGLE_ADS_ID && <tr><td>_gcl_aw, _gcl_au… (cookies, seulement si vous acceptez)</td><td>Mesure Google Ads : relier une inscription à la publicité sur laquelle vous avez cliqué.</td><td>Environ 90 jours</td></tr>}
          {!!FACEBOOK_PIXEL_ID && <tr><td>_fbp (cookie, seulement si vous acceptez)</td><td>Mesure Meta (Facebook et Instagram) : relier une inscription à la publicité sur laquelle vous avez cliqué. Le pixel n’enregistre ni vos clics sur les boutons ni le contenu des formulaires.</td><td>Environ 90 jours</td></tr>}
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
        <li><b>Détection de votre pays</b> : pour afficher les prix de votre pays, notre serveur cherche le pays qui correspond à votre adresse IP auprès d’un service de géolocalisation gratuit (api.country.is, ou ipwho.is en secours). Seule l’adresse IP leur est transmise ; Kaislo ne la garde pas. Si vous touchez « Utiliser ma position », votre navigateur vous demande d’abord l’autorisation ; vos coordonnées sont alors envoyées à un service gratuit (BigDataCloud) qui renvoie seulement le nom du pays, et ne sont pas conservées par Kaislo. Vous pouvez toujours choisir votre pays vous-même dans la liste.</li>
        <li><b>WhatsApp et Google Maps</b> : ouverts uniquement quand vous touchez un bouton « Envoyer par WhatsApp » ou « Ouvrir dans Google Maps ». Leurs propres règles s’appliquent alors.</li>
        {!!GOOGLE_ADS_ID && <li><b>Google Ads</b> (seulement si vous acceptez le bandeau) : mesure des inscriptions venues de nos publicités. Google reçoit que quelqu’un a cliqué sur une publicité puis s’est inscrit ; jamais les ventes, les clients ni le contenu de votre commerce. Les règles de Google s’appliquent alors.</li>}
        {!!FACEBOOK_PIXEL_ID && <li><b>Meta (Facebook et Instagram)</b> (seulement si vous acceptez le bandeau) : pixel de mesure des inscriptions venues de nos publicités. Meta reçoit la page vue et le fait qu’une inscription a eu lieu ; jamais les ventes, les clients ni le contenu de votre commerce. Les règles de Meta s’appliquent alors.</li>}
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
