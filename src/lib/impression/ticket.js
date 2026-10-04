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

  // En-tête du commerce (avec le logo si le gérant l'a choisi)
  if (commerce.logo && commerce.logoSurTicket === true) out.push({ logo: true, ref: commerce.logo, texte: '' });
  for (const l of decouper(commerce.nom.toUpperCase(), L)) ajouter(centrer(l, L), { gras: true, grand: true });
  for (const info of [commerce.adresse, [commerce.ville, commerce.telephone].filter(Boolean).join(' · ')]) {
    if (info) for (const l of decouper(info, L)) ajouter(centrer(l, L));
  }
  separateur();

  // Vente annulée : bien visible en haut du ticket
  if (vente.annulee) {
    ajouter(centrer('*** VENTE ANNULÉE ***', L), { gras: true, grand: true });
    for (const l of decouper('Le ' + formatDate(vente.annulee.date) + ' à ' + formatHeure(vente.annulee.date), L)) ajouter(centrer(l, L));
    if (vente.annulee.motif) for (const l of decouper('Motif : ' + vente.annulee.motif, L)) ajouter(centrer(l, L));
    separateur();
  }

  // Infos de la vente (le nom du vendeur n'est pas imprimé :
  // il reste visible pour le gérant dans l'historique des ventes)
  const date = formatDate(vente.date) + ' ' + formatHeure(vente.date);
  for (const l of deuxColonnes('Ticket n° ' + vente.numero, date, L)) ajouter(l);
  if (vente.table) ajouter('Table : ' + vente.table);
  if (vente.aDistance) ajouter('Commande à distance');
  separateur();

  // Articles
  for (const ligne of vente.lignes) {
    const libelle = ligne.quantite + ' x ' + ligne.nom;
    for (const l of deuxColonnes(libelle, formatNombre(ligne.total, dev), L)) ajouter(l);
    for (const d of ligne.details) for (const l of decouper(d, L - 4)) ajouter('    ' + l);
    if (ligne.quantite > 1) ajouter('    (' + formatNombre(ligne.prixUnitaire, dev) + ' l\'unité)');
    if (ligne.prixNormal) ajouter('    Promo ! au lieu de ' + formatNombre(ligne.prixNormal, dev));
  }
  separateur();

  // Totaux
  if (vente.remise > 0) {
    for (const l of deuxColonnes('Sous-total', formatPrix(vente.sousTotal, dev), L)) ajouter(l);
    const detail = vente.remiseInfo?.type === 'pourcent' ? ' (' + vente.remiseInfo.valeur + ' %)' : '';
    for (const l of deuxColonnes('Remise' + detail, '-' + formatPrix(vente.remise, dev), L)) ajouter(l);
  }
  for (const l of deuxColonnes('TOTAL', formatPrix(vente.total, dev), L)) ajouter(l, { gras: true, grand: true });
  if (vente.paiement === 'Crédit') {
    ajouter('Paiement : À CRÉDIT', { gras: true });
    for (const l of decouper('Client : ' + vente.clientNom, L)) ajouter(l);
    if (vente.soldeClientApres !== undefined) {
      for (const l of deuxColonnes('Total dû', formatPrix(vente.soldeClientApres, dev), L)) ajouter(l, { gras: true });
    }
  } else {
    ajouter('Paiement : ' + vente.paiement);
  }
  if (vente.recu > 0) {
    for (const l of deuxColonnes('Reçu', formatPrix(vente.recu, dev), L)) ajouter(l);
    for (const l of deuxColonnes('Rendu', formatPrix(vente.recu - vente.total, dev), L)) ajouter(l);
  }
  separateur();

  // Pied de ticket
  if (commerce.piedTicket) for (const l of decouper(commerce.piedTicket, L)) ajouter(centrer(l, L));
  ajouter(centrer('Kaislo', L));
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
  ajouter(centrer('FERMETURE DE LA JOURNÉE', L), { gras: true });
  separateur();
  colonnes('Ouverture', formatDate(cl.debut) + ' ' + formatHeure(cl.debut));
  if (cl.ouvertePar) ajouter('  par ' + cl.ouvertePar);
  colonnes('Fermeture', formatDate(cl.fin) + ' ' + formatHeure(cl.fin));
  ajouter('  par ' + cl.utilisateurNom);
  separateur();

  colonnes('Ventes (' + cl.nbVentes + ' tickets)', formatPrix(cl.totalVentes, dev), { gras: true });
  if (cl.nbAnnulees) colonnes('Ventes annulées', String(cl.nbAnnulees));
  if (cl.totalRemises) colonnes('Remises accordées', formatNombre(cl.totalRemises, dev));
  separateur();
  ajouter('PAR MODE DE PAIEMENT', { gras: true });
  for (const p of cl.parPaiement) {
    if (!(p.nb || p.rembourse || p.mode === 'Espèces')) continue;
    colonnes(p.mode + ' (' + p.nb + ')', formatNombre(p.total, dev));
    if (p.rembourse) colonnes('  + crédits remboursés', formatNombre(p.rembourse, dev));
  }
  if (cl.totalRecu !== undefined) colonnes('TOTAL REÇU', formatPrix(cl.totalRecu, dev), { gras: true });
  separateur();

  // Total vendu par article (pour les comptes de fin de journée)
  if (cl.parArticle?.length) {
    ajouter('ARTICLES VENDUS (' + (cl.nbArticles ?? '') + ')', { gras: true });
    for (const a of cl.parArticle) colonnes(a.quantite + ' x ' + a.nom, formatNombre(a.total, dev));
    separateur();
  }

  ajouter('ESPÈCES EN MAIN', { gras: true });
  colonnes('Fond de départ', formatNombre(cl.fondDeCaisse, dev));
  colonnes('+ Ventes en espèces', formatNombre(cl.ventesEspeces, dev));
  if (cl.remboursementsEspeces) colonnes('+ Crédits remboursés', formatNombre(cl.remboursementsEspeces, dev));
  colonnes('- Dépenses payées', formatNombre(cl.depensesCaisse, dev));
  colonnes('Attendu', formatPrix(cl.attendu, dev), { gras: true });
  colonnes('Compté', formatPrix(cl.compte, dev), { gras: true });
  separateur();
  colonnes('ÉCART', signe(cl.ecart), { gras: true, grand: true });
  ajouter(centrer(cl.ecart === 0 ? 'Comptes justes' : cl.ecart < 0 ? 'Il manque de l’argent' : 'Excédent dans les comptes', L));
  separateur();
  if (cl.note) for (const l of decouper('Note : ' + cl.note, L)) ajouter(l);
  ajouter('');
  ajouter('Signature :');
  ajouter('');
  ajouter(centrer('Kaislo', L));
  return out;
}

/**
 * TICKET CUISINE : la table, l'heure et les plats à préparer (sans les prix).
 * lignes = uniquement les nouveaux articles à envoyer en cuisine
 */
export function construireTicketCuisine(commande, lignes, commerce, largeurPapier = 58) {
  const L = CARACTERES[largeurPapier] || 32;
  const out = [];
  const ajouter = (texte, opts = {}) => out.push({ texte, gras: !!opts.gras, grand: !!opts.grand });
  ajouter(centrer('CUISINE', L), { gras: true, grand: true });
  ajouter(centrer(commande.table.toUpperCase(), L), { gras: true, grand: true });
  ajouter(centrer(formatHeure(new Date().toISOString()) + ' · ' + commande.vendeurNom, L));
  ajouter('='.repeat(L));
  for (const ligne of lignes) {
    for (const l of decouper(ligne.quantite + ' x ' + ligne.nom, L)) ajouter(l, { gras: true, grand: true });
    for (const d of ligne.details) for (const l of decouper(d, L - 4)) ajouter('    ' + l, { gras: true });
  }
  ajouter('='.repeat(L));
  return out;
}

/**
 * REÇU DE REMBOURSEMENT (carnet de crédit)
 */
export function construireTicketRemboursement(r, client, soldeApres, commerce, largeurPapier = 58) {
  const L = CARACTERES[largeurPapier] || 32;
  const dev = commerce.devise;
  const out = [];
  const ajouter = (texte, opts = {}) => out.push({ texte, gras: !!opts.gras, grand: !!opts.grand });
  const colonnes = (g, d, opts) => deuxColonnes(g, d, L).forEach((l) => ajouter(l, opts));
  if (commerce.logo && commerce.logoSurTicket === true) out.push({ logo: true, ref: commerce.logo, texte: '' });
  for (const l of decouper(commerce.nom.toUpperCase(), L)) ajouter(centrer(l, L), { gras: true, grand: true });
  ajouter(centrer('REÇU DE REMBOURSEMENT', L), { gras: true });
  ajouter('-'.repeat(L));
  colonnes('Date', formatDate(r.date) + ' ' + formatHeure(r.date));
  for (const l of decouper('Client : ' + client.nom, L)) ajouter(l);
  ajouter('-'.repeat(L));
  colonnes('MONTANT REÇU', formatPrix(r.montant, dev), { gras: true, grand: true });
  colonnes('Mode', r.mode);
  colonnes('Reste dû', formatPrix(soldeApres, dev), { gras: true });
  ajouter('-'.repeat(L));
  ajouter(centrer(soldeApres > 0 ? 'Merci !' : 'Compte soldé. Merci !', L));
  ajouter(centrer('Kaislo', L));
  return out;
}

// Petit ticket pour tester l'imprimante
export function ticketTest(commerce, largeurPapier = 58) {
  const L = CARACTERES[largeurPapier] || 32;
  return [
    { texte: centrer('KAISLO', L), gras: true, grand: true },
    { texte: centrer('Test d\'impression', L) },
    { texte: '-'.repeat(L) },
    { texte: commerce.nom },
    { texte: 'Papier : ' + largeurPapier + ' mm (' + L + ' car.)' },
    { texte: 'Accents : é è à ç ô ù' },
    { texte: '-'.repeat(L) },
    { texte: centrer('Tout fonctionne !', L), gras: true },
  ];
}

/**
 * Reçu à envoyer par WhatsApp : les mêmes lignes que le ticket imprimé,
 * dans un bloc ``` (police à chasse fixe dans WhatsApp, colonnes alignées).
 */
export function ticketEnTexteWhatsApp(lignes, commerce) {
  const texte = lignes.filter((l) => !l.logo).map((l) => l.texte.replace(/\s+$/, '')).join('\n');
  return 'Bonjour, voici votre reçu de *' + commerce.nom + '* :\n```\n' + texte + '\n```\nMerci pour votre confiance !';
}
