import { defineConfig } from 'vite';

// Chemins relatifs : le jeu fonctionne dans un sous-dossier, un iframe ou un zip de plateforme.
// Le SDK CrazyGames est chargé directement par index.html : `npm run build` suffit pour toutes les plateformes.
export default defineConfig({
  base: './',
  build: { assetsInlineLimit: 300000, chunkSizeWarningLimit: 1200, target: 'es2019' },
});
