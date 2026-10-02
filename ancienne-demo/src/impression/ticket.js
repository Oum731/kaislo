// ------------------------------------------------------------
// MISE EN PAGE DU TICKET
//
// On construit le ticket une seule fois sous forme de lignes de texte
// de largeur fixe. Ces mêmes lignes servent :
//  - à l'aperçu à l'écran (police à chasse fixe)
//  - à l'impression thermique (escpos.js)
// Donc l'aperçu = exactement ce qui sort de l'imprimante.
// ------------------------------------------------------------
import { formatNombre, formatPrix, formatDate, formatHeure } from '../utils/format.js';

// Nombre de caractères par ligne selon la largeur du papier
export const CARACTERES = { 58: 32, 80: 48 };

// Coupe un texte en morceaux de "largeur" caractères maximum (sans couper les mots si possible)
function decouper(texte, largeur) {
  const mots = String(texte).split(' ');
  const lignes = [];
  let courante = '';
  for (const mot of mots) {
    if (!courante) courante = mot;
    else if ((courante + ' ' + mot).length <= largeur) courante += ' ' + mot;
    else {
      lignes.push(courante);
      courante = mot;
    }
    // mot plus long que la ligne : on le coupe
    while (courante.length > largeur) {
      lignes.push(courante.slice(0, largeur));
      courante = courante.slice(largeur);
    }
  }
  if (courante) lignes.push(courante);
  return lignes.length ? lignes : [''];
}

function centrer(texte, largeur) {
  const espace = Math.max(0, Math.floor((largeur - texte.length) / 2));
  return ' '.repeat(espace) + texte;
}

// Texte à gauche + montant à droite sur la même ligne
function deuxColonnes(gauche, droite, largeur) {
  const place = largeur - droite.length - 1;
  const morceaux = decouper(gauche, place);
  const derniere = morceaux.pop();
  return [...morceaux, derniere + ' '.repeat(largeur - derniere.length - droite.length) + droite];
}

/**
 * Renvoie une liste de lignes : { texte, gras, grand }
 * "grand" = double hauteur (même largeur, donc la mise en page reste juste)
 */
export function construireTicket(vente, commerce, largeurPapier = 58) {
  const L = CARACTERES[largeurPapier] || 32;
  const dev = commerce.devise;
  const out = [];
  const ajouter = (texte, opts = {}) => out.push({ texte, gras: !!opts.gras, grand: !!opts.grand });
  const separateur = () => ajouter('-'.repeat(L));

  // En-tête du commerce
  for (const l of decouper(commerce.nom.toUpperCase(), L)) ajouter(centrer(l, L), { gras: true, grand: true });
  for (const info of [commerce.adresse, [commerce.ville, commerce.telephone].filter(Boolean).join(' · ')]) {
    if (info) for (const l of decouper(info, L)) ajouter(centrer(l, L));
  }
  separateur();

  // Vente annulée : bien visible en haut du ticket
  if (vente.annulee) {
    ajouter(centrer('*** VENTE ANNULÉE ***', L), { gras: true, grand: true });
    for (const l of decouper('Par ' + vente.annulee.par + ' le ' + formatDate(vente.annulee.date) + ' ' + formatHeure(vente.annulee.date), L)) ajouter(centrer(l, L));
    if (vente.annulee.motif) for (const l of decouper('Motif : ' + vente.annulee.motif, L)) ajouter(centrer(l, L));
    separateur();
  }

  // Infos de la vente
  const date = formatDate(vente.date) + ' ' + formatHeure(vente.date);
  for (const l of deuxColonnes('Ticket n° ' + vente.numero, date, L)) ajouter(l);
  ajouter('Vendeur : ' + vente.vendeurNom);
  separateur();

  // Articles
  for (const ligne of vente.lignes) {
    const libelle = ligne.quantite + ' x ' + ligne.nom;
    for (const l of deuxColonnes(libelle, formatNombre(ligne.total, dev), L)) ajouter(l);
    for (const d of ligne.details) for (const l of decouper(d, L - 4)) ajouter('    ' + l);
    if (ligne.quantite > 1) ajouter('    (' + formatNombre(ligne.prixUnitaire, dev) + ' l\'unité)');
  }
  separateur();

  // Totaux
  for (const l of deuxColonnes('TOTAL', formatPrix(vente.total, dev), L)) ajouter(l, { gras: true, grand: true });
  ajouter('Paiement : ' + vente.paiement);
  if (vente.recu > 0) {
    for (const l of deuxColonnes('Reçu', formatPrix(vente.recu, dev), L)) ajouter(l);
    for (const l of deuxColonnes('Rendu', formatPrix(vente.recu - vente.total, dev), L)) ajouter(l);
  }
  separateur();

  // Pied de ticket
  if (commerce.piedTicket) for (const l of decouper(commerce.piedTicket, L)) ajouter(centrer(l, L));
  ajouter(centrer('Caisse Kaisly', L));
  return out;
}

/**
 * Ticket de CLÔTURE DE CAISSE (rapport de fin de journée)
 */
export function construireTicketCloture(cl, commerce, largeurPapier = 58) {
  const L = CARACTERES[largeurPapier] || 32;
  const dev = commerce.devise;
  const out = [];
  const ajouter = (texte, opts = {}) => out.push({ texte, gras: !!opts.gras, grand: !!opts.grand });
  const separateur = () => ajouter('-'.repeat(L));
  const colonnes = (g, d, opts) => deuxColonnes(g, d, L).forEach((l) => ajouter(l, opts));
  const signe = (m) => (m > 0 ? '+' : '') + formatPrix(m, dev);

  for (const l of decouper(commerce.nom.toUpperCase(), L)) ajouter(centrer(l, L), { gras: true, grand: true });
  ajouter(centrer('CLÔTURE DE CAISSE', L), { gras: true });
  separateur();
  colonnes('Du', formatDate(cl.debut) + ' ' + formatHeure(cl.debut));
  colonnes('Au', formatDate(cl.fin) + ' ' + formatHeure(cl.fin));
  ajouter('Par : ' + cl.utilisateurNom);
  separateur();

  colonnes('Ventes (' + cl.nbVentes + ' tickets)', formatPrix(cl.totalVentes, dev), { gras: true });
  if (cl.nbAnnulees) colonnes('Ventes annulées', String(cl.nbAnnulees));
  separateur();
  ajouter('PAR MODE DE PAIEMENT', { gras: true });
  for (const p of cl.parPaiement) colonnes(p.mode + ' (' + p.nb + ')', formatNombre(p.total, dev));
  separateur();

  ajouter('ESPÈCES DANS LA CAISSE', { gras: true });
  colonnes('Fond de caisse', formatNombre(cl.fondDeCaisse, dev));
  colonnes('+ Ventes en espèces', formatNombre(cl.ventesEspeces, dev));
  colonnes('- Dépenses payées', formatNombre(cl.depensesCaisse, dev));
  colonnes('Attendu', formatPrix(cl.attendu, dev), { gras: true });
  colonnes('Compté', formatPrix(cl.compte, dev), { gras: true });
  separateur();
  colonnes('ÉCART', signe(cl.ecart), { gras: true, grand: true });
  ajouter(centrer(cl.ecart === 0 ? 'Caisse juste' : cl.ecart < 0 ? 'Il manque de l’argent' : 'Excédent en caisse', L));
  separateur();
  ajouter('');
  ajouter('Signature :');
  ajouter('');
  ajouter(centrer('Caisse Kaisly', L));
  return out;
}

// Petit ticket pour tester l'imprimante
export function ticketTest(commerce, largeurPapier = 58) {
  const L = CARACTERES[largeurPapier] || 32;
  return [
    { texte: centrer('KAISLY', L), gras: true, grand: true },
    { texte: centrer('Test d\'impression', L) },
    { texte: '-'.repeat(L) },
    { texte: commerce.nom },
    { texte: 'Papier : ' + largeurPapier + ' mm (' + L + ' car.)' },
    { texte: 'Accents : é è à ç ô ù' },
    { texte: '-'.repeat(L) },
    { texte: centrer('Tout fonctionne !', L), gras: true },
  ];
}
