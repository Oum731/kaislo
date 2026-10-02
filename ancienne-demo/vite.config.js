import { defineConfig } from 'vite';

// base './' : l'app fonctionne dans n'importe quel dossier (sous-domaine Hostinger,
// ou plus tard dans l'application mobile Capacitor).
export default defineConfig({
  base: './',
  build: { outDir: 'dist' },
});
