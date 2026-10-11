import { muteForAd } from './audio.js';

// Intégration du SDK CrazyGames v3 (script chargé dans index.html).
// Le SDK n'est utilisé que dans les environnements « local » (localhost, ?useLocalSdk=true) et « crazygames ».
// Ailleurs (votre site, itch.io…) il est « disabled » : tous ses appels lèvent une erreur, donc on n'y touche pas
// et le jeu fonctionne normalement. Chaque appel est protégé : une erreur du SDK ne casse jamais le jeu.
const sdk = () => (typeof window !== 'undefined' && window.CrazyGames ? window.CrazyGames.SDK : null);
const safe = (fn, fallback = null) => { try { return fn(); } catch (e) { return fallback; } };
let ready = false, env = 'none';

// Pub : promesse résolue à true si la pub est allée au bout (utile pour les pubs avec récompense)
function requestAd(type) {
  return new Promise((resolve) => {
    if (!ready) return resolve(false);
    let done = false;
    const end = (ok) => { if (done) return; done = true; muteForAd(false); resolve(ok); };
    try {
      sdk().ad.requestAd(type, { adStarted: () => muteForAd(true), adFinished: () => end(true), adError: () => end(false) });
    } catch (e) { end(false); }
    setTimeout(() => end(false), 90000);   // garde-fou : ne jamais bloquer le jeu
  });
}

export const platform = {
  get ready() { return ready; },
  get environment() { return env; },

  // À appeler une seule fois, avant tout autre appel (on attend la fin, avec un délai maximum)
  async init() {
    const s = sdk();
    if (!s) return false;
    try {
      await Promise.race([s.init(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 6000))]);
      env = s.environment;
      ready = env === 'local' || env === 'crazygames';
    } catch (e) { ready = false; }
    return ready;
  },

  // Écran de chargement et déroulement du jeu
  loadingStart() { if (ready) safe(() => sdk().game.loadingStart()); },
  loadingStop() { if (ready) safe(() => sdk().game.loadingStop()); },
  gameplayStart() { if (ready) safe(() => sdk().game.gameplayStart()); },
  gameplayStop() { if (ready) safe(() => sdk().game.gameplayStop()); },
  happytime() { if (ready) safe(() => sdk().game.happytime()); },

  // Pubs : uniquement depuis un écran de fin ou de menu, jamais pendant la conduite
  async showMidgameAd() { await requestAd('midgame'); },
  showRewardedAd() { return requestAd('rewarded'); },
  async hasAdblock() { return ready ? !!(await safe(() => sdk().ad.hasAdblock(), false)) : false; },

  // Sauvegarde partagée entre appareils (module data du SDK)
  async cloudGet(key) { return ready ? ((await safe(() => sdk().data.getItem(key), null)) || null) : null; },
  cloudSet(key, value) { if (ready) safe(() => sdk().data.setItem(key, value)); },

  // Réglage « couper le son » imposé par la plateforme (prioritaire sur le son du jeu)
  get muteAudio() { return ready ? !!safe(() => sdk().game.settings.muteAudio, false) : false; },
  onSettingsChange(cb) { if (ready) safe(() => sdk().game.addSettingsChangeListener(cb)); },

  // Compte joueur
  async getUser() { if (!ready) return null; try { return (await sdk().user.getUser()) || null; } catch (e) { return null; } },
  get accountAvailable() { return ready && !!safe(() => sdk().user.isUserAccountAvailable, false); },
  async showAuth() { try { await sdk().user.showAuthPrompt(); return true; } catch (e) { return false; } },
  onAuthChange(cb) { if (ready) safe(() => sdk().user.addAuthListener(cb)); },
  async username() {
    if (!ready) return null;
    try { const s = sdk(); if (!s.user.isUserAccountAvailable) return null; const u = await s.user.getUser(); return (u && u.username) || null; } catch (e) { return null; }
  },
  locale() { return ready ? safe(() => sdk().user.systemInfo.locale, null) : null; },
};
