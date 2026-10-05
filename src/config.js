// ------------------------------------------------------------
// Réglages généraux du site
// ------------------------------------------------------------

// Adresse définitive du site (domaine kaislo.com)
// (utilisée pour Google : sitemap, liens de partage…)
export const SITE_URL = 'https://kaislo.com';

// Google Search Console → Ajouter une propriété → balise HTML : coller ici le code « content » (sinon laisser vide)
export const GOOGLE_VERIFICATION = '';

// Sous-dossier du site : vide sur Hostinger, "/kaislo" pour la version de test
// sur GitHub Pages (fixé au moment du build par NEXT_PUBLIC_BASE_PATH).
// Les <Link> de Next l'ajoutent tout seuls ; pour les images et fichiers
// de public/, utiliser chemin('/captures/…').
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
export const chemin = (p) => BASE_PATH + p;

export const SITE_NOM = 'Kaislo';
export const SITE_SLOGAN = 'La gestion des ventes et du stock, simple, pour tous les commerces';
export const CONTACT_WHATSAPP = '212600000000'; // numéro WhatsApp d'Amorac (sans +)
export const CONTACT_EMAIL = 'contact@kaislo.com';

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
export const DATE_PAGES_LEGALES = '3 octobre 2026';

// L'espace Amorac (/admin) est protégé par le serveur : comptes de l'équipe (e-mail + mot de passe).
// Premier compte : clé « CleAdmin » du fichier .env du serveur.
