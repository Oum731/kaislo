// Pont vers les SDK des plateformes (CrazyGames, Poki, GameDistribution...).
// Sans SDK chargé, toutes les fonctions sont des no-op : le jeu marche partout.
const cg = () => window.CrazyGames && window.CrazyGames.SDK;
export const platform = {
  gameplayStart() { try { cg() && cg().game.gameplayStart(); } catch (e) {} },
  gameplayStop() { try { cg() && cg().game.gameplayStop(); } catch (e) {} },
  happytime() { try { cg() && cg().game.happytime(); } catch (e) {} },
  // Pub entre deux courses : appelée uniquement sur un écran de fin, jamais pendant la conduite.
  showMidgameAd() {
    return new Promise((resolve) => {
      try {
        const s = cg();
        if (!s) return resolve();
        s.ad.requestAd('midgame', { adFinished: resolve, adError: resolve, adStarted: () => {} });
      } catch (e) { resolve(); }
    });
  },
};
