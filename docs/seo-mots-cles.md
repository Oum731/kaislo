# SEO sur le site (on-page) : mots-clés visés page par page

Les volumes de recherche ne sont pas mesurés ici (aucun outil de mots-clés accessible depuis le serveur de développement).
À valider avec **Google Search Console** (rapport « Résultats de recherche » : requêtes réelles) et le **Planificateur de mots clés** de Google Ads (gratuit avec le compte Ads).
Règle : un mot-clé principal par page, dans le titre (début), la description, le h1 et le premier paragraphe ; les variantes dans les titres h2 et la FAQ.

## Pages principales

| Page | Mot-clé principal (FR) | Variantes | Main keyword (EN) |
|---|---|---|---|
| `/` | logiciel de caisse et de gestion de stock | gestion de commerce, logiciel de vente, application de vente | POS and inventory management software |
| `/logiciel-de-caisse/` | logiciel de caisse | caisse sur téléphone, application de caisse, caisse sans internet, caisse enregistreuse gratuite | POS software (`/en/pos-software/`) |
| `/gestion-stock/` | logiciel de gestion de stock | inventaire, alerte de rupture, valeur du stock, appli de stock | inventory management software |
| `/gestion-epicerie/` | logiciel pour épicerie | supérette, code-barres, crédit client, carnet de crédit | grocery store software |
| `/gestion-restaurant/` | logiciel pour restaurant | maquis, snack, ticket cuisine, gestion des tables | restaurant POS software |
| `/gestion-boutique/` | logiciel pour boutique | boutique de vêtements, tailles et couleurs, cosmétiques | boutique management software |
| `/gestion-bar/` | logiciel pour bar | café, lounge, stock bouteilles | bar POS software |
| `/gestion-quincaillerie/` | logiciel pour quincaillerie | unités de vente, milliers de références | hardware store software |
| `/gestion-boulangerie/` | logiciel pour boulangerie | pâtisserie, production, invendus | bakery management software |
| `/logiciel-grossiste/` | logiciel pour grossiste | dépôt, prix par palier, crédit clients | wholesale management software |
| `/tarifs/` | prix logiciel de caisse | abonnement, essai gratuit | POS software pricing |
| `/pays/<pays>/` (15 pays) | logiciel de gestion de commerce au <pays> | caisse <pays>, devise locale, mobile money | business management software in <country> |

## Requêtes à cibler avec des guides (intention « comment faire »)

Déjà couverts (53 guides FR + EN) : inventaire, marge, crédit clients, clôture de caisse, pertes de stock, mobile money, coût d'un plat, réapprovisionnement, vendeurs, comptabilité simple, par métier et par pays.
Idées à ajouter ensuite (par ordre d'intérêt) :
1. « logiciel de caisse gratuit : que choisir » (comparatif honnête, renvoie vers la page caisse)
2. « caisse enregistreuse ou application de caisse ? » (coûts, obligations selon le pays)
3. « modèle de facture / bon de livraison Excel » (modèle gratuit, très recherché)
4. « calculer un prix de vente à partir du prix d'achat » (outil/modèle)
5. « gérer le stock d'une boutique en ligne / WhatsApp Business »
6. « tenue de caisse : fond de caisse et écarts » (guide + modèle)

## Ce qui est en place (vérifié par `npm run seo`)

- Titre ≤ 65 caractères, description 50–160, une adresse canonique, un seul h1, hreflang FR/EN, plan du site, robots.txt.
- Données structurées : Organization, WebSite, FAQPage (sur presque toutes les pages), BreadcrumbList, Article (guides), SoftwareApplication + AggregateOffer (pages métier), VideoObject.
- Maillage interne : pied de page (métiers, pays, guides), « À lire aussi » sur chaque guide (4 voisins en rotation, donc chaque guide reçoit au moins 4 liens), lien du guide vers sa page métier.
- Images : texte alternatif, versions réduites, captures et vidéos dans la devise du visiteur.

## À contrôler tous les mois (Search Console)

1. Pages indexées et « Découverte, actuellement non indexée » (le sitemap compte plus de 160 pages).
2. Requêtes avec beaucoup d'impressions et peu de clics : retravailler titre et description de la page.
3. Position moyenne des mots-clés principaux ci-dessus ; une page entre 8 et 20 mérite un paragraphe en plus et 2 ou 3 liens internes.
4. Core Web Vitals (voir README, section vitesse).
