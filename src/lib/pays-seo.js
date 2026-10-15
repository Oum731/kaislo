// ------------------------------------------------------------
// PAGES PAR PAYS (référencement local) : /pays/cote-d-ivoire/, /pays/senegal/…
// Les devises, modes de paiement et prix viennent des vraies données de l'application (modeles.js, tarifs.js).
// Ici : l'adresse de la page, la formulation (« en Côte d’Ivoire », « au Sénégal ») et les commerces les plus courants.
// Pour ajouter un pays : un seul fichier, api/lib/pays.json (voir liste-pays.js). Seuls les textes très locaux (comme la Belgique) restent ici.
// ------------------------------------------------------------
import { DONNEES_PAYS } from './donnees/liste-pays.js';

// Belgique : la page et les guides répondent aux recherches réelles (« logiciel de caisse belgique », Wallonie, Liège, prix, gratuit).
// Pas d'affirmation juridique : seulement un rappel d'aller vérifier l'obligation de caisse enregistreuse certifiée de l'Horeca.
const LOCAL_BELGIQUE = {
  villes: ['Bruxelles', 'Liège', 'Namur', 'Charleroi', 'Mons'],
  titre: 'Logiciel de caisse en Belgique : prix en euros',
  description: 'Logiciel de caisse pour commerces en Belgique, Wallonie et Bruxelles : ventes, stock, crédit clients, en euros, sans internet. Essai gratuit 30 jours.',
  h1: 'Logiciel de caisse en Belgique : ventes, stock et crédit clients sur votre téléphone.',
  sectionTitre: 'Pour les commerces de Wallonie et de Bruxelles',
  sectionIntro: 'À Bruxelles, Liège, Namur, Charleroi, Mons ou dans votre commune, Kaislo s’installe en deux minutes sur le téléphone ou la tablette que vous avez déjà.',
  avertissementHoreca: 'Restaurants, cafés et traiteurs : en Belgique, l’Horeca doit utiliser un système de caisse enregistreuse certifié (avec module de contrôle fiscal, la « boîte noire »). Kaislo est un outil de gestion des ventes, du stock et du crédit clients : ce n’est pas ce système certifié. Vérifiez vos obligations auprès du SPF Finances ou de votre comptable ; Kaislo convient aux commerces non concernés (épiceries, boutiques, commerces de proximité) et peut compléter votre caisse certifiée pour le stock.',
  points: [
    ['Euros, avec les centimes', 'Montants, remises, tickets et comptes du soir en euros, sans conversion ni mauvaise surprise.'],
    ['Espèces, carte et Payconiq', 'Notez le mode de chaque vente : le terminal reste celui de votre banque, et le soir vous retrouvez le total de chaque mode.'],
    ['Marche sans internet', 'Marchés, foires, sous-sols ou zones mal couvertes : vous continuez à vendre, les ventes partent dès que le réseau revient.'],
    ['Aucun matériel à acheter', 'Un téléphone, une tablette ou un ordinateur suffit. L’imprimante de tickets est facultative.'],
    ['Essai gratuit, sans engagement', '30 jours pour tout tester, sans carte bancaire, puis un abonnement mensuel selon votre métier.'],
  ],
};

// Pays qui ont une page : ceux de liste-pays.js (api/lib/pays.json) qui ont un bloc « seo ». Les textes propres à un pays sont plus haut (ex. Belgique).
const LOCAL = { BE: LOCAL_BELGIQUE };
export const PAYS_SEO = DONNEES_PAYS.filter((p) => p.seo).map((p) => ({ id: p.id, slug: p.seo.slug, prep: p.article, commerces: p.seo.commerces, ...(LOCAL[p.id] ? { local: LOCAL[p.id] } : {}) }));

export const lienPays = (p) => `/pays/${p.slug}/`;
