// ------------------------------------------------------------
// ÉCRAN STATISTIQUES (gérant)
// ------------------------------------------------------------
import { calculerStats, LIBELLES_PERIODE } from '../donnees/statistiques.js';

export const stats = {
  periodeStats: 'jour',
  barreActive: null, // barre touchée sur le graphique
  s: null, // résultat du calcul (mis en cache)
  libellesPeriode: LIBELLES_PERIODE,

  rafraichirStats() {
    if (!this.d) return;
    this.s = calculerStats(this.d.ventes, this.periodeStats, new Date(), this.d.depenses || []);
    this.barreActive = null;
  },

  choisirPeriode(p) {
    this.periodeStats = p;
    this.rafraichirStats();
  },

  maxBarres() {
    return Math.max(1, ...this.s.barres.map((b) => b.valeur));
  },

  // Hauteur en % d'une barre
  hauteurBarre(b) {
    return b.valeur ? Math.max(2, (b.valeur / this.maxBarres()) * 100) : 0;
  },

  // Largeur en % d'une ligne de classement (top produits, vendeurs…)
  largeurClassement(liste, e) {
    return liste.length ? (e.total / liste[0].total) * 100 : 0;
  },

  partPaiement(e) {
    return this.s.total ? Math.round((e.total / this.s.total) * 100) : 0;
  },

  // N'affiche qu'une étiquette sur deux/cinq si les barres sont nombreuses
  etiquetteVisible(i) {
    const n = this.s.barres.length;
    if (n > 20) return i === 0 || (i + 1) % 5 === 0;
    if (n > 12) return i % 2 === 0;
    return true;
  },

  produitsStockBas() {
    return this.d.produits.filter((p) => p.actif && p.suiviStock && p.stock <= 5).sort((a, b) => a.stock - b.stock);
  },
};
