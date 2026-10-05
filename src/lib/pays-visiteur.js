// ------------------------------------------------------------
// PAYS DU VISITEUR (pour n'afficher que les tarifs et la devise de son pays)
// Devine par le fuseau horaire puis la langue du navigateur : pas de GPS, pas d'adresse IP, pas de cookie.
// Le visiteur peut corriger son pays (voyage, VPN) : son choix est gardé dans cet appareil.
// ------------------------------------------------------------
import { PAYS } from '@/lib/donnees/modeles';

// Pays affiché dans la page générée à l'avance (avant que l'appareil du visiteur ne soit consulté)
export const PAYS_PAR_DEFAUT = 'CI';
const CLE = 'kaislo-pays-visiteur';

const FUSEAUX = {
  'Africa/Casablanca': 'MA', 'Africa/El_Aaiun': 'MA', 'Africa/Abidjan': 'CI', 'Africa/Dakar': 'SN', 'Africa/Bamako': 'ML',
  'Africa/Ouagadougou': 'BF', 'Africa/Porto-Novo': 'BJ', 'Africa/Lome': 'TG', 'Africa/Niamey': 'NE', 'Africa/Conakry': 'GN',
  'Africa/Douala': 'CM', 'Africa/Libreville': 'GA', 'Africa/Brazzaville': 'CG', 'Europe/Paris': 'FR', 'Europe/Brussels': 'BE',
  'America/Toronto': 'CA', 'America/Montreal': 'CA', 'America/Vancouver': 'CA', 'America/Edmonton': 'CA', 'America/Winnipeg': 'CA',
  'America/Halifax': 'CA', 'America/St_Johns': 'CA', 'America/Regina': 'CA',
};

const existe = (id) => PAYS.some((p) => p.id === id);

export function lirePaysChoisi() {
  try { const id = localStorage.getItem(CLE); return existe(id) ? id : null; } catch { return null; }
}

export function choisirPays(id) {
  try { localStorage.setItem(CLE, id); } catch { /* stockage bloqué : le choix vaut pour cette page seulement */ }
}

// Pays déduit de l'appareil, ou null si on ne sait pas
export function devinerPays() {
  try {
    const fuseau = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (FUSEAUX[fuseau]) return FUSEAUX[fuseau];
  } catch { /* ignoré */ }
  const region = (typeof navigator !== 'undefined' ? navigator.language || '' : '').split('-')[1]?.toUpperCase();
  return existe(region) ? region : null;
}

// Pays inconnu (hors liste) : tarifs en dollars (« Autre pays »)
export const paysDuVisiteur = () => lirePaysChoisi() || devinerPays() || 'XX';
