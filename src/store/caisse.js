// ------------------------------------------------------------
// CAISSE : panier, validation de la vente, remise, vente à crédit,
// commandes par table (restaurant), envoi en cuisine, annulation.
// ------------------------------------------------------------
import { creerLigne, cleLigne, sousTotal, montantRemise } from '@/lib/donnees/vente.js';
import { soldeClient } from '@/lib/donnees/credit.js';
import { CREDIT } from '@/lib/donnees/modeles.js';
import { arrondir, genId } from '@/lib/utils/format.js';
import { estServeur } from '@/lib/donnees/synchro.js';
import { appelApi } from '@/lib/api.js';

export const trancheCaisse = (set, get) => ({
  panier: [], // lignes en cours
  remise: null, // { type: 'pourcent' | 'montant', valeur }
  commandeActive: null, // id de la commande (table) en cours de modification
  derniereVente: null,
  // choix en cours dans le panier (gardés quand on passe d'une fenêtre à l'autre)
  paiementChoisi: null,
  montantRecu: null,
  clientCredit: null,
  // commande d'un client qui n'est pas sur place (reçu envoyé par WhatsApp)
  aDistance: false,
  telephoneDistance: '',

  // --- Panier ---
  ajouterAuPanier(produit, choix, quantite) {
    const { d } = get();
    const cat = d.categories.find((c) => c.id === produit.categorieId);
    const ligne = creerLigne(produit, choix, quantite, d.commerce.devise, cat?.nom);
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
    if (produit.suiviStock && produit.stock <= 0) {
      get().message('Stock de « ' + produit.nom + ' » à zéro : pensez à le mettre à jour', 'erreur');
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

  viderPanier() {
    set({ panier: [], remise: null, commandeActive: null, paiementChoisi: null, montantRecu: null, clientCredit: null, aDistance: false, telephoneDistance: '' });
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
      get().message('Ouvrez d’abord la caisse du jour', 'erreur');
      get().ouvrir('ouverture');
      return null;
    }
    if (paiement === CREDIT && !client) {
      get().message('Choisissez le client pour une vente à crédit', 'erreur');
      return null;
    }
    const t = get().totaux();
    if (paiement === 'Espèces' && recu > 0 && recu < t.total) {
      get().message('Le montant reçu est inférieur au total', 'erreur');
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
      paiement,
      recu: paiement === 'Espèces' && recu > 0 ? recu : 0,
      clientId: client?.id || null,
      clientNom: client?.nom || null,
      table: commande?.table || null,
      // Client à distance : on garde son numéro pour lui envoyer le reçu par WhatsApp
      aDistance: get().aDistance || undefined,
      telephoneClient: (get().aDistance && get().telephoneDistance.trim()) || client?.telephone || undefined,
      lignes: panier.map(({ envoyee, ...l }) => l),
      sousTotal: t.sousTotal,
      remise: t.remise,
      remiseInfo: t.remise > 0 ? remise : null,
      total: t.total,
    };
    if (client) vente.soldeClientApres = soldeClient(d0, client.id) + vente.total;

    get().majDonnees((d) => ({
      ventes: [...d.ventes, vente],
      prochainNumero: d.prochainNumero + 1,
      // Le stock baisse
      produits: d.produits.map((p) => {
        if (!p.suiviStock) return p;
        const q = vente.lignes.filter((l) => l.produitId === p.id).reduce((s, l) => s + l.quantite, 0);
        return q ? { ...p, stock: Math.max(0, p.stock - q) } : p;
      }),
      // La table est libérée
      commandes: commande ? d.commandes.filter((c) => c.id !== commande.id) : d.commandes,
    }));
    set({ panier: [], remise: null, commandeActive: null, derniereVente: vente, paiementChoisi: null, montantRecu: null, clientCredit: null, aDistance: false, telephoneDistance: '' });
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
      get().message('Pas de connexion internet : le code du gérant ne peut pas être vérifié ici', 'erreur');
      return false;
    }
  },

  async annulerVente(vente, pin, motif) {
    const gerant = await get().verifierPinGerant(pin);
    if (gerant === false) return false; // message déjà affiché
    if (!gerant) {
      get().message('Code PIN du gérant incorrect', 'erreur');
      return false;
    }
    const annulee = { ...vente, annulee: { date: new Date().toISOString(), par: gerant.nom, motif: motif.trim() } };
    get().majDonnees((d) => ({
      ventes: d.ventes.map((v) => (v.id === vente.id ? annulee : v)),
      // Les articles reviennent dans le stock
      produits: d.produits.map((p) => {
        if (!p.suiviStock) return p;
        const q = vente.lignes.filter((l) => l.produitId === p.id).reduce((s, l) => s + l.quantite, 0);
        return q ? { ...p, stock: p.stock + q } : p;
      }),
    }));
    get().ouvrir('ticket', { vente: annulee });
    get().message('Vente n° ' + vente.numero + ' annulée');
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
    get().majDonnees((d) => ({
      commandes: d.commandes.map((c) => (c.id === commande.id ? { ...c, lignes } : c)),
    }));
    set({ panier: [], commandeActive: null, remise: null });
    if (nouvelles.length) {
      get().ouvrir('cuisine', { commande, lignes: nouvelles });
      if (get().imprimante.connectee) get().imprimerCuisine(commande, nouvelles);
    } else {
      get().message(commande.table + ' enregistrée');
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

  // Libère une table sans encaisser (erreur, client parti) : gérant seulement
  libererTable(commandeId) {
    get().majDonnees((d) => ({ commandes: d.commandes.filter((c) => c.id !== commandeId) }));
    if (get().commandeActive === commandeId) set({ panier: [], commandeActive: null });
    get().message('Table libérée');
  },
});
