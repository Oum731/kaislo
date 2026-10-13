// ------------------------------------------------------------
// CONTRAT DU COMMERCIAL KAISLO (PDF A4) : contrat d'apporteur d'affaires indépendant.
// Fabriqué dans le navigateur (jsPDF) à partir des règles figées au moment de l'envoi du contrat (contrat.conditions),
// donc le PDF reste identique même si le programme change ensuite.
// Police standard du PDF : accents français conservés, caractères hors alphabet latin remplacés par « ? ».
// Ce modèle est un point de départ : à faire relire par un juriste local avant de l'utiliser avec de vrais commerciaux.
// ------------------------------------------------------------
import { formatNombre, symbole, formatDate } from '../utils/format.js';
import { PAYS } from '../donnees/modeles.js';

const VERT = [30, 91, 67];
const GRIS = [95, 105, 100];

const sur = (t) => String(t ?? '')
  .replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').replace(/[–—−]/g, '-').replace(/…/g, '...').replace(/[   ]/g, ' ')
  .replace(/€/g, 'EUR').replace(/[^\x20-\x7E\xA1-\xFF\n]/g, '?');

const montant = (x, dev) => formatNombre(x, dev) + ' ' + (dev === 'EUR' ? 'EUR' : symbole(dev));

/** Articles du contrat : liste de { titre, paragraphes[] } (texte brut), utile aussi pour les tests. */
export function articlesContrat({ commercial, contrat, societe }) {
  const c = contrat.conditions || {};
  const pays = PAYS.find((p) => p.id === commercial.pays) || { nom: commercial.pays, devise: 'FCFA' };
  const dev = pays.devise;
  const bonus = c.bonusHebdo || {};
  const montantBonus = Number(bonus.montant?.[dev] || 0);
  const primes = (c.primes || []).filter((p) => Number(p.montant?.[dev] || 0) > 0);
  const nomSociete = societe.nom || 'Kaislo';

  return [
    { titre: 'Article 1 - Objet', paragraphes: [
      `Le présent contrat fixe les conditions dans lesquelles le Commercial présente l'application Kaislo (gestion des ventes et du stock pour les commerces) à des commerçants et les inscrit avec son code parrain ${commercial.code}, en échange d'une rémunération.`,
    ] },
    { titre: 'Article 2 - Statut indépendant', paragraphes: [
      'Le Commercial agit en toute indépendance. Le présent contrat ne crée ni contrat de travail, ni lien de subordination, ni société ou association entre les parties. Le Commercial organise librement son temps et ses déplacements, supporte ses propres frais (transport, communication) et n\'a aucun pouvoir pour engager ' + nomSociete + ' ou signer en son nom.',
      'Le Commercial est responsable de ses déclarations fiscales et sociales éventuelles sur les sommes perçues.',
    ] },
    { titre: 'Article 3 - Mission', paragraphes: [
      'Le Commercial rencontre des commerçants (boutiques, pharmacies, restaurants, quincailleries, etc.), leur présente Kaislo, les inscrit avec son code ou son lien personnel et les aide à démarrer (ajout des premiers articles, première vente). La mission est non exclusive et sans objectif minimum obligatoire.',
    ] },
    { titre: 'Article 4 - Rémunération', paragraphes: [
      `4.1 Commission. Le Commercial perçoit ${c.taux ?? 25} % de chaque paiement d'abonnement effectué par un client qu'il a apporté, pendant les ${c.dureeMois ?? 12} premiers mois payés de ce client (formule et postes supplémentaires compris).`,
      `4.2 Validation. Les commissions deviennent payables quand le client a payé ${c.moisValidation ?? 6} mois d'abonnement et utilise réellement Kaislo (des ventes enregistrées chaque semaine). À la validation, les commissions des premiers mois sont versées en une fois, puis chacune des suivantes est versée au fur et à mesure des paiements du client.`,
      `4.3 Client qui arrête. Si le client cesse de payer avant la validation, aucune commission n'est due pour ce client.`,
      montantBonus > 0
        ? `4.4 Bonus hebdomadaire. Le Commercial reçoit ${montant(montantBonus, dev)} pour chaque semaine (du lundi au dimanche, selon la date d'inscription des clients) où au moins ${bonus.clients ?? 5} clients apportés ont démarré. Un client a démarré s'il a au moins 3 articles et 1 vente enregistrés dans les 7 jours qui suivent son inscription. Le bonus est calculé et versé après la fin de la semaine.`
        : '4.4 Bonus hebdomadaire. Aucun bonus hebdomadaire n\'est prévu dans la devise de ce pays à la date du contrat.',
      primes.length
        ? '4.5 Primes. ' + primes.map((p) => `${montant(p.montant[dev], dev)} à ${p.clients} clients validés`).join(' ; ') + '. Chaque prime est versée une seule fois.'
        : '4.5 Primes. Des primes par palier de clients validés peuvent être décidées par ' + nomSociete + ' ; leurs montants sont alors communiqués par écrit.',
      '4.6 Paiement et suivi. Les sommes sont versées par mobile money ou virement. Le Commercial suit ses clients et ses gains dans son espace en ligne ; en cas de doute, l\'équipe vérifie l\'activité réelle du client et sa décision est expliquée au Commercial.',
    ] },
    { titre: 'Article 5 - Engagements du Commercial', paragraphes: [
      'Le Commercial s\'engage à : présenter Kaislo honnêtement, sans promesse de gain ni information mensongère ; ne créer aucun faux compte, ni compte fictif ou sans activité réelle, et ne pas s\'inscrire lui-même ou inscrire ses proches pour obtenir une rémunération ; respecter les commerçants qui refusent et ne pas les harceler ; ne pas utiliser le nom et le logo Kaislo en dehors du présent programme ; protéger les données personnelles des commerçants rencontrés.',
      'Tout manquement de ce type peut entraîner la perte des sommes concernées et la fin immédiate du contrat.',
    ] },
    { titre: 'Article 6 - Engagements de ' + nomSociete, paragraphes: [
      `${nomSociete} fournit au Commercial un code parrain, un espace de suivi, une formation de départ et des supports de prospection, enregistre fidèlement les clients inscrits avec son code et verse les sommes dues selon l'article 4.`,
      'Les règles de rémunération peuvent évoluer pour l\'avenir, avec un préavis écrit de 15 jours, sans effet sur les commissions déjà acquises et sans effet sur les clients déjà inscrits avec le code du Commercial.',
    ] },
    { titre: 'Article 7 - Confidentialité et données personnelles', paragraphes: [
      'Le Commercial garde confidentielles les informations non publiques reçues de ' + nomSociete + ' et les informations de ses clients. Il n\'utilise les numéros de téléphone et informations recueillis que pour inscrire le commerçant à Kaislo, avec son accord, et ne les transmet à personne d\'autre.',
    ] },
    { titre: 'Article 8 - Durée et fin du contrat', paragraphes: [
      'Le contrat est conclu pour une durée indéterminée. Chaque partie peut y mettre fin à tout moment avec un préavis écrit de 15 jours (message dans l\'espace, e-mail ou WhatsApp). La fin est immédiate en cas de fraude ou de faute grave.',
      'Les commissions déjà validées restent dues après la fin du contrat. Les commissions en attente restent dues si les conditions de validation sont remplies, sauf fraude.',
    ] },
    { titre: 'Article 9 - Liberté du Commercial', paragraphes: [
      'Le Commercial reste libre d\'exercer d\'autres activités. Il s\'interdit seulement de dénigrer Kaislo et de se présenter comme salarié ou représentant légal de ' + nomSociete + '.',
    ] },
    { titre: 'Article 10 - Droit applicable et litiges', paragraphes: [
      `Le contrat est soumis au droit en vigueur en ${pays.nom}. Les parties cherchent d'abord une solution amiable. À défaut, le litige est porté devant les tribunaux compétents.`,
    ] },
    { titre: 'Article 11 - Acceptation électronique', paragraphes: [
      'Le Commercial accepte le contrat en appuyant sur « J\'ai lu et j\'accepte » dans son espace Kaislo. La date de cet acte est enregistrée et vaut signature. Le Commercial peut télécharger ce document à tout moment.',
    ] },
  ];
}

/** Construit le PDF (objet jsPDF). */
export async function creerPdfContrat({ commercial, contrat, societe = {} }) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setProperties({ title: `Contrat ${contrat.numero}`, author: 'Kaislo', creator: 'Kaislo' });
  const L = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const marge = 18;
  const largeur = L - marge * 2;
  let y = 0;

  const verifier = (besoin) => { if (y + besoin > H - 18) { doc.addPage(); y = 20; } };
  const ecrire = (texte, { taille = 10, gras = false, couleur = [20, 33, 28], interligne = 4.6, apres = 2.5 } = {}) => {
    doc.setFont('helvetica', gras ? 'bold' : 'normal');
    doc.setFontSize(taille);
    doc.setTextColor(...couleur);
    for (const ligne of doc.splitTextToSize(sur(texte), largeur)) {
      verifier(interligne);
      doc.text(ligne, marge, y);
      y += interligne;
    }
    y += apres;
  };

  // En-tête
  doc.setFillColor(...VERT);
  doc.rect(0, 0, L, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Kaislo', marge, 13);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(sur('Contrat d\'apporteur d\'affaires indépendant'), marge, 21);
  doc.setFontSize(9);
  doc.text(sur(`N° ${contrat.numero} - ${formatDate(contrat.envoyeLe)}`), L - marge, 21, { align: 'right' });
  y = 40;

  // Parties
  const nomSociete = societe.nom || 'Kaislo';
  const lignesSociete = [societe.formeJuridique, societe.adresse && 'siège : ' + societe.adresse, societe.immatriculation].filter(Boolean).join(', ');
  const pays = PAYS.find((p) => p.id === commercial.pays);
  ecrire('ENTRE LES SOUSSIGNÉS', { gras: true, couleur: VERT, taille: 11 });
  ecrire(`${nomSociete}${lignesSociete ? ', ' + lignesSociete : ''}, qui exploite l'application Kaislo, représentée par ${societe.directeurPublication || 'son représentant légal'}, ci-après « Kaislo ».`);
  ecrire('ET', { gras: true, couleur: VERT, taille: 11 });
  ecrire(`${commercial.nom}, téléphone ${commercial.telephone}${commercial.email ? ', e-mail ' + commercial.email : ''}, demeurant à ${[commercial.quartier, commercial.ville, pays?.nom].filter(Boolean).join(', ')}, code parrain ${commercial.code}, ci-après « le Commercial ».`, { apres: 5 });

  for (const a of articlesContrat({ commercial, contrat, societe })) {
    verifier(20);
    ecrire(a.titre, { gras: true, couleur: VERT, taille: 11, apres: 1.5 });
    for (const p of a.paragraphes) ecrire(p);
  }

  // Signatures
  verifier(52);
  y += 4;
  ecrire(`Fait à ${pays?.ville || '____________'}, le ${formatDate(contrat.envoyeLe)}, en deux exemplaires (un par partie, ou en version électronique).`, { apres: 6 });
  const hauteur = y;
  doc.setDrawColor(...GRIS);
  doc.setLineWidth(0.3);
  doc.rect(marge, hauteur, largeur / 2 - 3, 36);
  doc.rect(marge + largeur / 2 + 3, hauteur, largeur / 2 - 3, 36);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(20, 33, 28);
  doc.text(sur('Pour ' + nomSociete), marge + 3, hauteur + 6);
  doc.text('Le Commercial', marge + largeur / 2 + 6, hauteur + 6);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text(sur(societe.directeurPublication || 'Représentant de l\'équipe Kaislo'), marge + 3, hauteur + 12);
  doc.text(sur(commercial.nom), marge + largeur / 2 + 6, hauteur + 12);
  doc.setTextColor(...GRIS);
  if (contrat.accepteLe) {
    doc.setTextColor(...VERT);
    doc.setFont('helvetica', 'bold');
    doc.text(sur('Lu et approuvé'), marge + largeur / 2 + 6, hauteur + 20);
    doc.setFont('helvetica', 'normal');
    doc.text(sur('Accepté électroniquement le ' + formatDate(contrat.accepteLe)), marge + largeur / 2 + 6, hauteur + 26);
  } else {
    doc.text(sur('Mention « Lu et approuvé » et signature'), marge + largeur / 2 + 6, hauteur + 20);
  }
  y = hauteur + 42;

  // Pied de page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...GRIS);
    doc.text(sur(`Contrat ${contrat.numero} - ${commercial.nom}`), marge, H - 9);
    doc.text(`${i} / ${pages}`, L - marge, H - 9, { align: 'right' });
  }
  return doc;
}

export const nomFichierContrat = (contrat) => `Contrat-Kaislo-${contrat.numero}.pdf`;
