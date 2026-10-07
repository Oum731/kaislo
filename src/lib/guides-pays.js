// ------------------------------------------------------------
// GUIDES PAR PAYS : « Gérer son commerce en Côte d'Ivoire : paiements, devise et suivi des ventes ».
// Composés à partir des vraies données de chaque pays (devise, moyens de paiement, ville, commerces courants, prix) :
// modeles.js, pays-seo.js, tarifs.js. Pas d'information juridique ou fiscale : chaque pays a ses règles, on renvoie vers les autorités locales.
// Même forme que les guides de guides.js : { fr: {...}, en: {...} }.
// ------------------------------------------------------------
import { PAYS } from './donnees/modeles.js';
import { PAYS_SEO } from './pays-seo.js';
import { FORMULES } from './donnees/tarifs.js';
import { symbole } from './utils/format.js';

// Nom anglais, adresse anglaise et formulation « in … » de chaque pays
export const EN = {
  MA: { nom: 'Morocco', slug: 'morocco' }, CI: { nom: 'Côte d’Ivoire', slug: 'cote-d-ivoire' }, SN: { nom: 'Senegal', slug: 'senegal' },
  ML: { nom: 'Mali', slug: 'mali' }, BF: { nom: 'Burkina Faso', slug: 'burkina-faso' }, BJ: { nom: 'Benin', slug: 'benin' },
  TG: { nom: 'Togo', slug: 'togo' }, NE: { nom: 'Niger', slug: 'niger' }, GN: { nom: 'Guinea', slug: 'guinea' },
  CM: { nom: 'Cameroon', slug: 'cameroon' }, GA: { nom: 'Gabon', slug: 'gabon' }, CG: { nom: 'Congo', slug: 'congo' },
  FR: { nom: 'France', slug: 'france' }, BE: { nom: 'Belgium', slug: 'belgium' }, CA: { nom: 'Canada', slug: 'canada' },
};
// Commerces courants, en anglais (même ordre que pays-seo.js)
export const COMMERCES_EN = {
  'maquis et restaurants': 'maquis and restaurants', 'alimentations et boutiques': 'grocery shops and boutiques',   'quincailleries et dépôts': 'hardware stores and depots', 'boutiques et alimentations': 'shops and grocery stores', 'restaurants et gargotes': 'restaurants and street kitchens',
  boulangeries: 'bakeries', quincailleries: 'hardware stores', restaurants: 'restaurants', 'dépôts et grossistes': 'depots and wholesalers',
  'restaurants et maquis': 'restaurants and maquis', 'restaurants et bars': 'restaurants and bars', 'bars et restaurants': 'bars and restaurants',
  'épiceries et supérettes': 'grocery stores and convenience stores', 'restaurants et cafés': 'restaurants and cafes', boutiques: 'boutiques',
  'cosmétiques et beauté': 'cosmetics and beauty shops', 'téléphonie et électronique': 'phone and electronics shops', 'commerces de proximité': 'neighbourhood shops', épiceries: 'grocery stores',
};
export const ET_FR = (liste) => liste.join(', ').replace(/, ([^,]*)$/, ' et $1');
export const ET_EN = (liste) => liste.join(', ').replace(/, ([^,]*)$/, ' and $1');

// Conseil de prix selon la devise
export const CONSEIL_DEVISE = {
  FCFA: { fr: 'Le franc CFA n’a pas de centimes : pensez vos prix en montants ronds (par exemple au multiple de 25 ou de 50 FCFA) pour rendre la monnaie facilement.', en: 'The CFA franc has no cents: set prices in round amounts (for example multiples of 25 or 50 FCFA) so giving change is easy.' },
  GNF: { fr: 'Le franc guinéen se compte en grosses sommes, sans centimes : arrondissez vos prix à des montants faciles à rendre et notez-les toujours en entier.', en: 'The Guinean franc is counted in large sums, without cents: round your prices to amounts that are easy to give change for, and always write them in full.' },
  MAD: { fr: 'Le dirham se divise en centimes : gardez les prix au dirham ou au demi-dirham près et vérifiez que vos étiquettes et votre caisse affichent le même montant.', en: 'The dirham is divided into centimes: keep prices to the nearest dirham or half-dirham and check that your labels and your till show the same amount.' },
  EUR: { fr: 'L’euro se divise en centimes : attention aux arrondis sur les petites quantités et sur les remises, qui peuvent fausser votre marge.', en: 'The euro is divided into cents: watch rounding on small quantities and on discounts, which can distort your margin.' },
  CAD: { fr: 'Le dollar canadien se divise en cents : vérifiez si vos prix affichés incluent ou non les taxes de votre province, et soyez cohérent partout.', en: 'The Canadian dollar is divided into cents: check whether your displayed prices include your province’s taxes or not, and be consistent everywhere.' },
};

function guide(seo) {
  const p = PAYS.find((x) => x.id === seo.id);
  const en = EN[seo.id];
  const lieuFr = `${seo.prep} ${p.nom}`;
  const lieuEn = `in ${en.nom}`;
  const mobile = p.paiements.filter((m) => !['Espèces', 'Carte'].includes(m));
  const modesFr = ET_FR(p.paiements.map((m) => ({ Espèces: 'espèces', Carte: 'carte', 'Ticket resto': 'ticket resto' }[m] || m)));
  const modesEn = ET_EN(p.paiements.map((m) => ({ Espèces: 'cash', Carte: 'card', 'Ticket resto': 'meal vouchers' }[m] || m)));
  const prix = Math.min(...FORMULES.map((f) => f.prix[p.devise]));
  const prixFr = `${prix.toLocaleString('fr-FR')} ${symbole(p.devise)}`;
  const prixEn = `${prix.toLocaleString('en-GB')} ${symbole(p.devise)}`;
  const conseil = CONSEIL_DEVISE[p.devise] || CONSEIL_DEVISE.EUR;
  const ville = p.ville;
  const comFr = seo.commerces;
  const comEn = seo.commerces.map((c) => COMMERCES_EN[c] || c);
  return {
    cle: 'pays-' + seo.id.toLowerCase(),
    groupe: 'pays',
    modele: 'ventes',
    metier: `/pays/${seo.slug}/`,
    fr: {
      slug: `gerer-son-commerce-${seo.slug}`,
      seo: `Commerce ${lieuFr} : paiements, devise et ventes`,
      titre: `Gérer son commerce ${lieuFr} : paiements, devise et suivi des ventes`,
      court: `Gérer son commerce ${lieuFr}`,
      description: `Guide pratique pour les commerçants ${lieuFr} : ${p.devise}, moyens de paiement (${modesFr}), comptes du soir et suivi des ventes et du stock.`,
      chapo: `Quel que soit votre commerce (${ET_FR(comFr)}), ${ville ? 'à ' + ville + ' ou ailleurs ' : ''}${lieuFr}, les mêmes questions reviennent : comment fixer ses prix en ${p.devise}, comment suivre les paiements ${mobile.length ? 'par mobile money et en espèces' : 'par carte et en espèces'}, et comment savoir chaque soir ce que le commerce a vraiment gagné.`,
      sections: [
        { h: `La devise et les prix ${lieuFr}`, p: [`${lieuFr[0].toUpperCase() + lieuFr.slice(1)}, vous vendez en ${p.devise}. ${conseil.fr}`, 'Mettez à jour vos prix de vente à chaque changement de prix chez votre fournisseur : une hausse non répercutée mange directement votre marge.'] },
        { h: `Les moyens de paiement courants ${lieuFr}`, p: [`Vos clients peuvent vous payer en ${modesFr}. Vous n’avez pas besoin de tous les proposer : gardez ceux que vos clients utilisent vraiment et que vous savez vérifier.`, mobile.length ? `Pour ${ET_FR(mobile)}, l’argent arrive directement sur votre téléphone ou votre compte, pas dans la caisse : c’est pourquoi il faut noter le mode de paiement à chaque vente.` : 'Pour les paiements par carte, l’argent arrive sur votre compte avec un délai : notez-les à part de la caisse en espèces.'] },
        { h: 'Noter chaque mode et rapprocher chaque soir', l: ['Enregistrez chaque vente avec son mode de paiement.', 'Le soir, relevez le total de chaque mode dans vos comptes.', mobile.length ? 'Comparez le total de chaque mobile money avec les entrées de votre application.' : 'Comparez le total des cartes avec les relevés de votre terminal ou de votre banque.', 'Comptez les espèces et comparez-les à l’espèce attendue : la différence est l’écart de caisse.', 'Notez les frais (retrait, transfert, commission) comme une dépense.'] },
        { h: `Les commerces les plus courants ${lieuFr}`, p: [`${lieuFr[0].toUpperCase() + lieuFr.slice(1)}, on trouve surtout ${ET_FR(comFr)}. Dans tous ces métiers, trois habitudes font la différence : suivre le stock, connaître sa marge et ne jamais mélanger l’argent du commerce et l’argent personnel.`, 'Les règles légales, fiscales et d’autorisation varient selon le pays et l’activité : renseignez-vous auprès des autorités ou d’un comptable local avant de vous lancer.'] },
        { h: `Gérer son commerce ${lieuFr} avec Kaislo`, p: [`Kaislo fonctionne en ${p.devise}, propose ${modesFr} et marche même sans internet. Vous enregistrez vos ventes, suivez votre stock et le crédit de vos clients, et retrouvez vos comptes du soir sur votre téléphone, votre tablette ou votre ordinateur. Essai gratuit de 30 jours, puis à partir de ${prixFr} par mois selon votre métier.`] },
      ],
      faq: [
        [`Quelle devise utiliser ${lieuFr} dans Kaislo ?`, `${p.devise}, choisie automatiquement avec le pays à la création du commerce.`],
        [`Quels moyens de paiement puis-je noter ${lieuFr} ?`, `${modesFr} : le client vous paie comme d’habitude, Kaislo note seulement le mode pour vos comptes.`],
        ['Kaislo marche-t-il sans internet ?', 'Oui : les ventes sont gardées dans l’appareil et envoyées dès que le réseau revient.'],
      ],
    },
    en: {
      slug: `running-a-business-in-${en.slug}`,
      seo: `Run a shop ${lieuEn}: payments and currency`,
      titre: `Running a business ${lieuEn}: payments, currency and sales tracking`,
      court: `Running a business ${lieuEn}`,
      description: `A practical guide for shopkeepers ${lieuEn}: ${p.devise}, payment methods (${modesEn}), evening accounts and tracking sales and stock.`,
      chapo: `Whatever your business (${ET_EN(comEn)}), ${ville ? 'in ' + ville + ' or elsewhere ' : ''}${lieuEn}, the same questions come up: how to set prices in ${p.devise}, how to track payments ${mobile.length ? 'by mobile money and in cash' : 'by card and in cash'}, and how to know every evening what the business really earned.`,
      sections: [
        { h: `Currency and prices ${lieuEn}`, p: [`${lieuEn[0].toUpperCase() + lieuEn.slice(1)}, you sell in ${p.devise}. ${conseil.en}`, 'Update your selling prices every time your supplier’s price changes: an increase you do not pass on eats directly into your margin.'] },
        { h: `Common payment methods ${lieuEn}`, p: [`Your customers can pay you by ${modesEn}. You do not have to offer all of them: keep the ones your customers really use and that you know how to check.`, mobile.length ? `With ${ET_EN(mobile)}, the money lands on your phone or account, not in the till: that is why you must record the payment method on every sale.` : 'With card payments, the money reaches your account after a delay: record them separately from the cash drawer.'] },
        { h: 'Record each method and reconcile every evening', l: ['Record every sale with its payment method.', 'In the evening, take each method’s total from your accounts.', mobile.length ? 'Compare each mobile money total with the credits in your app.' : 'Compare the card total with your terminal or bank statements.', 'Count the cash and compare it with expected cash: the difference is the cash gap.', 'Record fees (withdrawal, transfer, commission) as an expense.'] },
        { h: `The most common businesses ${lieuEn}`, p: [`${lieuEn[0].toUpperCase() + lieuEn.slice(1)}, you mostly find ${ET_EN(comEn)}. In all of them, three habits make the difference: track stock, know your margin and never mix business money with personal money.`, 'Legal, tax and licensing rules vary by country and activity: check with the authorities or a local accountant before you start.'] },
        { h: `Run your business ${lieuEn} with Kaislo`, p: [`Kaislo works in ${p.devise}, offers ${modesEn} and works even without internet. You record sales, track stock and customer credit, and get your evening accounts on your phone, tablet or computer. 30-day free trial, then from ${prixEn} per month depending on your business.`] },
      ],
      faq: [
        [`Which currency should I use ${lieuEn} in Kaislo?`, `${p.devise}, chosen automatically with the country when you create the business.`],
        [`Which payment methods can I record ${lieuEn}?`, `${modesEn}: the customer pays you as usual, Kaislo only records the method for your accounts.`],
        ['Does Kaislo work without internet?', 'Yes: sales are kept on the device and sent as soon as the network returns.'],
      ],
    },
  };
}

export const GUIDES_PAYS = PAYS_SEO.map(guide);
