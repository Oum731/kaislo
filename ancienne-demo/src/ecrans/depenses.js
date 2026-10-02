// ------------------------------------------------------------
// DÉPENSES (gérant) : achats au marché, gaz, transport, loyer…
// Le tableau de bord affiche : ventes − dépenses = solde
// ------------------------------------------------------------
import { genId } from '../utils/format.js';
import { CATEGORIES_DEPENSES } from '../donnees/demo.js';

export const depenses = {
  categoriesDepenses: CATEGORIES_DEPENSES,
  brouillonDepense: null,

  nouvelleDepense() {
    this.brouillonDepense = {
      id: null,
      montant: null,
      categorie: CATEGORIES_DEPENSES[0],
      note: '',
      depuisCaisse: true, // payée avec l'argent de la caisse (compte dans la clôture)
    };
    this.feuille = 'depense';
  },

  modifierDepense(x) {
    this.brouillonDepense = { ...x };
    this.feuille = 'depense';
  },

  enregistrerDepense() {
    const b = this.brouillonDepense;
    if (!(b.montant > 0)) return this.message('Indiquez le montant de la dépense', 'erreur');
    b.note = (b.note || '').trim();
    if (!this.d.depenses) this.d.depenses = [];
    if (b.id) {
      Object.assign(this.d.depenses.find((x) => x.id === b.id), b);
    } else {
      this.d.depenses.push({ ...b, id: genId('d'), date: new Date().toISOString(), utilisateurNom: this.utilisateur.nom });
    }
    this.sauvegarder();
    this.fermerFeuille();
    this.rafraichirStats();
    this.message('Dépense enregistrée');
  },

  supprimerDepense() {
    if (!confirm('Supprimer cette dépense ?')) return;
    this.d.depenses = this.d.depenses.filter((x) => x.id !== this.brouillonDepense.id);
    this.sauvegarder();
    this.fermerFeuille();
    this.rafraichirStats();
  },
};
