// ------------------------------------------------------------
// ÉCRAN RÉGLAGES (gérant) : équipe, infos du commerce, imprimante
// ------------------------------------------------------------
import { genId } from '../utils/format.js';
import { reinitialiserCommerce, majCompte, supprimerCommerce } from '../donnees/stockage.js';

export const reglages = {
  ongletReglages: 'equipe', // 'equipe' | 'commerce' | 'imprimante'
  brouillonUtilisateur: null,
  brouillonCommerce: null,

  // --- Équipe ---
  vendeurs() {
    return this.d.utilisateurs;
  },

  ventesDuJourDe(u) {
    const debut = new Date();
    debut.setHours(0, 0, 0, 0);
    return this.d.ventes
      .filter((v) => !v.annulee && v.vendeurId === u.id && new Date(v.date) >= debut)
      .reduce((s, v) => s + v.total, 0);
  },

  nouveauVendeur() {
    this.brouillonUtilisateur = { id: null, nom: '', role: 'vendeur', pin: '', actif: true, peutGererProduits: false };
    this.feuille = 'utilisateur';
  },

  modifierUtilisateur(u) {
    this.brouillonUtilisateur = { ...u };
    this.feuille = 'utilisateur';
  },

  enregistrerUtilisateur() {
    const b = this.brouillonUtilisateur;
    b.nom = b.nom.trim();
    b.pin = String(b.pin || '').trim();
    if (!b.nom) return this.message('Indiquez le nom', 'erreur');
    if (!/^\d{4}$/.test(b.pin)) return this.message('Le code PIN doit contenir 4 chiffres', 'erreur');
    if (this.d.utilisateurs.some((u) => u.pin === b.pin && u.id !== b.id)) {
      return this.message('Ce code PIN est déjà utilisé', 'erreur');
    }
    if (b.id) Object.assign(this.d.utilisateurs.find((u) => u.id === b.id), b);
    else this.d.utilisateurs.push({ ...b, id: genId('u') });
    this.sauvegarder();
    this.fermerFeuille();
    this.message('Vendeur enregistré');
  },

  basculerUtilisateur(u) {
    if (u.id === this.utilisateur.id) return this.message('Vous ne pouvez pas désactiver votre propre compte', 'erreur');
    u.actif = !u.actif;
    this.sauvegarder();
    this.message(u.nom + (u.actif ? ' peut à nouveau se connecter' : ' ne peut plus se connecter'));
  },

  // --- Commerce ---
  ouvrirReglages(onglet) {
    this.ongletReglages = onglet;
    if (onglet === 'commerce') this.brouillonCommerce = { ...this.d.commerce };
  },

  enregistrerInfosCommerce() {
    const b = this.brouillonCommerce;
    if (!b.nom.trim()) return this.message('Le nom du commerce est obligatoire', 'erreur');
    // La devise et le type sont fixés par Amorac (super admin) : on ne les change pas ici
    Object.assign(this.d.commerce, {
      nom: b.nom.trim(),
      adresse: b.adresse,
      ville: b.ville,
      telephone: b.telephone,
      piedTicket: b.piedTicket,
    });
    this.sauvegarder();
    majCompte(this.d.commerce);
    this.message('Informations enregistrées');
  },

  // Supprime un commerce créé sur ce téléphone (pas les démos)
  supprimerCeCommerce() {
    if (!confirm('Supprimer définitivement « ' + this.d.commerce.nom + ' » et toutes ses ventes de ce téléphone ?')) return;
    supprimerCommerce(this.d.commerce.id);
    this.changerDeCommerce();
    this.message('Commerce supprimé');
  },

  reinitialiserDemo() {
    if (!confirm('Remettre ce commerce de démo à zéro ? Vos modifications seront perdues.')) return;
    this.d = reinitialiserCommerce(this.d.commerce.id);
    this.utilisateur = this.d.utilisateurs.find((u) => u.role === 'gerant');
    this.brouillonCommerce = { ...this.d.commerce };
    this.rafraichirStats();
    this.message('Démo réinitialisée');
  },
};
