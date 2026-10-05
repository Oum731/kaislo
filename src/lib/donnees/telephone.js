// ------------------------------------------------------------
// NUMÉROS DE TÉLÉPHONE selon le pays.
//
// Tous les numéros sont enregistrés au format international (norme E.164),
// par exemple « +225 07 07 12 34 56 ». Le numéro identifie chaque personne et
// chaque commerce : il est unique dans tout Kaislo.
// Mêmes règles côté serveur : api/lib/telephone.php (à garder identiques).
//
//   longueurs    : nombre de chiffres du numéro national (sans l'indicatif)
//   zeroNational : le 0 de tête disparaît en format international (Maroc, France…) ;
//                  en Côte d'Ivoire, au Bénin, au Congo ou au Gabon, il fait partie du numéro
//   groupes      : découpage pour l'affichage
// ------------------------------------------------------------
import { tr } from '../i18n/index.js';
export const REGLES_TELEPHONE = {
  MA: { indicatif: '212', longueurs: [9], zeroNational: true, groupes: [1, 2, 2, 2, 2], exemple: '06 12 34 56 78' },
  CI: { indicatif: '225', longueurs: [10], zeroNational: false, groupes: [2, 2, 2, 2, 2], exemple: '07 07 12 34 56' },
  SN: { indicatif: '221', longueurs: [9], zeroNational: false, groupes: [2, 3, 2, 2], exemple: '77 123 45 67' },
  ML: { indicatif: '223', longueurs: [8], zeroNational: false, groupes: [2, 2, 2, 2], exemple: '76 12 34 56' },
  BF: { indicatif: '226', longueurs: [8], zeroNational: false, groupes: [2, 2, 2, 2], exemple: '70 12 34 56' },
  BJ: { indicatif: '229', longueurs: [10], zeroNational: false, groupes: [2, 2, 2, 2, 2], exemple: '01 97 12 34 56' },
  TG: { indicatif: '228', longueurs: [8], zeroNational: false, groupes: [2, 2, 2, 2], exemple: '90 12 34 56' },
  NE: { indicatif: '227', longueurs: [8], zeroNational: false, groupes: [2, 2, 2, 2], exemple: '90 12 34 56' },
  GN: { indicatif: '224', longueurs: [9], zeroNational: false, groupes: [3, 2, 2, 2], exemple: '622 12 34 56' },
  CM: { indicatif: '237', longueurs: [9], zeroNational: false, groupes: [1, 2, 2, 2, 2], exemple: '6 71 23 45 67' },
  GA: { indicatif: '241', longueurs: [8, 7], zeroNational: false, groupes: [2, 2, 2, 2], exemple: '06 12 34 56' },
  CG: { indicatif: '242', longueurs: [9], zeroNational: false, groupes: [2, 3, 2, 2], exemple: '06 612 34 56' },
  FR: { indicatif: '33', longueurs: [9], zeroNational: true, groupes: [1, 2, 2, 2, 2], exemple: '06 12 34 56 78' },
  BE: { indicatif: '32', longueurs: [9, 8], zeroNational: true, groupes: [3, 2, 2, 2], exemple: '0470 12 34 56' },
  CA: { indicatif: '1', longueurs: [10], zeroNational: false, groupes: [3, 3, 4], exemple: '514 555 0123' },
};

// Découpe un numéro national en groupes lisibles (« 07 07 12 34 56 »)
function grouper(national, groupes) {
  const total = groupes.reduce((a, b) => a + b, 0);
  const tailles = total === national.length ? groupes : Array(Math.ceil(national.length / 2)).fill(2);
  const morceaux = [];
  let i = 0;
  for (const t of tailles) { if (i < national.length) morceaux.push(national.slice(i, i + t)); i += t; }
  return morceaux.join(' ');
}

/**
 * Vérifie et met au format international un numéro tapé par quelqu'un.
 * paysId : pays du commerce (sert si le numéro est tapé sans indicatif).
 * Renvoie { ok: true, e164: '+2250707123456', affichage: '+225 07 07 12 34 56', pays } ou { ok: false, erreur }.
 */
export function normaliserTelephone(saisie, paysId) {
  const brut = String(saisie || '').trim();
  let chiffres = brut.replace(/\D/g, '');
  if (!chiffres) return { ok: false, erreur: tr('Indiquez le numéro de téléphone') };
  const international = brut.startsWith('+') || chiffres.startsWith('00');
  if (chiffres.startsWith('00')) chiffres = chiffres.slice(2);

  let pays = paysId;
  let national = chiffres;
  if (international) {
    // Pays de l'indicatif (celui du commerce en priorité, puis le plus long qui correspond)
    const trouves = Object.entries(REGLES_TELEPHONE)
      .filter(([, r]) => chiffres.startsWith(r.indicatif))
      .sort((a, b) => (b[0] === paysId) - (a[0] === paysId) || b[1].indicatif.length - a[1].indicatif.length);
    if (!trouves.length) {
      // Pays non répertorié : accepté si la longueur est plausible (8 à 15 chiffres)
      if (chiffres.length < 8 || chiffres.length > 15) return { ok: false, erreur: tr('Numéro international incomplet (ex : +225 07 07 12 34 56)') };
      return { ok: true, e164: '+' + chiffres, affichage: '+' + chiffres, pays: null };
    }
    pays = trouves[0][0];
    national = chiffres.slice(REGLES_TELEPHONE[pays].indicatif.length);
  } else {
    const r = REGLES_TELEPHONE[paysId];
    if (!r) return { ok: false, erreur: tr('Écrivez le numéro au format international : + indicatif du pays, puis le numéro') };
    // Numéro tapé avec l'indicatif mais sans le « + » (ex : 2250707123456)
    const longueur = (n) => (r.zeroNational ? n.replace(/^0/, '') : n).length;
    const reste = national.slice(r.indicatif.length);
    if (national.startsWith(r.indicatif) && !r.longueurs.includes(longueur(national)) && r.longueurs.includes(longueur(reste))) national = reste;
  }
  const r = REGLES_TELEPHONE[pays];
  if (r.zeroNational && national.startsWith('0')) national = national.slice(1);
  if (!r.longueurs.includes(national.length)) {
    return { ok: false, erreur: tr('Numéro incomplet ou trop long. Exemple : {0}', [r.exemple]) };
  }
  return { ok: true, e164: '+' + r.indicatif + national, affichage: '+' + r.indicatif + ' ' + grouper(national, r.groupes), pays };
}

// Affiche lisiblement un numéro déjà enregistré (« +2250707123456 » -> « +225 07 07 12 34 56 »)
export function formaterTelephone(telephone, paysId) {
  const n = normaliserTelephone(telephone, paysId);
  return n.ok ? n.affichage : String(telephone || '');
}

// Clé unique d'un numéro (chiffres du format international), ou '' s'il est invalide
export function cleNumero(telephone, paysId) {
  const n = normaliserTelephone(telephone, paysId);
  return n.ok ? n.e164.slice(1) : '';
}

// Exemple à afficher dans le champ, selon le pays
export function exempleTelephone(paysId) {
  return REGLES_TELEPHONE[paysId]?.exemple || tr('+indicatif numéro');
}
export function indicatifPays(paysId) {
  return REGLES_TELEPHONE[paysId] ? '+' + REGLES_TELEPHONE[paysId].indicatif : '';
}
