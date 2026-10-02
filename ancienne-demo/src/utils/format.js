// ------------------------------------------------------------
// Petites fonctions de mise en forme (prix, dates, identifiants)
// ------------------------------------------------------------

// Nombre de décimales selon la devise : le FCFA n'a pas de centimes, le dirham oui.
const DECIMALES = { FCFA: 0, MAD: 2 };

// Libellé affiché après le montant.
const SYMBOLES = { FCFA: 'FCFA', MAD: 'DH' };

// Formate un nombre "à la française" : 12 500 ou 24,50.
// On remplace les espaces spéciales d'Intl par une espace normale
// (sinon l'imprimante thermique affiche des caractères bizarres).
export function formatNombre(montant, devise) {
  const dec = DECIMALES[devise] ?? 0;
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  })
    .format(montant || 0)
    .replace(/\s/g, ' ');
}

// Montant avec la devise : "12 500 FCFA" ou "24,50 DH".
export function formatPrix(montant, devise) {
  return formatNombre(montant, devise) + ' ' + (SYMBOLES[devise] ?? devise);
}

// Arrondi propre selon la devise (évite les 0.30000000004).
export function arrondir(montant, devise) {
  const f = 10 ** (DECIMALES[devise] ?? 0);
  return Math.round((montant || 0) * f) / f;
}

// Identifiant unique court (suffisant pour la démo).
export function genId(prefixe = '') {
  return prefixe + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// "14:05"
export function formatHeure(dateIso) {
  const d = new Date(dateIso);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

// "02/10/2026"
export function formatDate(dateIso) {
  const d = new Date(dateIso);
  return (
    String(d.getDate()).padStart(2, '0') + '/' +
    String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear()
  );
}

// "Jeudi 2 octobre"
export function formatJourLong(date) {
  const s = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Initiales pour les avatars : "Awa Koné" -> "AK"
export function initiales(nom) {
  return (nom || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0].toUpperCase())
    .join('');
}
