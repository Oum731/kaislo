<?php
// ------------------------------------------------------------
// DÉFI ANTI-ROBOT (« captcha » sans service extérieur, sans cookie, sans image à déchiffrer)
//
// Avant d'envoyer un formulaire public, l'application demande un défi au serveur (GET /api/defi) et son navigateur cherche un nombre
// tel que sha256(sel + nombre) commence par N zéros binaires : une fraction de seconde pour une personne, mais un coût réel pour un robot
// qui envoie des milliers de demandes (inscriptions, messages, tentatives de code PIN). Chaque défi ne sert qu'une fois et expire vite.
//
//   GET /api/defi   →  { sel, expire, signature, bits }
//   Les routes de DEFI_ROUTES attendent dans le corps  { defi: { sel, expire, signature, nonce } }
//
// Réglages du fichier .env : Defi=non (désactive, pour les tests) · DefiBits=16 (difficulté, 8 à 22)
// À noter : cela freine les robots et les envois en masse ; la protection contre les injections vient des requêtes préparées (api/lib/base.php).
// ------------------------------------------------------------

const DEFI_VALIDITE_SECONDES = 600;
const DEFI_ROUTES = [
    'POST /inscription', 'POST /connexion', 'POST /contact', 'POST /public/chat', 'POST /public/commande', 'POST /avis',
    'POST /commercial/inscription', 'POST /commercial/connexion', 'POST /admin/connexion',
];

function defiActif(): bool
{
    return strtolower((string) (lireFichierEnvCle('Defi') ?? 'oui')) !== 'non';
}

function defiBits(): int
{
    return max(8, min(22, (int) (lireFichierEnvCle('DefiBits') ?? 16)));
}

// Clé secrète des signatures : créée une fois, gardée en base
function cleDefi(): string
{
    $v = reglageAmorac('cle_defi', [])['v'] ?? null;
    if (is_string($v) && strlen($v) >= 32) return $v;
    $v = bin2hex(random_bytes(32));
    enregistrerReglageAmorac('cle_defi', ['v' => $v]);
    return $v;
}

function signatureDefi(string $sel, int $expire): string
{
    return hash_hmac('sha256', $sel . '|' . $expire, cleDefi());
}

function routeDefi(): never
{
    $sel = bin2hex(random_bytes(12));
    $expire = time() + DEFI_VALIDITE_SECONDES;
    repondre(['ok' => true, 'sel' => $sel, 'expire' => $expire, 'signature' => signatureDefi($sel, $expire), 'bits' => defiBits(), 'actif' => defiActif()]);
}

// Nombre de zéros binaires au début d'un condensé
function zerosEnTete(string $binaire): int
{
    $n = 0;
    foreach (str_split($binaire) as $octet) {
        $v = ord($octet);
        if ($v === 0) { $n += 8; continue; }
        while (($v & 0x80) === 0) { $n++; $v <<= 1; }
        break;
    }
    return $n;
}

/** Vérifie le défi résolu ; lève une erreur 400 sinon. Un défi ne passe qu'une fois. */
function verifierDefi(array $corps): void
{
    if (!defiActif()) return;
    $d = is_array($corps['defi'] ?? null) ? $corps['defi'] : [];
    $sel = (string) ($d['sel'] ?? '');
    $expire = (int) ($d['expire'] ?? 0);
    $nonce = (string) ($d['nonce'] ?? '');
    $echec = new ErreurApi('Vérification anti-robot non validée : rechargez la page et réessayez', 400);
    if (!preg_match('/^[a-f0-9]{24}$/', $sel) || $expire < time() || strlen($nonce) < 1 || strlen($nonce) > 20) throw $echec;
    if (!hash_equals(signatureDefi($sel, $expire), (string) ($d['signature'] ?? ''))) throw $echec;
    if (zerosEnTete(hash('sha256', $sel . $nonce, true)) < defiBits()) throw $echec;
    requete('DELETE FROM defis_utilises WHERE expire < ?', [time()]);
    try {
        requete('INSERT INTO defis_utilises (sel, expire) VALUES (?, ?)', [$sel, $expire]);
    } catch (PDOException) {
        throw $echec; // déjà utilisé
    }
}
