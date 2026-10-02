// ------------------------------------------------------------
// CARNET DE CRÉDIT (le « karné ») : ventes à crédit et remboursements.
//
// Solde d'un client = total de ses achats à crédit − ses remboursements.
// ------------------------------------------------------------
import { CREDIT, numeroWhatsApp } from './modeles.js';

export const venteACredit = (v) => !v.annulee && v.paiement === CREDIT;

// Achats à crédit et remboursements d'un client, du plus récent au plus ancien
export function historiqueClient(d, clientId) {
  const achats = d.ventes
    .filter((v) => venteACredit(v) && v.clientId === clientId)
    .map((v) => ({ type: 'achat', date: v.date, montant: v.total, vente: v }));
  const remboursements = (d.remboursements || [])
    .filter((r) => r.clientId === clientId)
    .map((r) => ({ type: 'remboursement', date: r.date, montant: r.montant, remboursement: r }));
  return [...achats, ...remboursements].sort((a, b) => b.date.localeCompare(a.date));
}

export function soldeClient(d, clientId) {
  let solde = 0;
  for (const v of d.ventes) if (venteACredit(v) && v.clientId === clientId) solde += v.total;
  for (const r of d.remboursements || []) if (r.clientId === clientId) solde -= r.montant;
  return Math.max(0, Math.round(solde * 100) / 100);
}

// Date du plus ancien achat pas encore remboursé (approximation : dernier remboursement)
export function dernierMouvement(d, clientId) {
  return historiqueClient(d, clientId)[0]?.date || null;
}

// Liste des clients avec leur solde, ceux qui doivent le plus en premier
export function clientsAvecSolde(d) {
  return (d.clients || [])
    .map((c) => ({ ...c, solde: soldeClient(d, c.id), dernier: dernierMouvement(d, c.id) }))
    .sort((a, b) => b.solde - a.solde || a.nom.localeCompare(b.nom));
}

export function totalCreditEnCours(d) {
  return (d.clients || []).reduce((s, c) => s + soldeClient(d, c.id), 0);
}

// Lien WhatsApp avec un message de rappel tout prêt
export function lienRappelWhatsApp(client, solde, commerce, montantFormate) {
  const tel = numeroWhatsApp(client.telephone, commerce.pays); // format international
  const texte =
    `Bonjour ${client.nom}, ici ${commerce.nom}. ` +
    `Petit rappel : votre crédit chez nous est de ${montantFormate}. Merci et bonne journée !`;
  return 'https://wa.me/' + tel + '?text=' + encodeURIComponent(texte);
}
