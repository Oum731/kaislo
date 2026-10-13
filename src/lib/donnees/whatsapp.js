// ------------------------------------------------------------
// TEXTES WHATSAPP de Kaislo (prêts à envoyer : WhatsApp s'ouvre avec le message déjà écrit, il reste à appuyer sur Envoyer)
//  - résumé de la journée, que le gérant s'envoie à lui-même après la fermeture de la caisse ;
//  - signature « Fait avec Kaislo » ajoutée à la fin des reçus et des rappels de crédit envoyés aux clients (facultatif).
// Fonctions pures : pas d'accès au store, le formatage des montants est passé en paramètre.
// ------------------------------------------------------------
import { numeroWhatsApp } from './modeles.js';
import { tr } from '../i18n/index.js';

export const ADRESSE_SITE = 'kaislo.com';

/** Dernière ligne des messages envoyés aux clients : fait connaître Kaislo sans gêner (le gérant peut la retirer). */
export const signatureKaislo = () => tr('Fait avec Kaislo · {0}', [ADRESSE_SITE]);

/** Lien WhatsApp vers un numéro, avec le texte déjà écrit. */
export function lienWhatsApp(telephone, paysId, texte) {
  return 'https://wa.me/' + numeroWhatsApp(telephone, paysId) + '?text=' + encodeURIComponent(texte);
}

/**
 * Résumé du soir, envoyé au gérant sur son propre WhatsApp.
 * cloture : résumé de fermeture (calculerCloture + compte, ecart) · creditTotal : crédits clients en cours (ou null)
 * prix : fonction qui met un montant en forme dans la devise du commerce · date : jour à afficher
 */
export function resumeJourneeTexte({ cloture: c, commerce, creditTotal = null, prix, date }) {
  const lignes = [];
  lignes.push(tr('*Résumé de la journée · {0}*', [commerce.nom]));
  lignes.push(date);
  lignes.push('');
  lignes.push(tr('💰 Ventes : *{0}* ({1} tickets)', [prix(c.totalVentes), c.nbVentes]));
  if (c.nbVentes > 0) lignes.push(tr('🧾 Panier moyen : {0}', [prix(c.totalVentes / c.nbVentes)]));
  for (const p of (c.parPaiement || []).filter((x) => x.nb > 0)) lignes.push(`   • ${p.mode} : ${prix(p.total)} (${p.nb})`);
  const top = (c.parArticle || []).slice(0, 3);
  if (top.length) lignes.push(tr('🏆 Les plus vendus : {0}', [top.map((a) => `${a.nom} (${a.quantite})`).join(', ')]));
  if (c.depensesCaisse > 0) lignes.push(tr('📤 Dépenses payées en caisse : {0}', [prix(c.depensesCaisse)]));
  lignes.push('');
  lignes.push(tr('💵 Espèces attendues : {0} · comptées : {1}', [prix(c.attendu), prix(c.compte)]));
  lignes.push(c.ecart === 0 ? tr('✅ Caisse juste') : tr('⚠️ Écart de caisse : {0}', [(c.ecart > 0 ? '+' : '') + prix(c.ecart)]));
  if (creditTotal > 0) lignes.push(tr('📒 Crédits à récupérer : {0}', [prix(creditTotal)]));
  if (c.nbAnnulees > 0) lignes.push(tr('↩️ Ventes annulées : {0}', [c.nbAnnulees]));
  lignes.push('');
  lignes.push(tr('Bonne soirée !'));
  return lignes.join('\n');
}
