// ------------------------------------------------------------
// ÉTAT DE L'APPLICATION (bibliothèque "zustand")
//
// Tout ce que l'application sait (commerce ouvert, personne connectée,
// panier…) est rangé ici, avec les actions qui le modifient.
// Les écrans (dossier components/app) lisent cet état avec useKaisly().
//
// Le fichier est découpé en "tranches" pour rester lisible :
//   session.js    : connexion, inscription, droits
//   caisse.js     : panier, ventes, tables, annulation
//   gestion.js    : produits, stock, équipe, dépenses, clôtures, crédit
//   impression.js : imprimante Bluetooth et tickets
// ------------------------------------------------------------
import { create } from 'zustand';
import { enregistrerCommerce, chargerPreferences, enregistrerPreferences, estDemo } from '@/lib/donnees/stockage.js';
import { PAYS, paysDuNavigateur } from '@/lib/donnees/modeles.js';
import { formatPrix, formatNombre } from '@/lib/utils/format.js';
import { trancheSession } from './session.js';
import { trancheCaisse } from './caisse.js';
import { trancheGestion } from './gestion.js';
import { trancheImpression } from './impression.js';

const trancheCommune = (set, get) => ({
  pret: false, // devient true quand les données du téléphone sont chargées
  d: null, // données du commerce ouvert
  utilisateur: null, // personne connectée
  ecran: 'caisse', // écran affiché
  feuille: null, // fenêtre ouverte : { type: 'ticket', ...infos }
  toast: null,
  prefs: { largeurTicket: 58, accents: true },

  // Appelé une seule fois au démarrage, dans le navigateur
  demarrer() {
    if (get().pret) return;
    set({ prefs: chargerPreferences() });
    get().initImprimante();
    // Liens directs depuis le site :
    //   /app?demo=resto-ivoire&pays=CI   (pays facultatif : devise, ville, paiements)
    //   /app?inscription=1
    const params = new URLSearchParams(window.location.search);
    if (!get().prefs.paysDemo) get().choisirPaysDemo(paysDuNavigateur());
    if (params.get('pays') && PAYS.some((p) => p.id === params.get('pays'))) get().choisirPaysDemo(params.get('pays'));
    const demo = params.get('demo');
    // Lien de démo rouvert (ou page rechargée) : on garde la session en cours
    if (demo && estDemo(demo) && get().prefs.commerceAppareil === demo) get().restaurerSession();
    else if (demo && estDemo(demo)) get().relierAppareil(demo);
    else if (params.get('inscription')) set({ etapeConnexion: 'inscription' });
    else get().restaurerSession();
    set({ pret: true });
  },

  /**
   * Modifie les données du commerce et les enregistre.
   * Exemple : majDonnees((d) => ({ ventes: [...d.ventes, vente] }))
   */
  majDonnees(recette) {
    const d = get().d;
    const nouvelles = { ...d, ...recette(d) };
    enregistrerCommerce(nouvelles);
    // Garde la personne connectée à jour (droits modifiés par le gérant…)
    const u = get().utilisateur;
    set({ d: nouvelles, utilisateur: u ? nouvelles.utilisateurs.find((x) => x.id === u.id) || u : u });
    return nouvelles;
  },

  sauverPrefs(partiel) {
    const prefs = { ...get().prefs, ...partiel };
    enregistrerPreferences(prefs);
    set({ prefs });
  },

  allerA(ecran) {
    set({ ecran, feuille: null });
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  },

  ouvrir(type, infos = {}) {
    // _id : chaque ouverture repart d'un formulaire neuf
    set({ feuille: { type, ...infos, _id: Date.now() } });
  },

  fermer() {
    set({ feuille: null });
  },

  // Petit message temporaire en haut de l'écran
  message(texte, type = 'ok') {
    set({ toast: { texte, type, id: Date.now() } });
    clearTimeout(get()._toastTimer);
    set({ _toastTimer: setTimeout(() => set({ toast: null }), 2800) });
  },

  // Mise en forme des montants dans la devise du commerce
  devise() {
    return get().d?.commerce.devise || 'MAD';
  },
  prix(m) {
    return formatPrix(m, get().devise());
  },
  nombre(m) {
    return formatNombre(m, get().devise());
  },
});

export const useKaisly = create((set, get) => ({
  ...trancheCommune(set, get),
  ...trancheSession(set, get),
  ...trancheCaisse(set, get),
  ...trancheGestion(set, get),
  ...trancheImpression(set, get),
}));
