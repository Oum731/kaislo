'use client';
// ------------------------------------------------------------
// ESPACE AMORAC (/admin) : gestion de tous les commerces Kaisly
//  - tableau de bord : nombre de commerces, essais, abonnés, revenus
//  - commerces : fiche, abonnement, paiements, suspension
//  - paiements : historique des abonnements payés
//  - offres : noms, descriptions et prix par devise
//
// DÉMONSTRATION : les données viennent de cet appareil (localStorage).
// Dans la vraie version, elles viendront du serveur et l'accès sera
// réservé aux comptes de l'équipe Amorac.
// ------------------------------------------------------------
import { useEffect, useMemo, useState } from 'react';
import Chargement from '@/components/Chargement';
import Link from 'next/link';
import { tousLesCommerces, enregistrerCommerce, offresActuelles, chargerAdmin, enregistrerAdmin } from '@/lib/donnees/stockage';
import { etatAbonnement, LIBELLES_STATUT, OFFRES_DEFAUT, prolonger, DUREE_ESSAI_JOURS } from '@/lib/donnees/abonnement';
import { paysParId, typeCommerce, numeroWhatsApp } from '@/lib/donnees/modeles';
import { formatPrix, formatDate, genId, symbole, NOMS_DEVISES } from '@/lib/utils/format';
import { ADMIN_MOT_DE_PASSE } from '@/config';
import { Icone, Feuille, Puces, ImageStockee, ChampMontant, initiales } from '@/components/ui';

const JOUR = 86400000;
const DEVISES = ['MAD', 'FCFA', 'EUR', 'CAD', 'USD', 'GNF'];
const CLASSE_STATUT = { essai: 'safran', actif: '', expire: 'rouge', suspendu: 'sombre' };

// Résumé d'un commerce pour l'équipe Amorac
function resumer(d) {
  const il30j = Date.now() - 30 * JOUR;
  const ventes = d.ventes.filter((v) => !v.annulee);
  const recentes = ventes.filter((v) => new Date(v.date) >= il30j);
  const derniere = ventes.length ? ventes[ventes.length - 1].date : null;
  const gerant = d.utilisateurs.find((u) => u.role === 'gerant');
  return {
    d,
    id: d.commerce.id,
    commerce: d.commerce,
    gerant: gerant?.nom || d.commerce.gerantNom || '—',
    gerantTelephone: gerant?.telephone || '',
    etat: etatAbonnement(d.commerce.abonnement),
    ca30: recentes.reduce((s, v) => s + v.total, 0),
    tickets30: recentes.length,
    derniereActivite: derniere || d.commerce.creeLe || null,
    actifSemaine: derniere && Date.now() - new Date(derniere) < 7 * JOUR,
    nbProduits: d.produits.length,
    nbVendeurs: d.utilisateurs.filter((u) => u.role === 'vendeur' && u.actif).length,
  };
}

export default function Admin() {
  const [connecte, setConnecte] = useState(false);
  const [pret, setPret] = useState(false);
  useEffect(() => {
    try { setConnecte(sessionStorage.getItem('kaisly:admin') === 'oui'); } catch { /* rien */ }
    setPret(true);
  }, []);
  if (!pret) return <Chargement texte="Ouverture de l’espace Amorac…" />;
  if (!connecte) return <ConnexionAdmin surConnexion={() => setConnecte(true)} />;
  return <TableauAdmin surDeconnexion={() => { try { sessionStorage.removeItem('kaisly:admin'); } catch { /* rien */ } setConnecte(false); }} />;
}

function ConnexionAdmin({ surConnexion }) {
  const [mdp, setMdp] = useState('');
  const [erreur, setErreur] = useState(false);
  const valider = () => {
    if (mdp === ADMIN_MOT_DE_PASSE) {
      try { sessionStorage.setItem('kaisly:admin', 'oui'); } catch { /* rien */ }
      surConnexion();
    } else setErreur(true);
  };
  return (
    <div className="ecran-chargement" style={{ padding: 20 }}>
      <div className="carte pile" style={{ width: '100%', maxWidth: 420 }}>
        <span className="logo"><span className="logo-marque">K</span> Kaisly · Amorac</span>
        <h2>Espace équipe</h2>
        <p className="petit muet">Gestion des commerces, abonnements et offres.</p>
        <label className="champ"><span>Mot de passe</span>
          <input type="password" value={mdp} onChange={(e) => { setMdp(e.target.value); setErreur(false); }} onKeyDown={(e) => e.key === 'Enter' && valider()} autoFocus />
        </label>
        {erreur && <p className="alerte">Mot de passe incorrect</p>}
        <button className="btn bloc" onClick={valider}>Entrer</button>
        <p className="tres-petit muet">Démonstration : l’accès sera protégé par le serveur dans la version en ligne.</p>
      </div>
    </div>
  );
}

function TableauAdmin({ surDeconnexion }) {
  const [ecran, setEcran] = useState('tableau');
  const [version, setVersion] = useState(0); // force le rechargement après une modification
  const [ouvert, setOuvert] = useState(null); // id du commerce affiché
  const commerces = useMemo(() => tousLesCommerces().map(resumer), [version]);
  const recharger = () => setVersion((v) => v + 1);
  const liens = [['tableau', 'Accueil', 'accueil'], ['commerces', 'Commerces', 'produits'], ['paiements', 'Paiements', 'ventes'], ['offres', 'Offres', 'remise']];
  const fiche = commerces.find((c) => c.id === ouvert);

  return (
    <div className="coque">
      <nav className="menu" aria-label="Menu Amorac">
        <div className="menu-marque"><span className="logo"><span className="logo-marque">K</span><span className="logo-texte">Amorac</span></span></div>
        <div className="menu-liens">
          {liens.map(([e, l, i]) => (
            <button key={e} className={`menu-lien ${ecran === e ? 'actif' : ''}`} onClick={() => { setEcran(e); window.scrollTo(0, 0); }}>
              <Icone nom={i} /><span className="tronque">{l}</span>
            </button>
          ))}
          <button className="menu-lien seulement-mobile" onClick={surDeconnexion}><Icone nom="sortie" /><span>Sortir</span></button>
        </div>
        <div className="menu-pied">
          <button className="carte-utilisateur" onClick={surDeconnexion}>
            <span className="avatar gerant">AM</span>
            <span className="infos"><b className="bloc-texte">Équipe Amorac</b><span className="tres-petit" style={{ opacity: 0.65 }}>Se déconnecter</span></span>
          </button>
        </div>
      </nav>
      <main className="principal">
        {ecran === 'tableau' && <VueTableau commerces={commerces} ouvrir={setOuvert} />}
        {ecran === 'commerces' && <VueCommerces commerces={commerces} ouvrir={setOuvert} />}
        {ecran === 'paiements' && <VuePaiements commerces={commerces} ouvrir={setOuvert} />}
        {ecran === 'offres' && <VueOffres />}
      </main>
      {fiche && <FicheCommerce c={fiche} fermer={() => setOuvert(null)} recharger={recharger} />}
    </div>
  );
}

function EnTeteAdmin({ surTitre, titre, children }) {
  return (
    <header className="barre-haut">
      <div className="titres"><p className="sur-titre">{surTitre}</p><h1>{titre}</h1></div>
      {children}
    </header>
  );
}

// Montants groupés par devise : "1 200,00 DH · 45 000 FCFA"
function parDevise(lignes) {
  const totaux = {};
  for (const { montant, devise } of lignes) totaux[devise] = (totaux[devise] || 0) + montant;
  const texte = Object.entries(totaux).map(([dev, m]) => formatPrix(m, dev)).join(' · ');
  return texte || '—';
}

function paiementsDe(commerces) {
  return commerces.flatMap((c) => (c.commerce.abonnement?.paiements || []).map((p) => ({ ...p, c })));
}

function VueTableau({ commerces, ouvrir }) {
  const compte = (statut) => commerces.filter((c) => c.etat.statut === statut).length;
  const debutMois = new Date();
  debutMois.setDate(1);
  debutMois.setHours(0, 0, 0, 0);
  const paiements = paiementsDe(commerces);
  const duMois = paiements.filter((p) => new Date(p.date) >= debutMois);
  const aRelancer = commerces
    .filter((c) => c.etat.statut === 'expire' || (c.etat.statut === 'essai' && c.etat.joursRestants <= 7))
    .sort((a, b) => (a.etat.joursRestants ?? 0) - (b.etat.joursRestants ?? 0));
  const repartition = (cle) => {
    const m = {};
    for (const c of commerces) m[cle(c)] = (m[cle(c)] || 0) + 1;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  };

  return (
    <>
      <EnTeteAdmin surTitre="Équipe Amorac" titre="Tableau de bord" />
      <div className="contenu">
        <p className="astuce" style={{ marginBottom: 16 }}>Démonstration : seuls les commerces créés sur cet appareil (et les démos) apparaissent ici. En ligne, tous les commerces s’afficheront.</p>
        <div className="kpis">
          <div className="carte kpi"><p className="petit muet">Commerces</p><p className="kpi-valeur">{commerces.length}</p><p className="sous">{commerces.filter((c) => c.actifSemaine).length} actifs cette semaine</p></div>
          <div className="carte kpi"><p className="petit muet">Abonnés</p><p className="kpi-valeur vert-texte">{compte('actif')}</p><p className="sous">abonnement en cours</p></div>
          <div className="carte kpi"><p className="petit muet">En essai</p><p className="kpi-valeur" style={{ color: 'var(--safran-fonce)' }}>{compte('essai')}</p><p className="sous">{DUREE_ESSAI_JOURS} jours gratuits</p></div>
          <div className="carte kpi"><p className="petit muet">Expirés</p><p className="kpi-valeur rouge-texte">{compte('expire')}</p><p className="sous">à relancer</p></div>
          <div className="carte kpi"><p className="petit muet">Suspendus</p><p className="kpi-valeur">{compte('suspendu')}</p><p className="sous">accès bloqué</p></div>
          <div className="carte kpi"><p className="petit muet">Encaissé ce mois</p><p className="kpi-valeur petit" style={{ fontSize: 17 }}>{parDevise(duMois)}</p><p className="sous">{duMois.length} paiement(s)</p></div>
        </div>

        <div className="grille-ecran deux" style={{ marginTop: 16 }}>
          <div className="carte">
            <h3>À relancer</h3>
            <p className="tres-petit muet">Essais qui se terminent dans 7 jours ou moins, et abonnements expirés.</p>
            <div className="liste" style={{ marginTop: 12 }}>
              {aRelancer.map((c) => <LigneCommerce key={c.id} c={c} ouvrir={ouvrir} />)}
              {!aRelancer.length && <p className="muet petit" style={{ padding: 16 }}>Personne à relancer pour le moment.</p>}
            </div>
          </div>
          <div className="pile">
            <Repartition titre="Par pays" lignes={repartition((c) => paysParId(c.commerce.pays).nom)} total={commerces.length} />
            <Repartition titre="Par type de commerce" lignes={repartition((c) => typeCommerce(c.commerce.type).nom)} total={commerces.length} />
          </div>
        </div>
      </div>
    </>
  );
}

function Repartition({ titre, lignes, total }) {
  return (
    <div className="carte">
      <h3>{titre}</h3>
      <div style={{ marginTop: 12 }}>
        {lignes.map(([nom, n]) => (
          <div key={nom} className="classement-ligne">
            <div className="ligne espace petit"><span>{nom}</span><b>{n}</b></div>
            <div className="jauge"><div style={{ width: (n / total) * 100 + '%' }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LigneCommerce({ c, ouvrir }) {
  const offre = offresActuelles().find((o) => o.id === c.commerce.abonnement?.offre);
  return (
    <button className="liste-item" onClick={() => ouvrir(c.id)}>
      <ImageStockee reference={c.commerce.logo} className="mini-photo" alt="" secours={<span className="mini-emoji teinte-vert">{initiales(c.commerce.nom)}</span>} />
      <span className="grandit">
        <b className="bloc-texte tronque">{c.commerce.nom}</b>
        <span className="tres-petit muet tronque bloc-texte">{paysParId(c.commerce.pays).nom} · {c.commerce.ville} · {c.gerant}</span>
      </span>
      <span style={{ textAlign: 'right' }}>
        <span className={`badge ${CLASSE_STATUT[c.etat.statut]}`}>{LIBELLES_STATUT[c.etat.statut]}{offre && c.etat.statut === 'actif' ? ' · ' + offre.nom : ''}</span>
        {c.etat.joursRestants !== null && c.etat.joursRestants > 0 && <span className="tres-petit muet bloc-texte">{c.etat.joursRestants} j restants</span>}
      </span>
    </button>
  );
}

function VueCommerces({ commerces, ouvrir }) {
  const [filtre, setFiltre] = useState('tous');
  const [recherche, setRecherche] = useState('');
  const r = recherche.trim().toLowerCase();
  const liste = commerces
    .filter((c) => (filtre === 'tous' || c.etat.statut === filtre) && (!r || [c.commerce.nom, c.commerce.ville, c.commerce.code, c.gerant, c.gerantTelephone].some((x) => (x || '').toLowerCase().includes(r))))
    .sort((a, b) => (b.derniereActivite || '').localeCompare(a.derniereActivite || ''));
  return (
    <>
      <EnTeteAdmin surTitre={commerces.length + ' commerces'} titre="Commerces" />
      <div className="contenu" style={{ maxWidth: 1000 }}>
        <div className="ligne" style={{ flexWrap: 'wrap', marginBottom: 14 }}>
          <label className="recherche grandit" style={{ minWidth: 240 }}>
            <Icone nom="recherche" taille="sm" />
            <input type="search" placeholder="Nom, ville, code, gérant, téléphone…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
          </label>
          <Puces options={[['tous', 'Tous'], ['essai', 'Essai'], ['actif', 'Actifs'], ['expire', 'Expirés'], ['suspendu', 'Suspendus']]} valeur={filtre} surChanger={setFiltre} />
        </div>
        <div className="liste">
          {liste.map((c) => <LigneCommerce key={c.id} c={c} ouvrir={ouvrir} />)}
          {!liste.length && <p className="muet petit" style={{ padding: 16 }}>Aucun commerce.</p>}
        </div>
      </div>
    </>
  );
}

function VuePaiements({ commerces, ouvrir }) {
  const paiements = paiementsDe(commerces).sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <EnTeteAdmin surTitre={paiements.length + ' paiements'} titre="Paiements" />
      <div className="contenu" style={{ maxWidth: 900 }}>
        <div className="carte kpi" style={{ marginBottom: 14 }}><p className="petit muet">Total encaissé</p><p className="kpi-valeur">{parDevise(paiements)}</p></div>
        <div className="liste">
          {paiements.map((p) => (
            <button key={p.c.id + p.id} className="liste-item" onClick={() => ouvrir(p.c.id)}>
              <span className="grandit">
                <b className="bloc-texte tronque">{p.c.commerce.nom}</b>
                <span className="tres-petit muet">{formatDate(p.date)} · {p.mois} mois{p.note ? ' · ' + p.note : ''}</span>
              </span>
              <b className="chiffre">{formatPrix(p.montant, p.devise)}</b>
            </button>
          ))}
          {!paiements.length && <p className="muet petit" style={{ padding: 16 }}>Aucun paiement enregistré.</p>}
        </div>
      </div>
    </>
  );
}

function VueOffres() {
  const [offres, setOffres] = useState(() => JSON.parse(JSON.stringify(offresActuelles())));
  const maj = (i, x) => setOffres(offres.map((o, j) => (j === i ? { ...o, ...x } : o)));
  const enregistrer = () => {
    enregistrerAdmin({ ...chargerAdmin(), offres });
    alert('Offres enregistrées');
  };
  return (
    <>
      <EnTeteAdmin surTitre="Prix par mois et par devise" titre="Offres">
        <button className="btn" onClick={enregistrer}>Enregistrer</button>
      </EnTeteAdmin>
      <div className="contenu" style={{ maxWidth: 900 }}>
        <p className="astuce" style={{ marginBottom: 14 }}>Les prix indiqués sont des exemples : remplacez-les par vos tarifs. L’essai gratuit dure {DUREE_ESSAI_JOURS} jours.</p>
        {offres.map((o, i) => (
          <div key={o.id} className="carte pile" style={{ marginBottom: 14 }}>
            <div className="grille-2">
              <label className="champ"><span>Nom</span><input value={o.nom} onChange={(e) => maj(i, { nom: e.target.value })} /></label>
              <label className="champ"><span>Identifiant</span><input value={o.id} disabled /></label>
            </div>
            <label className="champ"><span>Description</span><input value={o.description} onChange={(e) => maj(i, { description: e.target.value })} /></label>
            {o.id !== 'essai' && (
              <div className="grille-3">
                {DEVISES.map((dev) => (
                  <label key={dev} className="champ"><span>{NOMS_DEVISES[dev]} / mois</span>
                    <ChampMontant valeur={o.prix?.[dev] ?? null} surChanger={(v) => maj(i, { prix: { ...o.prix, [dev]: v } })} />
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
        <button className="btn fantome" onClick={() => setOffres(JSON.parse(JSON.stringify(OFFRES_DEFAUT)))}>Revenir aux offres par défaut</button>
      </div>
    </>
  );
}

// ---------- Fiche d'un commerce : abonnement, paiements, suspension ----------
function FicheCommerce({ c, fermer, recharger }) {
  const offres = offresActuelles();
  const ab = c.commerce.abonnement || {};
  const dev = c.commerce.devise;
  const [offre, setOffre] = useState(ab.offre === 'essai' ? 'starter' : ab.offre || 'starter');
  const prixOffre = (id) => offres.find((o) => o.id === id)?.prix?.[dev] ?? 0;
  const [mois, setMois] = useState(1);
  const [montant, setMontant] = useState(prixOffre(offre));
  const [notes, setNotes] = useState(ab.notes || '');
  const pays = paysParId(c.commerce.pays);

  // Enregistre la modification de l'abonnement dans les données du commerce
  const majAbonnement = (changements, texte) => {
    const d = { ...c.d, commerce: { ...c.commerce, abonnement: { ...ab, ...changements } } };
    enregistrerCommerce(d);
    recharger();
    if (texte) alert(texte);
  };
  const enregistrerPaiement = () => {
    if (!(montant > 0)) return alert('Indiquez le montant reçu');
    const paiement = { id: genId('pa'), date: new Date().toISOString(), montant: Number(montant), devise: dev, mois: Number(mois), offre, note: '' };
    majAbonnement({
      offre,
      statut: 'actif',
      periodeFin: prolonger(ab.statut === 'actif' ? ab.periodeFin : null, mois * 30),
      paiements: [...(ab.paiements || []), paiement],
    }, 'Paiement enregistré : abonnement actif');
  };
  const telContact = c.gerantTelephone || c.commerce.telephone;
  const lienWhatsApp = telContact ? 'https://wa.me/' + numeroWhatsApp(telContact, c.commerce.pays) : null;

  return (
    <Feuille titre={c.commerce.nom} sousTitre={'Code ' + c.commerce.code + ' · ' + typeCommerce(c.commerce.type).nom} surFermer={fermer} pleine large
      avant={<ImageStockee reference={c.commerce.logo} className="mini-photo" alt="" secours={<span className="mini-emoji teinte-vert">{initiales(c.commerce.nom)}</span>} />}>
      <div className="grille-ecran deux">
        <div className="pile">
          <div className="carte pile">
            <h3>Informations</h3>
            <p className="petit"><b>Gérant :</b> {c.gerant}{c.gerantTelephone ? ' · ' + c.gerantTelephone : ''}</p>
            <p className="petit"><b>Pays :</b> {pays.nom} · {c.commerce.ville} · {symbole(dev)}</p>
            <p className="petit"><b>Téléphone :</b> {c.commerce.telephone || '—'}</p>
            <p className="petit"><b>Adresse :</b> {c.commerce.adresse || '—'}</p>
            <p className="petit"><b>Créé le :</b> {c.commerce.creeLe ? formatDate(c.commerce.creeLe) : '—'}</p>
            {lienWhatsApp && <a className="btn secondaire petit" href={lienWhatsApp} target="_blank" rel="noreferrer"><Icone nom="whatsapp" taille="sm" /> Contacter sur WhatsApp</a>}
          </div>
          <div className="carte">
            <h3>Utilisation (30 derniers jours)</h3>
            <div className="grille-2" style={{ marginTop: 12 }}>
              <div><p className="petit muet">Chiffre d’affaires</p><b>{formatPrix(c.ca30, dev)}</b></div>
              <div><p className="petit muet">Tickets</p><b>{c.tickets30}</b></div>
              <div><p className="petit muet">Produits</p><b>{c.nbProduits}</b></div>
              <div><p className="petit muet">Vendeurs actifs</p><b>{c.nbVendeurs}</b></div>
            </div>
            <p className="tres-petit muet" style={{ marginTop: 10 }}>Dernière activité : {c.derniereActivite ? formatDate(c.derniereActivite) : '—'}</p>
          </div>
          <div className="carte pile">
            <h3>Notes internes</h3>
            <label className="champ"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex : rappelé le 12/10, paiera en début de mois" /></label>
            <button className="btn secondaire petit" onClick={() => majAbonnement({ notes }, 'Notes enregistrées')}>Enregistrer les notes</button>
          </div>
        </div>

        <div className="pile">
          <div className="carte pile">
            <div className="ligne espace">
              <h3>Abonnement</h3>
              <span className={`badge ${CLASSE_STATUT[c.etat.statut]}`}>{LIBELLES_STATUT[c.etat.statut]}</span>
            </div>
            <p className="petit">
              Offre : <b>{offres.find((o) => o.id === ab.offre)?.nom || '—'}</b>
              {c.etat.fin && <> · {c.etat.statut === 'expire' ? 'terminé le ' : 'jusqu’au '}{formatDate(c.etat.fin)}{c.etat.joursRestants > 0 ? ' (' + c.etat.joursRestants + ' j)' : ''}</>}
            </p>
            {c.etat.statut !== 'suspendu' && (
              <div className="grille-2">
                <button className="btn secondaire petit" onClick={() => majAbonnement({ statut: ab.statut === 'actif' ? 'actif' : 'essai', essaiFin: prolonger(ab.essaiFin, 15) }, 'Essai prolongé de 15 jours')}>+15 jours d’essai</button>
                <button className="btn danger petit" onClick={() => confirm('Suspendre « ' + c.commerce.nom + ' » ? Personne ne pourra plus se connecter.') && majAbonnement({ statutAvantSuspension: ab.statut, statut: 'suspendu' }, 'Commerce suspendu')}>Suspendre</button>
              </div>
            )}
            {c.etat.statut === 'suspendu' && (
              <button className="btn bloc" onClick={() => majAbonnement({ statut: ab.statutAvantSuspension || 'actif' }, 'Commerce réactivé')}>Réactiver le commerce</button>
            )}
          </div>

          <div className="carte pile">
            <h3>Enregistrer un paiement</h3>
            <div className="grille-2">
              <label className="champ"><span>Offre</span>
                <select value={offre} onChange={(e) => { setOffre(e.target.value); setMontant(prixOffre(e.target.value) * mois); }}>
                  {offres.filter((o) => o.id !== 'essai').map((o) => <option key={o.id} value={o.id}>{o.nom} · {formatPrix(o.prix?.[dev] || 0, dev)}/mois</option>)}
                </select>
              </label>
              <label className="champ"><span>Durée</span>
                <select value={mois} onChange={(e) => { setMois(Number(e.target.value)); setMontant(prixOffre(offre) * Number(e.target.value)); }}>
                  {[1, 3, 6, 12].map((m) => <option key={m} value={m}>{m} mois</option>)}
                </select>
              </label>
            </div>
            <label className="champ"><span>Montant reçu ({symbole(dev)})</span><ChampMontant valeur={montant} surChanger={setMontant} /></label>
            <button className="btn bloc" onClick={enregistrerPaiement}><Icone nom="ok" /> Enregistrer le paiement</button>
            <p className="tres-petit muet">L’abonnement devient actif et l’échéance avance de {mois * 30} jours.</p>
          </div>

          <div className="carte">
            <h3>Historique des paiements</h3>
            {(ab.paiements || []).slice().reverse().map((p) => (
              <div key={p.id} className="ligne espace petit" style={{ marginTop: 10 }}>
                <span>{formatDate(p.date)} · {p.mois} mois{p.note ? ' · ' + p.note : ''}</span>
                <b className="chiffre">{formatPrix(p.montant, p.devise)}</b>
              </div>
            ))}
            {!(ab.paiements || []).length && <p className="muet petit" style={{ marginTop: 10 }}>Aucun paiement.</p>}
          </div>
        </div>
      </div>
      <p className="tres-petit muet centre" style={{ marginTop: 16 }}><Link href="/app/" className="lien">Ouvrir l’application</Link></p>
    </Feuille>
  );
}
