import { muteForAd } from './audio.js';

// Pont vers les SDK des plateformes (CrazyGames aujourd'hui, d'autres ensuite).
// Sans SDK chargé, tout est en no-op : le jeu marche partout (GitHub Pages, itch.io, etc.).
const cg = () => window.CrazyGames && window.CrazyGames.SDK;
let ready = false;
export const platform = {
  async init() {
    try { if (cg()) { await cg().init(); ready = true; } } catch (e) {}
    return ready;
  },
  loadingStart() { try { ready && cg().game.loadingStart(); } catch (e) {} },
  loadingStop() { try { ready && cg().game.loadingStop(); } catch (e) {} },
  gameplayStart() { try { ready && cg().game.gameplayStart(); } catch (e) {} },
  gameplayStop() { try { ready && cg().game.gameplayStop(); } catch (e) {} },
  happytime() { try { ready && cg().game.happytime(); } catch (e) {} },
  // Pub entre deux courses : uniquement depuis un écran de fin ou de menu, jamais pendant la conduite.
  showMidgameAd() {
    return new Promise((resolve) => {
      if (!ready) return resolve();
      let done = false;
      const end = () => { if (!done) { done = true; muteForAd(false); resolve(); } };
      try {
        cg().ad.requestAd('midgame', { adStarted: () => muteForAd(true), adFinished: end, adError: end });
        setTimeout(end, 90000); // garde-fou
      } catch (e) { end(); }
    });
  },
};
