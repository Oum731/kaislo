// ------------------------------------------------------------
// Réglages généraux du site
// ------------------------------------------------------------

// Adresse définitive du site (domaine kaislo.com)
// (utilisée pour Google : sitemap, liens de partage…)
export const SITE_URL = 'https://kaislo.com';

// Sous-dossier du site : vide sur Hostinger, "/kaisly" pour la version de test
// sur GitHub Pages (fixé au moment du build par NEXT_PUBLIC_BASE_PATH).
// Les <Link> de Next l'ajoutent tout seuls ; pour les images et fichiers
// de public/, utiliser chemin('/captures/…').
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
export const chemin = (p) => BASE_PATH + p;

export const SITE_NOM = 'Kaislo';
export const SITE_SLOGAN = 'La caisse et la gestion de stock simples, pour tous les commerces';
export const CONTACT_WHATSAPP = '212600000000'; // numéro WhatsApp d'Amorac (sans +)
export const CONTACT_EMAIL = 'contact@amorac.com';

// Informations légales (pages Mentions légales, Confidentialité, Conditions…).
// À COMPLÉTER avant le lancement commercial : un champ vide n'est pas affiché.
export const SOCIETE = {
  nom: 'Amorac',
  formeJuridique: '', // ex : SARL au capital de 100 000 MAD
  adresse: '', // adresse du siège
  immatriculation: '', // ex : RC Casablanca 123456 · ICE 000000000000000
  directeurPublication: '', // nom de la personne responsable du site
  emailDonnees: 'contact@amorac.com', // demandes sur les données personnelles
  emailSecurite: 'contact@amorac.com', // signalement de failles de sécurité
};

// Hébergeur du site (à modifier lors du passage sur Hostinger)
export const HEBERGEUR = {
  nom: 'GitHub Pages (GitHub, Inc.)',
  adresse: '88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis',
  site: 'https://pages.github.com',
};

// Date affichée en haut des pages légales (à changer à chaque modification)
export const DATE_PAGES_LEGALES = '3 octobre 2026';

// Mot de passe de l'espace Amorac (/admin) — DÉMONSTRATION SEULEMENT.
// Dans la vraie version, l'accès sera protégé par le serveur (comptes de l'équipe).
export const ADMIN_MOT_DE_PASSE = 'amorac2026';
