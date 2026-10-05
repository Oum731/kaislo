// ------------------------------------------------------------
// PAGES PAR PAYS (référencement local) : /pays/cote-d-ivoire/, /pays/senegal/…
// Les devises, modes de paiement et prix viennent des vraies données de l'application (modeles.js, tarifs.js).
// Ici : l'adresse de la page, la formulation (« en Côte d’Ivoire », « au Sénégal ») et les commerces les plus courants.
// Pour ajouter un pays : l'ajouter à PAYS (modeles.js), puis ici.
// ------------------------------------------------------------
export const PAYS_SEO = [
  { id: 'CI', slug: 'cote-d-ivoire', prep: 'en', commerces: ['maquis et restaurants', 'alimentations et boutiques', 'boulangeries', 'quincailleries et dépôts'] },
  { id: 'SN', slug: 'senegal', prep: 'au', commerces: ['boutiques et alimentations', 'restaurants et gargotes', 'boulangeries', 'quincailleries'] },
  { id: 'ML', slug: 'mali', prep: 'au', commerces: ['boutiques et alimentations', 'restaurants', 'téléphonie et électronique', 'dépôts et grossistes'] },
  { id: 'BF', slug: 'burkina-faso', prep: 'au', commerces: ['boutiques et alimentations', 'maquis et restaurants', 'téléphonie et électronique', 'quincailleries'] },
  { id: 'BJ', slug: 'benin', prep: 'au', commerces: ['alimentations et boutiques', 'restaurants et maquis', 'téléphonie et électronique', 'quincailleries'] },
  { id: 'TG', slug: 'togo', prep: 'au', commerces: ['boutiques et alimentations', 'restaurants et bars', 'téléphonie et électronique', 'quincailleries'] },
  { id: 'NE', slug: 'niger', prep: 'au', commerces: ['boutiques et alimentations', 'restaurants', 'téléphonie et électronique', 'dépôts et grossistes'] },
  { id: 'GN', slug: 'guinee', prep: 'en', commerces: ['boutiques et alimentations', 'restaurants', 'téléphonie et électronique', 'quincailleries'] },
  { id: 'CM', slug: 'cameroun', prep: 'au', commerces: ['boutiques et alimentations', 'bars et restaurants', 'téléphonie et électronique', 'quincailleries'] },
  { id: 'GA', slug: 'gabon', prep: 'au', commerces: ['boutiques et alimentations', 'restaurants et bars', 'téléphonie et électronique', 'boulangeries'] },
  { id: 'CG', slug: 'congo', prep: 'au', commerces: ['boutiques et alimentations', 'restaurants et bars', 'téléphonie et électronique', 'dépôts et grossistes'] },
  { id: 'MA', slug: 'maroc', prep: 'au', commerces: ['épiceries et supérettes', 'restaurants et cafés', 'boutiques', 'cosmétiques et beauté'] },
  { id: 'FR', slug: 'france', prep: 'en', commerces: ['épiceries et supérettes', 'restaurants et cafés', 'boutiques', 'commerces de proximité'] },
  { id: 'BE', slug: 'belgique', prep: 'en', commerces: ['épiceries', 'restaurants et cafés', 'boutiques', 'commerces de proximité'] },
  { id: 'CA', slug: 'canada', prep: 'au', commerces: ['épiceries', 'restaurants et cafés', 'boutiques', 'commerces de proximité'] },
];

export const lienPays = (p) => `/pays/${p.slug}/`;
