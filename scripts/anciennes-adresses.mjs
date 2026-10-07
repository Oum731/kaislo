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

const ACTIVITES = ['restaurant', 'epicerie', 'boutique', 'quincaillerie', 'boulangerie', 'bar'];
// Pages retirées (métier réglementé non proposé) : le .htaccess répond « 410 Gone » ; ce fichier remplace l'ancienne page restée sur le serveur
// (sans redirection : une page retirée ne doit pas pointer vers une page sans rapport) et reste hors de l'index (noindex)
const RETIREES = [
  ['caisse-pharmacie', '/'], ['gestion-pharmacie', '/'], ['en/pharmacy-management', '/en/'],
  ['guides/gerer-le-stock-dune-pharmacie-peremptions', '/guides/'], ['en/guides/managing-pharmacy-stock-and-expiry-dates', '/en/guides/'],
];
const SITE = 'https://kaislo.com';

const ecrire = (dossierRelatif, cible) => {
  const dossier = path.join('out', dossierRelatif);
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
};
const retiree = (dossierRelatif, suite) => {
  const dossier = path.join('out', dossierRelatif);
  fs.mkdirSync(dossier, { recursive: true });
  fs.writeFileSync(path.join(dossier, 'index.html'), `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page retirée — Kaislo</title>
<meta name="robots" content="noindex">
</head>
<body>
<p>Cette page n’existe plus. <a href="${suite}">Retour à Kaislo</a></p>
</body>
</html>
`);
};
for (const a of ACTIVITES) ecrire(`caisse-${a}`, `/gestion-${a}/`);
for (const [ancienne, suite] of RETIREES) retiree(ancienne, suite);
console.log(`Anciennes adresses : ${ACTIVITES.length + RETIREES.length} pages de redirection écrites dans out/`);
