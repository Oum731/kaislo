<?php
// ------------------------------------------------------------
// ÉQUIPE : vendeurs créés et modifiés par le gérant, et vérification
// du code PIN du gérant (annulation d'une vente).
// Les codes PIN ne sont jamais stockés sur les appareils, seulement ici (chiffrés).
//
//   POST /api/utilisateurs     créer ou modifier un vendeur (gérant seulement)
//   POST /api/verifier-gerant  { pin } : est-ce le code d'un gérant du commerce ?
// ------------------------------------------------------------

// ---------- POST /api/utilisateurs ----------
// { id?, nom, telephone, pin?, actif, peutGererProduits, peutFaireRemises }
function routeUtilisateur(): never
{
    $moi = utilisateurConnecte();
    if ($moi['role'] !== 'gerant') throw new ErreurApi('Réservé au gérant', 403);
    $e = entree();
    $id = (string) ($e['id'] ?? '');
    $existant = $id !== '' ? requete('SELECT * FROM utilisateurs WHERE id = ? AND commerce_id = ?', [$id, $moi['commerce_id']])->fetch() : null;
    if ($id !== '' && !$existant) throw new ErreurApi('Vendeur introuvable', 404);

    $nom = texte($e, 'nom', 'le nom');
    $telephone = texte($e, 'telephone', 'le numéro de téléphone', true, 40);
    $cle = cleTelephone($telephone);
    if (!$cle) throw new ErreurApi('Indiquez le numéro de téléphone : il sert à se connecter');
    $autre = requete('SELECT id FROM utilisateurs WHERE cle_telephone = ?', [$cle])->fetch();
    if ($autre && $autre['id'] !== $id) throw new ErreurApi('Ce numéro est déjà utilisé par un autre compte Kaislo', 409);

    $pin = (string) ($e['pin'] ?? '');
    if ($pin !== '' || !$existant) {
        if (!preg_match('/^\d{4}$/', $pin)) throw new ErreurApi('Le code PIN doit contenir 4 chiffres');
        // Un vendeur ne doit pas avoir le PIN du gérant (qui valide les annulations)
        $estGerant = $existant && $existant['role'] === 'gerant';
        if (!$estGerant) {
            foreach (requete("SELECT pin_hash FROM utilisateurs WHERE commerce_id = ? AND role = 'gerant'", [$moi['commerce_id']])->fetchAll() as $g) {
                if (password_verify($pin, $g['pin_hash'])) throw new ErreurApi('Choisissez un code PIN différent de celui du gérant');
            }
        }
    }
    $actif = array_key_exists('actif', $e) ? (bool) $e['actif'] : true;
    if ($existant && $existant['id'] === $moi['id'] && !$actif) throw new ErreurApi('Vous ne pouvez pas désactiver votre propre compte');
    $produits = !empty($e['peutGererProduits']) ? 1 : 0;
    $remises = !empty($e['peutFaireRemises']) ? 1 : 0;

    if ($existant) {
        requete('UPDATE utilisateurs SET nom = ?, telephone = ?, cle_telephone = ?, actif = ?, peut_gerer_produits = ?, peut_faire_remises = ?, modifie_le = ? WHERE id = ?', [
            $nom, $telephone, $cle, $actif ? 1 : 0, $produits, $remises, maintenant(), $id,
        ]);
        if ($pin !== '') requete('UPDATE utilisateurs SET pin_hash = ? WHERE id = ?', [password_hash($pin, PASSWORD_DEFAULT), $id]);
        // Compte désactivé ou code changé : ses appareils sont déconnectés
        if (!$actif || $pin !== '') requete('DELETE FROM jetons WHERE utilisateur_id = ?', [$id]);
        journaliser($moi['commerce_id'], $moi['id'], 'vendeur-modifie', ['vendeur' => $id, 'actif' => $actif]);
    } else {
        $id = nouvelId('u');
        requete('INSERT INTO utilisateurs (id, commerce_id, nom, telephone, cle_telephone, pin_hash, role, actif, peut_gerer_produits, peut_faire_remises, cree_le, modifie_le)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
            $id, $moi['commerce_id'], $nom, $telephone, $cle, password_hash($pin, PASSWORD_DEFAULT), 'vendeur', $actif ? 1 : 0, $produits, $remises, maintenant(), maintenant(),
        ]);
        journaliser($moi['commerce_id'], $moi['id'], 'vendeur-cree', ['vendeur' => $id]);
    }
    repondre(['ok' => true, 'id' => $id, 'utilisateurs' => equipe($moi['commerce_id'])]);
}

// ---------- POST /api/verifier-gerant ----------
function routeVerifierGerant(): never
{
    $moi = utilisateurConnecte();
    $pin = (string) (entree()['pin'] ?? '');
    $cleBlocage = 'gerant:' . $moi['commerce_id'];
    verifierBlocage($cleBlocage);
    foreach (requete("SELECT nom, pin_hash FROM utilisateurs WHERE commerce_id = ? AND role = 'gerant' AND actif = 1", [$moi['commerce_id']])->fetchAll() as $g) {
        if (preg_match('/^\d{4}$/', $pin) && password_verify($pin, $g['pin_hash'])) {
            effacerEchecs($cleBlocage);
            repondre(['ok' => true, 'gerant' => ['nom' => $g['nom']]]);
        }
    }
    if (noterEchec($cleBlocage)) throw new ErreurApi('Trop d’essais : réessayez dans ' . MINUTES_BLOCAGE . ' minutes.', 429);
    throw new ErreurApi('Code PIN du gérant incorrect', 401);
}
