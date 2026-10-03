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
import { imprimerSysteme } from '@/lib/impression/systeme.js';
import { lireLocal, ecrireLocal } from '@/lib/donnees/stockage.js';
import { estServeur } from '@/lib/donnees/synchro.js';
import { posteParId } from '@/lib/donnees/postes.js';

// Tickets venus d'autres appareils : imprimés s'ils datent de moins de 15 minutes
const FRAICHEUR_MS = 15 * 60000;

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

  // Imprime une liste de lignes déjà mise en page.
  // Sans imprimante Bluetooth (iPhone, ordinateur…) : fenêtre d'impression du système
  // (imprimante AirPrint, imprimante de tickets USB ou réseau).
  async imprimer(lignes, messageOk = 'Ticket imprimé') {
    const { imprimante } = get();
    if (!imprimante.connectee && !imprimante.nom) {
      await imprimerSysteme(lignes, get().prefs.largeurTicket);
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

  // Commerce en ligne, appareil sans imprimante : le ticket part sur l'imprimante de son poste
  doitEnvoyerAuPoste(vente) {
    const { imprimante, prefs, d } = get();
    return estServeur(d) && !imprimante.connectee && !!vente.posteId && prefs.posteAppareil !== vente.posteId;
  },
  nomPoste(posteId) {
    return posteParId(get().d, posteId).nom;
  },
  envoyerAuPoste(vente) {
    get().majDonnees((d) => ({ ventes: d.ventes.map((v) => (v.id === vente.id ? { ...v, impressionDemandee: new Date().toISOString() } : v)) }));
    get().message('Ticket envoyé à l’imprimante du poste « ' + get().nomPoste(vente.posteId) + ' »');
  },

  /**
   * Appareil désigné comme poste (Réglages → Postes), relié à une imprimante Bluetooth :
   * imprime les tickets et les envois en cuisine faits sur les téléphones de ses vendeurs.
   * Appelé après chaque synchronisation.
   */
  async imprimerPourPoste() {
    const { prefs, d, imprimante } = get();
    const poste = prefs.posteAppareil;
    if (!poste || !imprimante.connectee || !estServeur(d)) return;
    const cle = 'imprimes:' + d.commerce.id;
    const deja = new Set(lireLocal(cle) || []);
    const limite = Date.now() - FRAICHEUR_MS;
    const recent = (date) => date && new Date(date).getTime() > limite;
    const aFaire = [];
    for (const v of d.ventes || []) {
      if (v.posteId !== poste) continue;
      // Nouvelle vente d'un autre appareil (si l'impression automatique est active), ou demande d'impression
      const nouvelle = v.appareil !== prefs.appareilId && recent(v.date) && prefs.impressionAuto !== false;
      if (nouvelle && !deja.has(v.id)) aFaire.push([v.id, () => get().lignesVente(v)]);
      if (recent(v.impressionDemandee) && !deja.has(v.id + '@' + v.impressionDemandee)) aFaire.push([v.id + '@' + v.impressionDemandee, () => get().lignesVente(v)]);
    }
    for (const c of d.commandes || []) {
      for (const envoi of c.envoisCuisine || []) {
        if (envoi.posteId === poste && envoi.appareil !== prefs.appareilId && recent(envoi.le) && !deja.has(envoi.id)) {
          aFaire.push([envoi.id, () => get().lignesCuisine(c, envoi.lignes)]);
        }
      }
    }
    for (const [id, lignes] of aFaire) {
      deja.add(id);
      ecrireLocal(cle, [...deja].slice(-500));
      await get().imprimer(lignes(), 'Ticket du poste imprimé');
    }
  },

  imprimerTest() {
    return get().imprimer(ticketTest(get().d.commerce, get().prefs.largeurTicket), 'Ticket test envoyé');
  },
});
