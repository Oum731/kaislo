<?php
// ------------------------------------------------------------
// SAISIE : majuscules et minuscules des noms (mêmes règles que src/lib/donnees/saisie.js, vérifiées ensemble par tests/saisie.test.mjs)
// et reconnaissance des numéros de téléphone visiblement faux (0000000, 1111122, 12345678…).
// ------------------------------------------------------------

const PARTICULES_NOM = ['de', 'du', 'des', 'la', 'le', 'les', 'et', 'd', 'l', 'sur', 'sous', 'en'];

/** Met la première lettre de chaque mot en majuscule : « jean-pierre  d'AUBIGNÉ » devient « Jean-Pierre d'Aubigné ». */
function nomPropre(string $texte): string
{
    $texte = trim((string) preg_replace('/[\p{Cc}\s]+/u', ' ', $texte));
    if ($texte === '') return '';
    $mots = explode(' ', mb_strtolower($texte));
    foreach ($mots as $i => $mot) {
        // Découpe aux tirets et aux apostrophes en gardant les séparateurs
        $morceaux = preg_split("/([-’'])/u", $mot, -1, PREG_SPLIT_DELIM_CAPTURE);
        foreach ($morceaux as $k => $m) {
            if ($m === '' || $m === '-' || $m === '’' || $m === "'") continue;
            $particule = in_array($m, PARTICULES_NOM, true) && !($i === 0 && $k === 0);
            $morceaux[$k] = $particule ? $m : mb_strtoupper(mb_substr($m, 0, 1)) . mb_substr($m, 1);
        }
        $mots[$i] = implode('', $morceaux);
    }
    return implode(' ', $mots);
}

/** Pour les noms de commerce, de ville ou de quartier : corrigé seulement si le texte est tout en minuscules, tout en majuscules, ou mêle un mot criard (« épicerie AL BARAKA »). « iPhone Store » et « SOS Dépannage » restent tels quels. */
function nomPropreSiUniforme(string $texte): string
{
    $texte = trim((string) preg_replace('/[\p{Cc}\s]+/u', ' ', $texte));
    if ($texte === '') return '';
    if ($texte === mb_strtolower($texte) || $texte === mb_strtoupper($texte)) return nomPropre($texte);
    // Texte mêlant un mot criard (4 lettres ou plus, tout en majuscules) et d'autres mots : « épicerie AL BARAKA », « CHEZ awa »
    foreach (explode(' ', $texte) as $mot) {
        if (mb_strlen($mot) >= 4 && preg_match('/^[\p{Lu}\-’\']+$/u', $mot)) return nomPropre($texte);
    }
    return $texte;
}

/** Vrai si les chiffres du numéro national ont l'air inventés : 0000000, 1111122, 12345678, 12121212, 123123123… */
function numeroFactice(string $national): bool
{
    $n = strlen($national);
    if ($n < 6) return false;
    if (count(array_unique(str_split($national))) <= 2) return true; // deux chiffres différents au plus
    if (preg_match('/(\d)\1{4,}/', $national)) return true; // cinq fois le même chiffre de suite
    // Suite croissante ou décroissante de sept chiffres ou plus (1234567, 9876543)
    $montee = 1;
    $descente = 1;
    for ($i = 1; $i < $n; $i++) {
        $d = ((int) $national[$i] - (int) $national[$i - 1] + 10) % 10;
        $montee = $d === 1 ? $montee + 1 : 1;
        $descente = $d === 9 ? $descente + 1 : 1;
        if ($montee >= 7 || $descente >= 7) return true;
    }
    // Un petit groupe de un à quatre chiffres répété (1212121212, 123123123, 12341234)
    for ($p = 1; $p <= 4; $p++) {
        if ($n >= 2 * $p && substr(str_repeat(substr($national, 0, $p), (int) ceil($n / $p)), 0, $n) === $national) return true;
    }
    return false;
}
