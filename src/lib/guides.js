// ------------------------------------------------------------
// GUIDES PRATIQUES du site public (référencement : répondent aux questions que les commerçants tapent dans Google).
// Chaque guide existe en français et en anglais : { fr: {...}, en: {...} } avec ses propres adresses.
// Pour en ajouter un : une entrée ici, c'est tout (pages, plan du site, liens croisés et hreflang suivent).
// ------------------------------------------------------------
export const DATE_GUIDES = '2026-10-05';

// modele : fichier Excel gratuit lié au guide (public/modeles/, voir scripts/modeles.mjs)
export const GUIDES = [
  {
    cle: 'inventaire',
    modele: 'inventaire',
    metier: '/gestion-stock/',
    fr: {
      slug: 'faire-un-inventaire-de-stock',
      titre: 'Comment faire un inventaire de stock, étape par étape',
      court: 'Faire un inventaire de stock',
      description: 'Méthode simple pour faire l’inventaire de votre commerce : préparation, comptage, écarts, valeur du stock. Avec un modèle Excel gratuit à télécharger.',
      chapo: 'L’inventaire consiste à compter ce que vous avez réellement en rayon et en réserve, puis à le comparer avec ce que votre cahier ou votre logiciel annonce. Bien fait, il révèle les pertes, évite les ruptures et vous dit ce que votre stock vaut.',
      sections: [
        { h: 'Pourquoi faire un inventaire régulièrement', p: ['Un stock que l’on ne compte jamais finit toujours par différer de la réalité : vols, casse, erreurs de rendu, produits périmés, ventes non notées. Plus l’inventaire est espacé, plus l’écart est grand et plus il est difficile d’en trouver la cause.', 'Un inventaire complet une à deux fois par an est un minimum. Pour les produits qui coûtent cher ou qui partent vite, un comptage tournant chaque semaine est bien plus efficace.'] },
        { h: 'Préparer l’inventaire', p: ['Choisissez un moment calme : avant l’ouverture, ou après la fermeture. Arrêtez les entrées et les sorties de marchandise pendant le comptage, ou notez-les à part.', 'Rangez les articles par famille, mettez les produits identiques ensemble et prévoyez une liste imprimée ou un fichier avec le nom de chaque article, son unité (pièce, kg, litre, carton) et la quantité attendue.'] },
        { h: 'Compter, étape par étape', l: ['Comptez zone par zone (rayon 1, rayon 2, réserve) et cochez chaque zone terminée.', 'Notez la quantité réellement trouvée, jamais celle que vous croyez avoir.', 'Faites compter par deux personnes les articles de grande valeur.', 'Séparez les produits abîmés ou périmés : ils ne comptent pas dans le stock vendable.', 'Recomptez immédiatement tout écart important avant de le valider.'] },
        { h: 'Calculer les écarts et la valeur du stock', p: ['L’écart est la quantité comptée moins la quantité attendue. Un écart négatif signale une perte ; un écart positif, une entrée non notée ou une erreur de comptage.', 'La valeur du stock se calcule article par article : quantité × prix d’achat. Additionnez le tout pour savoir combien d’argent est immobilisé en marchandise. C’est aussi la base pour calculer vos marges.'] },
        { h: 'Faire l’inventaire avec Kaislo', p: ['Dans Kaislo, ouvrez Stock, touchez l’article et indiquez la quantité comptée : le stock est corrigé et l’écart est gardé dans l’historique. Vous voyez la valeur du stock au prix d’achat et à la vente, et vous pouvez exporter l’inventaire en Excel à tout moment.'] },
      ],
      faq: [
        ['À quelle fréquence faire un inventaire ?', 'Un inventaire complet au moins une fois par an, et un comptage tournant (quelques familles chaque semaine) pour les produits chers ou qui se vendent beaucoup.'],
        ['Que faire d’un écart d’inventaire ?', 'Recomptez, cherchez une entrée ou une vente non notée, puis corrigez le stock et gardez la trace de l’écart pour comprendre sa cause.'],
        ['Peut-on faire l’inventaire sans logiciel ?', 'Oui, avec un cahier ou un tableau Excel, par exemple le modèle gratuit proposé sur cette page. Un logiciel évite de tout recopier et met le stock à jour à chaque vente.'],
      ],
    },
    en: {
      slug: 'how-to-do-a-stock-inventory',
      titre: 'How to do a stock inventory, step by step',
      court: 'Doing a stock inventory',
      description: 'A simple method to take inventory in your shop: preparation, counting, discrepancies and stock value. Includes a free Excel template to download.',
      chapo: 'A stock inventory means counting what you really have on the shelves and in the storeroom, then comparing it with what your notebook or software says. Done well, it reveals losses, prevents stock-outs and tells you what your stock is worth.',
      sections: [
        { h: 'Why take inventory regularly', p: ['Stock that is never counted always drifts away from reality: theft, breakage, change errors, expired goods, sales that were not recorded. The longer you wait, the bigger the gap and the harder it is to find the cause.', 'A full inventory once or twice a year is the minimum. For expensive or fast-moving items, a rolling weekly count is far more effective.'] },
        { h: 'Prepare the inventory', p: ['Pick a quiet moment: before opening or after closing. Stop goods coming in and going out during the count, or note them separately.', 'Group items by family, keep identical products together and prepare a printed list or a file with each item’s name, its unit (piece, kg, litre, carton) and the expected quantity.'] },
        { h: 'Count, step by step', l: ['Count zone by zone (shelf 1, shelf 2, storeroom) and tick each finished zone.', 'Write down the quantity actually found, never the one you think you have.', 'Have two people count high-value items.', 'Set aside damaged or expired products: they are not sellable stock.', 'Recount any large discrepancy straight away before confirming it.'] },
        { h: 'Work out discrepancies and stock value', p: ['The discrepancy is the counted quantity minus the expected quantity. A negative gap points to a loss; a positive gap, to an unrecorded delivery or a counting mistake.', 'Stock value is calculated item by item: quantity × purchase price. Add it all up to see how much money is tied up in goods. It is also the basis for calculating your margins.'] },
        { h: 'Take inventory with Kaislo', p: ['In Kaislo, open Stock, tap the item and enter the counted quantity: the stock is corrected and the difference is kept in the history. You see the stock value at purchase and selling price, and you can export the inventory to Excel at any time.'] },
      ],
      faq: [
        ['How often should you take inventory?', 'A full inventory at least once a year, plus a rolling count (a few families each week) for expensive or fast-selling products.'],
        ['What should you do about an inventory discrepancy?', 'Recount, look for an unrecorded delivery or sale, then correct the stock and keep a record of the gap to understand its cause.'],
        ['Can you take inventory without software?', 'Yes, with a notebook or an Excel sheet, for example the free template on this page. Software saves rewriting everything and updates stock with every sale.'],
      ],
    },
  },
  {
    cle: 'marge',
    modele: 'ventes',
    metier: '/gestion-boutique/',
    fr: {
      slug: 'calculer-sa-marge-commerciale',
      seo: 'Calculer sa marge commerciale et fixer ses prix',
      titre: 'Calculer sa marge commerciale et fixer ses prix de vente',
      court: 'Calculer sa marge',
      description: 'Comment calculer la marge, le taux de marge et le prix de vente d’un produit, avec des exemples en FCFA, dirhams ou euros. Simple et sans jargon.',
      chapo: 'Beaucoup de commerçants savent combien ils vendent, peu savent combien ils gagnent vraiment. La marge, c’est la différence entre le prix de vente et le prix d’achat : elle paie votre loyer, vos salaires et votre revenu.',
      sections: [
        { h: 'La formule de la marge', p: ['Marge = prix de vente − prix d’achat. Si vous achetez un sac de riz 12 000 et le vendez 15 000, votre marge est de 3 000 par sac.', 'Le taux de marge compare cette marge au prix d’achat : 3 000 ÷ 12 000 = 25 %. Le taux de marque la compare au prix de vente : 3 000 ÷ 15 000 = 20 %. Choisissez l’un des deux et gardez-le toujours.'] },
        { h: 'Calculer son prix de vente', p: ['Pour viser un taux de marge de 30 %, multipliez le prix d’achat par 1,30. Pour viser un taux de marque de 30 %, divisez-le par 0,70. Arrondissez ensuite à un prix qui plaît au client, mais sans descendre sous votre marge minimale.'] },
        { h: 'Ce que la marge doit couvrir', l: ['Le loyer, l’électricité et l’eau.', 'Les salaires et le transport.', 'Les pertes : casse, vol, produits périmés.', 'Vos remises et le crédit non remboursé.', 'Et enfin, votre propre revenu.'] },
        { h: 'Les erreurs fréquentes', p: ['Oublier les frais de transport dans le prix d’achat, garder un ancien prix d’achat alors que le fournisseur a augmenté, ou accorder des remises sans savoir ce qu’il reste. Mettez à jour vos prix d’achat à chaque livraison.'] },
        { h: 'Suivre ses marges avec Kaislo', p: ['Renseignez le prix d’achat de chaque article : Kaislo calcule la marge sur chaque vente, par article et sur la période, et affiche le taux de marge dans le tableau de bord et dans le rapport Excel ou PDF.'] },
      ],
      faq: [
        ['Quelle est la différence entre taux de marge et taux de marque ?', 'Le taux de marge se calcule sur le prix d’achat, le taux de marque sur le prix de vente. Le second est toujours plus petit pour la même marge.'],
        ['Quelle marge viser pour une épicerie ?', 'Cela dépend des produits : faible sur les produits de base très comparés, plus élevée sur les produits d’appoint. Calculez la marge moyenne réelle plutôt qu’un chiffre unique.'],
      ],
    },
    en: {
      slug: 'how-to-calculate-profit-margin',
      seo: 'Calculate profit margin and set selling prices',
      titre: 'How to calculate profit margin and set your selling prices',
      court: 'Calculating margin',
      description: 'How to calculate margin, markup and selling price for a product, with examples in CFA francs, dirhams or euros. Simple and jargon-free.',
      chapo: 'Many shopkeepers know how much they sell, few know how much they really earn. Margin is the difference between selling price and purchase price: it pays your rent, your staff and your own income.',
      sections: [
        { h: 'The margin formula', p: ['Margin = selling price − purchase price. If you buy a bag of rice for 12,000 and sell it for 15,000, your margin is 3,000 per bag.', 'Markup compares that margin with the purchase price: 3,000 ÷ 12,000 = 25%. Margin rate compares it with the selling price: 3,000 ÷ 15,000 = 20%. Pick one and always stick with it.'] },
        { h: 'Work out your selling price', p: ['To aim for a 30% markup, multiply the purchase price by 1.30. To aim for a 30% margin rate, divide it by 0.70. Then round to a price customers like, without going below your minimum margin.'] },
        { h: 'What your margin has to cover', l: ['Rent, electricity and water.', 'Salaries and transport.', 'Losses: breakage, theft, expired goods.', 'Your discounts and unpaid credit.', 'And finally, your own income.'] },
        { h: 'Common mistakes', p: ['Forgetting transport costs in the purchase price, keeping an old purchase price after your supplier raised theirs, or giving discounts without knowing what is left. Update your purchase prices with every delivery.'] },
        { h: 'Track your margins with Kaislo', p: ['Enter each item’s purchase price: Kaislo calculates the margin on every sale, by item and over the period, and shows the margin rate on the dashboard and in the Excel or PDF report.'] },
      ],
      faq: [
        ['What is the difference between markup and margin rate?', 'Markup is calculated on the purchase price, margin rate on the selling price. The margin rate is always smaller for the same profit.'],
        ['What margin should a grocery store aim for?', 'It depends on the products: low on staples that customers compare, higher on convenience items. Calculate your real average margin rather than one fixed figure.'],
      ],
    },
  },
  {
    cle: 'credit',
    modele: 'ventes',
    metier: '/gestion-epicerie/',
    fr: {
      slug: 'gerer-le-credit-clients',
      titre: 'Gérer le crédit de ses clients sans perdre d’argent',
      court: 'Gérer le crédit clients',
      description: 'Comment accorder du crédit à vos clients, le suivre dans un carnet, relancer sans froisser et limiter les impayés. Conseils pratiques pour commerçants.',
      chapo: 'Le crédit fidélise, mais un carnet mal tenu mange votre trésorerie. L’objectif n’est pas de refuser le crédit, c’est de savoir à tout moment qui vous doit quoi, et depuis quand.',
      sections: [
        { h: 'Poser des règles claires', l: ['Ne faites crédit qu’à des clients que vous connaissez.', 'Fixez un plafond par client, adapté à ce qu’il peut rembourser.', 'Décidez d’un délai (une semaine, la fin du mois) et dites-le dès le départ.', 'Interdisez un nouveau crédit tant qu’un ancien dépasse le délai.'] },
        { h: 'Tenir un carnet fiable', p: ['Chaque vente à crédit doit être notée au moment de la vente : nom du client, date, articles, montant. Chaque remboursement l’est aussi, avec le mode de paiement. Un solde exact se calcule alors tout seul : achats à crédit moins remboursements.', 'Un carnet papier se perd et se discute. Un carnet numérique garde l’historique et peut être montré au client.'] },
        { h: 'Relancer sans froisser', p: ['Rappelez le montant et la date plutôt que de réclamer : « Votre solde est de 4 500 depuis le 12, souhaitez-vous passer le régler cette semaine ? ». Un message WhatsApp poli, envoyé tôt, vaut mieux qu’une demande gênante trois mois plus tard.'] },
        { h: 'Le crédit n’est pas de l’argent reçu', p: ['Dans vos comptes du soir, une vente à crédit compte dans le chiffre d’affaires mais pas dans l’argent en caisse. Ne dépensez que ce que vous avez reçu, et suivez le total dû comme un stock d’argent à récupérer.'] },
        { h: 'Le carnet de crédit de Kaislo', p: ['Kaislo garde le carnet de chaque client : achats à crédit, remboursements partiels ou totaux, solde dû et reçu de remboursement. Le rapport Excel liste tous les clients qui vous doivent de l’argent.'] },
      ],
      faq: [
        ['Comment limiter les impayés ?', 'Plafonnez le crédit par client, fixez un délai, notez chaque vente à crédit immédiatement et relancez dès le premier retard.'],
        ['Le crédit compte-t-il dans le chiffre d’affaires ?', 'Oui, la vente est faite, mais ce n’est pas de l’argent reçu tant que le client n’a pas remboursé.'],
      ],
    },
    en: {
      slug: 'manage-customer-credit',
      titre: 'How to manage customer credit without losing money',
      court: 'Managing customer credit',
      description: 'How to give customers credit, track it in a book, send reminders politely and limit unpaid debts. Practical advice for shopkeepers.',
      chapo: 'Credit builds loyalty, but a badly kept book eats your cash. The goal is not to refuse credit, it is to know at any time who owes you what, and since when.',
      sections: [
        { h: 'Set clear rules', l: ['Only give credit to customers you know.', 'Set a limit per customer, based on what they can repay.', 'Decide on a deadline (one week, end of month) and say so from the start.', 'No new credit while an old one is overdue.'] },
        { h: 'Keep a reliable book', p: ['Every credit sale must be written down at the time: customer name, date, items, amount. Every repayment too, with the payment method. An exact balance then calculates itself: credit purchases minus repayments.', 'A paper book gets lost and disputed. A digital book keeps the history and can be shown to the customer.'] },
        { h: 'Remind without offending', p: ['Mention the amount and the date rather than demanding: “Your balance has been 4,500 since the 12th, could you drop by this week to settle it?” A polite WhatsApp message sent early beats an awkward request three months later.'] },
        { h: 'Credit is not money received', p: ['In your evening accounts, a credit sale counts in revenue but not in cash. Only spend what you have received, and track the total owed like a stock of money to recover.'] },
        { h: 'Kaislo’s credit book', p: ['Kaislo keeps each customer’s book: credit purchases, partial or full repayments, balance owed and repayment receipt. The Excel report lists every customer who owes you money.'] },
      ],
      faq: [
        ['How do you limit unpaid debts?', 'Cap credit per customer, set a deadline, record every credit sale immediately and send a reminder at the first delay.'],
        ['Does credit count in revenue?', 'Yes, the sale is made, but it is not money received until the customer repays.'],
      ],
    },
  },
  {
    cle: 'cloture',
    modele: 'ventes',
    metier: '/gestion-restaurant/',
    fr: {
      slug: 'cloture-de-caisse-quotidienne',
      titre: 'La clôture de caisse : faire ses comptes chaque soir',
      court: 'Clôture de caisse',
      description: 'Comment faire la clôture de caisse de fin de journée : fond de caisse, total vendu, espèces, mobile money, écart. Méthode simple et modèle Excel gratuit.',
      chapo: 'Chaque soir, vous devez pouvoir répondre à deux questions : combien ai-je vendu, et l’argent qui devrait être là y est-il ? C’est le rôle de la clôture de caisse.',
      sections: [
        { h: 'Ouvrir la journée avec un fond de caisse', p: ['Comptez l’argent en caisse avant la première vente et notez-le : c’est le fond de caisse. Il sert à rendre la monnaie et doit être retrouvé le lendemain.'] },
        { h: 'Faire la clôture le soir', l: ['Relevez le total vendu de la journée.', 'Séparez par mode de paiement : espèces, Wave, Orange Money, carte, crédit.', 'Comptez les espèces réellement en caisse.', 'Calculez l’espèce attendue : fond de caisse + ventes en espèces + remboursements reçus − dépenses payées en espèces.', 'Comparez : la différence est l’écart de caisse.'] },
        { h: 'Comprendre l’écart', p: ['Un petit écart arrive (erreur de monnaie). Un écart qui revient chaque jour doit être expliqué : oubli de noter une vente ou une dépense, erreur de rendu, ou vol. Plus vous clôturez tôt après la fermeture, plus il est facile de retrouver la cause.'] },
        { h: 'Séparer ventes, argent reçu et crédit', p: ['Le total vendu inclut le crédit ; l’argent reçu ne l’inclut pas. Pour le mobile money, comparez avec le solde ou le relevé du compte. Kaislo n’encaisse jamais votre argent : il note comment vos clients vous ont payé.'] },
        { h: 'La fermeture de la journée avec Kaislo', p: ['Kaislo calcule le total vendu, l’argent par mode de paiement et l’espèce attendue ; vous indiquez l’espèce comptée et l’écart s’affiche. Le ticket de clôture peut être imprimé ou gardé, et chaque journée apparaît dans le rapport Excel.'] },
      ],
      faq: [
        ['Qu’est-ce qu’un fond de caisse ?', 'La somme en espèces laissée dans la caisse à l’ouverture pour rendre la monnaie.'],
        ['Que faire si la caisse ne tombe pas juste ?', 'Recomptez, vérifiez les ventes, dépenses et remboursements de la journée, puis notez l’écart et surveillez s’il se répète.'],
      ],
    },
    en: {
      slug: 'daily-cash-closing',
      titre: 'Cash closing: doing your accounts every evening',
      court: 'Daily cash closing',
      description: 'How to close the till at the end of the day: float, total sales, cash, mobile money, difference. A simple method and a free Excel template.',
      chapo: 'Every evening you should be able to answer two questions: how much did I sell, and is the money that should be here actually here? That is what closing the till is for.',
      sections: [
        { h: 'Open the day with a cash float', p: ['Count the money in the till before the first sale and write it down: that is the float. It is used to give change and should be found again the next day.'] },
        { h: 'Close the till in the evening', l: ['Take the day’s total sales.', 'Split by payment method: cash, Wave, Orange Money, card, credit.', 'Count the cash actually in the till.', 'Work out expected cash: float + cash sales + repayments received − cash expenses paid.', 'Compare: the difference is the cash gap.'] },
        { h: 'Understand the gap', p: ['A small gap happens (change error). A gap that comes back every day must be explained: a sale or expense not recorded, a change error, or theft. The sooner you close after shutting, the easier it is to find the cause.'] },
        { h: 'Separate sales, money received and credit', p: ['Total sales include credit; money received does not. For mobile money, compare with the account balance or statement. Kaislo never collects your money: it records how your customers paid you.'] },
        { h: 'Day closing with Kaislo', p: ['Kaislo calculates total sales, money by payment method and expected cash; you enter the cash counted and the gap appears. The closing receipt can be printed or kept, and every day shows up in the Excel report.'] },
      ],
      faq: [
        ['What is a cash float?', 'The cash left in the till at opening to give change.'],
        ['What if the till does not balance?', 'Recount, check the day’s sales, expenses and repayments, then note the gap and watch whether it repeats.'],
      ],
    },
  },
  {
    cle: 'pertes',
    modele: 'inventaire',
    metier: '/gestion-stock/',
    fr: {
      slug: 'reduire-les-pertes-de-stock',
      seo: 'Réduire les pertes de stock : casse, vol, péremption',
      titre: 'Réduire les pertes de stock : casse, vol, produits périmés',
      court: 'Réduire les pertes de stock',
      description: 'Les causes des pertes de stock dans un commerce et des moyens concrets de les réduire : rotation, alertes, droits des vendeurs, inventaires réguliers.',
      chapo: 'Dans un commerce, chaque produit perdu est du bénéfice qui disparaît. Casse, péremption, vols, erreurs : on ne peut pas tout supprimer, mais on peut les voir, les mesurer et les réduire.',
      sections: [
        { h: 'Où partent les pertes', l: ['Produits périmés ou abîmés avant d’être vendus.', 'Vols de clients ou d’employés.', 'Erreurs de rendu de monnaie ou de pesée.', 'Ventes non enregistrées.', 'Sur-stock qui immobilise l’argent et vieillit.'] },
        { h: 'Appliquer le premier entré, premier sorti', p: ['Placez les produits les plus anciens devant et vendez-les en premier. Indiquez la date de péremption sur les produits sensibles et vérifiez-la chaque semaine.'] },
        { h: 'Commander juste', p: ['Fixez un seuil d’alerte par article : quand le stock descend sous ce seuil, vous commandez. Le seuil dépend de la vitesse de vente et du délai de livraison de votre fournisseur. Évitez de commander « au cas où » : un sur-stock coûte cher.'] },
        { h: 'Contrôler sans fliquer', p: ['Donnez à chaque vendeur son propre accès avec un code PIN. Chaque vente, remise et annulation est alors attachée à une personne, avec un motif. Réservez les remises et les corrections de stock au gérant ou aux personnes de confiance.'] },
        { h: 'Mesurer avec des inventaires fréquents', p: ['Un comptage tournant hebdomadaire sur les articles chers repère un problème en quelques jours au lieu de quelques mois. Kaislo garde l’historique des mouvements et des écarts, et signale les articles en rupture ou bientôt en rupture.'] },
      ],
      faq: [
        ['Comment réduire les produits périmés ?', 'Vendez les plus anciens d’abord, surveillez les dates chaque semaine et commandez des quantités adaptées à votre vitesse de vente.'],
        ['Comment repérer un vol ?', 'Comparez régulièrement stock attendu et stock compté, et attachez chaque vente et annulation à un vendeur identifié.'],
      ],
    },
    en: {
      slug: 'reduce-stock-losses',
      seo: 'Reduce stock losses: breakage, theft, expiry',
      titre: 'Reducing stock losses: breakage, theft and expired goods',
      court: 'Reducing stock losses',
      description: 'The causes of stock loss in a shop and practical ways to reduce it: rotation, alerts, seller permissions and regular inventory counts.',
      chapo: 'In a shop, every lost product is profit that disappears. Breakage, expiry, theft, mistakes: you cannot remove them all, but you can see them, measure them and reduce them.',
      sections: [
        { h: 'Where losses come from', l: ['Products that expire or get damaged before being sold.', 'Theft by customers or staff.', 'Errors in change or weighing.', 'Sales that were not recorded.', 'Overstock that ties up money and ages.'] },
        { h: 'Apply first in, first out', p: ['Put the oldest products at the front and sell them first. Show the expiry date on sensitive products and check it every week.'] },
        { h: 'Order just enough', p: ['Set an alert threshold per item: when stock falls below it, you reorder. The threshold depends on how fast it sells and your supplier’s delivery time. Avoid ordering “just in case”: overstock is expensive.'] },
        { h: 'Control without policing', p: ['Give each seller their own access with a PIN. Every sale, discount and cancellation is then tied to a person, with a reason. Keep discounts and stock corrections for the manager or trusted people.'] },
        { h: 'Measure with frequent counts', p: ['A weekly rolling count of expensive items spots a problem in days instead of months. Kaislo keeps the history of movements and discrepancies, and flags items out of stock or about to run out.'] },
      ],
      faq: [
        ['How do you reduce expired products?', 'Sell the oldest first, check dates every week and order quantities that match how fast you sell.'],
        ['How do you spot theft?', 'Regularly compare expected and counted stock, and tie every sale and cancellation to an identified seller.'],
      ],
    },
  },
  {
    cle: 'mobile-money',
    modele: 'ventes',
    metier: '/gestion-boutique/',
    fr: {
      slug: 'noter-les-paiements-mobile-money',
      seo: 'Mobile money en boutique : noter Wave et Orange Money',
      titre: 'Mobile money en boutique : noter Wave et Orange Money sans se tromper',
      court: 'Noter le mobile money',
      description: 'Comment suivre les paiements Wave, Orange Money, MTN ou M-Pesa dans votre commerce et rapprocher vos ventes avec le solde de votre compte.',
      chapo: 'Le mobile money s’est imposé dans les boutiques, mais il complique les comptes : l’argent n’est pas dans la caisse. Voici comment le noter proprement et vérifier qu’il ne manque rien.',
      sections: [
        { h: 'Le problème : l’argent n’est pas dans le tiroir', p: ['Quand un client paie par Wave, Orange Money, MTN MoMo ou M-Pesa, l’argent arrive directement sur votre téléphone. Si vous ne notez pas la vente avec ce mode de paiement, votre caisse en espèces paraît juste mais vos comptes sont faux.'] },
        { h: 'Noter chaque vente avec son mode de paiement', p: ['Enregistrez chaque vente avec le bon mode : espèces, Wave, Orange Money, carte… En fin de journée vous obtenez le total par mode, indispensable pour savoir ce que vous devez retrouver dans chaque « poche ».'] },
        { h: 'Rapprocher avec votre compte', l: ['Relevez le total mobile money de la journée dans vos comptes.', 'Comparez-le avec les entrées de votre application mobile money.', 'Cherchez les écarts : frais de retrait, paiement non noté, erreur de montant.', 'Gardez le relevé du mois pour votre comptable.'] },
        { h: 'Les frais et retraits', p: ['Les frais de retrait ou de transfert sont une dépense : notez-les comme telle pour ne pas gonfler votre bénéfice. Votre solde en mobile money fait partie de votre trésorerie au même titre que la caisse.'] },
        { h: 'Avec Kaislo', p: ['Kaislo propose les modes de paiement de votre pays (Wave, Orange Money, MTN, M-Pesa, carte…). Les comptes du soir et le rapport Excel détaillent l’argent reçu par mode. Kaislo n’encaisse jamais l’argent : il garde seulement la trace de la façon dont vos clients vous ont payé.'] },
      ],
      faq: [
        ['Kaislo encaisse-t-il les paiements mobile money ?', 'Non. Vos clients vous paient comme d’habitude ; Kaislo note le mode de paiement pour vos comptes.'],
        ['Comment vérifier que mon mobile money est juste ?', 'Comparez le total du mode dans vos comptes du soir avec les entrées de votre application, en tenant compte des frais.'],
      ],
    },
    en: {
      slug: 'record-mobile-money-payments',
      seo: 'Record mobile money payments in your shop',
      titre: 'Mobile money in your shop: recording Wave and Orange Money correctly',
      court: 'Recording mobile money',
      description: 'How to track Wave, Orange Money, MTN or M-Pesa payments in your business and reconcile your sales with your account balance.',
      chapo: 'Mobile money has taken over in shops, but it complicates your accounts: the money is not in the till. Here is how to record it properly and check nothing is missing.',
      sections: [
        { h: 'The problem: the money is not in the drawer', p: ['When a customer pays by Wave, Orange Money, MTN MoMo or M-Pesa, the money lands straight on your phone. If you do not record the sale with that payment method, your cash drawer looks right but your accounts are wrong.'] },
        { h: 'Record every sale with its payment method', p: ['Record each sale with the right method: cash, Wave, Orange Money, card… At the end of the day you get the total per method, essential to know what you should find in each “pocket”.'] },
        { h: 'Reconcile with your account', l: ['Take the day’s mobile money total from your accounts.', 'Compare it with the credits in your mobile money app.', 'Look for gaps: withdrawal fees, unrecorded payment, wrong amount.', 'Keep the month’s statement for your accountant.'] },
        { h: 'Fees and withdrawals', p: ['Withdrawal or transfer fees are an expense: record them as such so your profit is not inflated. Your mobile money balance is part of your cash, just like the till.'] },
        { h: 'With Kaislo', p: ['Kaislo offers the payment methods of your country (Wave, Orange Money, MTN, M-Pesa, card…). The evening accounts and the Excel report detail the money received by method. Kaislo never collects the money: it only keeps track of how your customers paid you.'] },
      ],
      faq: [
        ['Does Kaislo collect mobile money payments?', 'No. Your customers pay you as usual; Kaislo records the payment method for your accounts.'],
        ['How do I check my mobile money is right?', 'Compare the method’s total in your evening accounts with the credits in your app, allowing for fees.'],
      ],
    },
  },
];

export const MODELES = {
  inventaire: {
    fr: { fichier: 'modele-inventaire-stock.xlsx', nom: 'Modèle Excel d’inventaire de stock (gratuit)' },
    en: { fichier: 'stock-inventory-template.xlsx', nom: 'Stock inventory Excel template (free)' },
  },
  ventes: {
    fr: { fichier: 'modele-suivi-ventes-quotidien.xlsx', nom: 'Modèle Excel de suivi des ventes et dépenses (gratuit)' },
    en: { fichier: 'daily-sales-tracker-template.xlsx', nom: 'Daily sales and expenses Excel template (free)' },
  },
};

export const adresseGuide = (g, lang) => (lang === 'en' ? '/en/guides/' : '/guides/') + g[lang].slug + '/';
export const guideParSlug = (slug, lang) => GUIDES.find((g) => g[lang].slug === slug);
