// ------------------------------------------------------------
// ÉTAT DE L'APPLICATION (bibliothèque "zustand")
//
// Tout ce que l'application sait (commerce ouvert, personne connectée,
// panier…) est rangé ici, avec les actions qui le modifient.
// Les écrans (dossier components/app) lisent cet état avec useKaislo().
//
// Le fichier est découpé en "tranches" pour rester lisible :
//   session.js    : connexion, inscription, droits
//   caisse.js     : panier, ventes, tables, annulation
//   gestion.js    : produits, stock, équipe, dépenses, clôtures, crédit
//   impression.js : imprimante Bluetooth et tickets
//   synchro.js    : envoi / réception des données (commerces inscrits en ligne)
// ------------------------------------------------------------
import { create } from 'zustand';
import { enregistrerCommerce, chargerPreferences, enregistrerPreferences, estDemo, migrerAncienNom } from '@/lib/donnees/stockage.js';
import { copierAnciennesImages } from '@/lib/donnees/images.js';
import { PAYS, paysDuNavigateur } from '@/lib/donnees/modeles.js';
import { formatPrix, formatNombre } from '@/lib/utils/format.js';
import { trancheSession } from './session.js';
import { trancheCaisse } from './caisse.js';
import { trancheGestion } from './gestion.js';
import { trancheImpression } from './impression.js';
import { trancheSynchro } from './synchro.js';
import { estServeur, noterChangements } from '@/lib/donnees/synchro.js';

// ---------- Bouton « retour » du téléphone ----------
// Chaque écran et chaque fenêtre ajoutent une étape à l'historique du navigateur :
// le bouton retour (Android, geste sur iPhone, touche du navigateur) referme la fenêtre,
// sinon revient à l'écran d'accueil, puis quitte l'application.
let ignorerRetour = false; // retour déclenché par l'application elle-même (fermeture d'une fenêtre)
let ajouterApresRetour = false; // fenêtre ouverte pendant ce retour : son étape sera ajoutée ensuite
const navigateur = () => typeof window !== 'undefined';
// Next.js prend en charge l'historique un instant après le démarrage. Avant cela, une étape ajoutée
// lui serait inconnue et un « retour » rechargerait la page : on attend qu'il soit prêt.
const historiquePret = () => navigateur() && !String(window.history.pushState).includes('[native code]');
export const ajouterEtape = (etape) => { if (historiquePret()) window.history.pushState(etape, ''); };

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
    migrerAncienNom(); // données de l'ancien nom (Kaisly) reprises sous Kaislo
    copierAnciennesImages();
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
    // Commerce en ligne : la modification part dans la file d'attente, envoyée au serveur
    if (estServeur(nouvelles)) get().planifierSynchro(noterChangements(d, nouvelles));
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
    const avant = get().ecran;
    set({ ecran, feuille: null });
    if (!navigateur()) return;
    window.scrollTo(0, 0);
    const etape = { kaislo: 'ecran', ecran };
    // Une fenêtre était ouverte : son étape devient celle du nouvel écran
    if (window.history.state?.kaislo === 'feuille') window.history.replaceState(etape, '');
    else if (ecran !== avant) ajouterEtape(etape);
  },

  ouvrir(type, infos = {}) {
    const dejaOuverte = !!get().feuille;
    // _id : chaque ouverture repart d'un formulaire neuf
    set({ feuille: { type, ...infos, _id: Date.now() } });
    if (!navigateur() || dejaOuverte) return; // une fenêtre en remplace une autre : même étape
    if (ignorerRetour) ajouterApresRetour = true;
    else ajouterEtape({ kaislo: 'feuille' });
  },

  fermer() {
    if (!get().feuille) return;
    set({ feuille: null });
    // Retire l'étape de la fenêtre, comme si on avait appuyé sur « retour »
    if (navigateur() && window.history.state?.kaislo === 'feuille') {
      ignorerRetour = true;
      window.history.back();
    }
  },

  // Appelé quand on appuie sur le bouton « retour » du téléphone (événement popstate)
  retourTelephone(etat) {
    if (ignorerRetour) {
      ignorerRetour = false;
      if (ajouterApresRetour) {
        ajouterApresRetour = false;
        ajouterEtape({ kaislo: 'feuille' });
      }
      return;
    }
    const s = get();
    if (s.feuille) return set({ feuille: null }); // 1. ferme la fenêtre ouverte
    if (s.utilisateur) {
      // 2. revient à l'écran précédent (ou à l'accueil)
      const accueil = s.utilisateur.role === 'gerant' ? 'accueil' : 'caisse';
      set({ ecran: etat?.kaislo === 'ecran' ? etat.ecran : accueil });
      window.scrollTo(0, 0);
      return;
    }
    if (s.etapeConnexion === 'inscription' || s.etapeConnexion === 'connexion') s.retourConnexion(); // 3. écrans de connexion
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

export const useKaislo = create((set, get) => ({
  ...trancheCommune(set, get),
  ...trancheSession(set, get),
  ...trancheCaisse(set, get),
  ...trancheGestion(set, get),
  ...trancheImpression(set, get),
  ...trancheSynchro(set, get),
}));
