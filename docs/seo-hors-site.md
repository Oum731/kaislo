# SEO hors du site (off-page) : plan d'action pour Kaislo

Ce qui ne se règle pas dans le code : réputation, liens entrants, présence locale. À faire par vous ou votre équipe ; chaque ligne dit quoi faire et pourquoi.

## 1. À faire cette semaine (gratuit, rapide)

1. **Google Search Console** : propriété `https://kaislo.com` vérifiée, sitemap `https://kaislo.com/sitemap.xml` envoyé (160+ pages), puis « Demander une indexation » pour `/`, `/logiciel-de-caisse/`, `/gestion-stock/`, `/tarifs/`, `/en/`.
2. **Bing Webmaster Tools** : importer le site depuis Search Console (10 minutes) ; Bing alimente aussi DuckDuckGo et une partie des assistants IA.
3. **Fiche Google Business Profile** (Amorac / Kaislo) : catégorie « Éditeur de logiciels », site `https://kaislo.com`, description avec « logiciel de caisse et de gestion de stock », photos (logo, captures), services (caisse, stock, crédit clients). Une fiche par pays où vous avez une adresse réelle.
4. **Profils officiels identiques** (même nom, même logo, même description) : LinkedIn (page entreprise), Facebook, Instagram, TikTok, YouTube, X, WhatsApp Business (catalogue + lien). Mettre `https://kaislo.com` en lien et en bio partout. Ces profils s'ajoutent ensuite aux données structurées (`sameAs`) et au pied de page : adresses publiques dans `RESEAUX` de `src/config.js` (YouTube déjà en place ; Facebook et LinkedIn à ajouter avec l'adresse de la **page** de l'entreprise, jamais d'un profil personnel `linkedin.com/in/…`).
5. **Logo** : fichiers du dossier `logos-ads` (carré 1200×1200) pour tous les profils.

## 2. Annuaires et comparateurs de logiciels (liens utiles, trafic qualifié)

Créer la fiche Kaislo (description, captures, prix, avis) sur :
- Capterra, GetApp, Software Advice (même compte, une seule saisie), SourceForge, G2
- AlternativeTo, Product Hunt (lancement), Appvizer, Sortlist, Comparateur-de-logiciels
- Pour l'Afrique francophone : annuaires d'entreprises et chambres de commerce du pays, médias tech africains (TechCabal, Digital Business Africa, rubriques « outils pour entrepreneurs »)
- Demander **5 avis clients** par plateforme dans les 2 premiers mois : sans avis, une fiche pèse peu.

## 3. Liens entrants (backlinks) : ce qui marche pour un SaaS de commerce

- **Partenariats** : experts-comptables, associations de commerçants, chambres de commerce, incubateurs et programmes d'accompagnement de chaque pays, banques et opérateurs mobile money (page « outils partenaires »). Demander un lien vers `https://kaislo.com/pays/<pays>/` depuis leur page ressources.
- **Programme commerciaux** (déjà dans le produit) : donner à chaque commercial un lien de parrainage et un petit kit (logo, 3 visuels, vidéo). Chaque article ou post qu'il publie est un lien.
- **Articles invités** : 1 article par mois sur un blog ou média d'entrepreneuriat (sujet : « 5 erreurs de stock », avec les modèles Excel gratuits comme appât). Le lien pointe vers le guide correspondant, pas vers la page d'accueil.
- **Modèles Excel gratuits** : déjà sur le site ; les proposer à des blogs et forums de commerçants contre un lien (« modèle fourni par Kaislo »).
- **Presse et communiqués** : lancement dans un pays, partenariat, chiffre (nombre de commerces). Médias : presse économique et sites d'actualité de chaque pays visé.
- **Lien « Fait avec Kaislo »** sur les tickets envoyés par WhatsApp : chaque ticket est une visite possible (à discuter : option désactivable).
À éviter : achat de liens en masse, échanges de liens artificiels, annuaires douteux : Google les pénalise.

## 4. Contenu hors du site

- **YouTube** : publier les 5 vidéos de démonstration (titre avec le mot-clé, description avec le lien vers la page correspondante, sous-titres FR/EN). Une vidéo YouTube bien décrite sort souvent en tête sur « logiciel de caisse » et « gestion de stock ».
- **TikTok / Reels / Facebook** : les vidéos publicitaires « Daniel » et « à l'ancienne contre Kaislo », avec le lien du site en bio ; réutiliser les mêmes mots-clés dans la légende (#logicieldecaisse #gestiondestock #commerce #mobilemoney).
- **Groupes Facebook et WhatsApp de commerçants** : répondre aux questions (« comment suivre mon stock ? ») avec un guide du site, sans spam.
- **Quora, forums locaux** : une réponse utile par semaine avec lien vers le guide concerné.

## 5. Présence locale par pays (Google Maps et recherche locale)

Pour chaque pays prioritaire (Côte d'Ivoire, Maroc, Sénégal, France) : une page pays existe (`/pays/<pays>/`) ; la relier à une fiche locale, à un numéro WhatsApp local et à un annuaire du pays. Le nom, l'adresse et le téléphone doivent être **identiques** partout (NAP).

## 6. Suivi

- Tableau mensuel : impressions et clics (Search Console), nombre de domaines qui font un lien (Search Console > Liens), avis reçus par plateforme, inscriptions par source (le suivi Google Ads est en place ; ajouter `?utm_source=` aux liens des profils).
- Objectif réaliste à 3 mois : 20 domaines référents de qualité, 15 avis, 3 pages en première page Google sur des requêtes de marque + métier.
