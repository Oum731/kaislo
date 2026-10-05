// ------------------------------------------------------------
// SYNCHRONISATION (tranche de l'état) : quand et comment envoyer / recevoir.
//   - juste après chaque modification (avec un petit délai pour grouper)
//   - toutes les 30 secondes, et dès que l'appareil retrouve internet
// L'état « synchro » est affiché dans l'en-tête (à jour, en attente, hors ligne).
// ------------------------------------------------------------
import { appelApi } from '@/lib/api.js';
import { avecStocks } from '@/lib/donnees/stock.js';
import { enregistrerCommerce } from '@/lib/donnees/stockage.js';
import { estServeur, chargerFile, tailleFile, preparerEnvoi, retirerDeLaFile, appliquerElements, fusionServeur } from '@/lib/donnees/synchro.js';

const INTERVALLE_MS = 30000;
const INTERVALLE_POSTE_MS = 5000; // appareil poste relié à l'imprimante : les tickets des vendeurs sortent vite
let derniereSynchro = 0;
const DELAI_APRES_MODIF_MS = 1500;
let minuterie = null;
let delai = null;
let enCours = null;

export const trancheSynchro = (set, get) => ({
  // etat : 'inactif' | 'envoi' | 'ok' | 'hors-ligne' | 'erreur'
  synchro: { etat: 'inactif', enAttente: 0, derniere: null, message: '' },
  messagesNonLus: 0, // réponses de l'équipe Kaislo pas encore lues (écran Aide)

  // Jeton de connexion utilisable pour ce commerce (personne connectée, sinon un autre de l'appareil)
  jetonServeur() {
    const { prefs, utilisateur, d } = get();
    const jetons = prefs.jetons || {};
    if (utilisateur && jetons[utilisateur.id]) return jetons[utilisateur.id];
    const ids = new Set((d?.utilisateurs || []).map((u) => u.id));
    return Object.entries(jetons).find(([id]) => ids.has(id))?.[1] || null;
  },

  demarrerSynchro() {
    if (!estServeur(get().d) || minuterie || typeof window === 'undefined') return;
    minuterie = setInterval(() => {
      const poste = get().prefs.posteAppareil && get().imprimante.connectee;
      if (Date.now() - derniereSynchro >= (poste ? INTERVALLE_POSTE_MS : INTERVALLE_MS)) get().synchroniser();
    }, INTERVALLE_POSTE_MS);
    window.addEventListener('online', get().synchroniser);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') get().synchroniser(); });
    set({ synchro: { ...get().synchro, enAttente: tailleFile(get().d.commerce.id) } });
    get().synchroniser();
  },

  arreterSynchro() {
    clearInterval(minuterie);
    minuterie = null;
    if (typeof window !== 'undefined') window.removeEventListener('online', get().synchroniser);
  },

  // Après une modification : synchronisation groupée un instant plus tard
  planifierSynchro(enAttente) {
    set({ synchro: { ...get().synchro, enAttente } });
    clearTimeout(delai);
    delai = setTimeout(() => get().synchroniser(), DELAI_APRES_MODIF_MS);
  },

  /** Envoie la file d'attente puis récupère les nouveautés. Renvoie true si tout s'est bien passé. */
  synchroniser() {
    if (enCours) return enCours; // une seule synchronisation à la fois
    derniereSynchro = Date.now();
    enCours = (async () => {
      const depart = get().d;
      const jeton = get().jetonServeur();
      if (!estServeur(depart) || !jeton) return false;
      const id = depart.commerce.id;
      set({ synchro: { ...get().synchro, etat: 'envoi' } });
      try {
        // 1. Envoi, par paquets de 200
        let file = chargerFile(id);
        let blocage = ''; // envoi refusé par le serveur (abonnement expiré, commerce suspendu)
        while (Object.keys(file).length) {
          const elements = await preparerEnvoi(get().d, file);
          let rep;
          try {
            rep = await appelApi('POST', '/donnees', { elements }, jeton);
          } catch (e) {
            // Commerce suspendu (403) : on n'envoie plus, mais on récupère quand même son état
            if (e.statut === 403) { blocage = e.message; break; }
            throw e;
          }
          retirerDeLaFile(id, elements, rep.refuses);
          if (rep.refuses?.length) console.warn('Refusés par le serveur', rep.refuses);
          file = chargerFile(id);
          if (elements.length < 200) break;
        }
        // 2. Réception (page par page) de ce que les autres appareils ont envoyé.
        // Chaque page est appliquée sur les données ACTUELLES (une vente faite pendant ce temps n'est pas perdue).
        const appliquer = async (transformer) => {
          let base, resultat;
          do {
            base = get().d;
            if (base?.commerce.id !== id) return false; // l'appareil a changé de commerce entre-temps
            resultat = await transformer(base);
          } while (get().d !== base);
          resultat = avecStocks(resultat); // ventes et mouvements des autres appareils : le stock se recalcule
          enregistrerCommerce(resultat);
          const u = get().utilisateur;
          set({ d: resultat, utilisateur: (u && resultat.utilisateurs.find((x) => x.id === u.id)) || u });
          return true;
        };
        let depuis = get().prefs.synchroDepuis?.[id] || '';
        let rep;
        do {
          rep = await appelApi('GET', '/donnees?depuis=' + encodeURIComponent(depuis), null, jeton);
          const elements = rep.elements;
          if (!(await appliquer((base) => appliquerElements(base, elements)))) return false;
          depuis = rep.heure;
          // Point de reprise mémorisé page après page (une coupure ne fait pas tout recommencer)
          get().sauverPrefs({ synchroDepuis: { ...(get().prefs.synchroDepuis || {}), [id]: depuis } });
        } while (rep.suite);
        const derniere = rep;
        await appliquer(async (base) => fusionServeur(base, derniere));
        set({ messagesNonLus: derniere.messagesNonLus || 0 });
        const u = get().utilisateur;
        const moi = u && get().d.utilisateurs.find((x) => x.id === u.id);
        // Envoi refusé : les ventes restent sur l'appareil et partiront dès que le blocage est levé
        const enAttente = tailleFile(id);
        set({ synchro: blocage && enAttente ? { etat: 'erreur', enAttente, derniere: new Date().toISOString(), message: blocage } : { etat: 'ok', enAttente, derniere: new Date().toISOString(), message: '' } });
        get().imprimerPourPoste(); // appareil poste : tickets des vendeurs à imprimer
        // Compte désactivé ou commerce suspendu depuis un autre appareil
        if (u && moi && !moi.actif) get().finSession('Votre compte a été désactivé par le gérant');
        else if (get().commerceSuspendu()) set({ etapeConnexion: 'suspendu', utilisateur: null });
        // Commerce réactivé par l'équipe Amorac : retour à l'écran de connexion
        else if (get().etapeConnexion === 'suspendu' && !get().utilisateur) set({ etapeConnexion: 'connexion' });
        return true;
      } catch (e) {
        if (e.statut === 401) get().finSession('Session expirée : reconnectez-vous');
        set({ synchro: { ...get().synchro, etat: e.horsLigne ? 'hors-ligne' : 'erreur', enAttente: tailleFile(id), message: e.message } });
        return false;
      }
    })().finally(() => { enCours = null; });
    return enCours;
  },
});
