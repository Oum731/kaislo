<?php
// ------------------------------------------------------------
// EMPREINTE DIGITALE / FACE ID (norme WebAuthn, celle des « passkeys »).
//
// Principe : à l'activation, le téléphone crée une paire de clés protégée par
// l'empreinte ou le visage. Seule la clé PUBLIQUE est envoyée ici.
// À la connexion, le téléphone signe un défi avec la clé secrète (après
// l'empreinte) et le serveur vérifie la signature : aucun secret ne circule.
//
//   POST /api/biometrie/defi         { type: 'creation' | 'connexion' }
//   POST /api/biometrie/enregistrer  (connecté) clé publique de cet appareil
//   POST /api/biometrie/connexion    signature du défi -> jeton de connexion
// ------------------------------------------------------------

const DUREE_DEFI_SECONDES = 300;

function b64url_decode(string $texte): string
{
    $r = base64_decode(strtr($texte, '-_', '+/') . str_repeat('=', (4 - strlen($texte) % 4) % 4), true);
    if ($r === false) throw new ErreurApi('Données d’empreinte invalides');
    return $r;
}

function b64url_encode(string $octets): string
{
    return rtrim(strtr(base64_encode($octets), '+/', '-_'), '=');
}

// Nom de domaine du site (« rp id » de WebAuthn) et adresse attendue de la page
function domaineSite(): string
{
    $hote = config()['domaine'] ?: ($_SERVER['HTTP_HOST'] ?? '');
    return strtolower(preg_replace('/:\d+$/', '', $hote));
}

function origineAutorisee(string $origine): bool
{
    $d = domaineSite();
    if ($origine === "https://$d") return true;
    // Tests sur l'ordinateur : http://localhost:port
    return $d === 'localhost' && preg_match('#^http://localhost(:\d+)?$#', $origine) === 1;
}

// ---------- POST /api/biometrie/defi ----------
function routeBiometrieDefi(): never
{
    $type = (string) (entree()['type'] ?? '');
    if (!in_array($type, ['creation', 'connexion'], true)) throw new ErreurApi('Type de défi inconnu');
    $u = $type === 'creation' ? utilisateurConnecte() : null;
    $defi = random_bytes(32);
    requete('DELETE FROM defis WHERE expire_le < ?', [maintenant()]);
    requete('INSERT INTO defis (defi_hash, type, utilisateur_id, expire_le) VALUES (?, ?, ?, ?)', [hash('sha256', $defi), $type, $u['id'] ?? null, maintenant(DUREE_DEFI_SECONDES)]);
    $reponse = ['ok' => true, 'defi' => b64url_encode($defi), 'rpId' => domaineSite()];
    if ($u) $reponse['utilisateur'] = ['id' => b64url_encode($u['id']), 'nom' => $u['nom'], 'telephone' => $u['telephone']];
    repondre($reponse);
}

// Vérifie clientDataJSON (type, défi à usage unique, page d'origine) ; renvoie le défi consommé
function verifierClientData(string $clientDataJson, string $typeAttendu, string $typeDefi, ?string $utilisateurId): void
{
    $client = json_decode($clientDataJson, true);
    if (!is_array($client) || ($client['type'] ?? '') !== $typeAttendu) throw new ErreurApi('Réponse d’empreinte invalide', 400);
    if (!origineAutorisee((string) ($client['origin'] ?? ''))) throw new ErreurApi('Page d’origine non autorisée', 400);
    $empreinte = hash('sha256', b64url_decode((string) ($client['challenge'] ?? '')));
    $defi = requete('SELECT * FROM defis WHERE defi_hash = ? AND type = ?', [$empreinte, $typeDefi])->fetch();
    requete('DELETE FROM defis WHERE defi_hash = ?', [$empreinte]); // usage unique
    if (!$defi || $defi['expire_le'] < maintenant()) throw new ErreurApi('Délai dépassé : recommencez', 400);
    if ($utilisateurId !== null && $defi['utilisateur_id'] !== $utilisateurId) throw new ErreurApi('Défi d’un autre compte', 400);
}

// Vérifie les données de l'authentificateur : bon site, présence ET vérification de la personne
function verifierDonneesAppareil(string $authData): int
{
    if (strlen($authData) < 37) throw new ErreurApi('Réponse d’empreinte incomplète', 400);
    if (!hash_equals(hash('sha256', domaineSite(), true), substr($authData, 0, 32))) throw new ErreurApi('Empreinte créée pour un autre site', 400);
    $drapeaux = ord($authData[32]);
    // 0x01 : personne présente · 0x04 : personne vérifiée (empreinte, visage ou code du téléphone)
    if (($drapeaux & 0x01) === 0 || ($drapeaux & 0x04) === 0) throw new ErreurApi('Empreinte ou visage non vérifié', 401);
    return unpack('N', substr($authData, 33, 4))[1]; // compteur de signatures
}

// ---------- POST /api/biometrie/enregistrer ----------
// { credentialId, clientDataJSON, authenticatorData, publicKey (SPKI), alg, appareil }
function routeBiometrieEnregistrer(): never
{
    $u = utilisateurConnecte();
    $e = entree();
    $credentialId = (string) ($e['credentialId'] ?? '');
    if (!preg_match('/^[A-Za-z0-9_-]{16,1400}$/', $credentialId)) throw new ErreurApi('Identifiant d’empreinte invalide');
    verifierClientData(b64url_decode((string) ($e['clientDataJSON'] ?? '')), 'webauthn.create', 'creation', $u['id']);
    $compteur = verifierDonneesAppareil(b64url_decode((string) ($e['authenticatorData'] ?? '')));

    $alg = (int) ($e['alg'] ?? 0);
    if (!in_array($alg, [-7, -257], true)) throw new ErreurApi('Type de clé non pris en charge sur ce téléphone');
    $der = b64url_decode((string) ($e['publicKey'] ?? ''));
    $pem = "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END PUBLIC KEY-----\n";
    if (!openssl_pkey_get_public($pem)) throw new ErreurApi('Clé publique illisible');

    $idHash = hash('sha256', $credentialId);
    requete('DELETE FROM cles_biometriques WHERE id_hash = ?', [$idHash]);
    requete('INSERT INTO cles_biometriques (id_hash, credential_id, utilisateur_id, commerce_id, cle_publique, algo, compteur, appareil, cree_le, utilise_le) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        $idHash, $credentialId, $u['id'], $u['commerce_id'], $pem, $alg, $compteur, mb_substr((string) ($e['appareil'] ?? ''), 0, 200), maintenant(), null,
    ]);
    journaliser($u['commerce_id'], $u['id'], 'empreinte-activee');
    repondre(['ok' => true]);
}

// ---------- POST /api/biometrie/connexion ----------
// { credentialId, clientDataJSON, authenticatorData, signature, appareil }
function routeBiometrieConnexion(): never
{
    $e = entree();
    $credentialId = (string) ($e['credentialId'] ?? '');
    $cleBlocage = 'empreinte:' . hash('sha256', $credentialId);
    verifierBlocage($cleBlocage);
    verifierBlocage('ip:' . adresseIp());

    $cle = requete('SELECT * FROM cles_biometriques WHERE id_hash = ?', [hash('sha256', $credentialId)])->fetch();
    if (!$cle) throw new ErreurApi('Empreinte inconnue : connectez-vous avec votre code PIN', 401);
    $clientData = b64url_decode((string) ($e['clientDataJSON'] ?? ''));
    verifierClientData($clientData, 'webauthn.get', 'connexion', null);
    $authData = b64url_decode((string) ($e['authenticatorData'] ?? ''));
    $compteur = verifierDonneesAppareil($authData);

    // La signature porte sur les données de l'appareil + l'empreinte SHA-256 de clientDataJSON
    $signature = b64url_decode((string) ($e['signature'] ?? ''));
    $valide = openssl_verify($authData . hash('sha256', $clientData, true), $signature, $cle['cle_publique'], OPENSSL_ALGO_SHA256) === 1;
    // Compteur : s'il est utilisé par le téléphone, il doit toujours augmenter (sinon clé copiée)
    $compteurOk = $compteur === 0 && (int) $cle['compteur'] === 0 || $compteur > (int) $cle['compteur'];
    if (!$valide || !$compteurOk) {
        noterEchec($cleBlocage);
        throw new ErreurApi('Empreinte non reconnue : connectez-vous avec votre code PIN', 401);
    }

    $u = requete('SELECT * FROM utilisateurs WHERE id = ?', [$cle['utilisateur_id']])->fetch();
    if (!$u || !$u['actif']) throw new ErreurApi('Ce compte a été désactivé par le gérant', 403);
    $commerce = requete('SELECT * FROM commerces WHERE id = ?', [$u['commerce_id']])->fetch();
    if ($commerce['statut'] === 'suspendu') throw new ErreurApi('Ce commerce est suspendu. Contactez Amorac.', 403);
    requete('UPDATE cles_biometriques SET compteur = ?, utilise_le = ? WHERE id_hash = ?', [$compteur, maintenant(), $cle['id_hash']]);
    effacerEchecs($cleBlocage);
    $jeton = creerJeton($u, (string) ($e['appareil'] ?? ''));
    journaliser($u['commerce_id'], $u['id'], 'connexion-empreinte');
    repondre(['ok' => true, 'jeton' => $jeton, 'utilisateur' => versUtilisateur($u), 'commerce' => versCommerce($commerce)]);
}
