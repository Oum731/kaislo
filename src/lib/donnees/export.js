// ------------------------------------------------------------
// EXPORT DES DONNÉES DU COMMERCE (Réglages → Profil)
// - sauvegarde complète en JSON (sans les codes PIN)
// - liste des ventes en CSV, lisible dans Excel / Google Sheets
// Dans l'application mobile (Capacitor), le téléchargement passera
// par le partage de fichier du téléphone.
// ------------------------------------------------------------

// Date du jour pour le nom du fichier : 2026-10-03
const jour = () => new Date().toISOString().slice(0, 10);

// Nom de fichier simple, sans accents ni espaces
const nomFichier = (nom) => nom.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'commerce';

// Lance le téléchargement d'un fichier dans le navigateur
function telecharger(nom, contenu, type) {
  const url = URL.createObjectURL(new Blob([contenu], { type }));
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nom;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Toutes les données du commerce, sans les codes PIN
export function exporterTout(d) {
  const copie = { ...d, utilisateurs: d.utilisateurs.map(({ pin, ...u }) => u), exporteLe: new Date().toISOString() };
  telecharger(`kaisly-${nomFichier(d.commerce.nom)}-${jour()}.json`, JSON.stringify(copie, null, 2), 'application/json');
}

// Une cellule CSV : entre guillemets si besoin (séparateur « ; » pour Excel en français)
const cellule = (v) => {
  const t = v === null || v === undefined ? '' : String(v);
  return /[;"\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
};
// Montants avec une virgule décimale (format attendu par Excel en français)
const montant = (x) => (Number(x) || 0).toString().replace('.', ',');

// Une ligne par ticket
export function exporterVentesCsv(d) {
  const entete = ['Numéro', 'Date', 'Heure', 'Vendeur', 'Paiement', 'Client', 'Table', 'Articles', 'Sous-total', 'Remise', 'Total', 'Devise', 'Annulée', 'Motif d’annulation'];
  const lignes = d.ventes.map((v) => {
    const date = new Date(v.date);
    return [
      v.numero,
      date.toLocaleDateString('fr-FR'),
      date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      v.vendeurNom,
      v.paiement,
      v.clientNom,
      v.table,
      v.lignes.map((l) => l.quantite + ' × ' + l.nom).join(' | '),
      montant(v.sousTotal),
      montant(v.remise),
      montant(v.total),
      d.commerce.devise,
      v.annulee ? 'oui' : '',
      v.annulee?.motif,
    ];
  });
  // ﻿ au début : Excel reconnaît alors les accents (UTF-8)
  const csv = '﻿' + [entete, ...lignes].map((l) => l.map(cellule).join(';')).join('\r\n');
  telecharger(`kaisly-ventes-${nomFichier(d.commerce.nom)}-${jour()}.csv`, csv, 'text/csv;charset=utf-8');
}
