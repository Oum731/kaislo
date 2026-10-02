// ------------------------------------------------------------
// Réglages généraux du site
// ------------------------------------------------------------

// Adresse définitive du site : À CHANGER avant la mise en ligne
// (utilisée pour Google : sitemap, liens de partage…)
export const SITE_URL = 'https://kaisly.amorac.com';

// Sous-dossier du site : vide sur Hostinger, "/kaisly" pour la version de test
// sur GitHub Pages (fixé au moment du build par NEXT_PUBLIC_BASE_PATH).
// Les <Link> de Next l'ajoutent tout seuls ; pour les images et fichiers
// de public/, utiliser chemin('/captures/…').
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
export const chemin = (p) => BASE_PATH + p;

export const SITE_NOM = 'Kaisly';
export const SITE_SLOGAN = 'La caisse simple pour restaurants et épiceries';
export const CONTACT_WHATSAPP = '212600000000'; // numéro WhatsApp d'Amorac (sans +)
export const CONTACT_EMAIL = 'contact@amorac.com';

// Mot de passe de l'espace Amorac (/admin) — DÉMONSTRATION SEULEMENT.
// Dans la vraie version, l'accès sera protégé par le serveur (comptes de l'équipe).
export const ADMIN_MOT_DE_PASSE = 'amorac2026';
