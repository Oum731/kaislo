// ------------------------------------------------------------
// RELANCES de l'équipe Amorac : à quel moment de l'essai écrire à un commerçant, et quel message envoyer sur WhatsApp.
// Les messages sont proposés dans l'espace Amorac (tableau de bord et fiche d'un commerce) : l'équipe les relit, les adapte si besoin,
// et WhatsApp s'ouvre avec le texte déjà écrit. Rien n'est envoyé automatiquement.
// Texte en français (espace réservé à l'équipe). Fonctions pures, testées dans tests/relances.test.mjs.
// ------------------------------------------------------------

const JOUR = 86400000;

// Étapes de la relance, dans l'ordre de la vie d'un commerce
export const ETAPES = {
  bienvenue: { titre: 'Bienvenue (jour 0-1)', quand: 'Le commerce vient de s’inscrire' },
  'pas-demarre': { titre: 'Pas encore démarré', quand: 'Moins de 3 articles ajoutés après 2 jours' },
  inactif: { titre: 'Plus d’activité', quand: 'Pas utilisé depuis 4 jours ou plus' },
  conseil: { titre: 'Conseil d’usage', quand: 'Premiers jours, le commerce utilise Kaislo' },
  'mi-parcours': { titre: 'Point à mi-parcours', quand: 'Entre le jour 13 et le jour 20 de l’essai' },
  'fin-proche': { titre: 'Fin d’essai proche', quand: 'L’essai se termine dans 5 jours ou moins' },
  expire: { titre: 'Essai terminé', quand: 'Abonnement ou essai expiré' },
  'merci-avis': { titre: 'Merci, avis et parrainage', quand: 'Abonné satisfait (à envoyer à la main)' },
};

// Étape à proposer maintenant pour ce commerce (ligne de l'espace Amorac), ou null s'il n'y a rien à faire
export function etapeRelance(c, maintenant = Date.now()) {
  const statut = c.etat?.statut;
  if (!statut || statut === 'suspendu' || statut === 'actif') return null;
  const jours = Math.floor((maintenant - new Date(c.commerce.creeLe).getTime()) / JOUR);
  if (statut === 'expire') return (c.etat.joursRestants ?? 0) > -45 ? 'expire' : null; // pas de relance au-delà d'un mois et demi
  // statut « essai »
  if (c.etat.joursRestants <= 5) return 'fin-proche';
  if (jours <= 1) return 'bienvenue';
  if (jours >= 2 && (c.nbProduits || 0) < 3) return 'pas-demarre';
  const derniere = c.derniereActivite ? new Date(c.derniereActivite).getTime() : 0;
  if (jours >= 4 && maintenant - derniere > 4 * JOUR) return 'inactif';
  if (jours >= 13 && jours <= 20) return 'mi-parcours';
  if (jours >= 3 && jours <= 10) return 'conseil';
  return null;
}

export const prenomDe = (nom) => String(nom || '').trim().split(/\s+/)[0] || '';

/**
 * Texte WhatsApp d'une étape. v : { prenom, commerce, equipe, joursRestants, prix (déjà mis en forme, ex « 10 000 FCFA ») }
 */
export function texteRelance(code, v) {
  const salut = v.prenom ? `Bonjour ${v.prenom},` : 'Bonjour,';
  const signe = `${v.equipe || 'L’équipe'} de Kaislo`;
  switch (code) {
    case 'bienvenue':
      return `${salut} ici ${signe} 👋 Bienvenue ! L’essai gratuit de 30 jours de « ${v.commerce} » est lancé. Pour démarrer en 5 minutes : 1) ajoutez vos premiers articles, 2) faites une première vente. Besoin d’un coup de main ? Répondez à ce message, je vous guide.`;
    case 'pas-demarre':
      return `${salut} c’est ${signe}. Je vois que « ${v.commerce} » n’a pas encore ses articles dans Kaislo. Voulez-vous que je vous aide ? Envoyez-moi la liste (nom + prix) et je vous explique comment les ajouter, ou dites-moi à quelle heure vous appeler.`;
    case 'inactif':
      return `${salut} ici ${signe}. Cela fait quelques jours que « ${v.commerce} » n’a pas utilisé Kaislo. Y a-t-il quelque chose qui vous bloque ? Dites-moi ce qui ne va pas : Kaislo doit vous faire gagner du temps chaque jour.`;
    case 'conseil':
      return `${salut} ${signe}. Un conseil pour « ${v.commerce} » : après chaque vente, envoyez le reçu par WhatsApp à vos clients, et le soir fermez la journée pour vérifier la caisse et recevoir votre résumé sur WhatsApp. Une question ? Je suis là.`;
    case 'mi-parcours':
      return `${salut} ici ${signe}. Vous utilisez Kaislo depuis quelques semaines. Qu’est-ce qui vous plaît, et qu’est-ce qui manque pour « ${v.commerce} » ? Votre avis nous aide à améliorer l’application pour les commerçants comme vous.`;
    case 'fin-proche': {
      const j = Number(v.joursRestants) || 0;
      const quand = j <= 0 ? 'se termine aujourd’hui' : j === 1 ? 'se termine demain' : `se termine dans ${j} jours`;
      return `${salut} ici ${signe}. L’essai gratuit de « ${v.commerce} » ${quand}. Pour continuer sans interruption, l’abonnement est de ${v.prix} par mois (ou 2 mois offerts si vous payez l’année). Paiement par mobile money, virement ou espèces. Voulez-vous que je vous envoie les détails ?`;
    }
    case 'expire':
      return `${salut} ici ${signe}. L’essai de « ${v.commerce} » est terminé, mais vos données sont conservées : vous pouvez reprendre quand vous voulez (${v.prix} par mois). Si le prix ou une fonction vous a freiné, dites-le-moi, on peut trouver une solution.`;
    case 'merci-avis':
      return `${salut} merci d’utiliser Kaislo pour « ${v.commerce} » 🙏 Si vous êtes satisfait, deux petits services : 1) laissez votre avis dans l’application (menu Compte → Donner mon avis), 2) parlez de Kaislo à un autre commerçant : avec votre code de parrainage, il a des jours d’essai en plus et vous gagnez des jours offerts à son premier paiement (menu Compte → Parrainer un commerçant).`;
    default:
      return '';
  }
}
