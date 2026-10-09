// ------------------------------------------------------------
// Réglages généraux du site
// ------------------------------------------------------------

// Adresse définitive du site (domaine kaislo.com)
// (utilisée pour Google : sitemap, liens de partage…)
export const SITE_URL = 'https://kaislo.com';

// Google Search Console → Ajouter une propriété → balise HTML : coller ici le code « content » (sinon laisser vide)
export const GOOGLE_VERIFICATION = '';

// Google Ads : suivi des inscriptions venues de vos publicités (voir le README, « Suivi des inscriptions Google Ads »).
//  GOOGLE_ADS_ID          : identifiant de la balise, de la forme « AW-1234567890 » (Google Ads → Outils → Mesure → Conversions)
//  GOOGLE_ADS_INSCRIPTION : étiquette de la conversion « Inscription », de la forme « AbC-D_efG-h12345 »
// Tant que GOOGLE_ADS_ID est vide : rien n'est chargé, aucun bandeau de cookies n'apparaît. Quand il est rempli, la balise ne se charge
// qu'après l'accord du visiteur (bandeau « Accepter / Refuser »). Peut aussi être donné au build : NEXT_PUBLIC_GOOGLE_ADS_ID / NEXT_PUBLIC_GOOGLE_ADS_INSCRIPTION.
export const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || '';
export const GOOGLE_ADS_INSCRIPTION = process.env.NEXT_PUBLIC_GOOGLE_ADS_INSCRIPTION || '';

// Pixel Meta (Facebook et Instagram) : mesure des inscriptions venues de vos publicités Facebook / Instagram.
// Comme Google Ads : la balise ne se charge qu'APRÈS l'accord du visiteur (bandeau « Accepter / Refuser »), jamais dans /admin/ ni /commercial/.
// Pour le désactiver : NEXT_PUBLIC_FACEBOOK_PIXEL_ID= (vide) au build.
export const FACEBOOK_PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID ?? '2023668061621044';
// Noms des régies publicitaires mesurées (pour le bandeau et les pages Cookies / Confidentialité)
export const REGIES_MESURE = [GOOGLE_ADS_ID && 'Google Ads', FACEBOOK_PIXEL_ID && 'Meta (Facebook et Instagram)'].filter(Boolean).join(' et ');

// Sous-dossier du site : vide sur Hostinger, "/kaislo" pour la version de test
// sur GitHub Pages (fixé au moment du build par NEXT_PUBLIC_BASE_PATH).
// Les <Link> de Next l'ajoutent tout seuls ; pour les images et fichiers
// de public/, utiliser chemin('/captures/…').
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
// Images et vidéos du site : l'adresse porte le numéro de la publication (« ?v=… », voir next.config.mjs).
// Elles peuvent alors être gardées 1 an par le navigateur (voir public/.htaccess) et une nouvelle image s'affiche
// tout de suite après une publication, puisque son adresse change.
const NUMERO_PUBLICATION = process.env.NEXT_PUBLIC_BUILD_ID || '';
const FICHIER_VERSIONNE = /^\/(captures|videos|icons|logo)\/.+\.(webp|png|jpg|svg|mp4)$/;
export const chemin = (p) => BASE_PATH + p + (NUMERO_PUBLICATION && FICHIER_VERSIONNE.test(p) ? '?v=' + NUMERO_PUBLICATION : '');

export const SITE_NOM = 'Kaislo';
export const SITE_SLOGAN = 'La gestion des ventes et du stock, simple, pour tous les commerces';
export const CONTACT_WHATSAPP = '212600000000'; // numéro WhatsApp d'Amorac (sans +)
export const CONTACT_EMAIL = 'contact@kaislo.com';
// Pages officielles de Kaislo sur les réseaux (adresses publiques, sans suivi « ?si= »). Un champ vide n'est pas affiché.
// Données structurées « sameAs » (lues par Google) et pied de page. Facebook et LinkedIn : ajouter l'adresse de la PAGE de l'entreprise
// (facebook.com/…, linkedin.com/company/…) quand elle existe ; un profil personnel (linkedin.com/in/…) ne doit pas figurer ici.
export const RESEAUX = { youtube: 'https://www.youtube.com/@kaislo-amorac', facebook: 'https://www.facebook.com/profile.php?id=61594827136139', linkedin: '' };

// Informations légales (pages Mentions légales, Confidentialité, Conditions…).
// À COMPLÉTER avant le lancement commercial : un champ vide n'est pas affiché.
export const SOCIETE = {
  nom: 'Amorac',
  formeJuridique: '', // ex : SARL au capital de 100 000 MAD
  adresse: '', // adresse du siège
  immatriculation: '', // ex : RC Casablanca 123456 · ICE 000000000000000
  directeurPublication: '', // nom de la personne responsable du site
  emailDonnees: 'contact@kaislo.com', // demandes sur les données personnelles
  emailSecurite: 'contact@kaislo.com', // signalement de failles de sécurité
};

// Hébergeur du site et de la base de données
export const HEBERGEUR = {
  nom: 'Hostinger International Ltd',
  adresse: '61 Lordou Vironos Street, 6023 Larnaca, Chypre',
  site: 'https://www.hostinger.com',
};

// Date affichée en haut des pages légales (à changer à chaque modification)
export const DATE_PAGES_LEGALES = '8 octobre 2026';

// L'espace Amorac (/admin) est protégé par le serveur : comptes de l'équipe (e-mail + mot de passe).
// Premier compte : clé « CleAdmin » du fichier .env du serveur.
