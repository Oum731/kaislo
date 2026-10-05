// ------------------------------------------------------------
// Anciennes adresses des pages par activité (« /caisse-restaurant/ » devenue « /gestion-restaurant/ »).
//
// Le fichier .htaccess les redirige déjà (301). Ici on écrit en plus une petite page de redirection à chaque
// ancienne adresse : elle REMPLACE l'ancien fichier resté sur le serveur (un déploiement n'efface pas les
// fichiers retirés du projet) et fonctionne même si le serveur n'applique pas le .htaccess ou garde une page en cache.
// Lancé automatiquement après « npm run build » et par la publication.
// ------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';

const ACTIVITES = ['restaurant', 'epicerie', 'boutique', 'quincaillerie', 'pharmacie', 'boulangerie', 'bar'];
const SITE = 'https://kaislo.com';

for (const a of ACTIVITES) {
  const cible = `/gestion-${a}/`;
  const dossier = path.join('out', `caisse-${a}`);
  fs.mkdirSync(dossier, { recursive: true });
  fs.writeFileSync(path.join(dossier, 'index.html'), `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Cette page a changé d’adresse — Kaislo</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${SITE}${cible}">
<meta http-equiv="refresh" content="0;url=${cible}">
<script>location.replace(${JSON.stringify(cible)});</script>
</head>
<body>
<p>Cette page a changé d’adresse : <a href="${cible}">${SITE}${cible}</a></p>
</body>
</html>
`);
}
console.log(`Anciennes adresses : ${ACTIVITES.length} pages de redirection écrites dans out/`);
