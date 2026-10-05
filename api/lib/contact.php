<?php
// ------------------------------------------------------------
// MESSAGES DES VISITEURS (bulle « Discuter avec nous » du site et des démos).
// Le visiteur n'a pas de compte : il laisse son nom, son numéro WhatsApp ou son
// e-mail, et l'équipe lui répond par ce moyen. Un e-mail prévient l'équipe.
//
//   POST /api/contact          { nom, contact, texte, page, siteWeb (piège à robots, doit rester vide) }
//   GET  /api/admin/contacts   messages des visiteurs (non traités en premier)
//   POST /api/admin/contact    { id, action: 'traiter' | 'rouvrir' }
// ------------------------------------------------------------

const CONTACTS_PAR_HEURE_MAX = 5; // par adresse IP

function versContact(array $c): array
{
    return ['id' => $c['id'], 'nom' => $c['nom'], 'contact' => $c['contact'], 'texte' => $c['texte'], 'page' => $c['page'],
        'le' => $c['cree_le'], 'traiteLe' => $c['traite_le'], 'traitePar' => $c['traite_par']];
}

function routeContact(): never
{
    $e = entree();
    // Champ invisible pour les humains : un robot le remplit, on fait comme si tout allait bien
    if (trim((string) ($e['siteWeb'] ?? '')) !== '') repondre(['ok' => true], 201);
    $ip = hash('sha256', adresseIp());
    $recents = (int) requete('SELECT COUNT(*) AS n FROM contacts WHERE ip_hash = ? AND cree_le > ?', [$ip, maintenant(-3600)])->fetch()['n'];
    if ($recents >= CONTACTS_PAR_HEURE_MAX) throw new ErreurApi('Beaucoup de messages en peu de temps : réessayez dans un moment, ou écrivez-nous sur WhatsApp', 429);
    $nom = texte($e, 'nom', 'votre nom', true, 80);
    $contact = texte($e, 'contact', 'votre numéro WhatsApp ou votre e-mail', true, 120);
    if (!filter_var($contact, FILTER_VALIDATE_EMAIL) && strlen(preg_replace('/\D/', '', $contact)) < 8) {
        throw new ErreurApi('Indiquez un numéro WhatsApp (avec l’indicatif du pays) ou une adresse e-mail valide');
    }
    $texte = texteMessage($e);
    $page = mb_substr((string) ($e['page'] ?? ''), 0, 120);
    requete('INSERT INTO contacts (id, nom, contact, texte, page, ip_hash, cree_le) VALUES (?, ?, ?, ?, ?, ?, ?)', [nouvelId('ct'), $nom, $contact, $texte, $page, $ip, maintenant()]);
    envoyerEmail(
        lireFichierEnvCle('EmailEquipe') ?? 'contact@kaislo.com',
        'Kaislo — question d’un visiteur : ' . $nom,
        "Un visiteur a écrit depuis le site ($page).\n\nNom : $nom\nContact : $contact\n\n$texte\n\nÀ traiter dans l'espace Amorac → Messages → Visiteurs : https://" . (domaineSite() ?: 'kaislo.com') . "/admin/"
    );
    repondre(['ok' => true], 201);
}

// Nombre de messages de visiteurs pas encore traités (pastille de l'espace Amorac)
function contactsNonTraites(): int
{
    return (int) requete('SELECT COUNT(*) AS n FROM contacts WHERE traite_le IS NULL')->fetch()['n'];
}

function routeAdminContacts(): never
{
    adminConnecte();
    $lignes = requete('SELECT * FROM contacts ORDER BY CASE WHEN traite_le IS NULL THEN 0 ELSE 1 END, cree_le DESC LIMIT 200')->fetchAll();
    repondre(['ok' => true, 'contacts' => array_map('versContact', $lignes)]);
}

function routeAdminContact(): never
{
    $admin = adminConnecte();
    $e = entree();
    $id = (string) ($e['id'] ?? '');
    if (!requete('SELECT 1 FROM contacts WHERE id = ?', [$id])->fetch()) throw new ErreurApi('Message introuvable', 404);
    $traiter = ($e['action'] ?? '') === 'traiter';
    requete('UPDATE contacts SET traite_le = ?, traite_par = ? WHERE id = ?', [$traiter ? maintenant() : null, $traiter ? $admin['nom'] : null, $id]);
    repondre(['ok' => true]);
}
