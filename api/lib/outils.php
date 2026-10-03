<?php
// ------------------------------------------------------------
// OUTILS COMMUNS : réponses JSON, lecture de la demande, dates,
// identifiants, numéros de téléphone, anti-force brute, jetons.
// ------------------------------------------------------------

// Pays acceptés et leur devise (même liste que src/lib/donnees/modeles.js)
const PAYS = [
    'MA' => 'MAD', 'CI' => 'FCFA', 'SN' => 'FCFA', 'ML' => 'FCFA', 'BF' => 'FCFA', 'BJ' => 'FCFA', 'TG' => 'FCFA',
    'NE' => 'FCFA', 'GN' => 'GNF', 'CM' => 'FCFA', 'GA' => 'FCFA', 'CG' => 'FCFA', 'FR' => 'EUR', 'BE' => 'EUR',
    'CA' => 'CAD', 'XX' => 'USD',
];
const TYPES_COMMERCE = ['restaurant', 'epicerie', 'autre'];
const DUREE_ESSAI_JOURS = 30;
const DUREE_JETON_JOURS = 90;   // un appareil reste connecté 90 jours sans utilisation
const ESSAIS_AVANT_BLOCAGE = 5; // codes faux autorisés…
const MINUTES_BLOCAGE = 15;     // …avant un blocage de 15 minutes

// Erreur « prévue » : renvoyée telle quelle à l'application (message en français)
class ErreurApi extends Exception
{
    public function __construct(string $message, public int $statut = 400)
    {
        parent::__construct($message);
    }
}

function repondre(array $donnees, int $statut = 200): never
{
    http_response_code($statut);
    echo json_encode($donnees, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// Corps JSON de la demande
function entree(): array
{
    $brut = file_get_contents('php://input');
    if ($brut === '' || $brut === false) return [];
    $donnees = json_decode($brut, true);
    if (!is_array($donnees)) throw new ErreurApi('Demande mal formée');
    return $donnees;
}

// Texte nettoyé, obligatoire ou non, longueur limitée
function texte(array $source, string $cle, string $libelle, bool $obligatoire = true, int $max = 120): string
{
    $valeur = trim((string) ($source[$cle] ?? ''));
    if ($obligatoire && $valeur === '') throw new ErreurApi("Indiquez : $libelle");
    if (mb_strlen($valeur) > $max) throw new ErreurApi("$libelle : $max caractères au maximum");
    return $valeur;
}

function maintenant(int $decalageSecondes = 0): string
{
    return gmdate('Y-m-d\TH:i:s\Z', time() + $decalageSecondes);
}

function nouvelId(string $prefixe = ''): string
{
    return $prefixe . bin2hex(random_bytes(10));
}

// Clé d'un numéro de téléphone : ses 9 derniers chiffres (« +225 07 08… » = « 07 08… »)
// Même règle que cleTelephone() dans l'application.
function cleTelephone(string $telephone): string
{
    $chiffres = preg_replace('/\D/', '', $telephone);
    return strlen($chiffres) >= 8 ? substr($chiffres, -9) : '';
}

function adresseIp(): string
{
    return substr($_SERVER['REMOTE_ADDR'] ?? 'inconnue', 0, 45);
}

// ---------- Anti-force brute ----------

// Lève une erreur si la clé (numéro ou IP) est bloquée
function verifierBlocage(string $cle): void
{
    $ligne = requete('SELECT bloque_jusqua FROM tentatives WHERE cle = ?', [$cle])->fetch();
    if ($ligne && $ligne['bloque_jusqua'] && $ligne['bloque_jusqua'] > maintenant()) {
        $minutes = max(1, (int) ceil((strtotime($ligne['bloque_jusqua']) - time()) / 60));
        throw new ErreurApi("Trop de codes faux. Réessayez dans $minutes minute" . ($minutes > 1 ? 's' : '') . '.', 429);
    }
}

// Renvoie true si cet échec déclenche le blocage
function noterEchec(string $cle, int $limite = ESSAIS_AVANT_BLOCAGE): bool
{
    $ligne = requete('SELECT echecs FROM tentatives WHERE cle = ?', [$cle])->fetch();
    $echecs = ($ligne['echecs'] ?? 0) + 1;
    $bloque = $echecs >= $limite ? maintenant(MINUTES_BLOCAGE * 60) : null;
    if ($bloque) $echecs = 0; // nouveau cycle après le blocage
    if ($ligne) requete('UPDATE tentatives SET echecs = ?, bloque_jusqua = ?, modifie_le = ? WHERE cle = ?', [$echecs, $bloque, maintenant(), $cle]);
    else requete('INSERT INTO tentatives (cle, echecs, bloque_jusqua, modifie_le) VALUES (?, ?, ?, ?)', [$cle, $echecs, $bloque, maintenant()]);
    return $bloque !== null;
}

function effacerEchecs(string $cle): void
{
    requete('DELETE FROM tentatives WHERE cle = ?', [$cle]);
}

// ---------- Base ----------

function requete(string $sql, array $parametres = []): PDOStatement
{
    $r = base()->prepare($sql);
    $r->execute($parametres);
    return $r;
}

function journaliser(?string $commerceId, ?string $utilisateurId, string $action, array $details = []): void
{
    requete('INSERT INTO journal (id, commerce_id, utilisateur_id, action, details, cree_le) VALUES (?, ?, ?, ?, ?, ?)', [
        nouvelId('j'), $commerceId, $utilisateurId, $action, json_encode($details + ['ip' => adresseIp()], JSON_UNESCAPED_UNICODE), maintenant(),
    ]);
}

// ---------- Jetons de connexion ----------

// Crée un jeton pour un appareil ; seul son empreinte est enregistrée
function creerJeton(array $utilisateur, string $appareil): string
{
    $jeton = bin2hex(random_bytes(32));
    requete('INSERT INTO jetons (jeton_hash, utilisateur_id, commerce_id, appareil, cree_le, vu_le, expire_le) VALUES (?, ?, ?, ?, ?, ?, ?)', [
        hash('sha256', $jeton), $utilisateur['id'], $utilisateur['commerce_id'], mb_substr($appareil, 0, 200), maintenant(), maintenant(), maintenant(DUREE_JETON_JOURS * 86400),
    ]);
    return $jeton;
}

function jetonRecu(): ?string
{
    // Apache sur Hostinger peut masquer « Authorization » : l'en-tête X-Kaislo-Jeton sert de secours
    $entete = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/^Bearer\s+([a-f0-9]{64})$/i', $entete, $m)) return strtolower($m[1]);
    $secours = $_SERVER['HTTP_X_KAISLO_JETON'] ?? $_SERVER['HTTP_X_KAISLY_JETON'] ?? ''; // (ancien nom accepté)
    return preg_match('/^[a-f0-9]{64}$/i', $secours) ? strtolower($secours) : null;
}

// Utilisateur connecté (sinon erreur 401). Prolonge la validité du jeton à chaque utilisation.
function utilisateurConnecte(): array
{
    $jeton = jetonRecu();
    if (!$jeton) throw new ErreurApi('Connexion nécessaire', 401);
    $empreinte = hash('sha256', $jeton);
    $ligne = requete('SELECT j.expire_le, u.* FROM jetons j JOIN utilisateurs u ON u.id = j.utilisateur_id WHERE j.jeton_hash = ?', [$empreinte])->fetch();
    if (!$ligne || $ligne['expire_le'] < maintenant()) throw new ErreurApi('Session expirée : reconnectez-vous', 401);
    if (!$ligne['actif']) throw new ErreurApi('Ce compte a été désactivé par le gérant', 403);
    requete('UPDATE jetons SET vu_le = ?, expire_le = ? WHERE jeton_hash = ?', [maintenant(), maintenant(DUREE_JETON_JOURS * 86400), $empreinte]);
    unset($ligne['expire_le']);
    return $ligne;
}

// ---------- Mise en forme pour l'application ----------

function versUtilisateur(array $u): array
{
    return [
        'id' => $u['id'], 'commerceId' => $u['commerce_id'], 'nom' => $u['nom'], 'telephone' => $u['telephone'],
        'role' => $u['role'], 'actif' => (bool) $u['actif'],
        'peutGererProduits' => (bool) $u['peut_gerer_produits'], 'peutFaireRemises' => (bool) $u['peut_faire_remises'],
    ];
}

function versCommerce(array $c): array
{
    return [
        'id' => $c['id'], 'code' => $c['code'], 'nom' => $c['nom'], 'type' => $c['type'], 'pays' => $c['pays'],
        'devise' => $c['devise'], 'ville' => $c['ville'], 'telephone' => $c['telephone'],
        'creeLe' => $c['cree_le'], 'conditionsAccepteesLe' => $c['conditions_acceptees_le'],
        'abonnement' => [
            'offre' => $c['offre'], 'statut' => $c['statut'], 'essaiFin' => $c['essai_fin'], 'periodeFin' => $c['periode_fin'],
        ],
    ];
}
