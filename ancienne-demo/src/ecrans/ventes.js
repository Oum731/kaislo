// ------------------------------------------------------------
// ÉCRAN VENTES : historique des tickets (réimpression possible)
// Le vendeur ne voit que ses ventes, le gérant voit tout.
// Annuler une vente demande toujours le code PIN du gérant.
// ------------------------------------------------------------

export const ventes = {
  filtreVentes: 'jour', // 'jour' | 'hier' | 'semaine'
  motifAnnulation: '',
  pinAnnulation: '',

  ventesListe() {
    const debut = new Date();
    debut.setHours(0, 0, 0, 0);
    let fin = null;
    if (this.filtreVentes === 'hier') {
      fin = new Date(debut);
      debut.setDate(debut.getDate() - 1);
    }
    if (this.filtreVentes === 'semaine') debut.setDate(debut.getDate() - 6);

    return this.d.ventes
      .filter((v) => {
        const d = new Date(v.date);
        if (d < debut || (fin && d >= fin)) return false;
        return this.estGerant() || v.vendeurId === this.utilisateur.id;
      })
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 150);
  },

  // Les ventes annulées ne comptent pas dans le total
  totalListe() {
    return this.ventesListe().filter((v) => !v.annulee).reduce((s, v) => s + v.total, 0);
  },

  nbTicketsListe() {
    return this.ventesListe().filter((v) => !v.annulee).length;
  },

  resumeArticles(v) {
    const n = v.lignes.reduce((s, l) => s + l.quantite, 0);
    return n + (n > 1 ? ' articles' : ' article') + ' · ' + v.lignes.map((l) => l.produitNom || l.nom).join(', ');
  },

  ouvrirVente(v) {
    this.derniereVente = v;
    this.venteJusteValidee = false;
    this.feuille = 'ticket';
  },

  // --- Annulation ---
  demanderAnnulation() {
    this.motifAnnulation = '';
    this.pinAnnulation = '';
    this.feuille = 'annulation';
  },

  confirmerAnnulation() {
    const gerant = this.d.utilisateurs.find((u) => u.role === 'gerant' && u.actif && u.pin === this.pinAnnulation);
    if (!gerant) {
      this.pinAnnulation = '';
      navigator.vibrate?.(200);
      return this.message('Code PIN du gérant incorrect', 'erreur');
    }
    const v = this.derniereVente;
    v.annulee = { date: new Date().toISOString(), par: gerant.nom, motif: this.motifAnnulation.trim() };
    // Les articles reviennent dans le stock
    for (const l of v.lignes) {
      const p = this.d.produits.find((x) => x.id === l.produitId);
      if (p?.suiviStock) p.stock += l.quantite;
    }
    this.sauvegarder();
    this.rafraichirStats();
    this.feuille = 'ticket';
    this.message('Vente n° ' + v.numero + ' annulée');
  },
};
