<?php
// ------------------------------------------------------------
// CONFIGURATION : lit le fichier .env (jamais envoyé sur GitHub).
//
// Où mettre le .env sur Hostinger (du plus sûr au moins sûr) :
//   1. dans le dossier AU-DESSUS de public_html (inaccessible depuis le web)
//   2. dans public_html/ ou public_html/api/ (protégé par .htaccess)
//
// Clés reconnues :
//   Db, User, Password  : base MySQL (créée dans hPanel)
//   DbHost              : serveur MySQL (par défaut « localhost », valable sur Hostinger)
//   Host                : nom de domaine du site (informatif)
//   DbDriver            : « mysql » (par défaut) ou « sqlite » (tests sur ordinateur)
//   DbFichier           : chemin du fichier SQLite (tests seulement)
//   CleAdmin            : clé pour créer le premier compte de l'espace Amorac (12 caractères ou plus)
//   EmailEquipe         : adresse qui reçoit les messages des commerces (par défaut contact@kaislo.com)
//   EmailExpediteur     : expéditeur des e-mails envoyés par Kaislo (ex : no-reply@kaislo.com)
// ------------------------------------------------------------

function lireFichierEnv(string $fichier): array
{
    $valeurs = [];
    foreach (file($fichier, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $ligne) {
        $ligne = trim($ligne);
        if ($ligne === '' || $ligne[0] === '#' || !str_contains($ligne, '=')) continue;
        [$cle, $valeur] = explode('=', $ligne, 2);
        // Les guillemets autour de la valeur sont facultatifs
        $valeurs[trim($cle)] = trim(trim($valeur), "\"'");
    }
    return $valeurs;
}

function config(): array
{
    static $config = null;
    if ($config !== null) return $config;

    // Fichier imposé (tests), sinon recherche du .env du plus sûr au moins sûr
    $candidats = array_filter([
        getenv('KAISLO_ENV_FICHIER') ?: null,
        dirname(__DIR__, 3) . '/.env', // au-dessus de public_html
        dirname(__DIR__, 2) . '/.env', // public_html (ou racine du projet sur l'ordinateur)
        dirname(__DIR__) . '/.env',    // public_html/api
    ]);
    $valeurs = [];
    foreach ($candidats as $fichier) {
        if (is_file($fichier)) { $valeurs = lireFichierEnv($fichier); break; }
    }

    $config = [
        'driver' => strtolower($valeurs['DbDriver'] ?? 'mysql'),
        'base' => $valeurs['Db'] ?? '',
        'utilisateur' => $valeurs['User'] ?? '',
        'motDePasse' => $valeurs['Password'] ?? '',
        'serveur' => $valeurs['DbHost'] ?? 'localhost',
        'fichierSqlite' => $valeurs['DbFichier'] ?? (dirname(__DIR__) . '/kaislo-test.sqlite'),
        'domaine' => $valeurs['Host'] ?? '',
        'trouve' => $valeurs !== [],
        'brut' => $valeurs, // toutes les clés du .env (CleAdmin, EmailEquipe…)
    ];
    return $config;
}

// Valeur d'une clé du .env (null si absente)
function lireFichierEnvCle(string $cle): ?string
{
    $v = config()['brut'][$cle] ?? null;
    return $v === null || $v === '' ? null : (string) $v;
}
