// ------------------------------------------------------------
// SESSION : connexion par NUMÉRO DE TÉLÉPHONE + CODE PIN (ou empreinte / Face ID),
// inscription d'un commerce, droits.
//
// Deux sortes de commerces :
//   - démos (et version de test sans serveur) : tout reste dans l'appareil ;
//   - commerces inscrits en ligne (commerce.serveur) : le serveur vérifie le code PIN
//     et garde les données ; l'appareil en a une copie pour marcher sans internet.
// Le numéro de téléphone identifie la personne et son commerce.
// ------------------------------------------------------------
import { chargerCommerce, creerCommerce, commerceDepuisServeur, enregistrerCommerce, estDemo, trouverParTelephone, supprimerCommerce } from '@/lib/donnees/stockage.js';
import { typeCommerce, cleTelephone } from '@/lib/donnees/modeles.js';
import { normaliserTelephone } from '@/lib/donnees/telephone.js';
import { etatAbonnement } from '@/lib/donnees/abonnement.js';
import { estServeur, noterTout, tailleFile } from '@/lib/donnees/synchro.js';
import { API_ACTIVE, appelApi, nomAppareil } from '@/lib/api.js';
import { biometrieDisponible, activerBiometrie, connexionBiometrie, nomBiometrie } from '@/lib/biometrie.js';
import { tr } from '@/lib/i18n';
import { choisirPays } from '@/lib/pays-visiteur';

// Empreinte du code PIN gardée dans l'appareil : permet de se reconnecter SANS internet
// (seulement sur un appareil où la personne s'est déjà connectée en ligne)
async function empreintePin(sel, pin) {
  const octets = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sel + ':' + pin));
  return Array.from(new Uint8Array(octets), (b) => b.toString(16).padStart(2, '0')).join('');
}

export const trancheSession = (set, get) => ({
  etapeConnexion: 'accueil', // 'accueil' | 'inscription' | 'connexion' | 'suspendu'
  connexionEnCours: false,

  // Au démarrage : rouvre le commerce relié à cet appareil (et la dernière session)
  restaurerSession() {
    const { commerceAppareil, session } = get().prefs;
    if (!commerceAppareil) return;
    const d = chargerCommerce(commerceAppareil);
    if (!d) return get().sauverPrefs({ commerceAppareil: null, session: null });
    set({ d });
    if (estServeur(d)) get().demarrerSynchro();
    if (get().commerceSuspendu()) return set({ etapeConnexion: 'suspendu' });
    const u = session && d.utilisateurs.find((x) => x.id === session.utilisateurId && x.actif);
    if (u) get().ouvrirSession(u);
    else set({ etapeConnexion: 'connexion' });
  },

  // Démos : on relie l'appareil et on affiche l'écran de connexion
  relierAppareil(id) {
    const d = chargerCommerce(id);
    if (!d) return get().message(tr('Ce commerce n’existe pas'), 'erreur');
    get().sauverPrefs({ commerceAppareil: id, session: null });
    set({ d, utilisateur: null, etapeConnexion: get().commerceSuspendu() ? 'suspendu' : 'connexion' });
  },

  /**
   * Connexion avec le numéro de téléphone et le code PIN.
   * Renvoie (promesse) un message d'erreur, ou null si la connexion a réussi.
   */
  async connecterParTelephone(telephone, pin, pays) {
    const cle = cleTelephone(telephone);
    if (!cle) return tr('Entrez votre numéro de téléphone');
    if (!/^\d{4}$/.test(String(pin))) return tr('Le code PIN contient 4 chiffres');

    // 1. Démos et comptes gardés seulement dans l'appareil
    const trouve = trouverParTelephone(telephone);
    if (trouve && !estServeur(trouve.d)) {
      const u = trouve.utilisateur;
      if (u.pin !== String(pin)) return tr('Numéro ou code PIN incorrect');
      if (!u.actif) return tr('Ce compte est désactivé. Demandez à votre gérant de le réactiver.');
      const d = chargerCommerce(trouve.d.commerce.id);
      set({ d });
      get().sauverPrefs({ commerceAppareil: d.commerce.id });
      if (get().commerceSuspendu()) {
        set({ etapeConnexion: 'suspendu' });
        return null;
      }
      get().ouvrirSession(d.utilisateurs.find((x) => x.id === u.id));
      return null;
    }
    if (!API_ACTIVE) return tr('Aucun compte Kaislo avec ce numéro');
    const numero = normaliserTelephone(telephone, pays);
    if (!numero.ok) return numero.erreur;
    get().sauverPrefs({ paysConnexion: pays });

    // 2. Comptes en ligne : le serveur vérifie le code
    set({ connexionEnCours: true });
    try {
      const rep = await appelApi('POST', '/connexion', { telephone: numero.e164, pays, pin: String(pin), appareil: nomAppareil() });
      // Empreinte du PIN pour les reconnexions sans internet sur cet appareil
      const sel = crypto.getRandomValues(new Uint32Array(2)).join('-');
      const pinsHors = { ...(get().prefs.pinsHors || {}), [cle]: { sel, hash: await empreintePin(sel, pin), utilisateurId: rep.utilisateur.id, commerceId: rep.commerce.id } };
      get().sauverPrefs({ pinsHors });
      await get().ouvrirCompteServeur(rep);
      return null;
    } catch (e) {
      if (!e.horsLigne) return e.message;
      // Pas d'internet : reconnexion possible si cette personne s'est déjà connectée ici
      const memo = get().prefs.pinsHors?.[cle];
      if (!memo || !chargerCommerce(memo.commerceId)) return tr('Pas de connexion internet. La première connexion sur cet appareil demande internet.');
      if ((await empreintePin(memo.sel, pin)) !== memo.hash) return tr('Numéro ou code PIN incorrect');
      return get().ouvrirSessionHorsLigne(memo.commerceId, memo.utilisateurId);
    } finally {
      set({ connexionEnCours: false });
    }
  },

  /** Connexion réussie auprès du serveur (code PIN ou empreinte) : ouvre le commerce sur cet appareil. */
  async ouvrirCompteServeur(rep) {
    const nouveau = !chargerCommerce(rep.commerce.id);
    const d = commerceDepuisServeur(rep);
    const jetons = { ...(get().prefs.jetons || {}), [rep.utilisateur.id]: rep.jeton };
    get().sauverPrefs({ commerceAppareil: d.commerce.id, jetons });
    const utilisateurs = d.utilisateurs.some((u) => u.id === rep.utilisateur.id) ? d.utilisateurs.map((u) => (u.id === rep.utilisateur.id ? rep.utilisateur : u)) : [...d.utilisateurs, rep.utilisateur];
    const aJour = { ...d, utilisateurs, commerce: { ...d.commerce, abonnement: { ...d.commerce.abonnement, ...rep.commerce.abonnement } } };
    enregistrerCommerce(aJour);
    set({ d: aJour, utilisateur: rep.utilisateur });
    // Nouvel appareil : on récupère les données du commerce avant d'ouvrir la journée
    if (nouveau) await get().synchroniser();
    get().demarrerSynchro();
    if (get().commerceSuspendu()) return set({ etapeConnexion: 'suspendu', utilisateur: null });
    get().ouvrirSession(get().d.utilisateurs.find((u) => u.id === rep.utilisateur.id) || rep.utilisateur);
    get().proposerBiometrie(rep.utilisateur);
  },

  // Sans internet, sur un appareil déjà utilisé : on ouvre la copie locale
  ouvrirSessionHorsLigne(commerceId, utilisateurId) {
    const d = chargerCommerce(commerceId);
    const u = d?.utilisateurs.find((x) => x.id === utilisateurId);
    if (!u) return tr('Compte introuvable sur cet appareil');
    if (!u.actif) return tr('Ce compte est désactivé. Demandez à votre gérant de le réactiver.');
    set({ d });
    get().sauverPrefs({ commerceAppareil: commerceId });
    get().demarrerSynchro();
    get().ouvrirSession(u);
    get().message(tr('Hors ligne : les ventes seront envoyées dès le retour d’internet'));
    return null;
  },

  // ---------- Empreinte / Face ID ----------

  // Après une connexion par code : propose d'activer l'empreinte (une seule fois par appareil)
  async proposerBiometrie(u) {
    const cle = cleTelephone(u.telephone);
    const { biometrie = {}, biometrieRefusee = {} } = get().prefs;
    if (!cle || biometrie[cle] || biometrieRefusee[cle]) return;
    if (await biometrieDisponible()) get().ouvrir('biometrie');
  },

  async activerBiometrie() {
    const u = get().utilisateur;
    const cle = cleTelephone(u.telephone);
    try {
      const credentialId = await activerBiometrie(get().jetonServeur());
      const entree = { credentialId, telephone: u.telephone, nom: u.nom, utilisateurId: u.id, commerceId: get().d.commerce.id };
      get().sauverPrefs({ biometrie: { ...(get().prefs.biometrie || {}), [cle]: entree } });
      get().fermer();
      get().message(tr('{0} activé pour vos prochaines connexions', [nomBiometrie()[0].toUpperCase() + nomBiometrie().slice(1)]));
    } catch (e) {
      // « NotAllowedError » : la personne a annulé
      if (e.name !== 'NotAllowedError') get().message(e.message || tr('Activation impossible'), 'erreur');
    }
  },

  refuserBiometrie() {
    const cle = cleTelephone(get().utilisateur?.telephone);
    if (cle) get().sauverPrefs({ biometrieRefusee: { ...(get().prefs.biometrieRefusee || {}), [cle]: true } });
    get().fermer();
  },

  desactiverBiometrie() {
    const cle = cleTelephone(get().utilisateur?.telephone);
    const biometrie = { ...(get().prefs.biometrie || {}) };
    delete biometrie[cle];
    get().sauverPrefs({ biometrie });
    get().message(tr('Connexion par empreinte désactivée sur cet appareil'));
  },

  // Comptes de cet appareil avec l'empreinte activée (boutons de l'écran de connexion)
  comptesBiometrie() {
    return Object.values(get().prefs.biometrie || {});
  },

  /** Connexion par empreinte. Renvoie un message d'erreur, ou null. */
  async connecterParBiometrie(entree) {
    set({ connexionEnCours: true });
    try {
      const rep = await connexionBiometrie(entree.credentialId);
      if (rep.horsLigne) return get().ouvrirSessionHorsLigne(entree.commerceId, entree.utilisateurId);
      await get().ouvrirCompteServeur(rep);
      return null;
    } catch (e) {
      if (e.name === 'NotAllowedError') return null; // annulé par la personne
      return e.message || tr('Empreinte non reconnue : utilisez votre code PIN');
    } finally {
      set({ connexionEnCours: false });
    }
  },

  // Démos : le visiteur choisit son pays (devise, ville, paiements)
  // manuel : le visiteur l'a choisi lui-même (on ne le change plus ensuite, et le site le retient aussi)
  choisirPaysDemo(pays, manuel = false) {
    get().sauverPrefs(manuel ? { paysDemo: pays, paysDemoManuel: true } : { paysDemo: pays });
    if (manuel) choisirPays(pays);
  },

  // Personnes déjà connectées sur cet appareil (pour remplir le numéro en un clic)
  comptesRecents() {
    const id = get().d?.commerce.id;
    return (get().prefs.recents || []).filter((r) => r.commerceId === id);
  },

  // Détache l'appareil de son commerce (retour à l'accueil)
  delierAppareil() {
    const d = get().d;
    if (estServeur(d)) {
      // Ventes pas encore envoyées : on ne les perd pas
      if (tailleFile(d.commerce.id) > 0) {
        get().message(tr('Des modifications ne sont pas encore envoyées : reconnectez-vous à internet d’abord'), 'erreur');
        get().synchroniser();
        return;
      }
      // Déconnecte chaque compte de cet appareil, efface la copie locale et les accès mémorisés
      const ids = new Set(d.utilisateurs.map((u) => u.id));
      const jetons = { ...(get().prefs.jetons || {}) };
      for (const [id, jeton] of Object.entries(jetons)) {
        if (!ids.has(id)) continue;
        appelApi('POST', '/deconnexion', null, jeton).catch(() => {});
        delete jetons[id];
      }
      const garder = (liste) => Object.fromEntries(Object.entries(liste || {}).filter(([, v]) => v.commerceId !== d.commerce.id));
      get().sauverPrefs({ jetons, pinsHors: garder(get().prefs.pinsHors), biometrie: garder(get().prefs.biometrie) });
      get().arreterSynchro();
      supprimerCommerce(d.commerce.id);
    }
    get().sauverPrefs({ commerceAppareil: null, session: null });
    set({ d: null, utilisateur: null, feuille: null, panier: [], commandeActive: null, etapeConnexion: 'accueil' });
  },

  commerceSuspendu() {
    return etatAbonnement(get().d?.commerce.abonnement).statut === 'suspendu';
  },

  ouvrirSession(u) {
    const id = get().d.commerce.id;
    // Mémorise ce compte comme "récent" sur cet appareil (numéro + nom, jamais le PIN)
    const recents = [{ commerceId: id, telephone: u.telephone || '', nom: u.nom }, ...(get().prefs.recents || []).filter((r) => !(r.commerceId === id && r.telephone === u.telephone))].slice(0, 8);
    get().sauverPrefs({ commerceAppareil: id, session: { commerceId: id, utilisateurId: u.id }, recents });
    set({
      utilisateur: u,
      ecran: u.role === 'gerant' ? 'accueil' : 'caisse',
      panier: [],
      commandeActive: null,
      remise: null,
      feuille: null,
    });
  },

  // Change de personne, l'appareil reste relié au commerce
  seDeconnecter() {
    get().sauverPrefs({ session: null });
    set({ utilisateur: null, feuille: null, etapeConnexion: 'connexion', panier: [], commandeActive: null });
  },

  // Fin de session imposée (session expirée, compte désactivé) : retour à l'écran de connexion
  finSession(message) {
    if (!get().utilisateur) return;
    get().seDeconnecter();
    get().message(message, 'erreur');
  },

  // (ancien nom, gardé pour les boutons existants)
  changerDeCommerce() {
    get().delierAppareil();
  },

  retourConnexion() {
    const e = get().etapeConnexion;
    if ((e === 'connexion' || e === 'suspendu') && get().d) {
      // Quitter une démo est libre ; un vrai commerce se détache depuis le compte du gérant
      if (estDemo(get().d.commerce.id)) get().delierAppareil();
      else set({ etapeConnexion: 'accueil', d: null });
    } else set({ etapeConnexion: 'accueil' });
  },

  /**
   * Inscription d'un nouveau commerce.
   * infos = { type, nom, pays, ville, telephone, gerantNom, gerantTelephone, gerantPin, conditionsAccepteesLe }
   * Renvoie (promesse) un message d'erreur, ou null.
   */
  async inscrire(infos) {
    if (!API_ACTIVE) {
      // Version de test sans serveur : commerce gardé dans le navigateur
      const d = creerCommerce(infos);
      set({ d });
      get().ouvrirSession(d.utilisateurs[0]);
      get().message(tr('Bienvenue sur Kaislo ! Essai gratuit de 30 jours activé.'));
      return null;
    }
    set({ connexionEnCours: true });
    try {
      const rep = await appelApi('POST', '/inscription', {
        commerce: { nom: infos.nom, type: infos.type, pays: infos.pays, ville: infos.ville, telephone: infos.telephone },
        gerant: { nom: infos.gerantNom, telephone: infos.gerantTelephone, pin: infos.gerantPin },
        conditionsAcceptees: !!infos.conditionsAccepteesLe,
        codeParrain: infos.codeParrain || '', // commercial Kaislo qui a présenté l'application
        appareil: nomAppareil(),
      });
      const d = creerCommerce(infos, rep);
      noterTout(d); // catégories de départ et réglages envoyés au serveur
      const cle = cleTelephone(infos.gerantTelephone);
      const sel = crypto.getRandomValues(new Uint32Array(2)).join('-');
      get().sauverPrefs({
        commerceAppareil: d.commerce.id,
        jetons: { ...(get().prefs.jetons || {}), [rep.utilisateur.id]: rep.jeton },
        pinsHors: { ...(get().prefs.pinsHors || {}), [cle]: { sel, hash: await empreintePin(sel, infos.gerantPin), utilisateurId: rep.utilisateur.id, commerceId: d.commerce.id } },
      });
      if (get().prefs.codeParrain) get().sauverPrefs({ codeParrain: null }); // code utilisé
      set({ d });
      get().ouvrirSession(d.utilisateurs[0]);
      get().demarrerSynchro();
      get().message(tr('Bienvenue sur Kaislo ! Essai gratuit de 30 jours activé.'));
      get().proposerBiometrie(d.utilisateurs[0]);
      return null;
    } catch (e) {
      return e.horsLigne ? tr('Pas de connexion internet : l’inscription demande internet.') : e.message;
    } finally {
      set({ connexionEnCours: false });
    }
  },

  // --- Rôles et droits ---
  estGerant() {
    return get().utilisateur?.role === 'gerant';
  },

  // Droits donnés par le gérant à chaque vendeur :
  //   'peutGererProduits' : ajouter / modifier les produits et le stock
  //   'peutFaireRemises'  : accorder des remises
  peut(droit) {
    const u = get().utilisateur;
    return u?.role === 'gerant' || !!u?.[droit];
  },

  // Stock et inventaire : activés par défaut pour épiceries et boutiques,
  // et possibles pour tous (réglage « Gestion du stock et de l'inventaire »)
  gereStock() {
    const c = get().d?.commerce;
    return c?.gestionStock ?? typeCommerce(c?.type).gereStock;
  },

  aTables() {
    return (get().d?.commerce.tables || []).length > 0;
  },

  estDemoActuel() {
    return estDemo(get().d?.commerce.id);
  },
});
