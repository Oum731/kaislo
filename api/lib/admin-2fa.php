<?php
// ------------------------------------------------------------
// DOUBLE AUTHENTIFICATION DE L'ESPACE KAISLO (code à 6 chiffres d'une application : Google Authenticator, Microsoft Authenticator, Authy…)
//
// Protège les comptes de l'équipe : un mot de passe volé ne suffit plus. Norme TOTP (RFC 6238 : SHA-1, 6 chiffres, 30 secondes).
//   POST /api/admin/2fa/preparer     crée un secret et renvoie l'adresse « otpauth » (code QR) : pas encore actif
//   POST /api/admin/2fa/activer      { code } : vérifie le premier code, active, renvoie 8 codes de secours (affichés une seule fois)
//   POST /api/admin/2fa/desactiver   { motDePasse, code } : le code peut être un code de secours
//   POST /api/admin/connexion        { email, motDePasse, code? } : si le compte a la double authentification et qu'il n'y a pas de code,
//                                    la réponse est { ok: true, code2fa: true } (aucune session) ; l'application redemande avec le code
//   POST /api/admin/equipe           { id, reinitialiser2fa: true } : un administrateur retire la double authentification d'un collègue
//                                    qui a perdu son appareil (et ses codes de secours)
// Un code ne sert qu'une fois (pas de rejeu) ; les erreurs comptent dans le blocage des essais de connexion.
// ------------------------------------------------------------

const TOTP_PAS_SECONDES = 30;
const CODES_SECOURS_NOMBRE = 8;

function base32Encoder(string $binaire): string
{
    $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $bits = '';
    foreach (str_split($binaire) as $c) $bits .= str_pad(decbin(ord($c)), 8, '0', STR_PAD_LEFT);
    $texte = '';
    foreach (str_split($bits, 5) as $morceau) $texte .= $alphabet[bindec(str_pad($morceau, 5, '0'))];
    return $texte;
}

function base32Decoder(string $texte): string
{
    $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $bits = '';
    foreach (str_split(strtoupper(preg_replace('/[^A-Za-z2-7]/', '', $texte))) as $c) $bits .= str_pad(decbin(strpos($alphabet, $c)), 5, '0', STR_PAD_LEFT);
    $binaire = '';
    foreach (str_split($bits, 8) as $octet) if (strlen($octet) === 8) $binaire .= chr(bindec($octet));
    return $binaire;
}

/** Code à 6 chiffres du pas de temps donné (numéro de tranche de 30 secondes). */
function codeTotp(string $secretBinaire, int $pas): string
{
    $h = hash_hmac('sha1', pack('N2', 0, $pas), $secretBinaire, true);
    $d = ord($h[19]) & 0x0f;
    $n = ((ord($h[$d]) & 0x7f) << 24) | (ord($h[$d + 1]) << 16) | (ord($h[$d + 2]) << 8) | ord($h[$d + 3]);
    return str_pad((string) ($n % 1000000), 6, '0', STR_PAD_LEFT);
}

/** Le code est-il valable (tranche actuelle, précédente ou suivante, jamais utilisé) ? Renvoie le pas utilisé, ou null. */
function pasTotpValide(string $secretBase32, string $code, int $dernierPas): ?int
{
    if (!preg_match('/^\d{6}$/', $code)) return null;
    $secret = base32Decoder($secretBase32);
    $maintenant = intdiv(time(), TOTP_PAS_SECONDES);
    for ($decalage = -1; $decalage <= 1; $decalage++) {
        $pas = $maintenant + $decalage;
        if ($pas > $dernierPas && hash_equals(codeTotp($secret, $pas), $code)) return $pas;
    }
    return null;
}

function normaliserCodeSecours(string $code): string
{
    return strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $code));
}

function genererCodesSecours(): array
{
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans I, O, 0, 1 (lisibles à la main)
    $codes = [];
    for ($i = 0; $i < CODES_SECOURS_NOMBRE; $i++) {
        $c = '';
        for ($j = 0; $j < 8; $j++) $c .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        $codes[] = substr($c, 0, 4) . '-' . substr($c, 4);
    }
    return $codes;
}

/** Vérifie le code (application ou code de secours) du compte ; consomme ce qui a servi. */
function verifierDeuxFacteurs(array $a, string $code): bool
{
    $code = trim($code);
    if ($code === '') return false;
    if (preg_match('/^\d{6}$/', $code)) {
        $pas = pasTotpValide((string) $a['totp_secret'], $code, (int) ($a['totp_dernier'] ?? 0));
        if ($pas === null) return false;
        requete('UPDATE admins SET totp_dernier = ? WHERE id = ?', [$pas, $a['id']]);
        return true;
    }
    $saisi = normaliserCodeSecours($code);
    $hashes = json_decode((string) ($a['codes_secours'] ?? '[]'), true) ?: [];
    foreach ($hashes as $i => $h) {
        if (password_verify($saisi, $h)) {
            unset($hashes[$i]);
            requete('UPDATE admins SET codes_secours = ? WHERE id = ?', [json_encode(array_values($hashes)), $a['id']]);
            return true;
        }
    }
    return false;
}

function adresseOtpauth(string $email, string $secret): string
{
    return 'otpauth://totp/' . rawurlencode('Kaislo:' . $email) . '?secret=' . $secret . '&issuer=Kaislo&algorithm=SHA1&digits=6&period=' . TOTP_PAS_SECONDES;
}

function ligneAdmin(string $id): array
{
    return requete('SELECT * FROM admins WHERE id = ?', [$id])->fetch() ?: [];
}

function routeAdmin2faPreparer(): never
{
    $moi = adminConnecte();
    if (!empty(ligneAdmin($moi['id'])['totp_actif'])) throw new ErreurApi('La double authentification est déjà activée', 409);
    $secret = base32Encoder(random_bytes(20));
    requete('UPDATE admins SET totp_secret = ?, totp_actif = 0, totp_dernier = 0 WHERE id = ?', [$secret, $moi['id']]);
    repondre(['ok' => true, 'secret' => $secret, 'adresse' => adresseOtpauth($moi['email'], $secret)]);
}

function routeAdmin2faActiver(): never
{
    $moi = adminConnecte();
    $a = ligneAdmin($moi['id']);
    if (!empty($a['totp_actif'])) throw new ErreurApi('La double authentification est déjà activée', 409);
    if (empty($a['totp_secret'])) throw new ErreurApi('Commencez par « Activer la double authentification »', 400);
    $cleEmail = 'admin2fa:' . $a['id'];
    verifierBlocage($cleEmail);
    $pas = pasTotpValide((string) $a['totp_secret'], trim((string) (entree()['code'] ?? '')), 0);
    if ($pas === null) {
        $bloque = noterEchec($cleEmail);
        throw new ErreurApi($bloque ? 'Trop d’essais : réessayez dans ' . MINUTES_BLOCAGE . ' minutes.' : 'Code incorrect : vérifiez l’heure de votre téléphone et réessayez', $bloque ? 429 : 400);
    }
    effacerEchecs($cleEmail);
    $codes = genererCodesSecours();
    requete('UPDATE admins SET totp_actif = 1, totp_dernier = ?, codes_secours = ? WHERE id = ?', [$pas, json_encode(array_map(fn ($c) => password_hash(normaliserCodeSecours($c), PASSWORD_DEFAULT), $codes)), $a['id']]);
    journaliser(null, $a['id'], 'admin-2fa-activee');
    repondre(['ok' => true, 'codesSecours' => $codes]);
}

function routeAdmin2faDesactiver(): never
{
    $moi = adminConnecte();
    $a = ligneAdmin($moi['id']);
    if (empty($a['totp_actif'])) throw new ErreurApi('La double authentification n’est pas activée', 409);
    $e = entree();
    $cleEmail = 'admin2fa:' . $a['id'];
    verifierBlocage($cleEmail);
    if (!password_verify((string) ($e['motDePasse'] ?? ''), $a['mdp_hash']) || !verifierDeuxFacteurs($a, (string) ($e['code'] ?? ''))) {
        $bloque = noterEchec($cleEmail);
        throw new ErreurApi($bloque ? 'Trop d’essais : réessayez dans ' . MINUTES_BLOCAGE . ' minutes.' : 'Mot de passe ou code incorrect', $bloque ? 429 : 400);
    }
    effacerEchecs($cleEmail);
    requete('UPDATE admins SET totp_actif = 0, totp_secret = NULL, totp_dernier = 0, codes_secours = NULL WHERE id = ?', [$a['id']]);
    journaliser(null, $a['id'], 'admin-2fa-desactivee');
    repondre(['ok' => true]);
}

/** Un administrateur retire la double authentification d'un collègue (appareil et codes de secours perdus). */
function reinitialiserDeuxFacteurs(array $moi, string $idCible): void
{
    requete('UPDATE admins SET totp_actif = 0, totp_secret = NULL, totp_dernier = 0, codes_secours = NULL WHERE id = ?', [$idCible]);
    requete('DELETE FROM jetons_admin WHERE admin_id = ?', [$idCible]);
    journaliser(null, $moi['id'], 'admin-2fa-reinitialisee', ['compte' => $idCible]);
}
