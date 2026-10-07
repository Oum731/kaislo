// ------------------------------------------------------------
// GUIDES « LOGICIEL DE CAISSE » PAR PAYS : « Logiciel de caisse au Maroc : comment choisir et bien l'utiliser ».
// Composés à partir des vraies données de chaque pays (devise, moyens de paiement, ville, commerces courants, prix),
// comme les guides de guides-pays.js, mais centrés sur l'encaissement : paiements à prendre en charge, hors ligne,
// vérifications avant de choisir. Pas d'information juridique ou fiscale : on renvoie vers les autorités locales.
// ------------------------------------------------------------
import { PAYS } from './donnees/modeles.js';
import { PAYS_SEO } from './pays-seo.js';
import { FORMULES } from './donnees/tarifs.js';
import { symbole } from './utils/format.js';
import { EN, COMMERCES_EN, ET_FR, ET_EN, CONSEIL_DEVISE } from './guides-pays.js';

// Ce qu'il faut savoir de chaque moyen de paiement au moment d'encaisser
const MODE_FR = (m) => {
  if (m === 'Espèces') return 'Espèces : la monnaie à rendre se calcule seule ; comptez le fond de caisse le matin et vérifiez l’écart le soir.';
  if (m === 'Carte') return 'Carte : notez-la comme mode de paiement pour la retrouver dans vos totaux ; le terminal de paiement reste celui de votre banque.';
  if (m === 'Ticket resto') return 'Ticket resto : notez-le comme mode de paiement ; le remboursement se fait ensuite auprès de l’émetteur des titres.';
  if (m === 'Payconiq' || m === 'Interac') return `${m} : paiement électronique depuis le téléphone du client ; notez-le comme mode de paiement et rapprochez le total chaque soir.`;
  return `${m} : le client paie depuis son téléphone ; attendez la confirmation avant de valider la vente, puis rapprochez le total chaque soir.`;
};
const MODE_EN = (m) => {
  if (m === 'Espèces') return 'Cash: the change due calculates itself; count the float in the morning and check the discrepancy in the evening.';
  if (m === 'Carte') return 'Card: record it as a payment method so you find it in your totals; the payment terminal stays your bank’s.';
  if (m === 'Ticket resto') return 'Meal vouchers: record them as a payment method; reimbursement then comes from the voucher issuer.';
  if (m === 'Payconiq' || m === 'Interac') return `${m}: electronic payment from the customer’s phone; record it as a payment method and reconcile the total every evening.`;
  return `${m}: the customer pays from their phone; wait for the confirmation before confirming the sale, then reconcile the total every evening.`;
};
const MODE_COURT_FR = { Espèces: 'espèces', Carte: 'carte', 'Ticket resto': 'ticket resto' };
const MODE_COURT_EN = { Espèces: 'cash', Carte: 'card', 'Ticket resto': 'meal vouchers' };

function guide(seo) {
  const p = PAYS.find((x) => x.id === seo.id);
  const en = EN[seo.id];
  const lieuFr = `${seo.prep} ${p.nom}`;
  const lieuEn = `in ${en.nom}`;
  const modesFr = ET_FR(p.paiements.map((m) => MODE_COURT_FR[m] || m));
  const modesEn = ET_EN(p.paiements.map((m) => MODE_COURT_EN[m] || m));
  const mobile = p.paiements.filter((m) => !['Espèces', 'Carte'].includes(m));
  const prix = Math.min(...FORMULES.map((f) => f.prix[p.devise]));
  const prixFr = `${prix.toLocaleString('fr-FR')} ${symbole(p.devise)}`;
  const prixEn = `${prix.toLocaleString('en-GB')} ${symbole(p.devise)}`;
  const conseil = CONSEIL_DEVISE[p.devise] || CONSEIL_DEVISE.EUR;
  const ville = p.ville;
  const comFr = seo.commerces;
  const comEn = seo.commerces.map((c) => COMMERCES_EN[c] || c);
  const detailFr = mobile.length ? `mobile money (${ET_FR(mobile)})` : modesFr;
  const detailEn = mobile.length ? `mobile money (${ET_EN(mobile)})` : modesEn;
  return {
    cle: 'caisse-' + seo.id.toLowerCase(),
    groupe: 'caisse-pays',
    modele: 'ventes',
    metier: '/logiciel-de-caisse/',
    fr: {
      slug: `logiciel-de-caisse-${seo.slug}`,
      seo: `Logiciel de caisse ${lieuFr} : le guide`,
      titre: `Logiciel de caisse ${lieuFr} : comment choisir et bien l’utiliser`,
      court: `Logiciel de caisse ${lieuFr}`,
      description: `Logiciel de caisse ${lieuFr} : ${detailFr}, ${p.devise}, hors ligne et prix. Points à vérifier avant de choisir.`,
      chapo: `Choisir un logiciel de caisse ${lieuFr}${ville ? ' (à ' + ville + ' comme ailleurs)' : ''} demande de vérifier quelques points : les moyens de paiement de vos clients, le fonctionnement sans internet, le prix en ${p.devise} et les règles locales. Voici une méthode simple pour comparer.`,
      sections: [
        { h: `Ce qu’une caisse doit faire pour un commerce ${lieuFr}`, p: [`Que vous teniez ${ET_FR(comFr)}, la caisse doit encaisser vite, rendre la monnaie juste, garder la trace de chaque vente avec son moyen de paiement et mettre le stock à jour.`, conseil.fr] },
        { h: `Les paiements à prendre en charge ${lieuFr}`, p: [`Vos clients peuvent payer en ${modesFr}. Un bon logiciel de caisse vous laisse noter le mode de chaque vente et affiche le soir le total de chacun.`], l: p.paiements.map(MODE_FR) },
        { h: 'Travailler sans internet', p: ['Une caisse qui s’arrête quand le réseau coupe fait perdre des ventes. Choisissez un logiciel qui continue d’encaisser hors connexion et qui envoie les ventes dès que le réseau revient : c’est le cas de Kaislo.', 'Gardez le téléphone chargé et, si possible, une batterie externe : la caisse dépend de l’appareil.'] },
        { h: `Cinq vérifications avant de choisir ${lieuFr}`, l: [`Le prix est-il affiché en ${p.devise}, sans mauvaise surprise de change ?`, `Les moyens de paiement de vos clients (${modesFr}) peuvent-ils tous être notés ?`, 'Le logiciel marche-t-il sans internet ?', 'Pouvez-vous exporter vos données (Excel, PDF) et les emporter si vous partez ?', `Quelles obligations existent ${lieuFr} pour un matériel ou un logiciel de caisse ? Renseignez-vous auprès de l’administration fiscale ou d’un comptable local.`] },
        { h: `Kaislo comme logiciel de caisse ${lieuFr}`, p: [`Kaislo fonctionne en ${p.devise}, propose ${modesFr}, marche sans internet et gère le stock et le crédit de vos clients. Essai gratuit de 30 jours, puis à partir de ${prixFr} par mois selon votre métier.`, 'Kaislo est un outil de gestion des ventes et du stock : si votre pays impose un matériel fiscal certifié, vérifiez ce point avant de remplacer votre caisse.'] },
      ],
      faq: [
        [`Quel logiciel de caisse choisir ${ville ? 'à ' + ville : lieuFr} ?`, `Choisissez-en un qui accepte les moyens de paiement de vos clients (${modesFr}), marche sans internet, affiche les prix en ${p.devise} et vous laisse exporter vos données. Testez-le trois jours avant de vous engager.`],
        [`Faut-il une caisse enregistreuse ${lieuFr} ?`, 'Cela dépend de votre activité et des règles locales : renseignez-vous auprès de l’administration fiscale ou d’un comptable. Pour la gestion des ventes et du stock, une application sur téléphone suffit dans la plupart des petits commerces.'],
        ['Peut-on encaisser sans internet ?', 'Oui avec Kaislo : les ventes sont gardées dans l’appareil et envoyées dès que le réseau revient.'],
      ],
    },
    en: {
      slug: `pos-software-in-${en.slug}`,
      seo: `POS software ${lieuEn}: the guide`,
      titre: `POS software ${lieuEn}: how to choose and use it well`,
      court: `POS software ${lieuEn}`,
      description: `POS software ${lieuEn}: ${detailEn}, ${p.devise}, offline and price. Points to check before choosing.`,
      chapo: `Choosing POS software ${lieuEn}${ville ? ' (in ' + ville + ' as elsewhere)' : ''} means checking a few points: your customers’ payment methods, working without internet, the price in ${p.devise} and local rules. Here is a simple method to compare.`,
      sections: [
        { h: `What a till must do for a business ${lieuEn}`, p: [`Whether you run ${ET_EN(comEn)}, the till must check out fast, give the right change, keep a record of every sale with its payment method and update the stock.`, conseil.en] },
        { h: `Payments to support ${lieuEn}`, p: [`Your customers can pay by ${modesEn}. Good POS software lets you record the method of each sale and shows the total of each in the evening.`], l: p.paiements.map(MODE_EN) },
        { h: 'Working without internet', p: ['A till that stops when the network drops loses sales. Choose software that keeps taking payments offline and sends the sales as soon as the network returns: Kaislo does.', 'Keep the phone charged and, if possible, a power bank: the till depends on the device.'] },
        { h: `Five checks before choosing ${lieuEn}`, l: [`Is the price shown in ${p.devise}, with no exchange-rate surprise?`, `Can all your customers’ payment methods (${modesEn}) be recorded?`, 'Does the software work without internet?', 'Can you export your data (Excel, PDF) and take it with you if you leave?', `What requirements exist ${lieuEn} for cash register hardware or software? Ask the tax authority or a local accountant.`] },
        { h: `Kaislo as POS software ${lieuEn}`, p: [`Kaislo works in ${p.devise}, offers ${modesEn}, works without internet and manages stock and customer credit. 30-day free trial, then from ${prixEn} per month depending on your business.`, 'Kaislo is a sales and stock management tool: if your country requires certified fiscal hardware, check that point before replacing your register.'] },
      ],
      faq: [
        [`Which POS software should I choose ${ville ? 'in ' + ville : lieuEn}?`, `Pick one that accepts your customers’ payment methods (${modesEn}), works offline, shows prices in ${p.devise} and lets you export your data. Test it for three days before committing.`],
        [`Do I need a cash register ${lieuEn}?`, 'It depends on your activity and local rules: ask the tax authority or an accountant. For managing sales and stock, a phone app is enough in most small businesses.'],
        ['Can I take payments without internet?', 'Yes with Kaislo: sales are kept on the device and sent as soon as the network returns.'],
      ],
    },
  };
}

export const GUIDES_CAISSE_PAYS = PAYS_SEO.map(guide);
