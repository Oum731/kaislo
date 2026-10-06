// ------------------------------------------------------------
// Configuration Next.js
// output: 'export' => "npm run build" produit un dossier out/ avec
// uniquement des fichiers HTML/CSS/JS. Il suffit de l'envoyer sur
// Hostinger (pas besoin de Node sur le serveur), et ce même dossier
// servira plus tard à l'application mobile (Capacitor).
// ------------------------------------------------------------
const nextConfig = {
  output: 'export',
  trailingSlash: true, // /gestion-epicerie/ -> /gestion-epicerie/index.html (Hostinger)
  images: { unoptimized: true },
  reactStrictMode: true,
  // Numéro de cette publication : ajouté (« ?v=… ») aux adresses des images et vidéos du site pour pouvoir les garder 1 an en cache
  env: { NEXT_PUBLIC_BUILD_ID: process.env.NEXT_PUBLIC_BUILD_ID || Date.now().toString(36) },
  // Version de test GitHub Pages : le site vit dans /kaislo (voir npm run publier-github)
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
};

export default nextConfig;
