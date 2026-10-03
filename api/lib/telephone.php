<?php
// ------------------------------------------------------------
// NUMÉROS DE TÉLÉPHONE selon le pays (format international E.164).
// Mêmes règles que src/lib/donnees/telephone.js (à garder identiques).
// Le numéro identifie chaque personne et chaque commerce : unique dans tout Kaislo.
// ------------------------------------------------------------

const REGLES_TELEPHONE = [
    'MA' => ['indicatif' => '212', 'longueurs' => [9], 'zero' => true, 'groupes' => [1, 2, 2, 2, 2], 'exemple' => '06 12 34 56 78'],
    'CI' => ['indicatif' => '225', 'longueurs' => [10], 'zero' => false, 'groupes' => [2, 2, 2, 2, 2], 'exemple' => '07 07 12 34 56'],
    'SN' => ['indicatif' => '221', 'longueurs' => [9], 'zero' => false, 'groupes' => [2, 3, 2, 2], 'exemple' => '77 123 45 67'],
    'ML' => ['indicatif' => '223', 'longueurs' => [8], 'zero' => false, 'groupes' => [2, 2, 2, 2], 'exemple' => '76 12 34 56'],
    'BF' => ['indicatif' => '226', 'longueurs' => [8], 'zero' => false, 'groupes' => [2, 2, 2, 2], 'exemple' => '70 12 34 56'],
    'BJ' => ['indicatif' => '229', 'longueurs' => [10], 'zero' => false, 'groupes' => [2, 2, 2, 2, 2], 'exemple' => '01 97 12 34 56'],
    'TG' => ['indicatif' => '228', 'longueurs' => [8], 'zero' => false, 'groupes' => [2, 2, 2, 2], 'exemple' => '90 12 34 56'],
    'NE' => ['indicatif' => '227', 'longueurs' => [8], 'zero' => false, 'groupes' => [2, 2, 2, 2], 'exemple' => '90 12 34 56'],
    'GN' => ['indicatif' => '224', 'longueurs' => [9], 'zero' => false, 'groupes' => [3, 2, 2, 2], 'exemple' => '622 12 34 56'],
    'CM' => ['indicatif' => '237', 'longueurs' => [9], 'zero' => false, 'groupes' => [1, 2, 2, 2, 2], 'exemple' => '6 71 23 45 67'],
    'GA' => ['indicatif' => '241', 'longueurs' => [8, 7], 'zero' => false, 'groupes' => [2, 2, 2, 2], 'exemple' => '06 12 34 56'],
    'CG' => ['indicatif' => '242', 'longueurs' => [9], 'zero' => false, 'groupes' => [2, 3, 2, 2], 'exemple' => '06 612 34 56'],
    'FR' => ['indicatif' => '33', 'longueurs' => [9], 'zero' => true, 'groupes' => [1, 2, 2, 2, 2], 'exemple' => '06 12 34 56 78'],
    'BE' => ['indicatif' => '32', 'longueurs' => [9, 8], 'zero' => true, 'groupes' => [3, 2, 2, 2], 'exemple' => '0470 12 34 56'],
    'CA' => ['indicatif' => '1', 'longueurs' => [10], 'zero' => false, 'groupes' => [3, 3, 4], 'exemple' => '514 555 0123'],
];

function grouperNumero(string $national, array $groupes): string
{
    $tailles = array_sum($groupes) === strlen($national) ? $groupes : array_fill(0, (int) ceil(strlen($national) / 2), 2);
    $morceaux = [];
    $i = 0;
    foreach ($tailles as $t) {
        if ($i < strlen($national)) $morceaux[] = substr($national, $i, $t);
        $i += $t;
    }
    return implode(' ', $morceaux);
}

/**
 * Vérifie et met au format international un numéro tapé.
 * Renvoie ['ok' => true, 'e164' => '+225…', 'affichage' => '+225 07 07…', 'cle' => '225…']
 * ou ['ok' => false, 'erreur' => '…'].
 */
function normaliserTelephone(string $saisie, string $paysId): array
{
    $brut = trim($saisie);
    $chiffres = preg_replace('/\D/', '', $brut);
    if ($chiffres === '') return ['ok' => false, 'erreur' => 'Indiquez le numéro de téléphone'];
    $international = str_starts_with($brut, '+') || str_starts_with($chiffres, '00');
    if (str_starts_with($chiffres, '00')) $chiffres = substr($chiffres, 2);

    $pays = $paysId;
    $national = $chiffres;
    if ($international) {
        $trouves = array_filter(REGLES_TELEPHONE, fn ($r) => str_starts_with($chiffres, $r['indicatif']));
        uksort($trouves, fn ($a, $b) => (($b === $paysId) <=> ($a === $paysId)) ?: (strlen(REGLES_TELEPHONE[$b]['indicatif']) <=> strlen(REGLES_TELEPHONE[$a]['indicatif'])));
        if (!$trouves) {
            if (strlen($chiffres) < 8 || strlen($chiffres) > 15) return ['ok' => false, 'erreur' => 'Numéro international incomplet (ex : +225 07 07 12 34 56)'];
            return ['ok' => true, 'e164' => '+' . $chiffres, 'affichage' => '+' . $chiffres, 'cle' => $chiffres];
        }
        $pays = array_key_first($trouves);
        $national = substr($chiffres, strlen(REGLES_TELEPHONE[$pays]['indicatif']));
    } else {
        $r = REGLES_TELEPHONE[$paysId] ?? null;
        if (!$r) return ['ok' => false, 'erreur' => 'Écrivez le numéro au format international : + indicatif du pays, puis le numéro'];
        // Numéro tapé avec l'indicatif mais sans le « + »
        $longueur = fn ($n) => strlen($r['zero'] ? preg_replace('/^0/', '', $n) : $n);
        $reste = substr($national, strlen($r['indicatif']));
        if (str_starts_with($national, $r['indicatif']) && !in_array($longueur($national), $r['longueurs'], true) && in_array($longueur($reste), $r['longueurs'], true)) $national = $reste;
    }
    $r = REGLES_TELEPHONE[$pays];
    if ($r['zero'] && str_starts_with($national, '0')) $national = substr($national, 1);
    if (!in_array(strlen($national), $r['longueurs'], true)) return ['ok' => false, 'erreur' => 'Numéro incomplet ou trop long. Exemple : ' . $r['exemple']];
    return ['ok' => true, 'e164' => '+' . $r['indicatif'] . $national, 'affichage' => '+' . $r['indicatif'] . ' ' . grouperNumero($national, $r['groupes']), 'cle' => $r['indicatif'] . $national];
}

// Numéro valide ou erreur claire (avec le libellé du champ)
function telephoneValide(string $saisie, string $pays, string $libelle): array
{
    $n = normaliserTelephone($saisie, $pays);
    if (!$n['ok']) throw new ErreurApi(ucfirst($libelle) . ' : ' . lcfirst($n['erreur']));
    return $n;
}

// Le numéro est-il déjà pris (par une personne ou un commerce) en dehors de ce commerce ?
function numeroPrisAilleurs(string $cle, ?string $commerceId): bool
{
    $u = requete('SELECT commerce_id FROM utilisateurs WHERE cle_telephone = ?', [$cle])->fetch();
    if ($u && $u['commerce_id'] !== $commerceId) return true;
    $c = requete('SELECT id FROM commerces WHERE cle_telephone = ?', [$cle])->fetch();
    return $c && $c['id'] !== $commerceId;
}

// Clé du numéro saisi à la connexion. Anciennes versions de l'application (sans pays) :
// recherche par les 9 derniers chiffres, acceptée seulement si un seul compte correspond.
function cleConnexion(string $telephone, string $pays): string
{
    $n = normaliserTelephone($telephone, $pays);
    if ($n['ok']) return $n['cle'];
    if ($pays !== '') return '';
    $chiffres = preg_replace('/\D/', '', $telephone);
    if (strlen($chiffres) < 8) return '';
    $lignes = requete('SELECT cle_telephone FROM utilisateurs WHERE cle_telephone LIKE ?', ['%' . substr($chiffres, -9)])->fetchAll();
    return count($lignes) === 1 ? $lignes[0]['cle_telephone'] : '';
}
