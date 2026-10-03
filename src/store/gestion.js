// ------------------------------------------------------------
// GESTION : produits, catégories, équipe, commerce, tables,
// dépenses, clôtures, clients à crédit, remboursements, stock.
// Chaque action vérifie les données puis appelle majDonnees().
// ------------------------------------------------------------
import { genId, arrondir } from '@/lib/utils/format.js';
import { calculerCloture, caisseOuverte } from '@/lib/donnees/cloture.js';
import { soldeClient } from '@/lib/donnees/credit.js';
import { reinitialiserCommerce, majCompte, supprimerCommerce, telephoneDejaUtilise, enregistrerCommerce } from '@/lib/donnees/stockage.js';
import { estServeur } from '@/lib/donnees/synchro.js';
import { appelApi } from '@/lib/api.js';
import { cleTelephone } from '@/lib/donnees/modeles.js';
import { normaliserTelephone } from '@/lib/donnees/telephone.js';
import { supprimerImage } from '@/lib/donnees/images.js';
import { postesDe, postePlein, vendeursDuPoste } from '@/lib/donnees/postes.js';
import { VENDEURS_PAR_POSTE } from '@/lib/donnees/tarifs.js';

const nombre = (x) => (x === '' || x === null || x === undefined ? null : Number(x));

export const trancheGestion = (set, get) => ({
  // ---------- Produits ----------
  // Renvoie un message d'erreur, ou null si tout va bien
  enregistrerProduit(brouillon) {
    const b = JSON.parse(JSON.stringify(brouillon));
    b.nom = b.nom.trim();
    if (!b.nom) return 'Donnez un nom au produit';
    if (!get().d.categories.some((c) => c.id === b.categorieId)) return 'Choisissez ou créez une catégorie';
    b.prix = nombre(b.prix);
    if (b.prix === null || b.prix < 0) return 'Indiquez un prix';
    b.promo = nombre(b.promo);
    if (b.promo !== null && b.promo >= b.prix) return 'Le prix promo doit être plus petit que le prix normal';
    b.prixAchat = nombre(b.prixAchat);
    b.stock = nombre(b.stock) || 0;
    b.seuilAlerte = nombre(b.seuilAlerte) ?? 5;
    for (const g of b.groupes) {
      g.nom = g.nom.trim();
      g.options = g.options.filter((o) => o.nom.trim());
      if (!g.nom) return 'Chaque groupe d’options doit avoir un nom';
      if (!g.options.length) return 'Le groupe « ' + g.nom + ' » n’a aucune option';
      for (const o of g.options) o.prix = Number(o.prix) || 0;
    }
    get().majDonnees((d) =>
      b.id
        ? { produits: d.produits.map((p) => (p.id === b.id ? b : p)) }
        : { produits: [...d.produits, { ...b, id: genId('p') }] }
    );
    get().message('Produit enregistré');
    return null;
  },

  supprimerProduit(id) {
    supprimerImage(get().d.produits.find((p) => p.id === id)?.image); // sa photo aussi
    get().majDonnees((d) => ({ produits: d.produits.filter((p) => p.id !== id) }));
    get().message('Produit supprimé');
  },

  basculerProduit(id) {
    get().majDonnees((d) => ({ produits: d.produits.map((p) => (p.id === id ? { ...p, actif: !p.actif } : p)) }));
  },

  // ---------- Catégories ----------
  // Gérant, et vendeurs qui ont le droit "produits". Renvoie { erreur } ou { categorie }
  enregistrerCategorie(b) {
    const nom = b.nom.trim();
    if (!nom) return { erreur: 'Donnez un nom à la catégorie' };
    if (get().d.categories.some((c) => c.nom.toLowerCase() === nom.toLowerCase() && c.id !== b.id)) {
      return { erreur: 'Cette catégorie existe déjà' };
    }
    const categorie = { ...b, nom, id: b.id || genId('c') };
    get().majDonnees((d) =>
      b.id
        ? { categories: d.categories.map((c) => (c.id === b.id ? categorie : c)) }
        : { categories: [...d.categories, categorie] }
    );
    get().message('Catégorie « ' + nom + ' » enregistrée');
    return { categorie };
  },

  supprimerCategorie(id) {
    if (get().d.produits.some((p) => p.categorieId === id)) {
      return 'Déplacez ou supprimez d’abord les produits de cette catégorie';
    }
    get().majDonnees((d) => ({ categories: d.categories.filter((c) => c.id !== id) }));
    return null;
  },

  deplacerCategorie(id, sens) {
    const cats = [...get().d.categories];
    const i = cats.findIndex((c) => c.id === id);
    const j = i + sens;
    if (j < 0 || j >= cats.length) return;
    [cats[i], cats[j]] = [cats[j], cats[i]];
    get().majDonnees(() => ({ categories: cats }));
  },

  // ---------- Équipe ----------
  // Commerce en ligne : les vendeurs sont créés par le serveur (qui garde les codes PIN chiffrés).
  // Renvoie (promesse) un message d'erreur, ou null.
  async enregistrerUtilisateur(b) {
    const nom = b.nom.trim();
    const pin = String(b.pin || '').trim();
    const telephone = String(b.telephone || '').trim();
    const { d } = get();
    if (!nom) return 'Indiquez le nom';
    // Poste du vendeur : 5 vendeurs actifs au maximum par poste (le gérant ne compte pas)
    const posteId = b.role === 'gerant' ? undefined : b.posteId || postesDe(d)[0].id;
    if (posteId && b.actif !== false && postePlein(d, posteId, b.id)) return 'Ce poste a déjà ' + VENDEURS_PAR_POSTE + ' vendeurs : créez un autre poste (Réglages → Postes) ou choisissez-en un autre';
    if (estServeur(d)) {
      // Numéro au format international du pays du commerce (le serveur vérifie qu'il est unique)
      const numero = normaliserTelephone(telephone, d.commerce.pays);
      if (!numero.ok) return numero.erreur;
      // Modification d'un vendeur : PIN vide = inchangé
      if ((!b.id || pin) && !/^\d{4}$/.test(pin)) return 'Le code PIN doit contenir 4 chiffres';
      return get().equipeServeur({ id: b.id || undefined, nom, telephone: numero.affichage, pin: pin || undefined, actif: b.actif !== false, peutGererProduits: !!b.peutGererProduits, peutFaireRemises: !!b.peutFaireRemises, posteId }, 'Vendeur enregistré');
    }
    // Le numéro de téléphone sert d'identifiant de connexion : unique dans tout Kaislo
    if (!cleTelephone(telephone)) return 'Indiquez le numéro de téléphone : il sert à se connecter';
    if (telephoneDejaUtilise(telephone, (b.id || 'nouveau') + '@' + d.commerce.id)) return 'Ce numéro est déjà utilisé par un autre compte Kaislo';
    if (!/^\d{4}$/.test(pin)) return 'Le code PIN doit contenir 4 chiffres';
    // Un vendeur ne doit pas avoir le PIN du gérant (qui valide les annulations)
    if (b.role !== 'gerant' && d.utilisateurs.some((u) => u.role === 'gerant' && u.pin === pin)) return 'Choisissez un code PIN différent de celui du gérant';
    const u = { ...b, nom, pin, telephone, ...(posteId ? { posteId } : {}) };
    get().majDonnees((d) =>
      b.id
        ? { utilisateurs: d.utilisateurs.map((x) => (x.id === b.id ? u : x)) }
        : { utilisateurs: [...d.utilisateurs, { ...u, id: genId('u') }] }
    );
    get().message('Vendeur enregistré');
    return null;
  },

  async basculerUtilisateur(id) {
    if (id === get().utilisateur.id) return get().message('Vous ne pouvez pas désactiver votre propre compte', 'erreur');
    const u = get().d.utilisateurs.find((x) => x.id === id);
    if (estServeur(get().d)) {
      const erreur = await get().equipeServeur({ id, nom: u.nom, telephone: u.telephone, actif: !u.actif, peutGererProduits: !!u.peutGererProduits, peutFaireRemises: !!u.peutFaireRemises, posteId: u.posteId }, u.actif ? 'Compte désactivé : ses appareils sont déconnectés' : 'Compte réactivé');
      if (erreur) get().message(erreur, 'erreur');
      return;
    }
    if (!u.actif && u.role !== 'gerant' && postePlein(get().d, u.posteId || 'principal', u.id)) return get().message('Son poste a déjà ' + VENDEURS_PAR_POSTE + ' vendeurs : changez-le de poste avant de le réactiver', 'erreur');
    get().majDonnees((d) => ({ utilisateurs: d.utilisateurs.map((x) => (x.id === id ? { ...x, actif: !x.actif } : x)) }));
  },

  // ---------- Postes (points d'impression) ----------
  // Renvoie un message d'erreur, ou null
  enregistrerPoste(b) {
    const nom = (b.nom || '').trim();
    if (!nom) return 'Donnez un nom au poste (ex : Comptoir, Terrasse, Caisse 2)';
    const actuels = postesDe(get().d);
    if (actuels.some((p) => p.id !== b.id && p.nom.toLowerCase() === nom.toLowerCase())) return 'Un poste porte déjà ce nom';
    get().majDonnees((d) => {
      const liste = d.postes?.length ? d.postes : actuels; // le poste principal devient un vrai poste au premier changement
      return { postes: b.id ? liste.map((p) => (p.id === b.id ? { ...p, nom } : p)) : [...liste, { id: genId('poste'), nom }] };
    });
    get().message(b.id ? 'Poste renommé' : 'Poste « ' + nom + ' » créé');
    return null;
  },

  supprimerPoste(id) {
    const { d } = get();
    if (postesDe(d).length <= 1) return 'Il faut au moins un poste';
    if (vendeursDuPoste(d, id).length) return 'Des vendeurs sont affectés à ce poste : changez-les de poste d’abord';
    get().majDonnees((x) => ({ postes: postesDe(x).filter((p) => p.id !== id) }));
    if (get().prefs.posteAppareil === id) get().sauverPrefs({ posteAppareil: null });
    get().message('Poste supprimé');
    return null;
  },

  // Cet appareil (relié à l'imprimante) devient le poste choisi : il imprimera les tickets de ses vendeurs
  definirPosteAppareil(posteId) {
    get().sauverPrefs({ posteAppareil: posteId || null });
    get().message(posteId ? 'Cet appareil imprime les tickets du poste' : 'Cet appareil n’est plus un poste d’impression');
    if (posteId) get().synchroniser?.();
  },

  // Envoie un vendeur au serveur et met à jour l'équipe de l'appareil (pas de file d'attente : internet obligatoire)
  async equipeServeur(vendeur, messageOk) {
    try {
      const rep = await appelApi('POST', '/utilisateurs', vendeur, get().jetonServeur());
      const d = { ...get().d, utilisateurs: rep.utilisateurs };
      enregistrerCommerce(d);
      const moi = rep.utilisateurs.find((x) => x.id === get().utilisateur.id);
      set({ d, utilisateur: moi || get().utilisateur });
      get().message(messageOk);
      return null;
    } catch (e) {
      return e.horsLigne ? 'Connexion internet nécessaire pour gérer l’équipe' : e.message;
    }
  },

  // ---------- Commerce ----------
  enregistrerInfosCommerce(b) {
    if (!b.nom.trim()) return 'Le nom du commerce est obligatoire';
    const d = get().majDonnees((d) => ({
      commerce: {
        ...d.commerce,
        nom: b.nom.trim(),
        adresse: b.adresse,
        ville: b.ville,
        telephone: b.telephone,
        piedTicket: b.piedTicket,
        fondDeCaisse: Number(b.fondDeCaisse) || 0,
        email: (b.email || '').trim(),
        logo: b.logo || null, // référence de l'image (voir images.js)
        logoSurTicket: b.logoSurTicket === true, // logo sur les reçus : seulement si demandé
        localisation: b.localisation || null, // { lat, lng }
        gestionStock: b.gestionStock, // stock et inventaire (sinon : choix par défaut selon le type de commerce)
      },
    }));
    majCompte(d.commerce);
    get().message('Informations enregistrées');
    return null;
  },

  enregistrerTables(tables) {
    const propres = tables.map((t) => t.trim()).filter(Boolean);
    if (new Set(propres).size !== propres.length) return 'Deux tables ont le même nom';
    get().majDonnees((d) => ({ commerce: { ...d.commerce, tables: propres } }));
    get().message('Tables enregistrées');
    return null;
  },

  reinitialiserDemo() {
    const d = reinitialiserCommerce(get().d.commerce.id);
    set({ d, utilisateur: d.utilisateurs.find((u) => u.role === 'gerant'), panier: [], commandeActive: null });
    get().message('Démo réinitialisée');
  },

  supprimerCeCommerce() {
    supprimerCommerce(get().d.commerce.id);
    get().changerDeCommerce();
    get().message('Commerce supprimé');
  },

  // ---------- Dépenses ----------
  enregistrerDepense(b) {
    const montant = Number(b.montant);
    if (!(montant > 0)) return 'Indiquez le montant de la dépense';
    const x = { ...b, montant, note: (b.note || '').trim() };
    get().majDonnees((d) =>
      b.id
        ? { depenses: d.depenses.map((y) => (y.id === b.id ? x : y)) }
        : { depenses: [...d.depenses, { ...x, id: genId('d'), date: new Date().toISOString(), utilisateurNom: get().utilisateur.nom }] }
    );
    get().message('Dépense enregistrée');
    return null;
  },

  supprimerDepense(id) {
    get().majDonnees((d) => ({ depenses: d.depenses.filter((x) => x.id !== id) }));
  },

  // ---------- Journée de caisse : ouverture et fermeture ----------
  caisseOuverte() {
    return caisseOuverte(get().d);
  },

  // Ouverture : on compte la monnaie du matin (fond de caisse)
  ouvrirCaisse(fondDeCaisse, note = '') {
    if (caisseOuverte(get().d)) return get().message('La caisse est déjà ouverte', 'erreur');
    const session = {
      id: genId('s'),
      ouverteLe: new Date().toISOString(),
      ouvertePar: get().utilisateur.nom,
      fondDeCaisse: Number(fondDeCaisse) || 0,
      noteOuverture: note.trim(),
      fermeLe: null,
      fermePar: null,
      cloture: null,
    };
    get().majDonnees((d) => ({ sessionsCaisse: [...(d.sessionsCaisse || []), session] }));
    get().message('Caisse ouverte · fond de caisse ' + get().prix(session.fondDeCaisse));
    return session;
  },

  // Calcul de la fermeture pour la journée en cours (depuis l'ouverture)
  calculClotureEnCours() {
    const d = get().d;
    const session = caisseOuverte(d);
    if (!session) return null;
    return calculerCloture(d, new Date(session.ouverteLe), new Date(), session.fondDeCaisse);
  },

  // Fermeture : on compte les espèces, le résumé est gardé dans l'historique
  fermerCaisse(compte, note = '') {
    const session = caisseOuverte(get().d);
    if (!session) return null;
    const calcul = get().calculClotureEnCours();
    const maintenant = new Date().toISOString();
    const cl = {
      id: genId('z'),
      date: maintenant,
      utilisateurNom: get().utilisateur.nom,
      ouvertePar: session.ouvertePar,
      note: note.trim(),
      ...calcul,
      compte: Number(compte),
      ecart: arrondir(Number(compte) - calcul.attendu, get().devise()),
    };
    get().majDonnees((d) => ({
      sessionsCaisse: d.sessionsCaisse.map((x) => (x.id === session.id ? { ...x, fermeLe: maintenant, fermePar: cl.utilisateurNom, cloture: cl } : x)),
    }));
    get().ouvrir('ticketCloture', { cloture: cl });
    if (get().imprimante.connectee) get().imprimerCloture(cl);
    return cl;
  },

  // ---------- Clients à crédit ----------
  enregistrerClient(b) {
    const nom = b.nom.trim();
    if (!nom) return { erreur: 'Indiquez le nom du client' };
    const client = { ...b, nom, telephone: (b.telephone || '').trim(), id: b.id || genId('k') };
    get().majDonnees((d) =>
      b.id
        ? { clients: d.clients.map((c) => (c.id === b.id ? client : c)) }
        : { clients: [...(d.clients || []), client] }
    );
    return { client };
  },

  supprimerClient(id) {
    if (soldeClient(get().d, id) > 0) return 'Ce client doit encore de l’argent';
    get().majDonnees((d) => ({ clients: d.clients.filter((c) => c.id !== id) }));
    return null;
  },

  // Le client rembourse tout ou partie de son crédit
  enregistrerRemboursement(client, montant, mode) {
    const m = Number(montant);
    const solde = soldeClient(get().d, client.id);
    if (!(m > 0)) return { erreur: 'Indiquez le montant reçu' };
    if (m > solde + 0.001) return { erreur: 'Le client ne doit que ' + get().prix(solde) };
    const r = { id: genId('r'), date: new Date().toISOString(), clientId: client.id, montant: m, mode, utilisateurNom: get().utilisateur.nom };
    get().majDonnees((d) => ({ remboursements: [...(d.remboursements || []), r] }));
    const soldeApres = arrondir(solde - m, get().devise());
    get().ouvrir('recuRemboursement', { remboursement: r, client, soldeApres });
    if (get().imprimante.connectee) get().imprimerRemboursement(r, client, soldeApres);
    return { remboursement: r };
  },

  // ---------- Stock ----------
  // Arrivée de marchandise : le stock augmente, le prix d'achat peut être mis à jour
  entreeStock({ produitId, quantite, prixAchat, fournisseur, note }) {
    const q = Number(quantite);
    if (!(q > 0)) return 'Indiquez la quantité reçue';
    const p = get().d.produits.find((x) => x.id === produitId);
    if (!p) return 'Choisissez un produit';
    const pa = nombre(prixAchat);
    const mouvement = {
      id: genId('m'), date: new Date().toISOString(), produitId, produitNom: p.nom, type: 'entree',
      quantite: q, prixAchat: pa ?? p.prixAchat, fournisseur: (fournisseur || '').trim(), note: (note || '').trim(),
      utilisateurNom: get().utilisateur.nom,
    };
    get().majDonnees((d) => ({
      produits: d.produits.map((x) => (x.id === produitId ? { ...x, suiviStock: true, stock: x.stock + q, prixAchat: pa ?? x.prixAchat } : x)),
      mouvements: [...(d.mouvements || []), mouvement],
    }));
    get().message('+' + q + ' ' + p.nom);
    return null;
  },

  // Inventaire : on compte et on corrige la quantité réelle
  ajusterStock(produitId, quantiteReelle, note) {
    const q = Number(quantiteReelle);
    if (!(q >= 0)) return 'Indiquez la quantité comptée';
    const p = get().d.produits.find((x) => x.id === produitId);
    const ecart = q - p.stock;
    const mouvement = {
      id: genId('m'), date: new Date().toISOString(), produitId, produitNom: p.nom, type: 'ajustement',
      quantite: ecart, prixAchat: p.prixAchat, fournisseur: '', note: (note || '').trim() || 'Inventaire',
      utilisateurNom: get().utilisateur.nom,
    };
    get().majDonnees((d) => ({
      produits: d.produits.map((x) => (x.id === produitId ? { ...x, suiviStock: true, stock: q } : x)),
      mouvements: [...(d.mouvements || []), mouvement],
    }));
    get().message('Stock corrigé : ' + p.nom + ' = ' + q);
    return null;
  },
});
