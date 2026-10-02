// ------------------------------------------------------------
// KAISLY — point de départ de l'application (démo)
//
// L'interface est écrite dans index.html avec Alpine.js
// (les attributs x-show, x-text, @click… dans le HTML).
// La logique est rangée par écran dans le dossier src/ecrans/.
// ------------------------------------------------------------
import Alpine from 'alpinejs';
import './styles.css';

import { enregistrerCommerce, chargerPreferences, enregistrerPreferences } from './donnees/stockage.js';
import { formatPrix, formatNombre, formatHeure, formatDate, formatJourLong, initiales } from './utils/format.js';
import { session } from './ecrans/session.js';
import { caisse } from './ecrans/caisse.js';
import { ventes } from './ecrans/ventes.js';
import { catalogue } from './ecrans/catalogue.js';
import { reglages } from './ecrans/reglages.js';
import { imprimante } from './ecrans/imprimante.js';
import { stats } from './ecrans/stats.js';
import { depenses } from './ecrans/depenses.js';
import { cloture } from './ecrans/cloture.js';

// Assemble plusieurs objets en un seul, sans perdre les "getters"
function assembler(...morceaux) {
  const app = {};
  for (const m of morceaux) Object.defineProperties(app, Object.getOwnPropertyDescriptors(m));
  return app;
}

// Partie commune à tous les écrans
const commun = {
  d: null, // données du commerce ouvert (commerce, utilisateurs, catégories, produits, ventes)
  utilisateur: null, // personne connectée
  ecran: 'caisse', // onglet affiché
  feuille: null, // fenêtre qui monte du bas de l'écran (options, panier, ticket…)
  prefs: chargerPreferences(),
  toast: null,
  animerPanier: false,
  venteJusteValidee: false,
  installation: null, // proposition "Installer l'application"

  init() {
    this.initImprimante();
    this.restaurerSession();
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installation = e;
    });
  },

  // Raccourcis de mise en forme utilisables dans le HTML
  prix(m) {
    return formatPrix(m, this.devise());
  },
  nombre(m) {
    return formatNombre(m, this.devise());
  },
  heure: formatHeure,
  date: formatDate,
  initiales,
  aujourdhui() {
    return formatJourLong(new Date());
  },
  devise() {
    return this.d?.commerce.devise || 'FCFA';
  },

  allerA(ecran) {
    this.ecran = ecran;
    this.fermerFeuille();
    if (ecran === 'stats') this.rafraichirStats();
    if (ecran === 'reglages') this.ouvrirReglages(this.ongletReglages);
    window.scrollTo(0, 0);
  },

  // Le bouton imprimante de la caisse : onglet du vendeur ou réglages du gérant
  allerImprimante() {
    if (this.estGerant()) {
      this.ongletReglages = 'imprimante';
      this.allerA('reglages');
    } else this.allerA('imprimante');
  },

  fermerFeuille() {
    if (this.feuille === 'scan') this.arreterCamera();
    this.feuille = null;
  },

  sauvegarder() {
    enregistrerCommerce(this.d);
  },

  sauverPrefs() {
    enregistrerPreferences(this.prefs);
  },

  // Petit message en bas de l'écran
  message(texte, type = 'ok') {
    this.toast = { texte, type };
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => (this.toast = null), 2600);
  },

  async installer() {
    if (!this.installation) return;
    this.installation.prompt();
    await this.installation.userChoice;
    this.installation = null;
  },
};

Alpine.data('kaisly', () => assembler(commun, session, caisse, ventes, catalogue, reglages, imprimante, stats, depenses, cloture));
window.Alpine = Alpine;
Alpine.start();

// Service worker : permet l'installation et l'ouverture hors connexion
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
}
