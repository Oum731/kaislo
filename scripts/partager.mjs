// ------------------------------------------------------------
// PARTAGER LA DÉMO À DISTANCE
//
//   npm run build      (une fois, après chaque modification)
//   npm run partager   (garde cette fenêtre ouverte pendant le test)
//
// 1. Sert le dossier out/ sur http://localhost:8080
// 2. Ouvre un tunnel Cloudflare gratuit : un lien https://….trycloudflare.com
//    que le client peut ouvrir depuis n'importe où.
// Le lien change à chaque lancement et ne marche que tant que ce PC
// est allumé et que la commande tourne (Ctrl + C pour arrêter).
// ------------------------------------------------------------
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

let PORT = 8080; // si 8080 est occupé, on essaie 8081, 8082…
const RACINE = path.resolve('out');
const CLOUDFLARED = path.resolve('outils', 'cloudflared.exe');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml',
};

if (!fs.existsSync(path.join(RACINE, 'index.html'))) {
  console.error('Le dossier out/ est vide : lancez d’abord « npm run build ».');
  process.exit(1);
}

// --- 1. Petit serveur de fichiers ---
const serveur = http
  .createServer((req, res) => {
    let chemin = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let fichier = path.join(RACINE, chemin);
    if (!fichier.startsWith(RACINE)) { res.writeHead(403); return res.end(); } // sécurité
    if (fs.existsSync(fichier) && fs.statSync(fichier).isDirectory()) fichier = path.join(fichier, 'index.html');
    if (!fs.existsSync(fichier) && fs.existsSync(fichier + '.html')) fichier += '.html';
    if (!fs.existsSync(fichier)) {
      res.writeHead(404, { 'Content-Type': TYPES['.html'] });
      return fs.createReadStream(path.join(RACINE, '404.html')).pipe(res);
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(fichier)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(fichier).pipe(res);
  })
;
serveur.on('error', (e) => {
  if (e.code === 'EADDRINUSE' && PORT < 8090) {
    console.log('Port ' + PORT + ' occupé (un partage tourne déjà ? « npm run arreter-partage »), essai du port ' + (PORT + 1));
    PORT++;
    serveur.listen(PORT);
  } else {
    console.error('Impossible de démarrer le serveur : ' + e.message);
    process.exit(1);
  }
});
serveur.on('listening', () => {
  console.log(`Site local : http://localhost:${PORT}`);
  ouvrirTunnel();
});
serveur.listen(PORT);

// --- 2. Tunnel Cloudflare ---
function ouvrirTunnel() {
if (!fs.existsSync(CLOUDFLARED)) {
  console.error('outils/cloudflared.exe introuvable : le site reste accessible seulement sur ce PC.');
} else {
  console.log('Ouverture du lien public… (quelques secondes)');
  const tunnel = spawn(CLOUDFLARED, ['tunnel', '--no-autoupdate', '--url', `http://localhost:${PORT}`]);
  let affiche = false;
  const lire = (donnees) => {
    const lien = String(donnees).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (lien && !affiche) {
      affiche = true;
      console.log('\n==============================================');
      console.log(' Lien à envoyer au client :');
      console.log(' ' + lien[0]);
      console.log(' Démo directe restaurant : ' + lien[0] + '/app/?demo=resto-ivoire');
      console.log(' Démo directe épicerie   : ' + lien[0] + '/app/?demo=chez-sentinelle');
      console.log('==============================================');
      console.log('Gardez cette fenêtre ouverte. Ctrl + C pour arrêter.\n');
    }
  };
  tunnel.stdout.on('data', lire);
  tunnel.stderr.on('data', lire);
  tunnel.on('exit', (code) => console.log('Tunnel arrêté (code ' + code + ').'));
  process.on('SIGINT', () => { tunnel.kill(); process.exit(0); });
}
}
