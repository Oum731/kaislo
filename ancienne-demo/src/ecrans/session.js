// ------------------------------------------------------------
// ÉCRAN DE CONNEXION ET D'INSCRIPTION
//  - accueil : créer mon commerce / mes commerces / démos
//  - inscription en 3 étapes : type -> commerce -> gérant
//  - choix de l'utilisateur puis code PIN
// ------------------------------------------------------------
import { chargerCommerce, listeComptes, creerCommerce, estDemo } from '../donnees/stockage.js';
import { COMMERCES_DEMO } from '../donnees/demo.js';
import { TYPES_COMMERCE, PAYS, paysParId, typeCommerce } from '../donnees/modeles.js';

export const session = {
  commercesDemo: COMMERCES_DEMO,
  comptes: listeComptes(), // commerces créés sur ce téléphone
  typesCommerce: TYPES_COMMERCE,
  pays: PAYS,
  etapeConnexion: 'commerce', // 'commerce' | 'inscription' | 'utilisateur' | 'pin'
  utilisateurChoisi: null,
  pin: '',
  pinErreur: false,
  // inscription
  etapeInscription: 1,
  inscription: null,

  // Rouvre la dernière session (pratique pendant une démo)
  restaurerSession() {
    const s = this.prefs.session;
    if (!s) return;
    this.d = chargerCommerce(s.commerceId);
    if (!this.d) return; // commerce supprimé entre-temps
    const u = this.d.utilisateurs.find((x) => x.id === s.utilisateurId && x.actif);
    if (u) this.ouvrirSession(u);
    else this.etapeConnexion = 'utilisateur';
  },

  choisirCommerce(id) {
    this.d = chargerCommerce(id);
    if (!this.d) return this.message('Ce commerce n’existe plus sur ce téléphone', 'erreur');
    this.etapeConnexion = 'utilisateur';
  },

  utilisateursConnexion() {
    return this.d.utilisateurs.filter((u) => u.actif);
  },

  choisirUtilisateur(u) {
    this.utilisateurChoisi = u;
    this.pin = '';
    this.pinErreur = false;
    this.etapeConnexion = 'pin';
  },

  taperPin(chiffre) {
    if (this.pin.length >= 4) return;
    this.pinErreur = false;
    this.pin += chiffre;
    if (this.pin.length === 4) setTimeout(() => this.verifierPin(), 120);
  },

  effacerPin() {
    this.pin = this.pin.slice(0, -1);
  },

  verifierPin() {
    if (this.pin === this.utilisateurChoisi.pin) {
      this.ouvrirSession(this.utilisateurChoisi);
    } else {
      this.pinErreur = true;
      this.pin = '';
      navigator.vibrate?.(200);
    }
  },

  ouvrirSession(u) {
    this.utilisateur = u;
    this.prefs.session = { commerceId: this.d.commerce.id, utilisateurId: u.id };
    this.sauverPrefs();
    this.ecran = u.role === 'gerant' ? 'stats' : 'caisse';
    this.panier = [];
    this.categorieActive = 'tout';
    // Si aucune vente aujourd'hui (tôt le matin), on montre la semaine
    this.periodeStats = 'jour';
    this.rafraichirStats();
    if (!this.s.nb && this.d.ventes.length) this.choisirPeriode('semaine');
  },

  seDeconnecter() {
    this.utilisateur = null;
    this.prefs.session = null;
    this.sauverPrefs();
    this.fermerFeuille();
    this.etapeConnexion = 'utilisateur';
    this.pin = '';
  },

  changerDeCommerce() {
    this.seDeconnecter();
    this.d = null;
    this.comptes = listeComptes();
    this.etapeConnexion = 'commerce';
  },

  retourConnexion() {
    if (this.etapeConnexion === 'pin') this.etapeConnexion = 'utilisateur';
    else if (this.etapeConnexion === 'inscription' && this.etapeInscription > 1) this.etapeInscription--;
    else this.etapeConnexion = 'commerce';
  },

  // --- Rôles et droits ---
  estGerant() {
    return this.utilisateur?.role === 'gerant';
  },

  // Le gérant décide, pour chaque vendeur, s'il peut ajouter/modifier des produits
  peutGererProduits() {
    return this.estGerant() || !!this.utilisateur?.peutGererProduits;
  },

  // Épiceries et autres commerces : code-barres + stock
  gereStock() {
    return typeCommerce(this.d?.commerce.type).gereStock;
  },

  typeCommerceNom() {
    return typeCommerce(this.d?.commerce.type).nom;
  },

  estDemoActuel() {
    return estDemo(this.d?.commerce.id);
  },

  // --- Inscription d'un nouveau commerce ---
  commencerInscription() {
    this.inscription = {
      type: '',
      nom: '',
      pays: 'CI',
      ville: '',
      telephone: '',
      gerantNom: '',
      gerantPin: '',
      gerantPin2: '',
    };
    this.etapeInscription = 1;
    this.etapeConnexion = 'inscription';
  },

  choisirType(type) {
    this.inscription.type = type;
    this.etapeInscription = 2;
  },

  deviseInscription() {
    return paysParId(this.inscription.pays).devise === 'MAD' ? 'Dirham (DH)' : 'Franc CFA';
  },

  validerEtapeCommerce() {
    const i = this.inscription;
    if (!i.nom.trim()) return this.message('Indiquez le nom de votre commerce', 'erreur');
    if (!i.ville.trim()) return this.message('Indiquez la ville', 'erreur');
    this.etapeInscription = 3;
  },

  terminerInscription() {
    const i = this.inscription;
    if (!i.gerantNom.trim()) return this.message('Indiquez votre nom', 'erreur');
    if (!/^\d{4}$/.test(i.gerantPin)) return this.message('Le code PIN doit contenir 4 chiffres', 'erreur');
    if (i.gerantPin !== i.gerantPin2) return this.message('Les deux codes PIN ne sont pas identiques', 'erreur');

    this.d = creerCommerce({
      type: i.type,
      nom: i.nom.trim(),
      pays: i.pays,
      ville: i.ville.trim(),
      telephone: i.telephone.trim(),
      gerantNom: i.gerantNom.trim(),
      gerantPin: i.gerantPin,
    });
    this.comptes = listeComptes();
    this.inscription = null;
    this.ouvrirSession(this.d.utilisateurs[0]);
    this.message('Bienvenue sur Kaisly !');
  },

  // --- Premiers pas (affichés au gérant d'un nouveau commerce) ---
  premiersPas() {
    if (!this.d) return [];
    return [
      { fait: this.d.produits.length > 0, titre: 'Ajoutez vos produits', texte: 'Plats, boissons, articles… avec leurs prix et options', action: () => this.allerA('catalogue') },
      { fait: this.d.utilisateurs.some((u) => u.role === 'vendeur'), titre: 'Créez vos vendeurs', texte: 'Chacun aura son propre code PIN', action: () => { this.ongletReglages = 'equipe'; this.allerA('reglages'); } },
      { fait: this.imprimante.connectee, titre: 'Connectez l’imprimante', texte: 'Imprimante thermique Bluetooth', action: () => this.allerImprimante() },
      { fait: this.d.ventes.length > 0, titre: 'Faites votre première vente', texte: 'Depuis l’écran Caisse', action: () => this.allerA('caisse') },
    ];
  },

  afficherPremiersPas() {
    return this.estGerant() && !this.estDemoActuel() && this.premiersPas().some((p) => !p.fait);
  },
};
