import { defineConfig } from 'vite';

// Chemins relatifs : le jeu fonctionne dans un sous-dossier, un iframe ou un zip de plateforme.
// `npm run build:crazygames` injecte en plus le SDK CrazyGames dans la page.
export default defineConfig(({ mode }) => ({
  base: './',
  build: { chunkSizeWarningLimit: 900, target: 'es2019' },
  plugins: [
    {
      name: 'platform-sdk',
      transformIndexHtml(html) {
        if (mode !== 'crazygames') return html;
        return html.replace('</head>', '<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>\n</head>');
      },
    },
  ],
}));
