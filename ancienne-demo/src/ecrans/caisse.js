// ------------------------------------------------------------
// ÉCRAN CAISSE : le vendeur compose la vente, valide, le ticket s'imprime
// ------------------------------------------------------------
import { creerLigne, choixComplets, cleLigne } from '../donnees/vente.js';
import { arrondir, genId } from '../utils/format.js';

// Billets/pièces utilisés pour proposer des montants "reçus" rapides
const BILLETS = { FCFA: [500, 1000, 2000, 5000, 10000], MAD: [5, 10, 20, 50, 100, 200] };

export const caisse = {
  recherche: '',
  categorieActive: 'tout',
  panier: [],
  // fenêtre d'options
  produitOptions: null,
  choix: {},
  quantiteOptions: 1,
  // paiement
  paiement: '',
  montantRecu: null,
  derniereVente: null,
  // scan
  scanSupporte: false,
  scanCodeManuel: '',

  produitsAffiches() {
    const r = this.recherche.trim().toLowerCase();
    return this.d.produits.filter(
      (p) =>
        p.actif &&
        (this.categorieActive === 'tout' || p.categorieId === this.categorieActive) &&
        (!r || p.nom.toLowerCase().includes(r) || p.codeBarre === r)
    );
  },

  couleurCategorie(categorieId) {
    return this.d.categories.find((c) => c.id === categorieId)?.couleur || 'vert';
  },

  nomCategorie(categorieId) {
    return this.d.categories.find((c) => c.id === categorieId)?.nom || '';
  },

  // Prix minimum affiché sur la tuile : prix de base + option la moins chère des choix obligatoires
  prixDepart(p) {
    let prix = p.prix;
    for (const g of p.groupes) if (g.obligatoire) prix += Math.min(...g.options.map((o) => o.prix));
    return prix;
  },

  enRupture(p) {
    return p.suiviStock && p.stock <= 0;
  },

  // Le vendeur touche un produit
  toucherProduit(p) {
    // Stock à zéro : on prévient mais on laisse vendre (le stock saisi n'est pas toujours à jour)
    if (this.enRupture(p)) this.message('Stock de « ' + p.nom + ' » à zéro : pensez à le mettre à jour', 'erreur');
    if (p.groupes.length) {
      this.produitOptions = p;
      this.choix = {};
      // Pré-sélectionne la 1re option des groupes obligatoires : un geste de moins
      for (const g of p.groupes) if (g.obligatoire && g.options.length === 1) this.choix[g.id] = [g.options[0].id];
      this.quantiteOptions = 1;
      this.feuille = 'options';
    } else {
      this.ajouterAuPanier(p, {}, 1);
    }
  },

  // --- Fenêtre d'options ---
  optionChoisie(g, o) {
    return (this.choix[g.id] || []).includes(o.id);
  },

  basculerOption(g, o) {
    const actuels = this.choix[g.id] || [];
    if (g.type === 'unique') {
      // un 2e appui désélectionne seulement si le choix est facultatif
      this.choix[g.id] = actuels.includes(o.id) && !g.obligatoire ? [] : [o.id];
    } else {
      this.choix[g.id] = actuels.includes(o.id) ? actuels.filter((x) => x !== o.id) : [...actuels, o.id];
    }
  },

  optionsValides() {
    return this.produitOptions && choixComplets(this.produitOptions, this.choix);
  },

  prixAvecOptions() {
    if (!this.produitOptions) return 0;
    return creerLigne(this.produitOptions, this.choix, this.quantiteOptions, this.devise()).total;
  },

  validerOptions() {
    if (!this.optionsValides()) return;
    this.ajouterAuPanier(this.produitOptions, this.choix, this.quantiteOptions);
    this.fermerFeuille();
  },

  // --- Panier ---
  ajouterAuPanier(p, choix, quantite) {
    const ligne = creerLigne(p, choix, quantite, this.devise(), this.nomCategorie(p.categorieId));
    const existante = this.panier.find((l) => cleLigne(l) === cleLigne(ligne));
    if (existante) this.changerQuantite(existante, quantite);
    else this.panier.push(ligne);
    this.animerPanier = true;
    setTimeout(() => (this.animerPanier = false), 300);
    navigator.vibrate?.(15);
  },

  changerQuantite(ligne, delta) {
    ligne.quantite += delta;
    if (ligne.quantite <= 0) this.panier = this.panier.filter((l) => l !== ligne);
    else ligne.total = arrondir(ligne.prixUnitaire * ligne.quantite, this.devise());
    if (!this.panier.length && this.feuille === 'panier') this.fermerFeuille();
  },

  viderPanier() {
    this.panier = [];
    this.fermerFeuille();
  },

  totalPanier() {
    return arrondir(this.panier.reduce((s, l) => s + l.total, 0), this.devise());
  },

  nbArticles() {
    return this.panier.reduce((s, l) => s + l.quantite, 0);
  },

  quantiteDansPanier(p) {
    return this.panier.filter((l) => l.produitId === p.id).reduce((s, l) => s + l.quantite, 0);
  },

  ouvrirPanier() {
    if (!this.panier.length) return;
    this.paiement = this.d.commerce.modesPaiement[0];
    this.montantRecu = null;
    this.feuille = 'panier';
  },

  // Montants rapides pour les espèces : 2 000, 5 000, 10 000…
  montantsRapides() {
    const total = this.totalPanier();
    const propositions = new Set();
    for (const b of BILLETS[this.devise()] || []) {
      const m = Math.ceil(total / b) * b;
      if (m > total) propositions.add(m);
    }
    return [...propositions].sort((a, b) => a - b).slice(0, 3);
  },

  monnaieARendre() {
    return this.montantRecu > 0 ? arrondir(this.montantRecu - this.totalPanier(), this.devise()) : 0;
  },

  // --- Validation de la vente ---
  async validerVente() {
    if (!this.panier.length) return;
    const total = this.totalPanier();
    if (this.paiement === 'Espèces' && this.montantRecu > 0 && this.montantRecu < total) {
      this.message('Le montant reçu est inférieur au total', 'erreur');
      return;
    }
    const vente = {
      id: genId('v'),
      numero: this.d.prochainNumero++,
      date: new Date().toISOString(),
      vendeurId: this.utilisateur.id,
      vendeurNom: this.utilisateur.nom,
      paiement: this.paiement,
      recu: this.paiement === 'Espèces' && this.montantRecu > 0 ? this.montantRecu : 0,
      lignes: JSON.parse(JSON.stringify(this.panier)),
      total,
    };
    // Mise à jour du stock (épiceries)
    for (const l of vente.lignes) {
      const p = this.d.produits.find((x) => x.id === l.produitId);
      if (p?.suiviStock) p.stock = Math.max(0, p.stock - l.quantite);
    }
    this.d.ventes.push(vente);
    this.sauvegarder();
    this.panier = [];
    this.derniereVente = vente;
    this.venteJusteValidee = true;
    this.feuille = 'ticket';
    this.rafraichirStats();
    navigator.vibrate?.([30, 50, 30]);

    // Impression automatique si une imprimante est connectée
    if (this.imprimante.connectee) this.imprimerTicket(vente);
  },

  nouvelleVente() {
    this.fermerFeuille();
    this.recherche = '';
  },

  // --- Code-barres ---
  // Un lecteur de code-barres Bluetooth/USB "tape" le code puis Entrée dans la recherche
  validerRecherche() {
    const code = this.recherche.trim();
    const p = this.d.produits.find((x) => x.actif && x.codeBarre && x.codeBarre === code);
    if (p) {
      this.toucherProduit(p);
      this.recherche = '';
    } else if (this.produitsAffiches().length === 1) {
      this.toucherProduit(this.produitsAffiches()[0]);
      this.recherche = '';
    }
  },

  async ouvrirScan() {
    this.feuille = 'scan';
    this.scanCodeManuel = '';
    this.scanSupporte = 'BarcodeDetector' in window && !!navigator.mediaDevices;
    if (!this.scanSupporte) return;
    try {
      const flux = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      this._flux = flux;
      const video = document.getElementById('video-scan');
      video.srcObject = flux;
      await video.play();
      const detecteur = new window.BarcodeDetector();
      const boucle = async () => {
        if (this.feuille !== 'scan') return;
        try {
          const codes = await detecteur.detect(video);
          if (codes.length) return this.codeScanne(codes[0].rawValue);
        } catch { /* image pas encore prête */ }
        setTimeout(boucle, 250);
      };
      boucle();
    } catch {
      this.scanSupporte = false;
    }
  },

  arreterCamera() {
    this._flux?.getTracks().forEach((t) => t.stop());
    this._flux = null;
  },

  codeScanne(code) {
    const p = this.d.produits.find((x) => x.actif && x.codeBarre === String(code).trim());
    this.fermerFeuille();
    if (p) this.toucherProduit(p);
    else this.message('Aucun produit avec le code ' + code, 'erreur');
  },
};
