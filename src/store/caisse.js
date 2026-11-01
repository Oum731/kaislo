// ------------------------------------------------------------
// CAISSE : panier, validation de la vente, remise, vente à crédit,
// commandes par table (restaurant), envoi en cuisine, annulation.
// ------------------------------------------------------------
import { stockDe } from '@/lib/donnees/stock.js';
import { creerLigne, cleLigne, sousTotal, montantRemise } from '@/lib/donnees/vente.js';
import { produitPourMode, aPrixGros } from '@/lib/donnees/gros.js';
import { soldeClient } from '@/lib/donnees/credit.js';
import { CREDIT } from '@/lib/donnees/modeles.js';
import { arrondir, genId } from '@/lib/utils/format.js';
import { estServeur } from '@/lib/donnees/synchro.js';
import { appelApi } from '@/lib/api.js';
import { posteDuTicket } from '@/lib/donnees/postes.js';
import { tr } from '@/lib/i18n';

export const trancheCaisse = (set, get) => ({
  panier: [], // lignes en cours
  remise: null, // { type: 'pourcent' | 'montant', valeur }
  commandeActive: null, // id de la commande (table) en cours de modification
  derniereVente: null,
  refPaiement: '', // virement : nom du client ou référence du virement (facultatif)
  modeGros: false, // « Détail » ou « Gros » : le prix affiché et vendu est celui du mode (voir lib/donnees/gros.js)
  // choix en cours dans le panier (gardés quand on passe d'une fenêtre à l'autre)
  paiementChoisi: null,
  montantRecu: null,
  clientCredit: null,
  // commande d'un client qui n'est pas sur place (reçu envoyé par WhatsApp)
  aDistance: false,
  telephoneDistance: '',
  ongletVentes: null, // onglet à ouvrir dans l'écran Ventes (« depenses » depuis l'accueil) ; null = Tickets
  commandeEnLigne: null, // commande de la boutique en ligne qu'on est en train d'encaisser : { id, numero } (gardée sur la vente)

  // --- Panier ---
  // plus.demi : un demi-carton (mode gros seulement, article qui a un prix de demi-carton)
  ajouterAuPanier(produit, choix, quantite, plus = {}) {
    const { d } = get();
    const cat = d.categories.find((c) => c.id === produit.categorieId);
    const vendu = produitPourMode(produit, get().modeGros, !!plus.demi); // au carton en mode gros (si l'article a un prix de gros)
    const ligne = creerLigne(vendu, choix, quantite, d.commerce.devise, cat?.nom);
    const panier = [...get().panier];
    // Même article avec les mêmes options, pas encore envoyé en cuisine : on additionne
    const i = panier.findIndex((l) => !l.envoyee && cleLigne(l) === cleLigne(ligne));
    if (i >= 0) {
      const q = panier[i].quantite + quantite;
      panier[i] = { ...panier[i], quantite: q, total: arrondir(panier[i].prixUnitaire * q, d.commerce.devise) };
    } else {
      panier.push(ligne);
    }
    set({ panier });
    const contenance = vendu._gros?.contenance || 1;
    if (produit.suiviStock && stockDe(produit) <= 0) {
      get().message(tr('Stock de « {0} » à zéro : pensez à le mettre à jour', [produit.nom]), 'erreur');
    } else if (produit.suiviStock && contenance > 1 && panier[i >= 0 ? i : panier.length - 1].quantite * contenance > stockDe(produit)) {
      get().message(tr('Stock de « {0} » : {1} seulement', [produit.nom, stockDe(produit)]), 'erreur');
    }
    // Prix de gros : nombre de cartons conseillé (avertissement, jamais un blocage)
    const l = panier[i >= 0 ? i : panier.length - 1];
    if (vendu._gros && l.quantite === 1 && l.quantite < vendu._gros.minimum) {
      get().message(tr('Prix de gros à partir de {0} {1}', [vendu._gros.minimum, vendu._gros.unite]), 'erreur');
    }
    if (typeof navigator !== 'undefined') navigator.vibrate?.(15);
  },

  changerQuantite(index, delta) {
    const dev = get().devise();
    const panier = get().panier
      .map((l, i) => (i === index ? { ...l, quantite: l.quantite + delta, total: arrondir(l.prixUnitaire * (l.quantite + delta), dev) } : l))
      .filter((l) => l.quantite > 0);
    set({ panier });
  },

  // Passe de « Détail » à « Gros » (ou l'inverse) : les articles du panier qui ont un prix de gros sont refaits au nouveau prix.
  // Les quantités repartent à 1 (un carton n'est pas 24 pièces) : le message invite à les vérifier.
  choisirModeGros(gros) {
    if (get().modeGros === gros) return;
    const { d } = get();
    let change = false;
    const panier = get().panier.map((l) => {
      const p = d.produits.find((x) => x.id === l.produitId);
      if (!p || l.envoyee || !aPrixGros(p)) return l;
      change = true;
      const cat = d.categories.find((c) => c.id === p.categorieId);
      return creerLigne(produitPourMode(p, gros), {}, 1, d.commerce.devise, cat?.nom);
    });
    set({ modeGros: gros, panier });
    if (change) get().message(gros ? tr('Prix de gros appliqués : vérifiez les quantités (au carton)') : tr('Prix de détail appliqués : vérifiez les quantités (à la pièce)'), 'erreur');
  },

  viderPanier() {
    set({ refPaiement: '', modeGros: false, panier: [], remise: null, commandeActive: null, paiementChoisi: null, montantRecu: null, clientCredit: null, aDistance: false, telephoneDistance: '', commandeEnLigne: null });
  },

  definirRemise(remise) {
    set({ remise });
  },

  // Totaux du panier
  totaux() {
    const { panier, remise } = get();
    const dev = get().devise();
    const st = sousTotal(panier, dev);
    const r = montantRemise(remise, st, dev);
    return { sousTotal: st, remise: r, total: arrondir(st - r, dev), nbArticles: panier.reduce((s, l) => s + l.quantite, 0) };
  },

  /**
   * Enregistre la vente.
   * paiement : 'Espèces' | 'Carte' | … | 'Crédit'
   * recu : montant donné par le client (espèces), client : pour le crédit
   */
  validerVente({ paiement, recu = 0, client = null }) {
    const { panier, remise, utilisateur, commandeActive } = get();
    if (!panier.length) return null;
    // On n'encaisse que si la caisse du jour est ouverte
    if (!get().caisseOuverte()) {
      get().message(tr('Ouvrez d’abord la journée'), 'erreur');
      get().ouvrir('ouverture');
      return null;
    }
    if (paiement === CREDIT && !client) {
      get().message(tr('Choisissez le client pour une vente à crédit'), 'erreur');
      return null;
    }
    const t = get().totaux();
    if (paiement === 'Espèces' && recu > 0 && recu < t.total) {
      get().message(tr('Le montant reçu est inférieur au total'), 'erreur');
      return null;
    }
    const d0 = get().d;
    const commande = commandeActive ? d0.commandes.find((c) => c.id === commandeActive) : null;
    const vente = {
      id: genId('v'),
      numero: d0.prochainNumero,
      date: new Date().toISOString(),
      vendeurId: utilisateur.id,
      vendeurNom: utilisateur.nom,
      // Poste dont l'imprimante sort le ticket, et appareil qui a fait la vente
      posteId: posteDuTicket(d0, utilisateur, get().prefs.posteAppareil) || undefined,
      appareil: get().prefs.appareilId,
      paiement,
      recu: paiement === 'Espèces' && recu > 0 ? recu : 0,
      ...(paiement === 'Virement' && get().refPaiement.trim() ? { refPaiement: get().refPaiement.trim().slice(0, 60) } : {}),
      clientId: client?.id || null,
      clientNom: client?.nom || null,
      table: commande?.table || null,
      // Client à distance : on garde son numéro pour lui envoyer le reçu par WhatsApp
      aDistance: get().aDistance || undefined,
      ...(get().commandeEnLigne ? { commandeEnLigne: get().commandeEnLigne } : {}), // lien vente ↔ commande en ligne (modifier ou annuler l'une sait retrouver l'autre)
      telephoneClient: (get().aDistance && get().telephoneDistance.trim()) || client?.telephone || undefined,
      lignes: panier.map(({ envoyee, ...l }) => l),
      ...(panier.some((l) => l.gros) ? { gros: true } : {}), // vente avec des articles au carton (badge dans l'historique)
      sousTotal: t.sousTotal,
      remise: t.remise,
      remiseInfo: t.remise > 0 ? remise : null,
      total: t.total,
    };
    if (client) vente.soldeClientApres = soldeClient(d0, client.id) + vente.total;

    get().majDonnees((d) => ({
      ventes: [...d.ventes, vente],
      prochainNumero: d.prochainNumero + 1,
      // Le stock baisse tout seul : il se calcule à partir des ventes (voir lib/donnees/stock.js)
      // La table est libérée
      commandes: commande ? d.commandes.filter((c) => c.id !== commande.id) : d.commandes,
    }));
    set({ refPaiement: '', modeGros: false, panier: [], remise: null, commandeActive: null, derniereVente: vente, paiementChoisi: null, montantRecu: null, clientCredit: null, aDistance: false, telephoneDistance: '', commandeEnLigne: null });
    get().ouvrir('ticket', { vente, nouvelle: true });
    if (typeof navigator !== 'undefined') navigator.vibrate?.([30, 50, 30]);
    // Impression automatique seulement si une imprimante est connectée ET si l'option est active (facultatif)
    if (get().imprimante.connectee && get().prefs.impressionAuto !== false) get().imprimerVente(vente);
    return vente;
  },

  // --- Annulation (code PIN du gérant obligatoire) ---
  // Commerce en ligne : le code est vérifié par le serveur (il n'est jamais dans l'appareil d'un vendeur).
  // Sans internet, seul le gérant peut annuler, sur un appareil où il s'est déjà connecté.
  async verifierPinGerant(pin) {
    const { d, prefs } = get();
    if (!estServeur(d)) return d.utilisateurs.find((u) => u.role === 'gerant' && u.actif && u.pin === pin) || null;
    try {
      const rep = await appelApi('POST', '/verifier-gerant', { pin }, get().jetonServeur());
      return rep.gerant;
    } catch (e) {
      if (!e.horsLigne) {
        get().message(e.message, 'erreur');
        return false;
      }
      for (const memo of Object.values(prefs.pinsHors || {})) {
        const g = d.utilisateurs.find((u) => u.id === memo.utilisateurId && u.role === 'gerant' && u.actif);
        if (!g) continue;
        const octets = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(memo.sel + ':' + pin));
        if (Array.from(new Uint8Array(octets), (b) => b.toString(16).padStart(2, '0')).join('') === memo.hash) return g;
      }
      get().message(tr('Pas de connexion internet : le code du gérant ne peut pas être vérifié ici'), 'erreur');
      return false;
    }
  },

  // ouvrirTicket : false quand l'annulation fait partie d'un autre geste (commande en ligne annulée ou refaite)
  async annulerVente(vente, pin, motif, { ouvrirTicket = true } = {}) {
    const gerant = await get().verifierPinGerant(pin);
    if (gerant === false) return false; // message déjà affiché
    if (!gerant) {
      get().message(tr('Code PIN du gérant incorrect'), 'erreur');
      return false;
    }
    const annulee = { ...vente, annulee: { date: new Date().toISOString(), par: gerant.nom, motif: motif.trim() } };
    get().majDonnees((d) => ({
      ventes: d.ventes.map((v) => (v.id === vente.id ? annulee : v)),
      // Les articles reviennent dans le stock tout seuls : une vente annulée ne compte plus dans le calcul du stock
    }));
    if (ouvrirTicket) get().ouvrir('ticket', { vente: annulee });
    get().message(tr('Vente n° {0} annulée', [vente.numero]));
    return true;
  },

  // --- Tables (restaurant) ---
  commandeDeTable(table) {
    return (get().d.commandes || []).find((c) => c.table === table) || null;
  },

  // Ouvre une table : sa commande en cours, ou une nouvelle
  ouvrirTable(table) {
    const commande = get().commandeDeTable(table);
    if (commande) {
      set({ panier: commande.lignes.map((l) => ({ ...l })), commandeActive: commande.id, remise: null });
    } else {
      const nouvelle = {
        id: genId('cmd'),
        table,
        ouverteLe: new Date().toISOString(),
        vendeurId: get().utilisateur.id,
        vendeurNom: get().utilisateur.nom,
        lignes: [],
      };
      get().majDonnees((d) => ({ commandes: [...(d.commandes || []), nouvelle] }));
      set({ panier: [], commandeActive: nouvelle.id, remise: null });
    }
    get().allerA('caisse');
  },

  commandeEnCours() {
    const id = get().commandeActive;
    return id ? (get().d.commandes || []).find((c) => c.id === id) || null : null;
  },

  // Enregistre la commande de la table et imprime le ticket cuisine des nouveaux plats
  envoyerEnCuisine() {
    const commande = get().commandeEnCours();
    if (!commande) return;
    const nouvelles = get().panier.filter((l) => !l.envoyee);
    const lignes = get().panier.map((l) => ({ ...l, envoyee: true }));
    // Envoi noté sur la commande : le poste du serveur l'imprime s'il n'est pas sur cet appareil
    const envoi = nouvelles.length ? {
      id: genId('cu'), le: new Date().toISOString(), lignes: nouvelles.map(({ envoyee, ...l }) => l),
      posteId: posteDuTicket(get().d, get().utilisateur, get().prefs.posteAppareil) || undefined, appareil: get().prefs.appareilId,
    } : null;
    get().majDonnees((d) => ({
      commandes: d.commandes.map((c) => (c.id === commande.id ? { ...c, lignes, ...(envoi ? { envoisCuisine: [...(c.envoisCuisine || []), envoi].slice(-10) } : {}) } : c)),
    }));
    set({ panier: [], commandeActive: null, remise: null });
    if (nouvelles.length) {
      get().ouvrir('cuisine', { commande, lignes: nouvelles });
      if (get().imprimante.connectee) get().imprimerCuisine(commande, nouvelles);
    } else {
      get().message(tr('{0} enregistrée', [commande.table]));
      get().allerA('tables');
    }
  },

  // Range le panier sur une table (vente commencée en "direct")
  mettreSurTable(table) {
    const existante = get().commandeDeTable(table);
    const panier = get().panier;
    if (existante) {
      set({ commandeActive: existante.id, panier: [...existante.lignes.map((l) => ({ ...l })), ...panier] });
    } else {
      const nouvelle = {
        id: genId('cmd'),
        table,
        ouverteLe: new Date().toISOString(),
        vendeurId: get().utilisateur.id,
        vendeurNom: get().utilisateur.nom,
        lignes: [],
      };
      get().majDonnees((d) => ({ commandes: [...(d.commandes || []), nouvelle] }));
      set({ commandeActive: nouvelle.id });
    }
    get().envoyerEnCuisine();
  },

  // Quitte la table sans rien changer
  quitterCommande() {
    const commande = get().commandeEnCours();
    // Une table ouverte puis laissée vide est supprimée
    if (commande && !commande.lignes.length) {
      get().majDonnees((d) => ({ commandes: d.commandes.filter((c) => c.id !== commande.id) }));
    }
    set({ panier: [], commandeActive: null, remise: null });
  },

  // Libère une table sans terminer la vente (erreur, client parti) : gérant seulement
  libererTable(commandeId) {
    get().majDonnees((d) => ({ commandes: d.commandes.filter((c) => c.id !== commandeId) }));
    if (get().commandeActive === commandeId) set({ panier: [], commandeActive: null });
    get().message(tr('Table libérée'));
  },
});
