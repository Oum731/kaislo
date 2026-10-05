<?php
// ------------------------------------------------------------
// BASE DE DONNÉES : connexion (MySQL sur Hostinger, SQLite pour les tests)
// et création automatique des tables à la première utilisation.
//
// Pour ajouter une table : l'ajouter dans STRUCTURE et augmenter VERSION_BASE.
// Pour ajouter une colonne à une table existante : l'ajouter dans STRUCTURE
// ET écrire l'ALTER TABLE correspondant dans migrer() (bases déjà installées).
// ------------------------------------------------------------

const VERSION_BASE = 5;

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
            'cle_telephone' => 'VARCHAR(20)', // numéro du commerce (chiffres du format international) : unique
            'notes' => 'LONG', // notes internes de l'équipe Amorac
            'commercial_id' => 'ID', // commercial Kaislo qui a apporté le commerce (code parrain)
            'fondateur' => 'ENTIER', // 1 = tarif fondateur (remise à vie, 20 premiers clients)
            'commission_validee_le' => 'DATE', // 6 mois payés et utilisés : commissions du commercial débloquées
        ],
        'cle' => ['id'], 'uniques' => [['code'], ['cle_telephone']], 'index' => [],
    ],
    // Gérants et vendeurs (le numéro de téléphone est unique dans tout Kaislo)
    'utilisateurs' => [
        'colonnes' => [
            'id' => 'ID', 'commerce_id' => 'ID', 'nom' => 'TEXTE', 'telephone' => 'VARCHAR(40)',
            'cle_telephone' => 'VARCHAR(20)', 'pin_hash' => 'TEXTE', 'role' => 'VARCHAR(10)', 'actif' => 'ENTIER',
            'peut_gerer_produits' => 'ENTIER', 'peut_faire_remises' => 'ENTIER', 'cree_le' => 'DATE', 'modifie_le' => 'DATE',
            'poste_id' => 'VARCHAR(40)', // poste (point d'impression) du vendeur : 5 vendeurs au maximum par poste
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
            'postes' => 'ENTIER', 'details' => 'LONG', // nombre de postes payés ; formule, remise… (JSON)
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
        'colonnes' => [
            'id' => 'ID', 'email' => 'VARCHAR(190)', 'nom' => 'TEXTE', 'mdp_hash' => 'TEXTE', 'cree_le' => 'DATE',
            'role' => 'VARCHAR(20)', 'actif' => 'ENTIER', 'vu_le' => 'DATE', // role : 'admin' (tout) ou 'support' (messages, consultation)
        ],
        'cle' => ['id'], 'uniques' => [['email']], 'index' => [],
    ],
    // Sessions de l'espace Amorac (8 heures, empreinte du jeton seulement)
    'jetons_admin' => [
        'colonnes' => ['jeton_hash' => 'VARCHAR(64)', 'admin_id' => 'ID', 'cree_le' => 'DATE', 'expire_le' => 'DATE', 'appareil' => 'TEXTE'],
        'cle' => ['jeton_hash'], 'uniques' => [], 'index' => [['admin_id']],
    ],
    // Messagerie entre chaque commerce et l'équipe Amorac
    'messages' => [
        'colonnes' => [
            'id' => 'ID', 'commerce_id' => 'ID', 'auteur' => 'VARCHAR(10)', // 'commerce' ou 'amorac'
            'auteur_id' => 'ID', 'auteur_nom' => 'TEXTE', 'texte' => 'LONG', 'cree_le' => 'DATE', 'lu_le' => 'DATE',
        ],
        'cle' => ['id'], 'uniques' => [], 'index' => [['commerce_id', 'cree_le']],
    ],
    // Réglages de l'équipe Amorac (offres d'abonnement…), en JSON
    'reglages_amorac' => [
        'colonnes' => ['cle' => 'VARCHAR(40)', 'valeur' => 'LONG', 'modifie_le' => 'DATE'],
        'cle' => ['cle'], 'uniques' => [], 'index' => [],
    ],
    // Messages laissés par les visiteurs du site (bulle « Discuter avec nous »)
    'contacts' => [
        'colonnes' => [
            'id' => 'ID', 'nom' => 'TEXTE', 'contact' => 'TEXTE', 'texte' => 'LONG', 'page' => 'TEXTE',
            'ip_hash' => 'VARCHAR(64)', 'cree_le' => 'DATE', 'traite_le' => 'DATE', 'traite_par' => 'TEXTE',
        ],
        'cle' => ['id'], 'uniques' => [], 'index' => [['cree_le']],
    ],
    // Commerciaux Kaislo (code parrain, commission sur les abonnements de leurs clients)
    'commerciaux' => [
        'colonnes' => [
            'id' => 'ID', 'nom' => 'TEXTE', 'telephone' => 'VARCHAR(40)', 'cle_telephone' => 'VARCHAR(20)', 'email' => 'TEXTE',
            'pays' => 'VARCHAR(4)', 'code' => 'VARCHAR(20)', 'pin_hash' => 'TEXTE', 'taux' => 'MONTANT', 'actif' => 'ENTIER',
            'notes' => 'LONG', 'cree_le' => 'DATE', 'vu_le' => 'DATE',
        ],
        'cle' => ['id'], 'uniques' => [['code'], ['cle_telephone']], 'index' => [],
    ],
    // Sessions de l'espace commercial (30 jours, empreinte du jeton seulement)
    'jetons_commerciaux' => [
        'colonnes' => ['jeton_hash' => 'VARCHAR(64)', 'commercial_id' => 'ID', 'cree_le' => 'DATE', 'expire_le' => 'DATE'],
        'cle' => ['jeton_hash'], 'uniques' => [], 'index' => [['commercial_id']],
    ],
    // Commissions : une ligne par mois payé par le client (12 premiers mois)
    // statut : attente (avant validation) · a_payer · payee · annulee
    'commissions' => [
        'colonnes' => [
            'id' => 'ID', 'commercial_id' => 'ID', 'commerce_id' => 'ID', 'paiement_id' => 'ID', 'rang' => 'ENTIER',
            'montant' => 'MONTANT', 'devise' => 'VARCHAR(6)', 'statut' => 'VARCHAR(12)', 'cree_le' => 'DATE',
            'paye_le' => 'DATE', 'paye_par' => 'TEXTE', 'moyen' => 'VARCHAR(30)',
        ],
        'cle' => ['id'], 'uniques' => [], 'index' => [['commercial_id'], ['commerce_id']],
    ],
    // Primes des commerciaux (paliers de clients validés), enregistrées quand elles sont versées
    'primes' => [
        'colonnes' => [
            'id' => 'ID', 'commercial_id' => 'ID', 'palier' => 'ENTIER', 'montant' => 'MONTANT', 'devise' => 'VARCHAR(6)',
            'paye_le' => 'DATE', 'paye_par' => 'TEXTE', 'moyen' => 'VARCHAR(30)',
        ],
        'cle' => ['id'], 'uniques' => [['commercial_id', 'palier']], 'index' => [],
    ],
    // Autorisations données par le gérant (code PIN saisi sur l'appareil d'un vendeur : annuler une vente)
    'autorisations' => [
        'colonnes' => ['utilisateur_id' => 'ID', 'commerce_id' => 'ID', 'expire_le' => 'DATE'],
        'cle' => ['utilisateur_id'], 'uniques' => [], 'index' => [],
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
    $pdo->exec('CREATE TABLE IF NOT EXISTS kaislo_version (version INTEGER NOT NULL)');
    $version = (int) ($pdo->query('SELECT MAX(version) AS v FROM kaislo_version')->fetch()['v'] ?? 0);
    if ($version === 0) $version = reprendreAncienneVersion($pdo);
    if ($version >= VERSION_BASE) return;

    // Base déjà installée en version 1 : colonne recu_le ajoutée aux éléments
    // (si deux visiteurs arrivent au même instant, le second ignore « colonne déjà ajoutée »)
    $essayer = function (string $sql) use ($pdo) { try { $pdo->exec($sql); } catch (PDOException) { /* déjà fait */ } };
    if ($version === 1) {
        $essayer('ALTER TABLE elements ADD COLUMN recu_le VARCHAR(30) NULL');
        $essayer('CREATE INDEX i_elements_1 ON elements (commerce_id, recu_le)');
    }
    // Bases en version 1 ou 2 : numéro du commerce, notes Amorac, rôles de l'équipe
    $texteLong = $driver !== 'sqlite' ? 'MEDIUMTEXT' : 'TEXT';
    if ($version >= 1 && $version < 3) {
        $essayer('ALTER TABLE commerces ADD COLUMN cle_telephone VARCHAR(20) NULL');
        $essayer("ALTER TABLE commerces ADD COLUMN notes $texteLong NULL");
        $essayer('CREATE UNIQUE INDEX u_commerces_1 ON commerces (cle_telephone)');
        $essayer('ALTER TABLE admins ADD COLUMN role VARCHAR(20) NULL');
        $essayer('ALTER TABLE admins ADD COLUMN actif INTEGER NULL');
        $essayer('ALTER TABLE admins ADD COLUMN vu_le VARCHAR(30) NULL');
    }

    // Bases en version 1 à 3 : postes, commerciaux, tarif fondateur
    if ($version >= 1 && $version < 4) {
        $essayer('ALTER TABLE commerces ADD COLUMN commercial_id VARCHAR(32) NULL');
        $essayer('ALTER TABLE commerces ADD COLUMN fondateur INTEGER NULL');
        $essayer('ALTER TABLE commerces ADD COLUMN commission_validee_le VARCHAR(30) NULL');
        $essayer('ALTER TABLE utilisateurs ADD COLUMN poste_id VARCHAR(40) NULL');
        $essayer('ALTER TABLE paiements ADD COLUMN postes INTEGER NULL');
        $essayer("ALTER TABLE paiements ADD COLUMN details $texteLong NULL");
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
    // Numéros déjà enregistrés : mis au format international (pays du commerce)
    if ($version >= 1 && $version < 3) normaliserNumerosExistants($pdo);
    $pdo->prepare('INSERT INTO kaislo_version (version) VALUES (?)')->execute([VERSION_BASE]);
}

// Bases installées avant octobre 2026 : la table de version avait l'ancien nom du produit
function reprendreAncienneVersion(PDO $pdo): int
{
    $ancienne = 'kais' . 'ly_version';
    try { $v = (int) ($pdo->query("SELECT MAX(version) AS v FROM $ancienne")->fetch()['v'] ?? 0); } catch (PDOException) { return 0; }
    if ($v > 0) $pdo->prepare('INSERT INTO kaislo_version (version) VALUES (?)')->execute([$v]);
    $pdo->exec("DROP TABLE $ancienne");
    return $v;
}

// (migration v3) « 07 07 12 34 56 » -> « +225 07 07 12 34 56 » et clé unique sur le numéro complet
function normaliserNumerosExistants(PDO $pdo): void
{
    foreach ($pdo->query('SELECT u.id, u.telephone, c.pays FROM utilisateurs u JOIN commerces c ON c.id = u.commerce_id')->fetchAll() as $u) {
        $n = normaliserTelephone((string) $u['telephone'], (string) $u['pays']);
        if (!$n['ok']) continue;
        try { $pdo->prepare('UPDATE utilisateurs SET telephone = ?, cle_telephone = ? WHERE id = ?')->execute([$n['affichage'], $n['cle'], $u['id']]); } catch (PDOException) { /* doublon : on garde l'ancien */ }
    }
    foreach ($pdo->query('SELECT id, telephone, pays FROM commerces')->fetchAll() as $c) {
        $n = normaliserTelephone((string) $c['telephone'], (string) $c['pays']);
        if (!$n['ok']) continue;
        try { $pdo->prepare('UPDATE commerces SET telephone = ?, cle_telephone = ? WHERE id = ?')->execute([$n['affichage'], $n['cle'], $c['id']]); } catch (PDOException) { /* doublon */ }
    }
}
