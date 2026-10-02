// ------------------------------------------------------------
// CLÔTURE DE CAISSE : en fin de journée (ou de service), le vendeur
// compte les espèces. L'application compare avec ce qui est attendu
// et imprime un ticket de clôture.
// ------------------------------------------------------------
import { genId, arrondir } from '../utils/format.js';
import { calculerCloture, debutCloture } from '../donnees/cloture.js';
import { construireTicketCloture, imprimerCloture } from '../impression/index.js';

export const cloture = {
  clotureEnCours: null, // calcul affiché dans la fenêtre de clôture
  montantCompte: null,
  clotureAffichee: null, // clôture dont on montre le ticket

  ouvrirCloture() {
    if (!this.d.clotures) this.d.clotures = [];
    this.clotureEnCours = { fondDeCaisse: this.d.commerce.fondDeCaisse || 0 };
    this.recalculerCloture();
    this.montantCompte = null;
    this.feuille = 'cloture';
  },

  // Recalcule quand le fond de caisse change
  recalculerCloture() {
    const fin = new Date();
    const debut = debutCloture(this.d.clotures, fin);
    this.clotureEnCours = calculerCloture(this.d, debut, fin, this.clotureEnCours.fondDeCaisse);
  },

  ecartCloture() {
    if (this.montantCompte === null || this.montantCompte === '') return null;
    return arrondir(Number(this.montantCompte) - this.clotureEnCours.attendu, this.devise());
  },

  async validerCloture() {
    const ecart = this.ecartCloture();
    if (ecart === null) return this.message('Comptez les espèces et saisissez le montant', 'erreur');
    this.recalculerCloture(); // au cas où une vente a eu lieu entre-temps
    const cl = {
      id: genId('z'),
      date: new Date().toISOString(),
      utilisateurNom: this.utilisateur.nom,
      ...this.clotureEnCours,
      compte: Number(this.montantCompte),
      ecart: arrondir(Number(this.montantCompte) - this.clotureEnCours.attendu, this.devise()),
    };
    this.d.clotures.push(cl);
    this.sauvegarder();
    this.clotureAffichee = cl;
    this.feuille = 'ticketCloture';
    if (this.imprimante.connectee) this.imprimerTicketCloture(cl);
  },

  // Les dernières clôtures (tableau de bord du gérant)
  dernieresClotures() {
    return [...(this.d.clotures || [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
  },

  ouvrirTicketCloture(cl) {
    this.clotureAffichee = cl;
    this.feuille = 'ticketCloture';
  },

  lignesTicketCloture(cl) {
    return cl ? construireTicketCloture(cl, this.d.commerce, this.prefs.largeurTicket) : [];
  },

  async imprimerTicketCloture(cl) {
    if (!this.imprimante.connectee && !this.imprimante.nom) {
      return this.message('Connectez d’abord une imprimante', 'erreur');
    }
    this.impressionEnCours = true;
    try {
      await imprimerCloture(cl, this.d.commerce, this.prefs);
      this.message('Ticket de clôture imprimé');
    } catch (e) {
      this.message('Impression impossible : ' + e.message, 'erreur');
    } finally {
      this.impressionEnCours = false;
    }
  },

  // Texte et couleur de l'écart
  libelleEcart(ecart) {
    if (ecart === 0) return 'Caisse juste';
    return ecart < 0 ? 'Manque ' + this.prix(-ecart) : 'Excédent ' + this.prix(ecart);
  },

  classeEcart(ecart) {
    return ecart === 0 ? '' : ecart < 0 ? 'rouge' : 'safran';
  },
};
