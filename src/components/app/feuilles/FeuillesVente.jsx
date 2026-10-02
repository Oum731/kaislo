'use client';
// ------------------------------------------------------------
// Fenêtres liées à la vente : options d'un produit, panier (téléphone),
// ticket, annulation, ticket cuisine, remise, choix du client / de la
// table, scan de code-barres, clôture de caisse.
// ------------------------------------------------------------
import { useEffect, useRef, useState } from 'react';
import { useKaisly } from '@/store/kaisly';
import { creerLigne, choixComplets, prixDeBase } from '@/lib/donnees/vente';
import { clientsAvecSolde } from '@/lib/donnees/credit';
import { formatDate, formatHeure, formatJourLong, symbole } from '@/lib/utils/format';
import { historiqueCaisse } from '@/lib/donnees/cloture';
import { Feuille, Icone, ApercuTicket, ChampMontant, Segment, ImageStockee, initiales } from '@/components/ui';
import { ContenuPanier } from '../ecrans/Caisse';

// ---------- Options d'un produit (accompagnement, taille…) ----------
export function FeuilleOptions({ produit }) {
  const s = useKaisly();
  const [choix, setChoix] = useState(() =>
    // Groupe obligatoire avec une seule option : déjà cochée
    Object.fromEntries(produit.groupes.filter((g) => g.obligatoire && g.options.length === 1).map((g) => [g.id, [g.options[0].id]]))
  );
  const [quantite, setQuantite] = useState(1);
  const couleur = s.d.categories.find((c) => c.id === produit.categorieId)?.couleur || 'vert';
  const valide = choixComplets(produit, choix);
  const total = creerLigne(produit, choix, quantite, s.devise()).total;

  const basculer = (g, o) => {
    const actuels = choix[g.id] || [];
    let nouveaux;
    if (g.type === 'unique') nouveaux = actuels.includes(o.id) && !g.obligatoire ? [] : [o.id];
    else nouveaux = actuels.includes(o.id) ? actuels.filter((x) => x !== o.id) : [...actuels, o.id];
    setChoix({ ...choix, [g.id]: nouveaux });
  };

  return (
    <Feuille
      titre={produit.nom}
      sousTitre={s.prix(prixDeBase(produit)) + (prixDeBase(produit) < produit.prix ? ' (promo)' : '')}
      avant={<ImageStockee reference={produit.image} className="mini-photo" alt="" secours={<span className={`mini-emoji teinte-${couleur}`}>{initiales(produit.nom)}</span>} />}
      surFermer={s.fermer}
      pied={
        <div className="ligne">
          <div className="quantite">
            <button onClick={() => setQuantite(Math.max(1, quantite - 1))} aria-label="Moins"><Icone nom="moins" /></button>
            <span>{quantite}</span>
            <button onClick={() => setQuantite(quantite + 1)} aria-label="Plus"><Icone nom="plus" /></button>
          </div>
          <button className="btn grandit" disabled={!valide} onClick={() => { s.ajouterAuPanier(produit, choix, quantite); s.fermer(); }}>
            {valide ? 'Ajouter · ' + s.prix(total) : 'Faites un choix'}
          </button>
        </div>
      }
    >
      {produit.groupes.map((g) => {
        const fait = (choix[g.id] || []).length > 0;
        return (
          <div key={g.id} className="groupe-options">
            <div className="groupe-tete">
              <h3>{g.nom}</h3>
              <span className={`badge ${g.obligatoire ? (fait ? '' : 'safran') : 'gris'}`}>
                {g.obligatoire ? (fait ? 'OK' : 'Obligatoire') : g.type === 'multiple' ? 'Plusieurs choix' : 'Facultatif'}
              </span>
            </div>
            {g.options.map((o) => {
              const coche = (choix[g.id] || []).includes(o.id);
              return (
                <button key={o.id} className={`option ${coche ? 'choisie' : ''}`} onClick={() => basculer(g, o)}>
                  <span className={`coche ${g.type === 'multiple' ? 'carre' : ''}`}>{coche && <Icone nom="ok" taille="sm" style={{ strokeWidth: 3 }} />}</span>
                  <span>{o.nom}</span>
                  <span className="supplement">{o.prix > 0 ? '+ ' + s.nombre(o.prix) : o.prix < 0 ? '− ' + s.nombre(-o.prix) : ''}</span>
                </button>
              );
            })}
          </div>
        );
      })}
    </Feuille>
  );
}

// ---------- Panier (téléphone) ----------
export function FeuillePanier() {
  const s = useKaisly();
  const t = s.totaux();
  const commande = s.commandeEnCours();
  useEffect(() => {
    if (!s.panier.length) s.fermer();
  }, [s.panier.length]);
  return (
    <Feuille
      titre={commande ? commande.table : 'Commande'}
      sousTitre={t.nbArticles + ' article' + (t.nbArticles > 1 ? 's' : '')}
      surFermer={s.fermer}
      pleine
    >
      <ContenuPanier dansFeuille />
    </Feuille>
  );
}

// ---------- Ticket de vente ----------
export function FeuilleTicket({ vente, nouvelle }) {
  const s = useKaisly();
  return (
    <Feuille
      titre={'Ticket n° ' + vente.numero}
      sousTitre={formatDate(vente.date) + ' à ' + formatHeure(vente.date) + ' · ' + vente.vendeurNom}
      surFermer={s.fermer}
      pleine
      pied={
        <div className="grille-2">
          <button className="btn secondaire" onClick={() => s.imprimerVente(vente)} disabled={s.impressionEnCours}>
            <Icone nom="imprimante" /> {s.impressionEnCours ? 'Impression…' : 'Imprimer'}
          </button>
          <button className="btn" onClick={s.fermer}>{nouvelle ? 'Nouvelle vente' : 'Fermer'}</button>
        </div>
      }
    >
      {nouvelle && (
        <div className="succes">
          <div className="rond"><Icone nom="ok" taille="lg" style={{ strokeWidth: 3 }} /></div>
          <h2>{vente.paiement === 'Crédit' ? 'Noté dans le carnet' : 'Vente enregistrée'}</h2>
          <p className="muet">{s.prix(vente.total)} · {vente.paiement === 'Crédit' ? vente.clientNom : vente.paiement}</p>
          {vente.recu > 0 && <p className="info-verte" style={{ marginTop: 12, display: 'inline-block' }}>Rendre {s.prix(vente.recu - vente.total)}</p>}
        </div>
      )}
      {vente.annulee && (
        <p className="alerte" style={{ marginBottom: 14 }}>
          Vente annulée par {vente.annulee.par} le {formatDate(vente.annulee.date)} à {formatHeure(vente.annulee.date)}{vente.annulee.motif ? ' · ' + vente.annulee.motif : ''}
        </p>
      )}
      {!vente.annulee && <EnvoiWhatsApp vente={vente} enAvant={nouvelle && vente.aDistance} />}
      <ApercuTicket lignes={s.lignesVente(vente)} largeur={s.prefs.largeurTicket} />
      {!vente.annulee && (
        <button className="btn danger petit bloc" style={{ marginTop: 20 }} onClick={() => s.ouvrir('annulation', { vente })}>
          <Icone nom="fermer" taille="sm" /> Annuler cette vente
        </button>
      )}
    </Feuille>
  );
}

// ---------- Envoi du reçu par WhatsApp (client qui n'est pas sur place) ----------
function EnvoiWhatsApp({ vente, enAvant }) {
  const s = useKaisly();
  const [telephone, setTelephone] = useState(vente.telephoneClient || '');
  const [ouvert, setOuvert] = useState(enAvant || !!vente.telephoneClient);
  const envoyer = () => {
    const lien = s.lienWhatsAppRecu(vente, telephone.trim());
    if (lien) window.open(lien, '_blank', 'noopener');
  };
  if (!ouvert) {
    return (
      <button className="btn secondaire bloc" style={{ marginBottom: 14 }} onClick={() => setOuvert(true)}>
        <Icone nom="whatsapp" /> Envoyer le reçu par WhatsApp
      </button>
    );
  }
  return (
    <div className={`carte pile ${enAvant ? 'premiers-pas' : ''}`} style={{ marginBottom: 14, padding: 14 }}>
      <b className="petit">{enAvant ? 'Commande à distance : envoyez le reçu au client' : 'Envoyer le reçu par WhatsApp'}</b>
      <div className="ligne">
        <input className="saisie grandit" type="tel" inputMode="tel" placeholder="Numéro WhatsApp du client" value={telephone} onChange={(e) => setTelephone(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && envoyer()} />
        <button className="btn" onClick={envoyer} disabled={!telephone.trim()}><Icone nom="whatsapp" /> Envoyer</button>
      </div>
      <p className="tres-petit muet">WhatsApp s’ouvre avec le reçu déjà écrit : il ne reste qu’à appuyer sur Envoyer. Le numéro peut être tapé sans l’indicatif du pays.</p>
    </div>
  );
}

// ---------- Annulation (PIN du gérant) ----------
export function FeuilleAnnulation({ vente }) {
  const s = useKaisly();
  const [motif, setMotif] = useState('');
  const [pin, setPin] = useState('');
  const confirmer = () => {
    if (!s.annulerVente(vente, pin, motif)) setPin('');
  };
  return (
    <Feuille
      titre={'Annuler la vente n° ' + vente.numero}
      sousTitre={s.prix(vente.total) + ' · ' + vente.vendeurNom}
      surFermer={() => s.ouvrir('ticket', { vente })}
      pied={<button className="btn danger bloc" disabled={pin.length < 4} onClick={confirmer}>Confirmer l’annulation</button>}
    >
      <div className="pile">
        <label className="champ"><span>Motif</span><input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex : erreur de saisie, client parti…" /></label>
        <label className="champ"><span>Code PIN du gérant</span><input className="pin-saisie" type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value)} placeholder="••••" onKeyDown={(e) => e.key === 'Enter' && pin.length === 4 && confirmer()} /></label>
        <p className="tres-petit muet">La vente reste dans l’historique, marquée « Annulée ». Elle ne compte plus dans les totaux ni dans la clôture, et les articles reviennent dans le stock.</p>
      </div>
    </Feuille>
  );
}

// ---------- Ticket cuisine ----------
export function FeuilleCuisine({ commande, lignes }) {
  const s = useKaisly();
  return (
    <Feuille
      titre="Envoyé en cuisine"
      sousTitre={commande.table + ' · ' + lignes.reduce((x, l) => x + l.quantite, 0) + ' article(s)'}
      surFermer={() => { s.fermer(); s.allerA('tables'); }}
      pied={
        <div className="grille-2">
          <button className="btn secondaire" onClick={() => s.imprimerCuisine(commande, lignes)}><Icone nom="imprimante" /> Imprimer</button>
          <button className="btn" onClick={() => s.allerA('tables')}>Retour aux tables</button>
        </div>
      }
    >
      <ApercuTicket lignes={s.lignesCuisine(commande, lignes)} largeur={s.prefs.largeurTicket} />
    </Feuille>
  );
}

// ---------- Remise ----------
export function FeuilleRemise() {
  const s = useKaisly();
  const [type, setType] = useState(s.remise?.type || 'pourcent');
  const [valeur, setValeur] = useState(s.remise?.valeur ?? null);
  // Sur téléphone on revient au panier, sur grand écran le panier est déjà visible
  const retour = () => (window.innerWidth < 1024 ? s.ouvrir('panier') : s.fermer());
  const appliquer = (v = valeur) => {
    if (!(v > 0)) return s.message('Indiquez la remise', 'erreur');
    if (type === 'pourcent' && v > 100) return s.message('La remise ne peut pas dépasser 100 %', 'erreur');
    s.definirRemise({ type, valeur: v });
    retour();
  };
  return (
    <Feuille titre="Remise sur la vente" sousTitre={'Total actuel : ' + s.prix(s.totaux().sousTotal)} surFermer={retour}
      pied={<button className="btn bloc" onClick={() => appliquer()}>Appliquer la remise</button>}>
      <div className="pile">
        <Segment options={[['pourcent', 'En %'], ['montant', 'En ' + symbole(s.devise())]]} valeur={type} surChanger={setType} />
        <ChampMontant valeur={valeur} surChanger={setValeur} grand autoFocus placeholder={type === 'pourcent' ? '10' : '0'} />
        {type === 'pourcent' && (
          <div className="puces">
            {[5, 10, 15, 20, 50].map((p) => <button key={p} className="puce" onClick={() => { setValeur(p); }}>{p} %</button>)}
          </div>
        )}
      </div>
    </Feuille>
  );
}

// ---------- Choisir (ou créer) le client pour une vente à crédit ----------
export function FeuilleChoixClient() {
  const s = useKaisly();
  const [recherche, setRecherche] = useState('');
  const [nouveau, setNouveau] = useState(null);
  const clients = clientsAvecSolde(s.d);
  const r = recherche.trim().toLowerCase();
  const liste = clients.filter((c) => !r || c.nom.toLowerCase().includes(r) || (c.telephone || '').includes(r));
  const retour = () => (window.innerWidth < 1024 ? s.ouvrir('panier') : s.fermer());
  const choisir = (c) => {
    useKaisly.setState({ clientCredit: c, paiementChoisi: 'Crédit' });
    retour();
  };
  const creer = () => {
    const res = s.enregistrerClient(nouveau);
    if (res.erreur) return s.message(res.erreur, 'erreur');
    choisir(res.client);
  };

  if (nouveau) {
    return (
      <Feuille titre="Nouveau client" surFermer={() => setNouveau(null)} pied={<button className="btn bloc" onClick={creer}>Créer et choisir</button>}>
        <div className="pile">
          <label className="champ"><span>Nom</span><input value={nouveau.nom} onChange={(e) => setNouveau({ ...nouveau, nom: e.target.value })} autoFocus placeholder="Ex : Amorac Kaisly" /></label>
          <label className="champ"><span>Téléphone (pour le rappel WhatsApp)</span><input type="tel" value={nouveau.telephone} onChange={(e) => setNouveau({ ...nouveau, telephone: e.target.value })} placeholder="Ex : 06 12 34 56 78" /></label>
        </div>
      </Feuille>
    );
  }
  return (
    <Feuille titre="Vente à crédit" sousTitre="Pour quel client ?" surFermer={retour}
      pied={<button className="btn safran bloc" onClick={() => setNouveau({ nom: recherche, telephone: '', note: '' })}><Icone nom="plus" /> Nouveau client</button>}>
      <label className="recherche" style={{ marginBottom: 12 }}>
        <Icone nom="recherche" taille="sm" />
        <input type="search" placeholder="Rechercher un client…" value={recherche} onChange={(e) => setRecherche(e.target.value)} autoFocus />
      </label>
      <div className="liste">
        {liste.map((c) => (
          <button key={c.id} className="liste-item" onClick={() => choisir(c)}>
            <span className="avatar gerant">{initiales(c.nom)}</span>
            <span className="grandit"><b className="bloc-texte tronque">{c.nom}</b><span className="tres-petit muet">{c.telephone || '—'}</span></span>
            {c.solde > 0 ? <span className="badge safran">doit {s.prix(c.solde)}</span> : <span className="badge">À jour</span>}
          </button>
        ))}
        {!liste.length && <p className="muet petit" style={{ padding: 16 }}>Aucun client trouvé. Créez-le avec le bouton ci-dessous.</p>}
      </div>
    </Feuille>
  );
}

// ---------- Mettre la commande sur une table ----------
export function FeuilleChoixTable() {
  const s = useKaisly();
  const occupee = (t) => (s.d.commandes || []).some((c) => c.table === t && c.lignes.length);
  return (
    <Feuille titre="Sur quelle table ?" sousTitre="Les plats partent en cuisine" surFermer={() => (window.innerWidth < 1024 ? s.ouvrir('panier') : s.fermer())}>
      <div className="grille-tables">
        {s.d.commerce.tables.map((t) => (
          <button key={t} className={`table-carte ${occupee(t) ? 'occupee' : ''}`} style={{ minHeight: 84 }} onClick={() => s.mettreSurTable(t)}>
            <span className="nom">{t}</span>
            <span className="petit">{occupee(t) ? 'Ajouter à la commande' : 'Libre'}</span>
          </button>
        ))}
      </div>
    </Feuille>
  );
}

// ---------- Scan de code-barres avec la caméra ----------
export function FeuilleScan({ surCode }) {
  const s = useKaisly();
  const video = useRef(null);
  const [supporte, setSupporte] = useState(true);
  const [code, setCode] = useState('');
  const valider = (c) => { s.fermer(); surCode(String(c).trim()); };

  useEffect(() => {
    let flux = null, actif = true;
    (async () => {
      if (!('BarcodeDetector' in window) || !navigator.mediaDevices) return setSupporte(false);
      try {
        flux = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.current.srcObject = flux;
        await video.current.play();
        const detecteur = new window.BarcodeDetector();
        const boucle = async () => {
          if (!actif) return;
          try {
            const codes = await detecteur.detect(video.current);
            if (codes.length) return valider(codes[0].rawValue);
          } catch { /* image pas encore prête */ }
          setTimeout(boucle, 250);
        };
        boucle();
      } catch {
        setSupporte(false);
      }
    })();
    return () => { actif = false; flux?.getTracks().forEach((t) => t.stop()); };
  }, []);

  return (
    <Feuille titre="Scanner un article" sousTitre="Visez le code-barres avec la caméra" surFermer={s.fermer}>
      <div className="pile">
        {supporte ? (
          <video ref={video} playsInline muted style={{ width: '100%', borderRadius: 16, background: '#000', aspectRatio: '4/3', objectFit: 'cover' }} />
        ) : (
          <p className="astuce">Le scan par caméra n’est pas disponible sur ce navigateur. Tapez le code, ou utilisez un lecteur de code-barres (il remplit la recherche tout seul).</p>
        )}
        <div className="ligne">
          <input className="saisie grandit" inputMode="numeric" placeholder="Code-barres" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && valider(code)} />
          <button className="btn" onClick={() => valider(code)}>OK</button>
        </div>
        {s.estDemoActuel() && <p className="tres-petit muet">Démo : essayez 6111000000011 (huile) ou 6111000000103 (lait).</p>}
      </div>
    </Feuille>
  );
}

// ---------- Ouverture de la caisse du jour ----------
export function FeuilleOuverture() {
  const s = useKaisly();
  const [fond, setFond] = useState(s.d.commerce.fondDeCaisse || 0);
  const [note, setNote] = useState('');
  const derniere = historiqueCaisse(s.d).find((x) => x.fermeLe);
  const ouvrir = () => {
    if (s.ouvrirCaisse(fond, note)) s.fermer();
  };
  return (
    <Feuille titre="Ouverture de la caisse" sousTitre={formatJourLong(new Date()) + ' · ' + s.utilisateur.nom} surFermer={s.fermer}
      pied={<button className="btn grand bloc" onClick={ouvrir}><Icone nom="ok" /> Ouvrir la caisse</button>}>
      <div className="pile">
        <p className="petit">Comptez la monnaie présente dans la caisse avant la première vente.</p>
        <label className="champ"><span>Fond de caisse compté</span><ChampMontant valeur={fond} surChanger={(v) => setFond(v || 0)} grand autoFocus /></label>
        {derniere && (
          <p className="tres-petit muet">
            Dernière fermeture : {formatDate(derniere.fermeLe)} à {formatHeure(derniere.fermeLe)} par {derniere.fermePar} · espèces comptées {s.prix(derniere.cloture?.compte ?? 0)}
          </p>
        )}
        <label className="champ"><span>Note (facultatif)</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex : billets de 200 manquants pour la monnaie" /></label>
      </div>
    </Feuille>
  );
}

// ---------- Fermeture de la caisse (avec le total vendu par article) ----------
export function FeuilleCloture() {
  const s = useKaisly();
  const [compte, setCompte] = useState(null);
  const [note, setNote] = useState('');
  const session = s.caisseOuverte();
  const c = s.calculClotureEnCours();
  if (!session || !c) {
    return (
      <Feuille titre="Fermeture de la caisse" surFermer={s.fermer}>
        <p className="astuce">La caisse n’est pas ouverte.</p>
      </Feuille>
    );
  }
  const ecart = compte === null ? null : Math.round((compte - c.attendu) * 100) / 100;

  return (
    <Feuille titre="Fermeture de la caisse" sousTitre={'Ouverte à ' + formatHeure(session.ouverteLe) + ' par ' + session.ouvertePar} surFermer={s.fermer} pleine large
      pied={
        <button className="btn grand bloc" disabled={ecart === null} onClick={() => s.fermerCaisse(compte, note)}>
          <Icone nom={s.imprimante.connectee ? 'imprimante' : 'ok'} /> {s.imprimante.connectee ? 'Fermer la caisse et imprimer' : 'Fermer la caisse'}
        </button>
      }>
      <div className="grille-ecran deux">
        <div className="pile">
          <div className="carte">
            <div className="ligne espace"><b>Ventes ({c.nbVentes} tickets)</b><b className="chiffre">{s.prix(c.totalVentes)}</b></div>
            {c.parPaiement.map((p) => (
              <div key={p.mode} className="ligne espace petit" style={{ marginTop: 8 }}><span className="muet">{p.mode} ({p.nb})</span><span className="chiffre">{s.prix(p.total)}</span></div>
            ))}
            {c.totalRemises > 0 && <div className="ligne espace petit" style={{ marginTop: 8 }}><span className="muet">Remises accordées</span><span className="chiffre">{s.prix(c.totalRemises)}</span></div>}
            {c.nbAnnulees > 0 && <p className="tres-petit muet" style={{ marginTop: 8 }}>{c.nbAnnulees} vente(s) annulée(s), non comptée(s)</p>}
          </div>
          <ArticlesVendus c={c} />
        </div>
        <div className="pile">
          <div className="carte pile">
            <h3>Espèces dans la caisse</h3>
            <div className="ligne espace petit"><span className="muet">Fond de caisse (ouverture)</span><span className="chiffre">{s.prix(c.fondDeCaisse)}</span></div>
            <div className="ligne espace petit"><span className="muet">+ Ventes en espèces</span><span className="chiffre">{s.prix(c.ventesEspeces)}</span></div>
            {c.remboursementsEspeces > 0 && <div className="ligne espace petit"><span className="muet">+ Crédits remboursés en espèces</span><span className="chiffre">{s.prix(c.remboursementsEspeces)}</span></div>}
            <div className="ligne espace petit"><span className="muet">− Dépenses payées par la caisse</span><span className="chiffre">{s.prix(c.depensesCaisse)}</span></div>
            {c.attendu < 0 && <p className="astuce">Les dépenses payées par la caisse dépassent les espèces encaissées. Vérifiez les dépenses du jour.</p>}
            <div className="ligne espace" style={{ paddingTop: 10, borderTop: '1px solid var(--bordure)' }}><b>Espèces attendues</b><span className="kpi-valeur" style={{ margin: 0 }}>{s.prix(c.attendu)}</span></div>
          </div>
          <div className="carte pile">
            <h3>Comptez les billets et pièces</h3>
            <ChampMontant valeur={compte} surChanger={setCompte} grand placeholder="Montant compté" />
            {ecart !== null && (
              <div className={`ecart ${ecart === 0 ? 'juste' : ecart < 0 ? 'rouge' : 'safran'}`} style={{ marginTop: 0 }}>
                <Icone nom={ecart === 0 ? 'ok' : 'alerte'} />
                {ecart === 0 ? 'Caisse juste' : ecart < 0 ? 'Manque ' + s.prix(-ecart) : 'Excédent ' + s.prix(ecart)}
              </div>
            )}
            <label className="champ"><span>Note (facultatif)</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex : 2 billets abîmés mis de côté" /></label>
          </div>
        </div>
      </div>
    </Feuille>
  );
}

// Total vendu par article (quantité et montant)
function ArticlesVendus({ c }) {
  const s = useKaisly();
  const liste = c.parArticle || [];
  return (
    <div className="carte">
      <div className="ligne espace"><h3>Articles vendus</h3><span className="badge gris">{c.nbArticles ?? liste.reduce((x, a) => x + a.quantite, 0)} articles</span></div>
      <div style={{ marginTop: 8 }}>
        {liste.map((a) => (
          <div key={a.nom} className="ligne espace petit article-vendu">
            <span className="tronque"><b className="chiffre">{a.quantite} ×</b> {a.nom}</span>
            <span className="chiffre">{s.prix(a.total)}</span>
          </div>
        ))}
        {!liste.length && <p className="muet petit">Aucun article vendu.</p>}
      </div>
    </div>
  );
}

// ---------- Résumé d'une journée de caisse (après fermeture ou depuis l'historique) ----------
export function FeuilleTicketCloture({ cloture }) {
  const s = useKaisly();
  return (
    <Feuille titre="Résumé de la journée de caisse" sousTitre={'Fermée le ' + formatDate(cloture.date) + ' à ' + formatHeure(cloture.date) + ' · ' + cloture.utilisateurNom} surFermer={s.fermer} pleine large
      pied={
        <div className="grille-2">
          <button className="btn secondaire" onClick={() => s.imprimerCloture(cloture)} disabled={s.impressionEnCours}><Icone nom="imprimante" /> Imprimer</button>
          <button className="btn" onClick={s.fermer}>Terminer</button>
        </div>
      }>
      <div className="grille-ecran deux">
        <div className="pile">
          <div className="kpis" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div className="carte kpi"><p className="petit muet">Ventes</p><p className="kpi-valeur">{s.prix(cloture.totalVentes)}</p><p className="sous">{cloture.nbVentes} tickets</p></div>
            <div className="carte kpi"><p className="petit muet">Écart de caisse</p><p className="kpi-valeur" style={{ color: cloture.ecart === 0 ? 'var(--vert)' : cloture.ecart < 0 ? 'var(--rouge)' : 'var(--safran-fonce)' }}>{cloture.ecart === 0 ? 'Juste' : (cloture.ecart > 0 ? '+' : '') + s.prix(cloture.ecart)}</p><p className="sous">compté {s.prix(cloture.compte)}</p></div>
          </div>
          <div className="carte petit pile">
            <p><b>Ouverture :</b> {formatDate(cloture.debut)} à {formatHeure(cloture.debut)}{cloture.ouvertePar ? ' par ' + cloture.ouvertePar : ''}</p>
            <p><b>Fermeture :</b> {formatDate(cloture.date)} à {formatHeure(cloture.date)} par {cloture.utilisateurNom}</p>
            {cloture.note && <p><b>Note :</b> {cloture.note}</p>}
          </div>
          <ArticlesVendus c={cloture} />
        </div>
        <div>
          <p className="section-titre" style={{ marginTop: 0 }}>Ticket de fermeture</p>
          <ApercuTicket lignes={s.lignesCloture(cloture)} largeur={s.prefs.largeurTicket} />
        </div>
      </div>
    </Feuille>
  );
}
