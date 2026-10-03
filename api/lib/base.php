<?php
// ------------------------------------------------------------
// BASE DE DONNÉES : connexion (MySQL sur Hostinger, SQLite pour les tests)
// et création automatique des tables à la première utilisation.
//
// Pour ajouter une table : l'ajouter dans STRUCTURE et augmenter VERSION_BASE.
// Pour ajouter une colonne à une table existante : l'ajouter dans STRUCTURE
// ET écrire l'ALTER TABLE correspondant dans migrer() (bases déjà installées).
// ------------------------------------------------------------

const VERSION_BASE = 2;

// Types « neutres », traduits pour MySQL ou SQLite
//   ID : identifiant texte · TEXTE : texte court · LONG : texte long (JSON) · ENTIER · MONTANT · DATE (texte ISO)
const STRUCTURE = [
    // Les commerces inscrits
    'commerces' => [
        'colonnes' => [
            'id' => 'ID', 'code' => 'VARCHAR(10)', 'nom' => 'TEXTE', 'type' => 'VARCHAR(20)',
            'pays' => 'VARCHAR(4)', 'devise' => 'VARCHAR(6)', 'ville' => 'TEXTE', 'telephone' => 'VARCHAR(40)',
            'offre' => 'VARCHAR(20)', 'statut' => 'VARCHAR(20)', 'essai_fin' => 'DATE', 'periode_fin' => 'DATE',
            'conditions_acceptees_le' => 'DATE', 'cree_le' => 'DATE', 'modifie_le' => 'DATE',
        ],
        'cle' => ['id'], 'uniques' => [['code']], 'index' => [],
    ],
    // Gérants et vendeurs (le numéro de téléphone est unique dans tout Kaislo)
    'utilisateurs' => [
        'colonnes' => [
            'id' => 'ID', 'commerce_id' => 'ID', 'nom' => 'TEXTE', 'telephone' => 'VARCHAR(40)',
            'cle_telephone' => 'VARCHAR(20)', 'pin_hash' => 'TEXTE', 'role' => 'VARCHAR(10)', 'actif' => 'ENTIER',
            'peut_gerer_produits' => 'ENTIER', 'peut_faire_remises' => 'ENTIER', 'cree_le' => 'DATE', 'modifie_le' => 'DATE',
        ],
        'cle' => ['id'], 'uniques' => [['cle_telephone']], 'index' => [['commerce_id']],
    ],
    // Jetons de connexion (un par appareil connecté) ; seul leur empreinte est gardée
    'jetons' => [
        'colonnes' => [
            'jeton_hash' => 'VARCHAR(64)', 'utilisateur_id' => 'ID', 'commerce_id' => 'ID', 'appareil' => 'TEXTE',
            'cree_le' => 'DATE', 'vu_le' => 'DATE', 'expire_le' => 'DATE',
        ],
        'cle' => ['jeton_hash'], 'uniques' => [], 'index' => [['utilisateur_id']],
    ],
    // Codes faux : blocage temporaire après plusieurs essais (par numéro et par adresse IP)
    'tentatives' => [
        'colonnes' => ['cle' => 'VARCHAR(80)', 'echecs' => 'ENTIER', 'bloque_jusqua' => 'DATE', 'modifie_le' => 'DATE'],
        'cle' => ['cle'], 'uniques' => [], 'index' => [],
    ],
    // Données synchronisées depuis les caisses (articles, ventes, clients…), en JSON
    'elements' => [
        'colonnes' => [
            'commerce_id' => 'ID', 'type' => 'VARCHAR(20)', 'id' => 'VARCHAR(40)', 'contenu' => 'LONG',
            'modifie_le' => 'DATE', 'supprime' => 'ENTIER',
            'recu_le' => 'DATE', // heure d'arrivée sur le serveur : sert à envoyer les nouveautés aux autres appareils
        ],
        'cle' => ['commerce_id', 'type', 'id'], 'uniques' => [], 'index' => [['commerce_id', 'modifie_le'], ['commerce_id', 'recu_le']],
    ],
    // Paiements des abonnements (enregistrés par l'équipe Amorac ou le prestataire de paiement)
    'paiements' => [
        'colonnes' => [
            'id' => 'ID', 'commerce_id' => 'ID', 'date' => 'DATE', 'montant' => 'MONTANT', 'devise' => 'VARCHAR(6)',
            'mois' => 'ENTIER', 'moyen' => 'VARCHAR(30)', 'note' => 'TEXTE', 'cree_par' => 'TEXTE',
        ],
        'cle' => ['id'], 'uniques' => [], 'index' => [['commerce_id']],
    ],
    // Empreinte / Face ID : clé publique de chaque appareil (la clé secrète ne quitte jamais le téléphone)
    'cles_biometriques' => [
        'colonnes' => [
            'id_hash' => 'VARCHAR(64)', 'credential_id' => 'LONG', 'utilisateur_id' => 'ID', 'commerce_id' => 'ID',
            'cle_publique' => 'LONG', 'algo' => 'ENTIER', 'compteur' => 'ENTIER', 'appareil' => 'TEXTE',
            'cree_le' => 'DATE', 'utilise_le' => 'DATE',
        ],
        'cle' => ['id_hash'], 'uniques' => [], 'index' => [['utilisateur_id']],
    ],
    // Défis à usage unique (5 minutes) pour l'empreinte / Face ID
    'defis' => [
        'colonnes' => ['defi_hash' => 'VARCHAR(64)', 'type' => 'VARCHAR(20)', 'utilisateur_id' => 'ID', 'expire_le' => 'DATE'],
        'cle' => ['defi_hash'], 'uniques' => [], 'index' => [],
    ],
    // Comptes de l'équipe Amorac (espace /admin)
    'admins' => [
        'colonnes' => ['id' => 'ID', 'email' => 'VARCHAR(190)', 'nom' => 'TEXTE', 'mdp_hash' => 'TEXTE', 'cree_le' => 'DATE'],
        'cle' => ['id'], 'uniques' => [['email']], 'index' => [],
    ],
    // Journal des actions importantes (inscription, connexion, suspension…)
    'journal' => [
        'colonnes' => [
            'id' => 'ID', 'commerce_id' => 'ID', 'utilisateur_id' => 'ID', 'action' => 'VARCHAR(40)',
            'details' => 'LONG', 'cree_le' => 'DATE',
        ],
        'cle' => ['id'], 'uniques' => [], 'index' => [['commerce_id']],
    ],
];

// Connexion unique pour toute la requête
function base(): PDO
{
    static $pdo = null;
    if ($pdo) return $pdo;
    $c = config();
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    if ($c['driver'] === 'sqlite') {
        $pdo = new PDO('sqlite:' . $c['fichierSqlite'], null, null, $options);
    } else {
        $pdo = new PDO("mysql:host={$c['serveur']};dbname={$c['base']};charset=utf8mb4", $c['utilisateur'], $c['motDePasse'], $options);
    }
    migrer($pdo, $c['driver']);
    return $pdo;
}

// Traduit un type neutre pour le moteur de base de données
function typeSql(string $type, string $driver): string
{
    $mysql = $driver !== 'sqlite';
    return match ($type) {
        'ID' => 'VARCHAR(32)',
        'TEXTE' => $mysql ? 'VARCHAR(255)' : 'TEXT',
        'LONG' => $mysql ? 'MEDIUMTEXT' : 'TEXT',
        'ENTIER' => 'INTEGER',
        'MONTANT' => $mysql ? 'DECIMAL(14,2)' : 'REAL',
        'DATE' => 'VARCHAR(30)',
        default => $type, // VARCHAR(n) tel quel
    };
}

// Crée les tables manquantes (une seule fois par version)
function migrer(PDO $pdo, string $driver): void
{
    $pdo->exec('CREATE TABLE IF NOT EXISTS kaisly_version (version INTEGER NOT NULL)');
    $version = (int) ($pdo->query('SELECT MAX(version) AS v FROM kaisly_version')->fetch()['v'] ?? 0);
    if ($version >= VERSION_BASE) return;

    // Base déjà installée en version 1 : colonne recu_le ajoutée aux éléments
    // (si deux visiteurs arrivent au même instant, le second ignore « colonne déjà ajoutée »)
    if ($version === 1) {
        try { $pdo->exec('ALTER TABLE elements ADD COLUMN recu_le VARCHAR(30) NULL'); } catch (PDOException) { /* déjà fait */ }
        try { $pdo->exec('CREATE INDEX i_elements_1 ON elements (commerce_id, recu_le)'); } catch (PDOException) { /* déjà fait */ }
    }

    foreach (STRUCTURE as $table => $t) {
        $lignes = [];
        foreach ($t['colonnes'] as $nom => $type) {
            $lignes[] = "$nom " . typeSql($type, $driver) . (in_array($nom, $t['cle'], true) ? ' NOT NULL' : ' NULL');
        }
        $lignes[] = 'PRIMARY KEY (' . implode(', ', $t['cle']) . ')';
        foreach ($t['uniques'] as $i => $cols) $lignes[] = "CONSTRAINT u_{$table}_$i UNIQUE (" . implode(', ', $cols) . ')';
        if ($driver !== 'sqlite') {
            // MySQL : les index sont déclarés dans la table
            foreach ($t['index'] as $i => $cols) $lignes[] = "INDEX i_{$table}_$i (" . implode(', ', $cols) . ')';
        }
        $suffixe = $driver !== 'sqlite' ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci' : '';
        $pdo->exec("CREATE TABLE IF NOT EXISTS $table (\n  " . implode(",\n  ", $lignes) . "\n)$suffixe");
        if ($driver === 'sqlite') {
            foreach ($t['index'] as $i => $cols) $pdo->exec("CREATE INDEX IF NOT EXISTS i_{$table}_$i ON $table (" . implode(', ', $cols) . ')');
        }
    }
    $pdo->prepare('INSERT INTO kaisly_version (version) VALUES (?)')->execute([VERSION_BASE]);
}
