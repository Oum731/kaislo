'use client';
// ------------------------------------------------------------
// Fenêtres de gestion : produit, catégorie, vendeur, dépense,
// client et remboursement, stock, compte, menu "Plus".
// ------------------------------------------------------------
import { useEffect, useState } from 'react';
import { postesDe, vendeursDuPoste } from '@/lib/donnees/postes';
import { VENDEURS_PAR_POSTE } from '@/lib/donnees/tarifs';
import { useKaislo } from '@/store/kaislo';
import { genId, formatDate, formatHeure, symbole, quantiteUnite } from '@/lib/utils/format';
import { CATEGORIES_DEPENSES, COULEURS, UNITES, typeCommerce } from '@/lib/donnees/modeles';
import { historiqueClient, soldeClient, lienRappelWhatsApp } from '@/lib/donnees/credit';
import { Feuille, Icone, Segment, Reglage, ChampMontant, ApercuTicket, Avatar, ChoixImage, initiales, ChampTelephone } from '@/components/ui';
import { enregistrerImage, supprimerImage } from '@/lib/donnees/images';
import { liensMenu } from '../Coque';
import { biometrieDisponible, nomBiometrie } from '@/lib/biometrie';
import { cleTelephone } from '@/lib/donnees/modeles';
import { estServeur } from '@/lib/donnees/synchro';

// ---------- Produit ----------
export function FeuilleProduit({ produit, categorieId }) {
  const s = useKaislo();
  const { d } = s;
  const [b, setB] = useState(() =>
    produit
      ? JSON.parse(JSON.stringify(produit))
      : { id: null, categorieId: categorieId || d.categories[0]?.id, nom: '', prix: null, promo: null, prixAchat: null, emoji: '', image: null, codeBarre: '', unite: typeCommerce(d.commerce.type).unite, suiviStock: false, stock: 0, seuilAlerte: 5, actif: true, groupes: [] }
  );
  const [nouvelleImage, setNouvelleImage] = useState(null); // photo choisie, pas encore enregistrée
  const [imageRetiree, setImageRetiree] = useState(false);
  const [nouvelleCategorie, setNouvelleCategorie] = useState(null); // nom tapé, ou null
  const maj = (x) => setB({ ...b, ...x });
  const majGroupe = (gi, x) => setB({ ...b, groupes: b.groupes.map((g, i) => (i === gi ? { ...g, ...x } : g)) });
  const majOption = (gi, oi, x) => majGroupe(gi, { options: b.groupes[gi].options.map((o, i) => (i === oi ? { ...o, ...x } : o)) });
  const prixVente = b.promo > 0 && b.promo < b.prix ? b.promo : b.prix;
  const marge = b.prixAchat > 0 && prixVente > 0 ? prixVente - b.prixAchat : null;

  const enregistrer = async () => {
    let p = b;
    try {
      // La photo est enregistrée d'abord, l'article garde sa référence
      if (nouvelleImage) p = { ...b, image: await enregistrerImage(nouvelleImage, b.image) };
      else if (imageRetiree && b.image) {
        await supprimerImage(b.image);
        p = { ...b, image: null };
      }
    } catch {
      return s.message('Impossible d’enregistrer la photo sur cet appareil', 'erreur');
    }
    const err = s.enregistrerProduit(p);
    if (err) s.message(err, 'erreur');
    else s.fermer();
  };
  // Création d'une catégorie sans quitter la fiche
  const creerCategorie = () => {
    const r = s.enregistrerCategorie({ id: null, nom: nouvelleCategorie || '', couleur: COULEURS[d.categories.length % COULEURS.length] });
    if (r.erreur) return s.message(r.erreur, 'erreur');
    maj({ categorieId: r.categorie.id });
    setNouvelleCategorie(null);
  };
  const ajouterGroupe = (type) =>
    maj({ groupes: [...b.groupes, { id: genId('g'), nom: type === 'unique' ? 'Accompagnement' : 'Suppléments', type, obligatoire: type === 'unique', options: [{ id: genId('o'), nom: '', prix: 0 }] }] });
  const dev = symbole(s.devise());

  return (
    <Feuille titre={b.id ? 'Modifier l’article' : 'Nouvel article'} surFermer={s.fermer} pleine large
      pied={<button className="btn bloc" onClick={enregistrer}>Enregistrer</button>}>
      <div className="carte pile">
        <div className="champ">
          <span>Photo (facultatif)</span>
          <ChoixImage
            reference={b.image}
            nouvelle={nouvelleImage}
            retiree={imageRetiree}
            surChoisir={(x) => { setNouvelleImage(x); setImageRetiree(false); }}
            surRetirer={() => { setNouvelleImage(null); setImageRetiree(true); }}
            libelle="Photo de l’article"
          />
          <p className="aide">Prenez la photo avec le téléphone ou choisissez-la dans la galerie. Sans photo, l’icône est affichée.</p>
        </div>
        <div className="ligne" style={{ alignItems: 'flex-end' }}>
          <label className="champ grandit"><span>Nom</span><input value={b.nom} onChange={(e) => maj({ nom: e.target.value })} placeholder="Ex : Attiéké" autoFocus={!b.id} /></label>
        </div>
        <div className="champ">
          <span>Catégorie</span>
          {nouvelleCategorie === null ? (
            <div className="ligne">
              <select className="saisie grandit" value={b.categorieId} onChange={(e) => maj({ categorieId: e.target.value })}>
                {d.categories.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
              <button type="button" className="btn secondaire" onClick={() => setNouvelleCategorie('')}><Icone nom="plus" taille="sm" /> Nouvelle</button>
            </div>
          ) : (
            <div className="ligne">
              <input className="saisie grandit" autoFocus value={nouvelleCategorie} onChange={(e) => setNouvelleCategorie(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && creerCategorie()} placeholder="Ex : Jus frais, Sandwichs…" />
              <button type="button" className="btn" onClick={creerCategorie}>Créer</button>
              <button type="button" className="icone-btn" onClick={() => setNouvelleCategorie(null)} aria-label="Annuler"><Icone nom="fermer" taille="sm" /></button>
            </div>
          )}
        </div>
        <div className="grille-3">
          <label className="champ"><span>Prix ({dev})</span><ChampMontant valeur={b.prix} surChanger={(v) => maj({ prix: v })} /></label>
          <label className="champ"><span>Prix promo</span><ChampMontant valeur={b.promo} surChanger={(v) => maj({ promo: v })} placeholder="—" /></label>
          <label className="champ"><span>Prix d’achat</span><ChampMontant valeur={b.prixAchat} surChanger={(v) => maj({ prixAchat: v })} placeholder="—" /></label>
        </div>
        {marge !== null && (
          <p className={marge >= 0 ? 'info-verte' : 'alerte'}>
            Marge : {s.prix(marge)} par article ({Math.round((marge / prixVente) * 100)} %)
          </p>
        )}
        <p className="tres-petit muet">Prix promo : affiché barré à la caisse tant qu’il est rempli. Prix d’achat : sert à calculer vos marges (jamais montré au client).</p>

        <div className="grille-2">
          <label className="champ"><span>Unité de vente et de stock</span>
            <select value={b.unite || 'pièce'} onChange={(e) => maj({ unite: e.target.value })}>
              {UNITES.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </label>
          {s.gereStock() && <label className="champ"><span>Code-barres</span><input inputMode="numeric" value={b.codeBarre} onChange={(e) => maj({ codeBarre: e.target.value })} placeholder="Facultatif" /></label>}
        </div>
        <Reglage titre="Suivre le stock" aide="Le stock baisse à chaque vente ; alerte quand il devient bas." actif={b.suiviStock} surChanger={(v) => maj({ suiviStock: v })} />
        {b.suiviStock && (
          <div className="grille-2">
            <label className="champ"><span>Quantité en stock ({b.unite || 'pièce'})</span><ChampMontant valeur={b.stock} surChanger={(v) => maj({ stock: v })} /></label>
            <label className="champ"><span>Alerte à partir de</span><ChampMontant valeur={b.seuilAlerte} surChanger={(v) => maj({ seuilAlerte: v })} /></label>
          </div>
        )}
        <Reglage titre="Visible à la caisse" actif={b.actif} surChanger={(v) => maj({ actif: v })} />
      </div>

      <p className="section-titre">Options (accompagnements, tailles, suppléments…)</p>
      {b.groupes.map((g, gi) => (
        <div key={g.id} className="groupe-edition pile">
          <div className="ligne">
            <input className="saisie grandit" style={{ fontWeight: 700 }} value={g.nom} onChange={(e) => majGroupe(gi, { nom: e.target.value })} placeholder="Nom du groupe" />
            <button className="icone-btn danger" onClick={() => maj({ groupes: b.groupes.filter((_, i) => i !== gi) })} aria-label="Supprimer le groupe"><Icone nom="poubelle" /></button>
          </div>
          <Segment options={[['unique', 'Un seul choix'], ['multiple', 'Plusieurs choix']]} valeur={g.type} surChanger={(v) => majGroupe(gi, { type: v })} />
          <Reglage titre="Choix obligatoire" actif={g.obligatoire} surChanger={(v) => majGroupe(gi, { obligatoire: v })} />
          <div>
            <div className="option-edition tres-petit muet" style={{ marginTop: 0 }}><span>Option</span><span>Supplément</span><span /></div>
            {g.options.map((o, oi) => (
              <div key={o.id} className="option-edition">
                <input className="saisie" value={o.nom} onChange={(e) => majOption(gi, oi, { nom: e.target.value })} placeholder="Ex : Poisson grillé" />
                <input className="saisie chiffre" type="number" inputMode="decimal" step="any" value={o.prix} onChange={(e) => majOption(gi, oi, { prix: e.target.value === '' ? 0 : Number(e.target.value) })} />
                <button className="icone-btn danger" onClick={() => majGroupe(gi, { options: g.options.filter((_, i) => i !== oi) })} aria-label="Supprimer l’option"><Icone nom="fermer" taille="sm" /></button>
              </div>
            ))}
            <button className="lien" style={{ marginTop: 10 }} onClick={() => majGroupe(gi, { options: [...g.options, { id: genId('o'), nom: '', prix: 0 }] })}>+ Ajouter une option</button>
          </div>
        </div>
      ))}
      <div className="grille-2" style={{ marginTop: 12 }}>
        <button className="btn secondaire petit" onClick={() => ajouterGroupe('unique')}>+ Choix unique</button>
        <button className="btn secondaire petit" onClick={() => ajouterGroupe('multiple')}>+ Suppléments</button>
      </div>
      <p className="tres-petit muet" style={{ marginTop: 10 }}>Ex : « Accompagnement » en choix unique obligatoire, « Suppléments » en choix multiple facultatif. Le supplément s’ajoute au prix de base.</p>
      {b.id && s.estGerant() && (
        <button className="btn danger bloc" style={{ marginTop: 24 }} onClick={() => { if (confirm('Supprimer « ' + b.nom + ' » ? Les ventes passées restent intactes.')) { s.supprimerProduit(b.id); s.fermer(); } }}>Supprimer l’article</button>
      )}
    </Feuille>
  );
}

// ---------- Catégorie ----------
export function FeuilleCategorie({ categorie }) {
  const s = useKaislo();
  const [b, setB] = useState(categorie ? { ...categorie } : { id: null, nom: '', couleur: COULEURS[s.d.categories.length % COULEURS.length] });
  const enregistrer = () => { const r = s.enregistrerCategorie(b); r.erreur ? s.message(r.erreur, 'erreur') : s.fermer(); };
  const supprimer = () => { const err = s.supprimerCategorie(b.id); err ? s.message(err, 'erreur') : s.fermer(); };
  return (
    <Feuille titre={b.id ? 'Modifier la catégorie' : 'Nouvelle catégorie'} surFermer={s.fermer} pied={<button className="btn bloc" onClick={enregistrer}>Enregistrer</button>}>
      <div className="pile">
        <label className="champ"><span>Nom</span><input value={b.nom} onChange={(e) => setB({ ...b, nom: e.target.value })} placeholder="Ex : Boissons" autoFocus /></label>
        <div className="champ"><span>Couleur</span>
          <div className="choix-couleurs">
            {COULEURS.map((c) => <button key={c} className={`teinte-${c} ${b.couleur === c ? 'actif' : ''}`} onClick={() => setB({ ...b, couleur: c })} aria-label={c} />)}
          </div>
        </div>
        {b.id && s.estGerant() && <button className="btn danger bloc" onClick={supprimer}>Supprimer la catégorie</button>}
      </div>
    </Feuille>
  );
}

// ---------- Vendeur (PIN + droits) ----------
export function FeuilleUtilisateur({ utilisateur }) {
  const s = useKaislo();
  const [b, setB] = useState(utilisateur ? { ...utilisateur } : { id: null, nom: '', role: 'vendeur', telephone: '', pin: '', actif: true, peutGererProduits: false, peutFaireRemises: false });
  const [enCours, setEnCours] = useState(false);
  const enLigne = estServeur(s.d);
  const enregistrer = async () => {
    setEnCours(true);
    const err = await s.enregistrerUtilisateur(b); // commerce en ligne : envoyé au serveur
    setEnCours(false);
    err ? s.message(err, 'erreur') : s.fermer();
  };
  return (
    <Feuille titre={b.id ? b.nom : 'Nouveau vendeur'} surFermer={s.fermer} pied={<button className="btn bloc" onClick={enregistrer} disabled={enCours}>{enCours ? 'Enregistrement…' : 'Enregistrer'}</button>}>
      <div className="pile">
        <label className="champ"><span>Nom et prénom</span><input value={b.nom} onChange={(e) => setB({ ...b, nom: e.target.value })} placeholder="Ex : Amorac Kaislo" /></label>
        <ChampTelephone libelle="Numéro de téléphone (pour se connecter)" pays={s.d.commerce.pays} verifier={!s.estDemoActuel()} valeur={b.telephone || ''} surChanger={(v) => setB({ ...b, telephone: v })} />
        <label className="champ"><span>Code PIN (4 chiffres)</span><input className="pin-saisie" inputMode="numeric" maxLength={4} value={b.pin || ''} onChange={(e) => setB({ ...b, pin: e.target.value })} placeholder="••••" /></label>
        {enLigne && b.id && <p className="tres-petit muet">Laissez vide pour garder le code actuel. Les codes sont gardés chiffrés sur le serveur : personne ne peut les lire.</p>}
        <p className="tres-petit muet">Il se connectera avec ce numéro et ce code PIN, sur n’importe quel appareil du commerce.</p>
        {b.role !== 'gerant' && (
          <>
            <label className="champ"><span>Poste (imprimante où sortent ses tickets)</span>
              <select value={b.posteId || postesDe(s.d)[0].id} onChange={(e) => setB({ ...b, posteId: e.target.value })}>
                {postesDe(s.d).map((p) => {
                  const n = vendeursDuPoste(s.d, p.id, b.id).length;
                  return <option key={p.id} value={p.id} disabled={n >= VENDEURS_PAR_POSTE}>{p.nom} · {n}/{VENDEURS_PAR_POSTE} vendeurs{n >= VENDEURS_PAR_POSTE ? ' (complet)' : ''}</option>;
                })}
              </select>
            </label>
            <p className="tres-petit muet">{VENDEURS_PAR_POSTE} vendeurs au maximum par poste. Pour en ajouter : Réglages → Postes → « + Poste ».</p>
            <p className="section-titre">Ce que ce vendeur peut faire</p>
            <div className="carte pile">
              <p className="petit">✓ Encaisser, imprimer les tickets, vendre à crédit, clôturer sa caisse</p>
              <Reglage titre="Ajouter et modifier des produits" aide={b.peutGererProduits ? 'Il voit Produits et Stock : articles, prix, options, entrées de marchandise. Il ne peut rien supprimer.' : 'Il ne peut pas toucher aux produits ni aux prix.'} actif={!!b.peutGererProduits} surChanger={(v) => setB({ ...b, peutGererProduits: v })} />
              <Reglage titre="Faire des remises" aide="Remise en % ou en montant sur une vente." actif={!!b.peutFaireRemises} surChanger={(v) => setB({ ...b, peutFaireRemises: v })} />
              <p className="tres-petit muet">Annuler une vente demande toujours votre code PIN de gérant.</p>
            </div>
          </>
        )}
      </div>
    </Feuille>
  );
}

// ---------- Dépense ----------
export function FeuilleDepense({ depense }) {
  const s = useKaislo();
  const [b, setB] = useState(depense ? { ...depense } : { id: null, montant: null, categorie: CATEGORIES_DEPENSES[0], note: '', depuisCaisse: true });
  const enregistrer = () => { const err = s.enregistrerDepense(b); err ? s.message(err, 'erreur') : s.fermer(); };
  return (
    <Feuille titre={b.id ? 'Modifier la dépense' : 'Nouvelle dépense'} surFermer={s.fermer} pied={<button className="btn bloc" onClick={enregistrer}>Enregistrer</button>}>
      <div className="pile">
        <label className="champ"><span>Montant</span><ChampMontant valeur={b.montant} surChanger={(v) => setB({ ...b, montant: v })} grand autoFocus /></label>
        <div className="champ"><span>Catégorie</span>
          <div className="choix-grille">
            {CATEGORIES_DEPENSES.map((c) => <button key={c} className={b.categorie === c ? 'actif' : ''} onClick={() => setB({ ...b, categorie: c })} style={{ fontSize: 13 }}>{c}</button>)}
          </div>
        </div>
        <label className="champ"><span>Note (facultatif)</span><input value={b.note} onChange={(e) => setB({ ...b, note: e.target.value })} placeholder="Ex : marché, poisson et légumes" /></label>
        <Reglage titre="Payée avec l’argent de la caisse" aide="Elle sera déduite des espèces attendues à la clôture." actif={b.depuisCaisse} surChanger={(v) => setB({ ...b, depuisCaisse: v })} />
        {b.id && <button className="btn danger bloc" onClick={() => { if (confirm('Supprimer cette dépense ?')) { s.supprimerDepense(b.id); s.fermer(); } }}>Supprimer la dépense</button>}
      </div>
    </Feuille>
  );
}

// ---------- Client (création / modification) ----------
export function FeuilleClient({ client }) {
  const s = useKaislo();
  const [b, setB] = useState(client ? { ...client } : { id: null, nom: '', telephone: '', note: '' });
  const enregistrer = () => {
    const res = s.enregistrerClient(b);
    if (res.erreur) return s.message(res.erreur, 'erreur');
    s.ouvrir('ficheClient', { clientId: res.client.id });
  };
  return (
    <Feuille titre={b.id ? 'Modifier le client' : 'Nouveau client'} surFermer={s.fermer} pied={<button className="btn bloc" onClick={enregistrer}>Enregistrer</button>}>
      <div className="pile">
        <label className="champ"><span>Nom</span><input value={b.nom} onChange={(e) => setB({ ...b, nom: e.target.value })} placeholder="Ex : Amorac Kaislo" autoFocus /></label>
        <label className="champ"><span>Téléphone (pour le rappel WhatsApp)</span><input type="tel" value={b.telephone} onChange={(e) => setB({ ...b, telephone: e.target.value })} placeholder="Ex : 06 12 34 56 78" /></label>
        <label className="champ"><span>Note</span><input value={b.note} onChange={(e) => setB({ ...b, note: e.target.value })} placeholder="Ex : paie en fin de mois" /></label>
        {b.id && s.estGerant() && (
          <button className="btn danger bloc" onClick={() => { const err = s.supprimerClient(b.id); err ? s.message(err, 'erreur') : s.fermer(); }}>Supprimer le client</button>
        )}
      </div>
    </Feuille>
  );
}

// ---------- Fiche d'un client : solde, historique, remboursement, rappel ----------
export function FeuilleFicheClient({ clientId }) {
  const s = useKaislo();
  const client = s.d.clients.find((c) => c.id === clientId);
  if (!client) return null;
  const solde = soldeClient(s.d, client.id);
  const historique = historiqueClient(s.d, client.id);
  return (
    <Feuille titre={client.nom} sousTitre={client.telephone || 'Pas de téléphone'} surFermer={s.fermer} pleine
      avant={<span className="avatar gerant">{initiales(client.nom)}</span>}
      pied={
        <div className="grille-2">
          {client.telephone && solde > 0 ? (
            <a className="btn secondaire" href={lienRappelWhatsApp(client, solde, s.d.commerce, s.prix(solde))} target="_blank" rel="noreferrer"><Icone nom="whatsapp" /> Rappel WhatsApp</a>
          ) : (
            <button className="btn secondaire" onClick={() => s.ouvrir('client', { client })}>Modifier</button>
          )}
          <button className="btn" disabled={solde <= 0} onClick={() => s.ouvrir('remboursement', { clientId: client.id })}>Remboursement</button>
        </div>
      }>
      <div className="carte centre">
        <p className="petit muet">{solde > 0 ? 'Doit actuellement' : 'Compte à jour'}</p>
        <p className="solde-client" style={{ color: solde > 0 ? 'var(--safran-fonce)' : 'var(--vert)' }}>{s.prix(solde)}</p>
        {client.note && <p className="tres-petit muet">{client.note}</p>}
        {client.telephone && solde > 0 && <button className="lien" style={{ marginTop: 8 }} onClick={() => s.ouvrir('client', { client })}>Modifier le client</button>}
      </div>
      <p className="section-titre">Historique</p>
      <div className="liste">
        {historique.map((h) => (
          <div key={h.type + (h.vente?.id || h.remboursement?.id)} className={`liste-item ${h.vente ? 'cliquable' : ''}`} onClick={() => h.vente && s.ouvrir('ticket', { vente: h.vente })}>
            <span className="grandit">
              <b className="bloc-texte petit">{h.type === 'achat' ? 'Achat à crédit · ticket n° ' + h.vente.numero : 'Remboursement · ' + h.remboursement.mode}</b>
              <span className="tres-petit muet">{formatDate(h.date)} à {formatHeure(h.date)}{h.vente ? ' · ' + h.vente.lignes.map((l) => l.produitNom).join(', ') : ''}</span>
            </span>
            <span className={h.type === 'achat' ? 'mouvement-moins' : 'mouvement-plus'}>{h.type === 'achat' ? '+' : '−'}{s.prix(h.montant)}</span>
          </div>
        ))}
        {!historique.length && <p className="muet petit" style={{ padding: 16 }}>Aucun achat à crédit pour l’instant.</p>}
      </div>
    </Feuille>
  );
}

export function FeuilleRemboursement({ clientId }) {
  const s = useKaislo();
  const client = s.d.clients.find((c) => c.id === clientId);
  const solde = soldeClient(s.d, clientId);
  const [montant, setMontant] = useState(solde);
  const [mode, setMode] = useState('Espèces');
  const valider = () => {
    const res = s.enregistrerRemboursement(client, montant, mode);
    if (res.erreur) s.message(res.erreur, 'erreur');
  };
  return (
    <Feuille titre="Remboursement" sousTitre={client.nom + ' doit ' + s.prix(solde)} surFermer={() => s.ouvrir('ficheClient', { clientId })}
      pied={<button className="btn grand bloc" onClick={valider}><Icone nom="ok" /> Enregistrer {montant > 0 ? s.prix(montant) : ''}</button>}>
      <div className="pile">
        <label className="champ"><span>Montant reçu</span><ChampMontant valeur={montant} surChanger={setMontant} grand autoFocus /></label>
        <div className="puces">
          <button className="puce" onClick={() => setMontant(solde)}>Tout ({s.nombre(solde)})</button>
          {[0.5, 0.25].map((p) => <button key={p} className="puce" onClick={() => setMontant(Math.round(solde * p))}>{p * 100} %</button>)}
        </div>
        <div className="champ"><span>Mode</span>
          <div className="choix-grille">
            {s.d.commerce.modesPaiement.map((m) => <button key={m} className={mode === m ? 'actif' : ''} onClick={() => setMode(m)}>{m}</button>)}
          </div>
        </div>
        <p className="tres-petit muet">Un reçu est imprimé. Les remboursements en espèces comptent dans la clôture de caisse.</p>
      </div>
    </Feuille>
  );
}

export function FeuilleRecuRemboursement({ remboursement, client, soldeApres }) {
  const s = useKaislo();
  return (
    <Feuille titre="Remboursement enregistré" sousTitre={client.nom + ' · reste ' + s.prix(soldeApres)} surFermer={() => s.ouvrir('ficheClient', { clientId: client.id })}
      pied={
        <div className="grille-2">
          <button className="btn secondaire" onClick={() => s.imprimerRemboursement(remboursement, client, soldeApres)}><Icone nom="imprimante" /> Imprimer</button>
          <button className="btn" onClick={() => s.ouvrir('ficheClient', { clientId: client.id })}>Terminer</button>
        </div>
      }>
      <ApercuTicket lignes={s.lignesRemboursement(remboursement, client, soldeApres)} largeur={s.prefs.largeurTicket} />
    </Feuille>
  );
}

// ---------- Stock : entrée de marchandise ----------
export function FeuilleEntreeStock({ produitId }) {
  const s = useKaislo();
  const produits = [...s.d.produits].sort((a, b) => a.nom.localeCompare(b.nom));
  const [b, setB] = useState({ produitId: produitId || '', quantite: null, prixAchat: null, fournisseur: '', note: '' });
  const p = s.d.produits.find((x) => x.id === b.produitId);
  const valider = () => { const err = s.entreeStock(b); err ? s.message(err, 'erreur') : s.fermer(); };
  const fournisseurs = [...new Set((s.d.mouvements || []).map((m) => m.fournisseur).filter(Boolean))];
  return (
    <Feuille titre="Entrée de marchandise" sousTitre="Le stock augmente" surFermer={s.fermer} pied={<button className="btn bloc" onClick={valider}>Ajouter au stock</button>}>
      <div className="pile">
        <label className="champ"><span>Article</span>
          <select value={b.produitId} onChange={(e) => setB({ ...b, produitId: e.target.value })}>
            <option value="">Choisir…</option>
            {produits.map((x) => <option key={x.id} value={x.id}>{x.nom}{x.suiviStock ? ' (stock ' + x.stock + ')' : ''}</option>)}
          </select>
        </label>
        <div className="grille-2">
          <label className="champ"><span>Quantité reçue</span><ChampMontant valeur={b.quantite} surChanger={(v) => setB({ ...b, quantite: v })} /></label>
          <label className="champ"><span>Prix d’achat unitaire</span><ChampMontant valeur={b.prixAchat} surChanger={(v) => setB({ ...b, prixAchat: v })} placeholder={p?.prixAchat ? String(p.prixAchat) : '—'} /></label>
        </div>
        <label className="champ"><span>Fournisseur</span><input list="fournisseurs" value={b.fournisseur} onChange={(e) => setB({ ...b, fournisseur: e.target.value })} placeholder="Ex : Grossiste Derb Omar" /></label>
        <datalist id="fournisseurs">{fournisseurs.map((f) => <option key={f} value={f} />)}</datalist>
        {p && b.quantite > 0 && <p className="info-verte">Nouveau stock : {quantiteUnite(p.stock + Number(b.quantite), p.unite)}{(b.prixAchat || p.prixAchat) ? ' · coût ' + s.prix(b.quantite * (b.prixAchat || p.prixAchat)) : ''}</p>}
      </div>
    </Feuille>
  );
}

// ---------- Stock : inventaire ----------
export function FeuilleAjustement({ produit }) {
  const s = useKaislo();
  const [q, setQ] = useState(produit.stock);
  const [note, setNote] = useState('');
  const valider = () => { const err = s.ajusterStock(produit.id, q, note); err ? s.message(err, 'erreur') : s.fermer(); };
  return (
    <Feuille titre="Inventaire" sousTitre={produit.nom + ' · stock actuel ' + produit.stock} surFermer={s.fermer} pied={<button className="btn bloc" onClick={valider}>Corriger le stock</button>}>
      <div className="pile">
        <label className="champ"><span>Quantité réellement comptée</span><ChampMontant valeur={q} surChanger={setQ} grand autoFocus /></label>
        {q !== null && q !== produit.stock && <p className={q > produit.stock ? 'info-verte' : 'alerte'}>Écart : {q > produit.stock ? '+' : ''}{q - produit.stock}</p>}
        <label className="champ"><span>Raison (facultatif)</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex : casse, périmé, erreur de comptage" /></label>
      </div>
    </Feuille>
  );
}

// ---------- Mon compte ----------
export function FeuilleCompte() {
  const s = useKaislo();
  const enLigne = estServeur(s.d);
  const [biometrie, setBiometrie] = useState(false); // l'appareil a-t-il une empreinte / Face ID ?
  useEffect(() => { if (enLigne) biometrieDisponible().then(setBiometrie); }, [enLigne]);
  const empreinteActive = !!s.prefs.biometrie?.[cleTelephone(s.utilisateur.telephone)];
  const confirmerDeconnexion = () =>
    confirm('Déconnecter cet appareil de « ' + s.d.commerce.nom + ' » ?' + (enLigne
      ? ' La copie des données sera retirée de cet appareil (elles restent sur le serveur). Pour revenir : votre numéro et votre code PIN.'
      : ' Pour le reconnecter, il faudra le code du commerce (' + s.d.commerce.code + ').')) && s.delierAppareil();
  return (
    <Feuille surFermer={s.fermer} pied={
      <div className="pile">
        <button className="btn secondaire bloc" onClick={s.seDeconnecter}><Icone nom="sortie" /> Changer d’utilisateur</button>
        {s.estDemoActuel() ? (
          <button className="btn fantome bloc" onClick={s.delierAppareil}>Quitter la démo</button>
        ) : (
          s.estGerant() && <button className="btn fantome bloc" onClick={confirmerDeconnexion}>Déconnecter cet appareil du commerce</button>
        )}
      </div>
    }>
      <div className="centre" style={{ paddingTop: 8 }}>
        <span style={{ display: 'inline-block' }}><Avatar nom={s.utilisateur.nom} gerant={s.estGerant()} grand /></span>
        <h2 style={{ marginTop: 12 }}>{s.utilisateur.nom}</h2>
        <p className="muet">{s.estGerant() ? 'Gérant' : 'Vendeur'} · {s.d.commerce.nom}</p>
      </div>
      {!s.estGerant() && (
        <div className="liste" style={{ marginTop: 18 }}>
          <button className="liste-item" onClick={() => s.allerA('imprimante')}>
            <span className="mini-emoji teinte-vert"><Icone nom="imprimante" /></span>
            <b className="grandit">Imprimante</b>
            <span className="petit muet">{s.imprimante.connectee ? 'Connectée' : 'Non connectée'}</span>
            <Icone nom="droite" className="muet" />
          </button>
        </div>
      )}
      {enLigne && (
        <div className="carte pile" style={{ marginTop: 18 }}>
          <EtatSynchroDetail />
          {biometrie && (
            <Reglage
              titre={'Connexion avec ' + nomBiometrie()}
              aide="Sur cet appareil seulement. Le code PIN reste toujours possible."
              actif={empreinteActive}
              surChanger={(v) => (v ? s.activerBiometrie() : s.desactiverBiometrie())}
            />
          )}
        </div>
      )}
    </Feuille>
  );
}

// État de la synchronisation, avec un bouton pour la relancer
export function EtatSynchroDetail() {
  const s = useKaislo();
  const { etat, enAttente, derniere, message } = s.synchro;
  const texte = etat === 'envoi' ? 'Synchronisation en cours…'
    : etat === 'hors-ligne' ? 'Hors ligne : ' + (enAttente ? enAttente + ' modification(s) en attente' : 'tout est enregistré sur l’appareil')
    : etat === 'erreur' ? 'Erreur : ' + message
    : enAttente ? enAttente + ' modification(s) à envoyer'
    : derniere ? 'Données à jour (' + formatHeure(derniere) + ')' : 'Données enregistrées sur l’appareil';
  return (
    <div className="ligne espace">
      <div>
        <b>Sauvegarde en ligne</b>
        <p className="tres-petit muet">{texte}</p>
      </div>
      <button className="btn secondaire petit" onClick={() => s.synchroniser()} disabled={etat === 'envoi'}>Synchroniser</button>
    </div>
  );
}

// ---------- Proposition d'activer l'empreinte / Face ID (après la 1re connexion par code) ----------
export function FeuilleBiometrie() {
  const s = useKaislo();
  const nom = nomBiometrie();
  return (
    <Feuille titre={'Se connecter avec ' + nom + ' ?'} surFermer={s.refuserBiometrie} pied={
      <div className="grille-2">
        <button className="btn secondaire" onClick={s.refuserBiometrie}>Plus tard</button>
        <button className="btn" onClick={s.activerBiometrie}>Activer</button>
      </div>
    }>
      <div className="centre pile" style={{ paddingTop: 8 }}>
        <span className="mini-emoji teinte-vert" style={{ margin: '0 auto', width: 56, height: 56 }}><Icone nom="bouclier" taille="lg" /></span>
        <p>La prochaine fois, ouvrez votre caisse avec {nom}, sans taper votre code.</p>
        <p className="tres-petit muet">Votre empreinte ou votre visage ne quittent jamais votre téléphone. Le code PIN reste toujours possible.</p>
      </div>
    </Feuille>
  );
}

// ---------- Menu "Plus" (téléphone) ----------
export function FeuilleMenu() {
  const s = useKaislo();
  const liens = liensMenu(s).slice(4);
  return (
    <Feuille titre="Menu" surFermer={s.fermer}>
      <div className="liste">
        {liens.map(([ecran, libelle, icone]) => (
          <button key={ecran} className="liste-item" onClick={() => s.allerA(ecran)}>
            <span className="mini-emoji teinte-vert"><Icone nom={icone} /></span>
            <b className="grandit">{libelle}</b>
            <Icone nom="droite" className="muet" />
          </button>
        ))}
      </div>
    </Feuille>
  );
}
