// ------------------------------------------------------------
// Gestion de l'imprimante côté écran (boutons, messages, aperçu)
// ------------------------------------------------------------
import {
  construireTicket,
  etatImprimante,
  surChangementImprimante,
  connecterImprimante,
  deconnecterImprimante,
  imprimerVente,
  imprimerTest,
} from '../impression/index.js';

export const imprimante = {
  imprimante: etatImprimante(),
  impressionEnCours: false,

  initImprimante() {
    surChangementImprimante((etat) => (this.imprimante = etat));
  },

  async connecterImprimante() {
    try {
      await connecterImprimante();
      this.message('Imprimante connectée : ' + this.imprimante.nom);
    } catch (e) {
      // "NotFoundError" = l'utilisateur a fermé la fenêtre sans choisir
      if (e.name !== 'NotFoundError') this.message(e.message, 'erreur');
    }
  },

  deconnecterImprimante() {
    deconnecterImprimante();
    this.message('Imprimante déconnectée');
  },

  async imprimerTicket(vente) {
    if (!this.imprimante.connectee && !this.imprimante.nom) {
      return this.message('Connectez d’abord une imprimante (menu Imprimante)', 'erreur');
    }
    this.impressionEnCours = true;
    try {
      await imprimerVente(vente, this.d.commerce, this.prefs);
      this.message('Ticket imprimé');
    } catch (e) {
      this.message('Impression impossible : ' + e.message, 'erreur');
    } finally {
      this.impressionEnCours = false;
    }
  },

  async imprimerTest() {
    this.impressionEnCours = true;
    try {
      await imprimerTest(this.d.commerce, this.prefs);
    } catch (e) {
      this.message('Impression impossible : ' + e.message, 'erreur');
    } finally {
      this.impressionEnCours = false;
    }
  },

  changerLargeur(mm) {
    this.prefs.largeurTicket = mm;
    this.sauverPrefs();
  },

  basculerAccents() {
    this.prefs.accents = !this.prefs.accents;
    this.sauverPrefs();
  },

  // Lignes du ticket pour l'aperçu à l'écran
  lignesTicket(vente) {
    return vente ? construireTicket(vente, this.d.commerce, this.prefs.largeurTicket) : [];
  },
};
