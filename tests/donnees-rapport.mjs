// Données de test partagées par les tests du rapport (calcul, Excel, PDF)
export const iso = (...a) => new Date(...a).toISOString(); // heure locale de l'appareil, comme l'application

export const ligne = (id, nom, quantite, prix, cout) => ({ produitId: id, produitNom: nom, nom, quantite, prixUnitaire: prix, total: quantite * prix, coutUnitaire: cout ?? null, details: [] });
export function vente(id, date, paiement, lignes, { remise = 0, annulee = null, vendeur = 'Awa', client = null } = {}) {
  const sousTotal = lignes.reduce((s, l) => s + l.total, 0);
  return { id, numero: Number(id.replace('v', '')), date, vendeurId: 'u1', vendeurNom: vendeur, paiement, recu: 0, clientId: client, clientNom: client ? 'Koffi' : null, lignes, sousTotal, remise, total: sousTotal - remise, annulee };
}

// Une petite journée, avec tous les cas qui font se tromper les comptes
export function donnees() {
  return {
    commerce: { nom: 'Chez Test', ville: 'Abidjan', devise: 'FCFA', modesPaiement: ['Espèces', 'Wave', 'Carte'] },
    categories: [{ id: 'c1', nom: 'Épicerie' }],
    produits: [
      { id: 'p1', nom: 'Huile', categorieId: 'c1', prix: 2500, prixAchat: 2000, unite: 'litre', actif: true, suiviStock: true, stock: 12, seuilAlerte: 5 },
      { id: 'p2', nom: 'Riz', categorieId: 'c1', prix: 12000, prixAchat: 10000, actif: true, suiviStock: true, stock: 0 },
    ],
    clients: [{ id: 'k1', nom: 'Koffi', telephone: '0707070707' }],
    ventes: [
      vente('v1', iso(2026, 9, 5, 8, 0), 'Espèces', [ligne('p1', 'Huile', 2, 2500, 2000)]),
      vente('v2', iso(2026, 9, 5, 9, 30), 'Wave', [ligne('p2', 'Riz', 1, 12000, 10000)], { remise: 1000 }),
      vente('v3', iso(2026, 9, 5, 23, 59, 59), 'Espèces', [ligne('p1', 'Huile', 1, 2500, 2000)]),
      vente('v4', iso(2026, 9, 6, 0, 0, 0), 'Espèces', [ligne('p1', 'Huile', 1, 2500, 2000)]), // lendemain à minuit : hors du jour
      vente('v5', iso(2026, 9, 4, 23, 59, 59), 'Espèces', [ligne('p1', 'Huile', 1, 2500, 2000)]), // veille : hors du jour
      vente('v6', iso(2026, 9, 5, 10, 0), 'Espèces', [ligne('p1', 'Huile', 1, 2500, 2000)], { annulee: { date: iso(2026, 9, 5, 10, 5), motif: 'Erreur de saisie' } }),
      vente('v7', iso(2026, 9, 5, 11, 0), 'Crédit', [ligne('p3', 'Savon', 3, 1000)], { client: 'k1' }),
    ],
    depenses: [
      { id: 'e1', date: iso(2026, 9, 5, 8, 30), categorie: 'Transport', note: 'Livraison', montant: 1800, depuisCaisse: true },
      { id: 'e2', date: iso(2026, 9, 6, 0, 0, 0), categorie: 'Transport', note: 'Demain', montant: 999, depuisCaisse: false },
    ],
    remboursements: [{ id: 'r1', date: iso(2026, 9, 5, 12, 0), clientId: 'k1', montant: 1000, mode: 'Espèces' }],
    sessionsCaisse: [],
    utilisateurs: [],
  };
}
