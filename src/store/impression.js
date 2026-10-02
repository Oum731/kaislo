// ------------------------------------------------------------
// IMPRESSION : état de l'imprimante Bluetooth et impression des tickets
// ------------------------------------------------------------
import {
  etatImprimante,
  surChangementImprimante,
  connecterImprimante,
  deconnecterImprimante,
  imprimerLignes,
  construireTicket,
  construireTicketCloture,
  construireTicketCuisine,
  construireTicketRemboursement,
  ticketEnTexteWhatsApp,
  ticketTest,
} from '@/lib/impression/index.js';
import { numeroWhatsApp } from '@/lib/donnees/modeles.js';

export const trancheImpression = (set, get) => ({
  imprimante: { disponible: false, connectee: false, nom: '' },
  impressionEnCours: false,

  initImprimante() {
    set({ imprimante: etatImprimante() });
    surChangementImprimante((etat) => set({ imprimante: etat }));
  },

  async connecterImprimante() {
    try {
      await connecterImprimante();
      get().message('Imprimante connectée : ' + get().imprimante.nom);
    } catch (e) {
      // "NotFoundError" = la personne a fermé la fenêtre sans choisir
      if (e.name !== 'NotFoundError') get().message(e.message, 'erreur');
    }
  },

  deconnecterImprimante() {
    deconnecterImprimante();
    get().message('Imprimante déconnectée');
  },

  // Imprime une liste de lignes déjà mise en page
  async imprimer(lignes, messageOk = 'Ticket imprimé') {
    const { imprimante } = get();
    if (!imprimante.connectee && !imprimante.nom) {
      get().message('Connectez d’abord une imprimante (menu Imprimante)', 'erreur');
      return;
    }
    set({ impressionEnCours: true });
    try {
      await imprimerLignes(lignes, get().prefs);
      get().message(messageOk);
    } catch (e) {
      get().message('Impression impossible : ' + e.message, 'erreur');
    } finally {
      set({ impressionEnCours: false });
    }
  },

  // Les différents tickets (mis en page pour la largeur de papier choisie)
  lignesVente(vente) {
    return construireTicket(vente, get().d.commerce, get().prefs.largeurTicket);
  },
  lignesCloture(cl) {
    return construireTicketCloture(cl, get().d.commerce, get().prefs.largeurTicket);
  },
  lignesCuisine(commande, lignes) {
    return construireTicketCuisine(commande, lignes, get().d.commerce, get().prefs.largeurTicket);
  },
  lignesRemboursement(r, client, soldeApres) {
    return construireTicketRemboursement(r, client, soldeApres, get().d.commerce, get().prefs.largeurTicket);
  },

  imprimerVente(vente) {
    return get().imprimer(get().lignesVente(vente));
  },
  imprimerCloture(cl) {
    return get().imprimer(get().lignesCloture(cl), 'Ticket de clôture imprimé');
  },
  imprimerCuisine(commande, lignes) {
    return get().imprimer(get().lignesCuisine(commande, lignes), 'Ticket cuisine imprimé');
  },
  imprimerRemboursement(r, client, soldeApres) {
    return get().imprimer(get().lignesRemboursement(r, client, soldeApres), 'Reçu imprimé');
  },
  /**
   * Lien WhatsApp qui ouvre la conversation avec le client, reçu déjà écrit.
   * Le numéro est enregistré sur la vente (pour un nouvel envoi plus tard).
   */
  lienWhatsAppRecu(vente, telephone) {
    const { d } = get();
    const numero = numeroWhatsApp(telephone, d.commerce.pays);
    if (numero.replace(/\D/g, '').length < 8) {
      get().message('Numéro de téléphone incomplet', 'erreur');
      return null;
    }
    if (telephone !== vente.telephoneClient) {
      get().majDonnees((x) => ({ ventes: x.ventes.map((v) => (v.id === vente.id ? { ...v, telephoneClient: telephone } : v)) }));
    }
    const texte = ticketEnTexteWhatsApp(get().lignesVente(vente), d.commerce);
    return 'https://wa.me/' + numero + '?text=' + encodeURIComponent(texte);
  },

  imprimerTest() {
    return get().imprimer(ticketTest(get().d.commerce, get().prefs.largeurTicket), 'Ticket test envoyé');
  },
});
