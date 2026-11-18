export const SITE = {
  nom: 'AICA',
  nomLong: 'Association des Ivoiriens de Casablanca',
  email: 'aicaivoirienscasa@gmail.com',
  ville: 'Casablanca, Maroc',
  url: (process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL : 'http://localhost:3000')).replace(/\/$/, ''),
  validiteMois: 12,
};
export const SECTIONS = {
  evenements: { type: 'event', titre: 'Événements', un: 'Événement', desc: 'Rencontres, soirées, tournois et assemblées de l’association.' },
  actions: { type: 'action', titre: 'Nos actions', un: 'Action', desc: 'Ce que nous avons accompli ensemble : solidarité, entraide, accueil.' },
  activites: { type: 'activity', titre: 'Activités', un: 'Activité', desc: 'Les activités régulières de la communauté : sport, culture, jeunesse…' },
};
export const TYPE_TO_SECTION = Object.fromEntries(Object.entries(SECTIONS).map(([k, v]) => [v.type, k]));
