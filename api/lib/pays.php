<?php
// ------------------------------------------------------------
// PAYS DU VISITEUR, d'après son adresse IP (sert à afficher les tarifs de son pays).
//
//   GET /api/pays      { ok, pays: "CI" | null }
//
// Sources, dans l'ordre : en-tête du serveur ou du CDN (CF-IPCountry…), puis un service gratuit
// sans clé (api.country.is, puis ipwho.is). Seule l'adresse IP est envoyée à ce service ; rien n'est
// gardé dans la base. Le résultat est mis en cache 24 h dans un fichier temporaire (haché).
// ------------------------------------------------------------

function codePaysValide(mixed $v): ?string
{
    $v = strtoupper(trim((string) $v));
    return preg_match('/^[A-Z]{2}$/', $v) && $v !== 'XX' && $v !== 'T1' ? $v : null;
}

function adressePubliqueValide(string $ip): bool
{
    return (bool) filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE);
}

function interrogerService(string $url, string $champ): ?string
{
    $ctx = stream_context_create(['http' => ['timeout' => 2, 'ignore_errors' => true, 'header' => "Accept: application/json\r\n"]]);
    $texte = @file_get_contents($url, false, $ctx);
    $json = $texte ? json_decode($texte, true) : null;
    return is_array($json) ? codePaysValide($json[$champ] ?? null) : null;
}

function paysDeLAdresse(string $ip): ?string
{
    foreach (['HTTP_CF_IPCOUNTRY', 'HTTP_X_COUNTRY_CODE', 'HTTP_CLOUDFRONT_VIEWER_COUNTRY'] as $entete) {
        if ($p = codePaysValide($_SERVER[$entete] ?? null)) return $p;
    }
    if (!adressePubliqueValide($ip)) return null; // adresse locale : rien à chercher
    $fichier = sys_get_temp_dir() . '/kaislo-pays-' . substr(hash('sha256', $ip), 0, 24);
    if (is_file($fichier) && time() - filemtime($fichier) < 86400) {
        return codePaysValide(@file_get_contents($fichier));
    }
    $pays = interrogerService('https://api.country.is/' . rawurlencode($ip), 'country')
        ?? interrogerService('https://ipwho.is/' . rawurlencode($ip) . '?fields=country_code', 'country_code');
    if ($pays) @file_put_contents($fichier, $pays);
    return $pays;
}

function routePays(): never
{
    header('Cache-Control: no-store');
    repondre(['ok' => true, 'pays' => paysDeLAdresse(adresseIp())]);
}
