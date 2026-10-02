// ------------------------------------------------------------
// ÉCRAN CATALOGUE (gérant) : catégories, produits, groupes d'options
// ------------------------------------------------------------
import { genId } from '../utils/format.js';

export const COULEURS = ['vert', 'safran', 'terre', 'bleu', 'prune'];

export const catalogue = {
  ongletCatalogue: 'produits', // 'produits' | 'categories'
  rechercheCatalogue: '',
  brouillon: null, // produit en cours de modification (copie)
  brouillonCategorie: null,
  couleurs: COULEURS,

  // Produits rangés par catégorie, pour l'affichage
  catalogueParCategorie() {
    const r = this.rechercheCatalogue.trim().toLowerCase();
    return this.d.categories
      .map((c) => ({
        categorie: c,
        produits: this.d.produits.filter(
          (p) => p.categorieId === c.id && (!r || p.nom.toLowerCase().includes(r) || p.codeBarre === r)
        ),
      }))
      .filter((g) => g.produits.length || !r);
  },

  nbProduits(categorieId) {
    return this.d.produits.filter((p) => p.categorieId === categorieId).length;
  },

  resumeOptions(p) {
    return p.groupes.map((g) => g.nom).join(' · ');
  },

  // --- Produits ---
  nouveauProduit(categorieId) {
    this.brouillon = {
      id: null,
      categorieId: categorieId || this.d.categories[0]?.id,
      nom: '',
      prix: null,
      emoji: '',
      codeBarre: '',
      suiviStock: false, // le gérant l'active s'il veut suivre le stock de cet article
      stock: 0,
      actif: true,
      groupes: [],
    };
    this.feuille = 'produit';
  },

  modifierProduit(p) {
    this.brouillon = JSON.parse(JSON.stringify(p)); // copie : rien ne change tant qu'on n'enregistre pas
    this.feuille = 'produit';
  },

  enregistrerProduit() {
    const b = this.brouillon;
    b.nom = b.nom.trim();
    if (!b.nom) return this.message('Donnez un nom au produit', 'erreur');
    if (!(b.prix >= 0) || b.prix === null || b.prix === '') return this.message('Indiquez un prix', 'erreur');
    for (const g of b.groupes) {
      g.nom = g.nom.trim();
      g.options = g.options.filter((o) => o.nom.trim());
      if (!g.nom) return this.message('Chaque groupe d’options doit avoir un nom', 'erreur');
      if (!g.options.length) return this.message('Le groupe « ' + g.nom + ' » n’a aucune option', 'erreur');
      for (const o of g.options) o.prix = Number(o.prix) || 0;
    }
    b.prix = Number(b.prix);
    b.stock = Number(b.stock) || 0;

    if (b.id) {
      const i = this.d.produits.findIndex((p) => p.id === b.id);
      this.d.produits[i] = b;
    } else {
      b.id = genId('p');
      this.d.produits.push(b);
    }
    this.sauvegarder();
    this.fermerFeuille();
    this.message('Produit enregistré');
  },

  supprimerProduit() {
    if (!confirm('Supprimer « ' + this.brouillon.nom + ' » ? Les ventes passées restent intactes.')) return;
    this.d.produits = this.d.produits.filter((p) => p.id !== this.brouillon.id);
    this.sauvegarder();
    this.fermerFeuille();
    this.message('Produit supprimé');
  },

  basculerProduit(p) {
    p.actif = !p.actif;
    this.sauvegarder();
  },

  // --- Groupes d'options (dans le brouillon) ---
  ajouterGroupe(type) {
    this.brouillon.groupes.push({
      id: genId('g'),
      nom: type === 'unique' ? 'Accompagnement' : 'Suppléments',
      type,
      obligatoire: type === 'unique',
      options: [{ id: genId('o'), nom: '', prix: 0 }],
    });
  },

  supprimerGroupe(index) {
    this.brouillon.groupes.splice(index, 1);
  },

  ajouterOption(g) {
    g.options.push({ id: genId('o'), nom: '', prix: 0 });
  },

  supprimerOption(g, index) {
    g.options.splice(index, 1);
  },

  // --- Catégories ---
  nouvelleCategorie() {
    this.brouillonCategorie = { id: null, nom: '', couleur: COULEURS[this.d.categories.length % COULEURS.length] };
    this.feuille = 'categorie';
  },

  modifierCategorie(c) {
    this.brouillonCategorie = { ...c };
    this.feuille = 'categorie';
  },

  enregistrerCategorie() {
    const b = this.brouillonCategorie;
    b.nom = b.nom.trim();
    if (!b.nom) return this.message('Donnez un nom à la catégorie', 'erreur');
    if (b.id) Object.assign(this.d.categories.find((c) => c.id === b.id), b);
    else this.d.categories.push({ ...b, id: genId('c') });
    this.sauvegarder();
    this.fermerFeuille();
  },

  supprimerCategorie() {
    const b = this.brouillonCategorie;
    if (this.nbProduits(b.id)) {
      return this.message('Déplacez ou supprimez d’abord les produits de cette catégorie', 'erreur');
    }
    this.d.categories = this.d.categories.filter((c) => c.id !== b.id);
    this.sauvegarder();
    this.fermerFeuille();
  },

  deplacerCategorie(c, sens) {
    const i = this.d.categories.indexOf(c);
    const j = i + sens;
    if (j < 0 || j >= this.d.categories.length) return;
    const cats = [...this.d.categories];
    [cats[i], cats[j]] = [cats[j], cats[i]];
    this.d.categories = cats;
    this.sauvegarder();
  },
};
