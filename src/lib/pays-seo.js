// ------------------------------------------------------------
// PAGES PAR PAYS (référencement local) : /pays/cote-d-ivoire/, /pays/senegal/…
// Les devises, modes de paiement et prix viennent des vraies données de l'application (modeles.js, tarifs.js).
// Ici : l'adresse de la page, la formulation (« en Côte d’Ivoire », « au Sénégal ») et les commerces les plus courants.
// Pour ajouter un pays : l'ajouter à PAYS (modeles.js), puis ici.
// ------------------------------------------------------------
export const PAYS_SEO = [
  { id: 'CI', slug: 'cote-d-ivoire', prep: 'en', commerces: ['maquis et restaurants', 'alimentations et boutiques', 'pharmacies', 'quincailleries et dépôts'] },
  { id: 'SN', slug: 'senegal', prep: 'au', commerces: ['boutiques et alimentations', 'restaurants et gargotes', 'boulangeries', 'quincailleries'] },
  { id: 'ML', slug: 'mali', prep: 'au', commerces: ['boutiques et alimentations', 'restaurants', 'pharmacies', 'dépôts et grossistes'] },
  { id: 'BF', slug: 'burkina-faso', prep: 'au', commerces: ['boutiques et alimentations', 'maquis et restaurants', 'pharmacies', 'quincailleries'] },
  { id: 'BJ', slug: 'benin', prep: 'au', commerces: ['alimentations et boutiques', 'restaurants et maquis', 'pharmacies', 'quincailleries'] },
  { id: 'TG', slug: 'togo', prep: 'au', commerces: ['boutiques et alimentations', 'restaurants et bars', 'pharmacies', 'quincailleries'] },
  { id: 'NE', slug: 'niger', prep: 'au', commerces: ['boutiques et alimentations', 'restaurants', 'pharmacies', 'dépôts et grossistes'] },
  { id: 'GN', slug: 'guinee', prep: 'en', commerces: ['boutiques et alimentations', 'restaurants', 'pharmacies', 'quincailleries'] },
  { id: 'CM', slug: 'cameroun', prep: 'au', commerces: ['boutiques et alimentations', 'bars et restaurants', 'pharmacies', 'quincailleries'] },
  { id: 'GA', slug: 'gabon', prep: 'au', commerces: ['boutiques et alimentations', 'restaurants et bars', 'pharmacies', 'boulangeries'] },
  { id: 'CG', slug: 'congo', prep: 'au', commerces: ['boutiques et alimentations', 'restaurants et bars', 'pharmacies', 'dépôts et grossistes'] },
  { id: 'MA', slug: 'maroc', prep: 'au', commerces: ['épiceries et supérettes', 'restaurants et cafés', 'boutiques', 'pharmacies et parapharmacies'] },
  { id: 'FR', slug: 'france', prep: 'en', commerces: ['épiceries et supérettes', 'restaurants et cafés', 'boutiques', 'commerces de proximité'] },
  { id: 'BE', slug: 'belgique', prep: 'en', commerces: ['épiceries', 'restaurants et cafés', 'boutiques', 'commerces de proximité'] },
  { id: 'CA', slug: 'canada', prep: 'au', commerces: ['épiceries', 'restaurants et cafés', 'boutiques', 'commerces de proximité'] },
];

export const lienPays = (p) => `/pays/${p.slug}/`;
