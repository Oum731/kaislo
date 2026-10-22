// ------------------------------------------------------------
// GUIDES POUR LA BELGIQUE : répondent aux recherches réellement tapées en Belgique (logiciel de caisse gratuit, prix,
// système de gestion de commerce, caisse enregistreuse certifiée de l'Horeca). Même forme que les guides de guides.js : { fr: {...}, en: {...} }.
// Les prix viennent des vraies formules (tarifs.js). Aucune information juridique ou fiscale précise : on décrit la situation
// en termes généraux et on renvoie vers le SPF Finances ou un comptable ; Kaislo n'est pas un système de caisse certifié.
// ------------------------------------------------------------
import { FORMULES } from './donnees/tarifs.js';

const prixEur = (f) => f.prix.EUR;
const MIN = Math.min(...FORMULES.map(prixEur));
const eurFr = (n) => `${n.toLocaleString('fr-FR')} €`;
const eurEn = (n) => `€${n.toLocaleString('en-GB')}`;
const LISTE_FR = FORMULES.map((f) => `${f.nom} : ${eurFr(prixEur(f))} par mois`);
const LISTE_EN = FORMULES.map((f) => `${f.nom}: ${eurEn(prixEur(f))} per month`);

const HORECA_FR = 'En Belgique, les restaurants, cafés et traiteurs (l’Horeca) doivent utiliser un système de caisse enregistreuse certifié, relié à un module de contrôle fiscal (la « boîte noire »). Kaislo est un outil de gestion des ventes, du stock et du crédit clients : ce n’est pas ce système certifié et il ne le remplace pas. Vérifiez vos obligations auprès du SPF Finances ou de votre comptable.';
const HORECA_EN = 'In Belgium, restaurants, cafes and caterers (the Horeca sector) must use a certified cash register system linked to a fiscal control module (the “black box”). Kaislo is a tool for managing sales, stock and customer credit: it is not that certified system and does not replace it. Check your obligations with the FPS Finance or your accountant.';

export const GUIDES_BELGIQUE = [
  {
    cle: 'be-gratuit',
    groupe: 'belgique',
    modele: 'ventes',
    metier: '/pays/belgique/',
    fr: {
      slug: 'logiciel-de-caisse-gratuit-belgique',
      seo: 'Logiciel de caisse gratuit en Belgique : que vérifier',
      titre: 'Logiciel de caisse gratuit en Belgique : ce qu’il faut vérifier avant de choisir',
      court: 'Logiciel de caisse gratuit en Belgique',
      description: 'Logiciel de caisse gratuit en Belgique : limites fréquentes, questions à poser, essai gratuit ou version gratuite. Méthode pour tester en 3 jours.',
      chapo: 'Beaucoup de commerçants belges cherchent un logiciel de caisse gratuit. Gratuit peut vouloir dire essai limité dans le temps, version restreinte ou outil financé par la publicité ou par des commissions. Voici comment faire la différence et comment tester sans risque.',
      sections: [
        { h: 'Gratuit : trois cas très différents', l: ['Essai gratuit : tout est ouvert pendant une période (par exemple 30 jours), puis un abonnement démarre.', 'Version gratuite limitée : le logiciel reste gratuit mais plafonne le nombre de ventes, d’articles, d’utilisateurs ou d’appareils.', 'Gratuit financé autrement : publicité, ou commission prélevée sur vos paiements par carte ou par application.'] },
        { h: 'Les limites à repérer', l: ['Le stock est-il inclus, ou seulement l’encaissement ?', 'Peut-on exporter ses ventes et son stock (Excel, PDF) pour les donner au comptable ou partir ailleurs ?', 'Le logiciel marche-t-il sans internet quand le réseau coupe en pleine vente ?', 'Y a-t-il une commission sur les paiements, ou du matériel imposé ?', 'Que devient votre historique à la fin de l’essai ou si vous quittez le service ?'] },
        { h: 'Tester en trois jours', p: ['Choisissez trois jours ordinaires, pas une semaine creuse. Entrez vos vingt articles les plus vendus, encaissez vraiment avec le logiciel et comparez chaque soir le total avec votre caisse.', 'Coupez le wifi une fois pour vérifier que les ventes continuent. Exportez un fichier pour voir s’il est exploitable. Si l’un de ces tests échoue, passez au suivant.'] },
        { h: 'Un exemple chiffré : le vrai coût du « gratuit »', p: ['Exemple fictif pour comprendre le calcul. Un logiciel « gratuit » prélève 1,5 % sur les paiements par carte. Si 8 000 € de ventes passent par carte chaque mois, la commission est de 120 € par mois, soit 1 440 € par an. Un abonnement à 18 € par mois coûte 216 € par an : le « gratuit » revient alors plus de six fois plus cher.', 'À l’inverse, si vous encaissez presque tout en espèces et que la version gratuite couvre vos besoins, elle peut être le bon choix. Le calcul se fait toujours sur vos propres chiffres : ventes par carte, nombre d’articles, nombre d’appareils.'] },
        { h: 'Les questions à poser avant d’entrer vos données', l: ['Où sont hébergées vos données, et pouvez-vous les récupérer entièrement ?', 'Le support répond-il en français (ou en néerlandais) et par quel canal ?', 'Que se passe-t-il à la fin de l’essai : blocage immédiat, lecture seule, ou conservation de l’historique ?', 'Le prix est-il fixé par écrit, et peut-il changer en cours d’année ?', 'Peut-on ajouter un vendeur ou un deuxième appareil sans changer d’offre ?'] },
        { h: 'Le cas de Kaislo', p: [`Kaislo est gratuit pendant 30 jours, sans carte bancaire ni engagement, avec toutes les fonctions : ventes, stock, crédit clients, comptes du soir, export Excel, utilisation sans internet. Ensuite, c’est un abonnement à partir de ${eurFr(MIN)} par mois selon le métier, sans commission sur vos ventes : Kaislo n’encaisse jamais l’argent de vos clients.`, 'Kaislo marche sur le téléphone, la tablette ou l’ordinateur que vous avez déjà, sans matériel à acheter.'] },
        { h: 'Restaurants et cafés : un point à vérifier', p: [HORECA_FR] },
      ],
      faq: [
        ['Combien de temps faut-il pour tester un logiciel de caisse ?', 'Trois jours ordinaires suffisent pour juger la rapidité d’encaissement, la fiabilité du stock et la qualité de l’export. Comparez chaque soir le total du logiciel avec celui de votre caisse.'],
        ['Peut-on partir avec ses données si on change de logiciel ?', 'Cela dépend du logiciel : demandez avant de commencer si vous pouvez exporter les ventes, le stock et les clients dans un fichier Excel.'],
        ['Existe-t-il un logiciel de caisse entièrement gratuit en Belgique ?', 'Certains proposent une version gratuite limitée, souvent sans stock complet ou avec des commissions. Testez toujours avec vos vrais articles pendant quelques jours avant de vous engager.'],
        ['Kaislo est-il gratuit ?', 'Gratuit pendant 30 jours, sans carte bancaire, puis payant à partir de ' + eurFr(MIN) + ' par mois selon le métier.'],
        ['Un logiciel gratuit suffit-il pour un petit commerce ?', 'Oui s’il couvre vos besoins réels (encaissement, stock, crédit clients) et si vous pouvez exporter vos données. Sinon, mieux vaut un petit abonnement qu’une version gratuite qui vous bloque.'],
      ],
    },
    en: {
      slug: 'free-pos-software-belgium',
      seo: 'Free POS software in Belgium: what to check',
      titre: 'Free POS software in Belgium: what to check before you choose',
      court: 'Free POS software in Belgium',
      description: 'Free POS software in Belgium: common limits, questions to ask, free trial or free plan. A method to test it in three days.',
      chapo: 'Many Belgian shopkeepers look for free POS software. Free can mean a time-limited trial, a restricted plan, or a tool paid for by ads or by commissions. Here is how to tell the difference and how to test without risk.',
      sections: [
        { h: 'Free: three very different cases', l: ['Free trial: everything is open for a period (for example 30 days), then a subscription starts.', 'Limited free plan: the software stays free but caps the number of sales, items, users or devices.', 'Free but paid another way: advertising, or a commission taken on your card or app payments.'] },
        { h: 'Limits to look for', l: ['Is stock included, or only the till?', 'Can you export sales and stock (Excel, PDF) for your accountant or to leave?', 'Does it keep working without internet when the network drops mid-sale?', 'Is there a commission on payments, or mandatory hardware?', 'What happens to your history when the trial ends or if you leave?'] },
        { h: 'Test it in three days', p: ['Pick three ordinary days, not a slow week. Enter your twenty best sellers, really take payments with the software and compare each evening’s total with your cash drawer.', 'Switch the wifi off once to check that sales continue. Export a file to see if it is usable. If any test fails, move on to the next.'] },
        { h: 'A worked example: the real cost of “free”', p: ['A fictional example to show the calculation. A “free” tool takes 1.5% of card payments. If €8,000 of sales go through card each month, the commission is €120 a month, or €1,440 a year. A €18 monthly subscription costs €216 a year: the “free” option is then more than six times as expensive.', 'On the other hand, if you take almost everything in cash and the free plan covers your needs, it can be the right choice. Always run the numbers on your own figures: card sales, number of items, number of devices.'] },
        { h: 'Questions to ask before you enter your data', l: ['Where is your data hosted, and can you take all of it with you?', 'Does support answer in French (or Dutch) and through which channel?', 'What happens when the trial ends: immediate lock, read-only access, or history kept?', 'Is the price fixed in writing, and can it change during the year?', 'Can you add a seller or a second device without changing plan?'] },
        { h: 'The Kaislo case', p: [`Kaislo is free for 30 days, with no card and no commitment, with every feature: sales, stock, customer credit, evening accounts, Excel export, offline use. Then it is a subscription from ${eurEn(MIN)} per month depending on the business, with no commission on your sales: Kaislo never collects your customers’ money.`, 'Kaislo runs on the phone, tablet or computer you already have, with no hardware to buy.'] },
        { h: 'Restaurants and cafes: one point to check', p: [HORECA_EN] },
      ],
      faq: [
        ['How long should I test POS software?', 'Three ordinary days are enough to judge checkout speed, stock reliability and export quality. Compare the software total with your cash drawer each evening.'],
        ['Can I leave with my data if I change software?', 'It depends on the software: ask before you start whether sales, stock and customers can be exported to an Excel file.'],
        ['Is there fully free POS software in Belgium?', 'Some offer a limited free plan, often without full stock or with commissions. Always test with your real items for a few days before committing.'],
        ['Is Kaislo free?', 'Free for 30 days, with no card, then paid from ' + eurEn(MIN) + ' per month depending on the business.'],
        ['Is free software enough for a small shop?', 'Yes if it covers your real needs (till, stock, customer credit) and you can export your data. Otherwise a small subscription beats a free plan that blocks you.'],
      ],
    },
  },
  {
    cle: 'be-prix',
    groupe: 'belgique',
    modele: 'ventes',
    metier: '/pays/belgique/',
    fr: {
      slug: 'prix-logiciel-de-caisse-belgique',
      seo: 'Prix d’un logiciel de caisse en Belgique : le budget',
      titre: 'Prix d’un logiciel de caisse en Belgique : combien prévoir',
      court: 'Prix d’un logiciel de caisse en Belgique',
      description: 'Combien coûte un logiciel de caisse en Belgique ? Abonnement, matériel, terminal de paiement, commissions : les postes de coût et les tarifs Kaislo en euros.',
      chapo: 'Le prix affiché d’un logiciel de caisse n’est qu’une partie du budget. Entre l’abonnement, le matériel, le terminal de paiement et d’éventuelles commissions, l’écart peut être important. Voici les postes à comparer et les tarifs de Kaislo.',
      sections: [
        { h: 'Les cinq postes de coût', l: ['L’abonnement ou la licence du logiciel (mensuel, annuel ou achat unique).', 'Le matériel : caisse, tablette, tiroir-caisse, imprimante, lecteur de codes-barres.', 'Le terminal de paiement par carte, qui dépend de votre banque et non du logiciel.', 'Les commissions éventuelles sur les paiements ou sur les ventes.', 'L’installation, la formation et le support, parfois facturés à part.'] },
        { h: 'Comparer à périmètre égal', p: ['Un prix bas sans stock ni crédit clients ne remplace pas un prix un peu plus haut qui les inclut. Comparez toujours la même liste : encaissement, stock, crédit clients, export des données, fonctionnement hors ligne, nombre de postes et de vendeurs.', 'Demandez ce qui change si votre commerce grandit : un deuxième poste, un deuxième point de vente, plus de vendeurs.'] },
        { h: 'Les tarifs de Kaislo en euros', l: LISTE_FR, p: ['Chaque abonnement comprend 1 poste et 5 vendeurs. À l’année, 2 mois sont offerts. Essai gratuit de 30 jours, sans carte bancaire ni engagement.'] },
        { h: 'Un exemple chiffré sur douze mois', p: ['Exemple fictif d’une petite boutique. Offre A : 15 € par mois, sans stock, soit 180 € par an. Offre B : 25 € par mois avec stock et crédit clients, soit 300 € par an. Offre C : achat d’une caisse à 600 € puis 10 € par mois, soit 720 € la première année.', 'L’offre la moins chère sur le papier n’est pas la moins chère à l’usage : si l’offre A oblige à tenir le stock sur un cahier, le temps perdu et les erreurs coûtent plus que les 120 € d’écart avec l’offre B.'] },
        { h: 'Les frais cachés à demander par écrit', l: ['Frais d’installation ou de mise en route.', 'Prix du matériel imposé (caisse, tiroir, imprimante) et de son remplacement.', 'Commission sur les paiements par carte ou par application.', 'Coût d’un utilisateur ou d’un appareil supplémentaire.', 'Frais pour récupérer ses données en quittant le service.', 'Conditions de résiliation et durée d’engagement.'] },
        { h: 'Ce que Kaislo ne facture pas', p: ['Pas de matériel obligatoire : Kaislo marche sur le téléphone, la tablette ou l’ordinateur que vous avez. Pas de commission sur vos ventes : vos clients vous paient directement, et Kaislo n’encaisse jamais leur argent. L’imprimante de tickets est facultative.'] },
        { h: 'Restaurants et cafés : prévoir la caisse certifiée', p: [HORECA_FR] },
      ],
      faq: [
        ['Vaut-il mieux payer à l’année ou au mois ?', 'Au mois, vous gardez la liberté d’arrêter. À l’année, vous gagnez souvent quelques mois offerts. Testez d’abord au mois, puis passez à l’année quand le logiciel est adopté.'],
        ['Le prix change-t-il avec le nombre de vendeurs ?', 'Cela dépend des logiciels. Chez Kaislo, chaque abonnement comprend 1 poste et 5 vendeurs ; un poste supplémentaire s’ajoute en supplément mensuel.'],
        ['Combien coûte un logiciel de caisse en Belgique ?', `Cela dépend du périmètre et du matériel. Chez Kaislo, à partir de ${eurFr(MIN)} par mois selon le métier, sans matériel obligatoire ni commission sur les ventes.`],
        ['Faut-il acheter du matériel ?', 'Pas pour Kaislo : un téléphone, une tablette ou un ordinateur suffit. Un terminal de paiement par carte reste fourni par votre banque.'],
        ['Peut-on payer à l’année ?', 'Oui : à l’année, 2 mois sont offerts sur l’abonnement Kaislo.'],
      ],
    },
    en: {
      slug: 'pos-software-price-belgium',
      seo: 'POS software price in Belgium: the budget',
      titre: 'POS software price in Belgium: how much to budget',
      court: 'POS software price in Belgium',
      description: 'How much does POS software cost in Belgium? Subscription, hardware, payment terminal, commissions: the cost items and Kaislo prices in euros.',
      chapo: 'The advertised price of POS software is only part of the budget. Between the subscription, hardware, the card terminal and possible commissions, the gap can be large. Here are the items to compare and Kaislo’s prices.',
      sections: [
        { h: 'The five cost items', l: ['The software subscription or licence (monthly, yearly or one-off).', 'Hardware: till, tablet, cash drawer, printer, barcode scanner.', 'The card payment terminal, which depends on your bank and not on the software.', 'Possible commissions on payments or on sales.', 'Set-up, training and support, sometimes billed separately.'] },
        { h: 'Compare like for like', p: ['A low price with no stock or customer credit does not replace a slightly higher price that includes them. Always compare the same list: till, stock, customer credit, data export, offline use, number of tills and sellers.', 'Ask what changes if your business grows: a second till, a second location, more sellers.'] },
        { h: 'Kaislo prices in euros', l: LISTE_EN, p: ['Each plan includes 1 till and 5 sellers. On the yearly plan, 2 months are free. 30-day free trial, with no card and no commitment.'] },
        { h: 'A twelve-month worked example', p: ['A fictional example for a small shop. Plan A: €15 a month, no stock, so €180 a year. Plan B: €25 a month with stock and customer credit, so €300 a year. Plan C: a till bought for €600 then €10 a month, so €720 in the first year.', 'The cheapest plan on paper is not always the cheapest in use: if plan A forces you to keep stock in a notebook, the lost time and the mistakes cost more than the €120 gap with plan B.'] },
        { h: 'Hidden costs to ask about in writing', l: ['Set-up or onboarding fees.', 'Price of mandatory hardware (till, drawer, printer) and of replacing it.', 'Commission on card or app payments.', 'Cost of an extra user or device.', 'Fees to retrieve your data when you leave.', 'Cancellation terms and length of commitment.'] },
        { h: 'What Kaislo does not charge for', p: ['No mandatory hardware: Kaislo runs on the phone, tablet or computer you have. No commission on your sales: customers pay you directly, and Kaislo never collects their money. The receipt printer is optional.'] },
        { h: 'Restaurants and cafes: plan for the certified register', p: [HORECA_EN] },
      ],
      faq: [
        ['Is it better to pay yearly or monthly?', 'Monthly keeps you free to stop. Yearly often gives a few free months. Test monthly first, then switch to yearly once the software is adopted.'],
        ['Does the price change with the number of sellers?', 'It depends on the software. With Kaislo, each plan includes 1 till and 5 sellers; an extra till is added as a monthly supplement.'],
        ['How much does POS software cost in Belgium?', `It depends on scope and hardware. With Kaislo, from ${eurEn(MIN)} per month depending on the business, with no mandatory hardware and no commission on sales.`],
        ['Do I need to buy hardware?', 'Not for Kaislo: a phone, tablet or computer is enough. A card payment terminal is still supplied by your bank.'],
        ['Can I pay yearly?', 'Yes: on the yearly plan, 2 months are free on the Kaislo subscription.'],
      ],
    },
  },
  {
    cle: 'be-gestion',
    groupe: 'belgique',
    modele: 'inventaire',
    metier: '/gestion-stock/',
    fr: {
      slug: 'systeme-de-gestion-commerce-belgique',
      seo: 'Système de gestion de commerce en Belgique : le guide',
      titre: 'Système de gestion pour un commerce en Belgique : stock, ventes et crédit clients',
      court: 'Système de gestion de commerce en Belgique',
      description: 'Système de gestion de commerce en Belgique : ce qu’il doit faire (stock, ventes, crédit, marges), comment choisir et démarrer en une semaine.',
      chapo: 'Un système de gestion de commerce réunit au même endroit les ventes, le stock, le crédit des clients et les comptes de la journée. Pour un commerce de proximité belge, l’essentiel est qu’il soit simple, qu’il marche sans internet et qu’il tienne vos chiffres en euros prêts pour le comptable.',
      sections: [
        { h: 'Ce qu’un système de gestion doit faire', l: ['Enregistrer chaque vente avec son moyen de paiement (espèces, carte, Payconiq).', 'Mettre le stock à jour à chaque vente et prévenir avant la rupture.', 'Suivre le crédit des clients : qui doit combien, depuis quand.', 'Donner chaque soir le chiffre d’affaires, les écarts de caisse et les produits qui se vendent.', 'Exporter les données (Excel, PDF) pour le comptable.'] },
        { h: 'Choisir selon votre commerce', p: ['Une épicerie ou une boutique a besoin d’un catalogue d’articles, de prix et d’un stock fiable. Un commerce avec plusieurs vendeurs a besoin de droits distincts (qui peut faire une remise ou annuler une vente). Un commerce qui vend à crédit a besoin d’un carnet de crédit clair.', 'Si vous hésitez, choisissez le système le plus simple que vos vendeurs utiliseront vraiment : un outil complet mais abandonné ne vaut rien.'] },
        { h: 'Démarrer en une semaine', l: ['Jour 1 : créez le commerce et entrez vos vingt articles les plus vendus avec leur prix.', 'Jours 2 et 3 : encaissez avec le système en parallèle de votre méthode habituelle et comparez les totaux.', 'Jour 4 : comptez le stock et corrigez les écarts.', 'Jours 5 à 7 : ajoutez le reste des articles et formez les vendeurs.', 'Fin de semaine : lisez les comptes du soir et décidez de continuer ou d’ajuster.'] },
        { h: 'Les erreurs fréquentes au démarrage', l: ['Entrer tout le catalogue d’un coup au lieu de commencer par les vingt articles les plus vendus.', 'Ne pas faire d’inventaire de départ : le stock affiché est alors faux dès le premier jour.', 'Oublier de noter les ventes à crédit, puis ne plus savoir qui doit quoi.', 'Laisser plusieurs personnes encaisser avec le même compte : impossible de savoir qui a vendu quoi.', 'Ne jamais comparer le total du logiciel avec la caisse en fin de journée.'] },
        { h: 'Les chiffres à suivre chaque semaine', l: ['Les ventes de la semaine, comparées à la précédente.', 'La marge : prix de vente moins prix d’achat, sur vos dix articles les plus vendus.', 'Les articles en rupture ou proches de la rupture.', 'Les crédits clients non remboursés et leur ancienneté.', 'Les articles qui ne se vendent plus et immobilisent de l’argent.'] },
        { h: 'Prix en euros et paiements', p: ['Montants et remises sont gérés en euros avec les centimes. Vous notez le moyen de paiement de chaque vente ; le terminal de carte reste celui de votre banque et Kaislo n’encaisse jamais l’argent. Pour la TVA, gardez des prix cohérents et conservez vos totaux pour votre comptable : Kaislo ne remplace pas votre déclaration.'] },
        { h: 'Kaislo comme système de gestion', p: [`Kaislo réunit ventes, stock, crédit clients, comptes du soir et export Excel, sur téléphone, tablette ou ordinateur, avec ou sans internet. Essai gratuit de 30 jours, puis à partir de ${eurFr(MIN)} par mois selon le métier.`, HORECA_FR] },
      ],
      faq: [
        ['Quels chiffres suivre chaque semaine dans un commerce ?', 'Les ventes, la marge sur les meilleurs articles, les ruptures de stock, les crédits clients à récupérer et les articles qui dorment. Cinq chiffres suffisent pour piloter un petit commerce.'],
        ['Un système de gestion remplace-t-il le comptable ?', 'Non. Il organise vos ventes et votre stock et facilite l’export pour votre comptable, mais la comptabilité et les obligations fiscales restent de sa responsabilité.'],
        ['Quel système de gestion pour un petit commerce en Belgique ?', 'Un outil simple qui couvre ventes, stock et crédit clients, fonctionne sans internet et permet d’exporter les données. Testez-le quelques jours avec vos vrais articles.'],
        ['Faut-il un système de gestion de stock ?', 'Dès que vous avez plus de quelques dizaines d’articles, oui : il évite les ruptures, les pertes cachées et le recomptage à la main.'],
        ['Kaislo gère-t-il la TVA ?', 'Kaislo enregistre vos ventes et vos prix. Il ne remplace pas votre déclaration de TVA : gardez vos totaux et rapprochez-vous de votre comptable.'],
      ],
    },
    en: {
      slug: 'business-management-system-belgium',
      seo: 'Business management system in Belgium: the guide',
      titre: 'A management system for a shop in Belgium: stock, sales and customer credit',
      court: 'Business management system in Belgium',
      description: 'A shop management system in Belgium: what it must do (stock, sales, credit, margins), how to choose and how to start in one week.',
      chapo: 'A shop management system brings sales, stock, customer credit and the day’s accounts together in one place. For a Belgian neighbourhood shop, what matters is that it is simple, works without internet and keeps your euro figures ready for your accountant.',
      sections: [
        { h: 'What a management system must do', l: ['Record each sale with its payment method (cash, card, Payconiq).', 'Update stock with every sale and warn you before stock-outs.', 'Track customer credit: who owes how much, since when.', 'Give you each evening the turnover, cash gaps and best-selling products.', 'Export data (Excel, PDF) for your accountant.'] },
        { h: 'Choose according to your business', p: ['A grocery store or shop needs an item catalogue, prices and reliable stock. A business with several sellers needs separate permissions (who can give a discount or cancel a sale). A business that sells on credit needs a clear credit book.', 'If in doubt, choose the simplest system your sellers will really use: a complete tool nobody uses is worth nothing.'] },
        { h: 'Start in one week', l: ['Day 1: create the business and enter your twenty best sellers with their prices.', 'Days 2 and 3: take payments with the system alongside your usual method and compare totals.', 'Day 4: count the stock and correct the gaps.', 'Days 5 to 7: add the rest of your items and train your sellers.', 'End of week: read the evening accounts and decide to continue or adjust.'] },
        { h: 'Common mistakes at the start', l: ['Entering the whole catalogue at once instead of starting with the twenty best sellers.', 'Skipping the opening stock count: displayed stock is wrong from day one.', 'Forgetting to record credit sales, then losing track of who owes what.', 'Letting several people take payments on the same account: you cannot tell who sold what.', 'Never comparing the software total with the cash drawer at the end of the day.'] },
        { h: 'The numbers to follow every week', l: ['This week’s sales, compared with last week.', 'Margin: selling price minus purchase price, on your ten best sellers.', 'Items out of stock or close to it.', 'Unpaid customer credit and how old it is.', 'Items that no longer sell and tie up cash.'] },
        { h: 'Euro prices and payments', p: ['Amounts and discounts are handled in euros with cents. You record the payment method of each sale; the card terminal stays your bank’s and Kaislo never collects the money. For VAT, keep consistent prices and keep your totals for your accountant: Kaislo does not replace your VAT return.'] },
        { h: 'Kaislo as a management system', p: [`Kaislo brings sales, stock, customer credit, evening accounts and Excel export together, on phone, tablet or computer, with or without internet. 30-day free trial, then from ${eurEn(MIN)} per month depending on the business.`, HORECA_EN] },
      ],
      faq: [
        ['Which numbers should a shop follow every week?', 'Sales, margin on the best sellers, stock-outs, customer credit to collect and slow-moving items. Five numbers are enough to run a small shop.'],
        ['Does a management system replace the accountant?', 'No. It organises your sales and stock and makes exporting for your accountant easier, but bookkeeping and tax obligations remain the accountant’s responsibility.'],
        ['Which management system for a small shop in Belgium?', 'A simple tool that covers sales, stock and customer credit, works without internet and lets you export data. Test it for a few days with your real items.'],
        ['Do I need a stock management system?', 'As soon as you have more than a few dozen items, yes: it prevents stock-outs, hidden losses and recounting by hand.'],
        ['Does Kaislo handle VAT?', 'Kaislo records your sales and prices. It does not replace your VAT return: keep your totals and check with your accountant.'],
      ],
    },
  },
  {
    cle: 'be-horeca',
    groupe: 'belgique',
    modele: 'ventes',
    metier: '/gestion-restaurant/',
    fr: {
      slug: 'caisse-enregistreuse-certifiee-horeca-belgique',
      seo: 'Caisse enregistreuse certifiée Horeca en Belgique',
      titre: 'Caisse enregistreuse certifiée (Horeca) en Belgique : ce que c’est et ce que Kaislo ne remplace pas',
      court: 'Caisse enregistreuse certifiée Horeca en Belgique',
      description: 'Caisse enregistreuse certifiée pour l’Horeca en Belgique : à quoi elle sert, qui est concerné, ce que Kaislo ne remplace pas et comment le compléter.',
      chapo: 'Les restaurants, cafés et traiteurs belges ne peuvent pas choisir n’importe quel logiciel de caisse : l’Horeca est soumis à un système de caisse enregistreuse certifié. Voici l’idée générale, ce que Kaislo remplace (ou non) et comment vous informer.',
      sections: [
        { h: 'L’idée générale', p: ['Pour limiter la fraude, l’administration belge impose à l’Horeca un système de caisse enregistreuse certifié : les ventes sont enregistrées par un module de contrôle fiscal (souvent appelé « boîte noire ») relié à la caisse, qui produit les tickets officiels.', 'Les règles précises (qui est concerné, quel matériel, quelles dates) évoluent : elles se vérifient auprès du SPF Finances ou de votre comptable, pas dans un guide de logiciel.'] },
        { h: 'Qui est concerné', p: ['En général les restaurants, cafés, bars, traiteurs et activités de restauration. Les commerces de détail comme une épicerie ou une boutique ne sont pas concernés de la même façon, mais les obligations dépendent de votre activité : demandez à votre comptable.'] },
        { h: 'Ce que Kaislo ne remplace pas', p: ['Kaislo n’est pas un système de caisse enregistreuse certifié et ne produit pas les tickets fiscaux de l’Horeca. Si votre activité y est soumise, gardez votre caisse certifiée pour encaisser et émettre les tickets officiels.'] },
        { h: 'Les questions à poser à un fournisseur de caisse certifiée', l: ['Le système proposé est-il bien un système de caisse enregistreuse certifié, avec son module de contrôle fiscal ?', 'Qui installe le module, qui le met à jour, et à quel prix ?', 'Le support est-il joignable le soir et le week-end, quand le service tourne ?', 'Que se passe-t-il en cas de panne en plein service ?', 'Pouvez-vous exporter vos ventes pour votre comptable ?', 'Quels frais s’ajoutent chaque mois : abonnement, maintenance, mises à jour ?'] },
        { h: 'Gérer stock et marges à côté de la caisse', p: ['La caisse certifiée enregistre les ventes officielles. Elle ne remplace pas le suivi du stock de boissons, des ingrédients et du coût de chaque plat. Ce suivi se fait à côté, sans toucher aux tickets officiels.', 'Une méthode simple : un inventaire hebdomadaire des boissons, une fiche de coût par plat (somme des ingrédients) et un point mensuel sur les plats les plus rentables. Ces chiffres aident à fixer les prix sans remplacer la caisse certifiée.'] },
        { h: 'Ce que Kaislo peut compléter', l: ['Le stock des boissons et des ingrédients, avec alertes avant la rupture.', 'Le calcul du coût d’un plat et de la marge.', 'Le suivi des pertes et des écarts.', 'Le crédit clients et les comptes de la journée pour votre propre pilotage.'] },
        { h: 'Pour un commerce non concerné', p: [`Pour une épicerie, une boutique ou un commerce de proximité, Kaislo gère ventes, stock et crédit clients, en euros, sans internet. Essai gratuit de 30 jours, puis à partir de ${eurFr(MIN)} par mois. Renseignez-vous tout de même sur vos obligations avant de remplacer votre matériel.`] },
      ],
      faq: [
        ['Peut-on utiliser Kaislo en plus d’une caisse certifiée ?', 'Oui, pour le stock, les coûts et les marges, à condition de continuer à encaisser et à émettre les tickets officiels avec votre caisse certifiée.'],
        ['Où vérifier si mon activité est concernée ?', 'Auprès du SPF Finances, de votre comptable ou de votre fédération professionnelle. Les règles évoluent : ne vous fiez pas à un guide de logiciel, y compris celui-ci.'],
        ['Une caisse enregistreuse certifiée est-elle obligatoire dans l’Horeca belge ?', 'En général oui : l’Horeca est soumis à un système de caisse enregistreuse certifié. Vérifiez votre situation auprès du SPF Finances ou de votre comptable.'],
        ['Kaislo remplace-t-il ma caisse certifiée ?', 'Non. Kaislo gère les ventes, le stock et le crédit clients, mais n’est pas un système de caisse certifié.'],
        ['Kaislo peut-il quand même servir dans mon restaurant ?', 'Oui pour le stock, le coût des plats, les pertes et le suivi, en complément de votre caisse certifiée.'],
      ],
    },
    en: {
      slug: 'certified-cash-register-horeca-belgium',
      seo: 'Certified cash register for Horeca in Belgium',
      titre: 'Certified cash register (Horeca) in Belgium: what it is and what Kaislo does not replace',
      court: 'Certified cash register for Horeca in Belgium',
      description: 'The certified cash register for Belgian Horeca: what it is for, who is concerned, what Kaislo does not replace and how to complement it.',
      chapo: 'Belgian restaurants, cafes and caterers cannot choose just any POS software: the Horeca sector is subject to a certified cash register system. Here is the general idea, what Kaislo does and does not replace, and where to get the exact rules.',
      sections: [
        { h: 'The general idea', p: ['To limit fraud, the Belgian administration requires the Horeca sector to use a certified cash register system: sales are recorded by a fiscal control module (often called the “black box”) linked to the till, which produces the official receipts.', 'The exact rules (who is concerned, which hardware, which dates) change: check them with the FPS Finance or your accountant, not in a software guide.'] },
        { h: 'Who is concerned', p: ['Generally restaurants, cafes, bars, caterers and food-service activities. Retail businesses such as a grocery store or shop are not concerned in the same way, but obligations depend on your activity: ask your accountant.'] },
        { h: 'What Kaislo does not replace', p: ['Kaislo is not a certified cash register system and does not issue the Horeca fiscal receipts. If your business is subject to it, keep your certified till to take payments and issue the official receipts.'] },
        { h: 'Questions to ask a certified-register supplier', l: ['Is the proposed system really a certified cash register system, with its fiscal control module?', 'Who installs the module, who updates it, and at what price?', 'Is support reachable in the evening and at weekends, when service is running?', 'What happens if it fails in the middle of service?', 'Can you export your sales for your accountant?', 'What monthly costs are added: subscription, maintenance, updates?'] },
        { h: 'Managing stock and margins next to the register', p: ['The certified register records the official sales. It does not replace tracking drink stock, ingredients and the cost of each dish. That tracking happens alongside it, without touching the official receipts.', 'A simple method: a weekly count of drinks, a cost sheet for each dish (the sum of its ingredients) and a monthly review of the most profitable dishes. These numbers help set prices without replacing the certified register.'] },
        { h: 'What Kaislo can complement', l: ['Stock of drinks and ingredients, with alerts before stock-outs.', 'Dish costing and margin.', 'Tracking losses and discrepancies.', 'Customer credit and the day’s accounts for your own management.'] },
        { h: 'For a business that is not concerned', p: [`For a grocery store, shop or neighbourhood business, Kaislo manages sales, stock and customer credit, in euros, without internet. 30-day free trial, then from ${eurEn(MIN)} per month. Still check your obligations before replacing your equipment.`] },
      ],
      faq: [
        ['Can I use Kaislo alongside a certified register?', 'Yes, for stock, costs and margins, as long as you keep taking payments and issuing official receipts with your certified register.'],
        ['Where can I check whether my business is concerned?', 'With the FPS Finance, your accountant or your trade federation. The rules change: do not rely on a software guide, this one included.'],
        ['Is a certified cash register mandatory in Belgian Horeca?', 'Generally yes: the Horeca sector is subject to a certified cash register system. Check your situation with the FPS Finance or your accountant.'],
        ['Does Kaislo replace my certified register?', 'No. Kaislo manages sales, stock and customer credit, but it is not a certified cash register system.'],
        ['Can Kaislo still help in my restaurant?', 'Yes for stock, dish costs, losses and follow-up, alongside your certified register.'],
      ],
    },
  },
];
