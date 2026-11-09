// ------------------------------------------------------------
// RÉSUMÉ DU JOUR (accueil du gérant) : l'essentiel de la journée en quelques lignes, en mots simples.
//  - chiffre, tickets, panier moyen, comparaison avec hier et avec le même jour la semaine dernière (au même moment de la journée) ;
//  - article le plus vendu, heure de pointe, dépenses, marge (si les prix d'achat sont connus), ventes annulées ;
//  - ce qu'il faut racheter (stock bas).
// Tant qu'aucune vente n'est enregistrée aujourd'hui, le résumé porte sur hier.
// ------------------------------------------------------------
import { calculerStats } from './statistiques.js';
import { stockDe } from './stock.js';
import { signatureKaislo } from './whatsapp.js';
import { tr } from '../i18n/index.js';

const debutDuJour = (date) => { const d = new Date(date); d.setHours(0, 0, 0, 0); return d; };
const pourcent = (actuel, avant) => (avant > 0 ? Math.round(((actuel - avant) / avant) * 100) : null);

// Total des ventes non annulées entre deux instants
const totalEntre = (ventes, debut, fin) => ventes.reduce((n, v) => {
  if (v.annulee) return n;
  const t = new Date(v.date);
  return t >= debut && t <= fin ? n + (Number(v.total) || 0) : n;
}, 0);

/**
 * Résumé de la journée. `maintenant` sert aux tests. Renvoie null si le commerce n'a encore aucune vente.
 */
export function resumeDuJour(d, maintenant = new Date()) {
  const ventes = d.ventes || [];
  const depenses = d.depenses || [];
  if (!ventes.some((v) => !v.annulee)) return null;

  const debutAujourdhui = debutDuJour(maintenant);
  const ventesAujourdhui = ventes.some((v) => !v.annulee && new Date(v.date) >= debutAujourdhui);
  // Aujourd'hui sans vente (tôt le matin, jour fermé) : on résume hier, sur toute la journée
  const estHier = !ventesAujourdhui;
  const jour = new Date(debutAujourdhui);
  let reference = maintenant;
  if (estHier) { jour.setDate(jour.getDate() - 1); reference = new Date(debutAujourdhui.getTime() - 1); }

  const st = calculerStats(ventes, 'jour', reference, depenses);
  const moment = reference.getTime() - jour.getTime();
  const semaineDerniere = new Date(jour); semaineDerniere.setDate(semaineDerniere.getDate() - 7);
  const vsSemaine = pourcent(st.total, totalEntre(ventes, semaineDerniere, new Date(semaineDerniere.getTime() + moment)));

  // Heure de pointe : l'heure qui a eu le plus de tickets (si assez de ventes pour que ce soit parlant)
  const parHeure = new Map();
  for (const v of ventes) {
    if (v.annulee || v.retourDe) continue; // heure de pointe : les tickets, pas les retours d'article
    const t = new Date(v.date);
    if (t < jour || t > reference) continue;
    parHeure.set(t.getHours(), (parHeure.get(t.getHours()) || 0) + 1);
  }
  const [heure, nbHeure] = [...parHeure].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0] || [null, 0];
  const heurePointe = st.nb >= 5 && nbHeure >= 2 ? { heure, nb: nbHeure } : null;

  const annulees = ventes.filter((v) => v.annulee && new Date(v.date) >= jour && new Date(v.date) <= reference);
  const meilleur = [...st.produits].sort((a, b) => b.quantite - a.quantite || b.total - a.total)[0] || null;
  const aRacheter = (d.produits || [])
    .filter((p) => p.actif && p.suiviStock && stockDe(p) <= (p.seuilAlerte ?? 5))
    .sort((a, b) => stockDe(a) - stockDe(b))
    .map((p) => ({ nom: p.nom, reste: stockDe(p) }));

  return {
    jour, estHier,
    total: st.total, nb: st.nb, panierMoyen: st.panierMoyen,
    vsHier: st.variation, vsSemaine,
    meilleurArticle: meilleur ? { nom: meilleur.nom, quantite: meilleur.quantite, total: meilleur.total } : null,
    heurePointe,
    depenses: st.totalDepenses, marge: st.marge, tauxMarge: st.tauxMarge, aCredit: st.aCredit,
    annulees: { nb: annulees.length, total: annulees.reduce((n, v) => n + (Number(v.total) || 0), 0) },
    aRacheter: aRacheter.slice(0, 3), nbARacheter: aRacheter.length,
  };
}

const signe = (n) => (n >= 0 ? '+' : '') + n + ' %';

/** Le résumé en texte pour WhatsApp (le gérant se l'envoie, ou l'envoie à son associé). `prix` formate un montant, `dateLongue` est le jour déjà écrit. */
export function resumeTexteWhatsApp(r, { commerce, prix, dateLongue }) {
  const l = [];
  l.push(r.estHier ? tr('*Résumé d’hier · {0}*', [commerce.nom]) : tr('*Résumé du jour · {0}*', [commerce.nom]));
  l.push(dateLongue);
  l.push('');
  l.push(tr('Ventes : *{0}* ({1} tickets, panier moyen {2})', [prix(r.total), r.nb, prix(r.panierMoyen)]));
  if (r.vsHier !== null) l.push(tr('Par rapport à hier : {0}', [signe(r.vsHier)]));
  if (r.vsSemaine !== null) l.push(tr('Par rapport au même jour la semaine dernière : {0}', [signe(r.vsSemaine)]));
  if (r.meilleurArticle) l.push(tr('Le plus vendu : {0} ({1})', [r.meilleurArticle.nom, r.meilleurArticle.quantite]));
  if (r.heurePointe) l.push(tr('Heure de pointe : {0} h ({1} tickets)', [r.heurePointe.heure, r.heurePointe.nb]));
  if (r.depenses > 0) l.push(tr('Dépenses : {0}', [prix(r.depenses)]));
  if (r.marge !== null) l.push(tr('Marge : {0} ({1} % des ventes)', [prix(r.marge), r.tauxMarge]));
  if (r.annulees.nb > 0) l.push(tr('Ventes annulées : {0}', [r.annulees.nb]));
  if (r.nbARacheter > 0) l.push(tr('À racheter : {0}', [r.aRacheter.map((p) => `${p.nom} (${p.reste})`).join(', ') + (r.nbARacheter > r.aRacheter.length ? '…' : '')]));
  l.push('');
  l.push(signatureKaislo());
  return l.join('\n');
}
