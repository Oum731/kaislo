// ------------------------------------------------------------
// SESSION : connexion par NUMÉRO DE TÉLÉPHONE + CODE PIN,
// inscription d'un commerce, droits.
//
// Le numéro de téléphone identifie la personne et son commerce :
// deux commerces peuvent avoir le même code PIN sans confusion.
// L'appareil reste ensuite relié à ce commerce (et ne montre que lui).
// ------------------------------------------------------------
import { chargerCommerce, creerCommerce, estDemo, trouverParTelephone } from '@/lib/donnees/stockage.js';
import { typeCommerce, cleTelephone } from '@/lib/donnees/modeles.js';
import { etatAbonnement } from '@/lib/donnees/abonnement.js';

export const trancheSession = (set, get) => ({
  etapeConnexion: 'accueil', // 'accueil' | 'inscription' | 'connexion' | 'suspendu'

  // Au démarrage : rouvre le commerce relié à cet appareil (et la dernière session)
  restaurerSession() {
    const { commerceAppareil, session } = get().prefs;
    if (!commerceAppareil) return;
    const d = chargerCommerce(commerceAppareil);
    if (!d) return get().sauverPrefs({ commerceAppareil: null, session: null });
    set({ d });
    if (get().commerceSuspendu()) return set({ etapeConnexion: 'suspendu' });
    const u = session && d.utilisateurs.find((x) => x.id === session.utilisateurId && x.actif);
    if (u) get().ouvrirSession(u);
    else set({ etapeConnexion: 'connexion' });
  },

  // Démos : on relie l'appareil et on affiche l'écran de connexion
  relierAppareil(id) {
    const d = chargerCommerce(id);
    if (!d) return get().message('Ce commerce n’existe pas', 'erreur');
    get().sauverPrefs({ commerceAppareil: id, session: null });
    set({ d, utilisateur: null, etapeConnexion: get().commerceSuspendu() ? 'suspendu' : 'connexion' });
  },

  /**
   * Connexion avec le numéro de téléphone et le code PIN.
   * Renvoie un message d'erreur, ou null si la connexion a réussi.
   */
  connecterParTelephone(telephone, pin) {
    if (!cleTelephone(telephone)) return 'Entrez votre numéro de téléphone';
    if (!/^\d{4}$/.test(String(pin))) return 'Le code PIN contient 4 chiffres';
    const trouve = trouverParTelephone(telephone);
    if (!trouve) return 'Aucun compte Kaisly avec ce numéro';
    const u = trouve.utilisateur;
    if (u.pin !== String(pin)) return 'Numéro ou code PIN incorrect';
    if (!u.actif) return 'Ce compte est désactivé. Demandez à votre gérant de le réactiver.';
    const d = chargerCommerce(trouve.d.commerce.id);
    set({ d });
    get().sauverPrefs({ commerceAppareil: d.commerce.id });
    if (get().commerceSuspendu()) {
      set({ etapeConnexion: 'suspendu' });
      return null;
    }
    get().ouvrirSession(d.utilisateurs.find((x) => x.id === u.id));
    return null;
  },

  // Démos : le visiteur choisit son pays (devise, ville, paiements)
  choisirPaysDemo(pays) {
    get().sauverPrefs({ paysDemo: pays });
  },

  // Personnes déjà connectées sur cet appareil (pour remplir le numéro en un clic)
  comptesRecents() {
    const id = get().d?.commerce.id;
    return (get().prefs.recents || []).filter((r) => r.commerceId === id);
  },

  // Détache l'appareil de son commerce (retour à l'accueil)
  delierAppareil() {
    get().sauverPrefs({ commerceAppareil: null, session: null });
    set({ d: null, utilisateur: null, feuille: null, panier: [], commandeActive: null, etapeConnexion: 'accueil' });
  },

  commerceSuspendu() {
    return etatAbonnement(get().d?.commerce.abonnement).statut === 'suspendu';
  },

  ouvrirSession(u) {
    const id = get().d.commerce.id;
    // Mémorise ce compte comme "récent" sur cet appareil (numéro + nom, jamais le PIN)
    const recents = [{ commerceId: id, telephone: u.telephone || '', nom: u.nom }, ...(get().prefs.recents || []).filter((r) => !(r.commerceId === id && r.nom === u.nom))].slice(0, 8);
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
   * infos = { type, nom, pays, ville, telephone, gerantNom, gerantTelephone, gerantPin }
   */
  inscrire(infos) {
    const d = creerCommerce(infos);
    set({ d });
    get().ouvrirSession(d.utilisateurs[0]);
    get().message('Bienvenue sur Kaisly ! Essai gratuit de 30 jours activé.');
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

  gereStock() {
    return typeCommerce(get().d?.commerce.type).gereStock;
  },

  aTables() {
    return (get().d?.commerce.tables || []).length > 0;
  },

  estDemoActuel() {
    return estDemo(get().d?.commerce.id);
  },
});
