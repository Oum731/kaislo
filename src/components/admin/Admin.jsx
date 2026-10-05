'use client';
// ------------------------------------------------------------
// ESPACE AMORAC (/admin) : gestion de tous les commerces Kaislo, sur le serveur.
//  - tableau de bord : commerces, essais, abonnés, revenus, à relancer
//  - commerces : fiche, abonnement, paiements, suspension, numéro, notes
//  - messages : conversations avec les commerces
//  - paiements, tarifs (formules par métier, postes, fondateur), commerciaux, équipe Amorac
// Accès : comptes de l'équipe (e-mail + mot de passe), session de 8 heures.
// Rôles : « admin » (tout) ou « support » (consultation, notes et messages).
// ------------------------------------------------------------
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Chargement from '@/components/Chargement';
import Marque from '@/components/Marque';
import { API_ACTIVE, appelApi } from '@/lib/api';
import { etatAbonnement, LIBELLES_STATUT, DUREE_ESSAI_JOURS } from '@/lib/donnees/abonnement';
import { paysParId, typeCommerce, numeroWhatsApp } from '@/lib/donnees/modeles';
import { formatPrix, formatDate, formatHeure, symbole, NOMS_DEVISES, initiales } from '@/lib/utils/format';
import { Icone, Feuille, Puces, ChampMontant } from '@/components/ui';
import { prixAbonnement, prixCatalogue } from '@/lib/donnees/tarifs';
import { memoriserEspace, oublierEspace } from '@/lib/espace';
import VueCommerciaux from './Commerciaux';

const JOUR = 86400000;
const DEVISES = ['FCFA', 'MAD', 'EUR', 'USD', 'CAD', 'GNF'];
const CLASSE_STATUT = { essai: 'safran', actif: '', expire: 'rouge', suspendu: 'sombre' };
const MOYENS = ['Espèces', 'Wave', 'Orange Money', 'MTN MoMo', 'Moov Money', 'Carte bancaire', 'Virement'];
const CLE_SESSION = 'kaislo:admin-jeton';

// Jeton de la session gardé pour l'onglet seulement (fermé = déconnecté)
const lireJeton = () => { try { return sessionStorage.getItem(CLE_SESSION); } catch { return null; } };
const garderJeton = (j) => { try { j ? sessionStorage.setItem(CLE_SESSION, j) : sessionStorage.removeItem(CLE_SESSION); } catch { /* rien */ } };

export default function Admin() {
  const [etat, setEtat] = useState({ pret: false, admin: null, installe: true, jeton: null });
  useEffect(() => {
    if (!API_ACTIVE) return setEtat({ pret: true, admin: null, installe: true, jeton: null });
    (async () => {
      const jeton = lireJeton();
      if (jeton) {
        try {
          const rep = await appelApi('GET', '/admin/moi', null, jeton);
          memoriserEspace('admin');
          return setEtat({ pret: true, admin: rep.admin, installe: true, jeton });
        } catch { garderJeton(null); }
      }
      const rep = await appelApi('GET', '/admin/etat').catch(() => ({ installe: true }));
      setEtat({ pret: true, admin: null, installe: rep.installe, jeton: null });
    })();
  }, []);
  const connecte = (rep) => { garderJeton(rep.jeton); memoriserEspace('admin'); setEtat({ pret: true, admin: rep.admin, installe: true, jeton: rep.jeton }); };
  const deconnexion = () => {
    appelApi('POST', '/admin/deconnexion', null, etat.jeton).catch(() => {});
    garderJeton(null);
    oublierEspace('admin');
    setEtat({ pret: true, admin: null, installe: true, jeton: null });
  };

  if (!etat.pret) return <Chargement texte="Ouverture de l’espace Amorac…" />;
  if (!API_ACTIVE) return <Cadre><p className="astuce">L’espace Amorac fonctionne sur le serveur (version hébergée). Cette version de test n’a pas de serveur.</p></Cadre>;
  if (!etat.admin) return etat.installe ? <ConnexionAdmin surConnexion={connecte} /> : <InstallationAdmin surConnexion={connecte} />;
  return <TableauAdmin admin={etat.admin} jeton={etat.jeton} surDeconnexion={deconnexion} />;
}

function Cadre({ children }) {
  return (
    <div className="ecran-chargement" style={{ padding: 20 }}>
      <div className="carte pile" style={{ width: '100%', maxWidth: 440 }}>
        <span className="logo"><Marque /> Kaislo · Amorac</span>
        {children}
      </div>
    </div>
  );
}

function ConnexionAdmin({ surConnexion }) {
  const [f, setF] = useState({ email: '', motDePasse: '' });
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);
  const valider = async (e) => {
    e.preventDefault();
    setEnCours(true);
    try { surConnexion(await appelApi('POST', '/admin/connexion', f)); } catch (err) { setErreur(err.message); }
    setEnCours(false);
  };
  return (
    <Cadre>
      <h2>Espace équipe</h2>
      <p className="petit muet">Gestion des commerces, abonnements, messages et offres.</p>
      <form className="pile" onSubmit={valider}>
        <label className="champ"><span>E-mail</span><input type="email" autoComplete="username" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoFocus /></label>
        <label className="champ"><span>Mot de passe</span><input type="password" autoComplete="current-password" value={f.motDePasse} onChange={(e) => setF({ ...f, motDePasse: e.target.value })} /></label>
        {erreur && <p className="alerte">{erreur}</p>}
        <button className="btn bloc" disabled={enCours}>{enCours ? 'Connexion…' : 'Se connecter'}</button>
      </form>
    </Cadre>
  );
}

// Premier compte : protégé par la clé « CleAdmin » du fichier .env du serveur
function InstallationAdmin({ surConnexion }) {
  const [f, setF] = useState({ cle: '', nom: '', email: '', motDePasse: '' });
  const [erreur, setErreur] = useState('');
  const maj = (c) => (e) => setF({ ...f, [c]: e.target.value });
  const valider = async (e) => {
    e.preventDefault();
    try { surConnexion(await appelApi('POST', '/admin/installer', f)); } catch (err) { setErreur(err.message); }
  };
  return (
    <Cadre>
      <h2>Installer l’espace Amorac</h2>
      <p className="petit muet">Création du premier compte administrateur. La clé d’installation est la valeur « CleAdmin » du fichier .env du serveur.</p>
      <form className="pile" onSubmit={valider}>
        <label className="champ"><span>Clé d’installation</span><input type="password" value={f.cle} onChange={maj('cle')} autoFocus /></label>
        <label className="champ"><span>Votre nom</span><input value={f.nom} onChange={maj('nom')} /></label>
        <label className="champ"><span>E-mail</span><input type="email" autoComplete="username" value={f.email} onChange={maj('email')} /></label>
        <label className="champ"><span>Mot de passe (10 caractères, lettres et chiffres)</span><input type="password" autoComplete="new-password" value={f.motDePasse} onChange={maj('motDePasse')} /></label>
        {erreur && <p className="alerte">{erreur}</p>}
        <button className="btn bloc">Créer le compte</button>
      </form>
    </Cadre>
  );
}

function TableauAdmin({ admin, jeton, surDeconnexion }) {
  const [ecran, setEcran] = useState('tableau');
  const [donnees, setDonnees] = useState(null); // { commerces, formules, regles, fondateurs }
  const [ouvert, setOuvert] = useState(null);
  const [nonLus, setNonLus] = useState(0);
  const [plusOuvert, setPlusOuvert] = useState(false);
  const [commerciauxAttente, setCommerciauxAttente] = useState(0);
  const api = useCallback((m, c, corps) => appelApi(m, c, corps, jeton).catch((e) => { if (e.statut === 401) surDeconnexion(); throw e; }), [jeton, surDeconnexion]);
  const recharger = useCallback(async () => {
    const rep = await api('GET', '/admin/commerces');
    const commerces = rep.commerces.map((c) => ({ ...c, etat: etatAbonnement(c.commerce.abonnement) }));
    setDonnees({ commerces, formules: rep.formules, regles: rep.regles, fondateurs: rep.fondateurs });
    // Pastille « Messages » : messages des commerces non lus + messages des visiteurs non traités
    setNonLus(commerces.reduce((n, c) => n + c.messagesNonLus, 0) + (rep.contactsNonTraites || 0));
    setCommerciauxAttente(rep.commerciauxEnAttente || 0); // pastille « Commerciaux » : inscriptions à valider
  }, [api]);
  useEffect(() => { recharger(); const m = setInterval(recharger, 60000); return () => clearInterval(m); }, [recharger]);

  const estAdmin = admin.role === 'admin';
  const liens = [['tableau', 'Accueil', 'accueil'], ['commerces', 'Commerces', 'produits'], ['messages', 'Messages', 'whatsapp', nonLus || null], ['paiements', 'Paiements', 'ventes'],
    ...(estAdmin ? [['commerciaux', 'Commerciaux', 'hausse', commerciauxAttente || null], ['tarifs', 'Tarifs', 'remise'], ['equipe', 'Équipe', 'clients']] : [])];
  const fiche = donnees?.commerces.find((c) => c.id === ouvert);
  const ctx = { api, recharger, formules: donnees?.formules || [], regles: donnees?.regles || {}, fondateurs: donnees?.fondateurs || 0, estAdmin, ouvrir: setOuvert, admin };

  return (
    <div className="coque">
      <nav className="menu" aria-label="Menu Amorac">
        <div className="menu-marque"><span className="logo"><Marque /><span className="logo-texte">Amorac</span></span></div>
        <div className="menu-liens">
          {/* Téléphone : 4 onglets + « Plus » (Commerciaux, Tarifs, Équipe, Sortir) ; tablette et ordinateur : tous les liens */}
          {liens.map(([e, l, i, pastille], n) => (
            <button key={e} className={`menu-lien ${n >= 4 ? 'cache-mobile' : ''} ${ecran === e ? 'actif' : ''}`} onClick={() => { setEcran(e); setPlusOuvert(false); window.scrollTo(0, 0); }}>
              <Icone nom={i} /><span className="tronque">{l}</span>{pastille ? <span className="pastille-nb">{pastille}</span> : null}
            </button>
          ))}
          <button className={`menu-lien seulement-mobile ${plusOuvert || liens.findIndex(([e]) => e === ecran) >= 4 ? 'actif' : ''}`} onClick={() => setPlusOuvert(!plusOuvert)} aria-expanded={plusOuvert} aria-controls="menu-plus">
            <Icone nom="menu" /><span>Plus</span>{commerciauxAttente ? <span className="pastille-nb">{commerciauxAttente}</span> : null}
          </button>
        </div>
        {plusOuvert && (
          <div className="seulement-mobile">
            <div className="menu-plus-voile" onClick={() => setPlusOuvert(false)} aria-hidden="true" />
            <div className="menu-plus" id="menu-plus">
              {liens.slice(4).map(([e, l, i, p]) => (
                <button key={e} className={`menu-plus-lien ${ecran === e ? 'actif' : ''}`} onClick={() => { setEcran(e); setPlusOuvert(false); window.scrollTo(0, 0); }}><Icone nom={i} /><span>{l}</span>{p ? <span className="badge safran" style={{ marginLeft: 'auto' }}>{p}</span> : null}</button>
              ))}
              <button className="menu-plus-lien" onClick={surDeconnexion}><Icone nom="sortie" /><span>Sortir ({initiales(admin.nom)})</span></button>
            </div>
          </div>
        )}
        <div className="menu-pied">
          <button className="carte-utilisateur" onClick={surDeconnexion}>
            <span className="avatar gerant">{initiales(admin.nom)}</span>
            <span className="infos"><b className="bloc-texte tronque">{admin.nom}</b><span className="tres-petit" style={{ opacity: 0.65 }}>{admin.role === 'admin' ? 'Administrateur' : 'Support'} · se déconnecter</span></span>
          </button>
        </div>
      </nav>
      <main className="principal">
        {!donnees ? <Chargement plein={false} texte="Chargement des commerces…" /> : (
          <>
            {ecran === 'tableau' && <VueTableau commerces={donnees.commerces} ctx={ctx} />}
            {ecran === 'commerces' && <VueCommerces commerces={donnees.commerces} ctx={ctx} />}
            {ecran === 'messages' && <VueMessages ctx={ctx} />}
            {ecran === 'paiements' && <VuePaiements commerces={donnees.commerces} ctx={ctx} />}
            {ecran === 'tarifs' && <VueTarifs ctx={ctx} />}
            {ecran === 'commerciaux' && <VueCommerciaux ctx={ctx} EnTeteAdmin={EnTeteAdmin} />}
            {ecran === 'equipe' && <VueEquipe ctx={ctx} />}
          </>
        )}
      </main>
      {fiche && <FicheCommerce c={fiche} ctx={ctx} fermer={() => setOuvert(null)} />}
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

// Montants groupés par devise : « 45 000 FCFA · 120,00 € »
function parDevise(lignes) {
  const totaux = {};
  for (const { montant, devise } of lignes) totaux[devise] = (totaux[devise] || 0) + montant;
  return Object.entries(totaux).map(([dev, m]) => formatPrix(m, dev)).join(' · ') || '—';
}
const paiementsDe = (commerces) => commerces.flatMap((c) => (c.commerce.abonnement?.paiements || []).map((p) => ({ ...p, c })));

function VueTableau({ commerces, ctx }) {
  const compte = (statut) => commerces.filter((c) => c.etat.statut === statut).length;
  const debutMois = new Date();
  debutMois.setDate(1);
  debutMois.setHours(0, 0, 0, 0);
  const duMois = paiementsDe(commerces).filter((p) => new Date(p.date) >= debutMois);
  const actifsSemaine = commerces.filter((c) => c.derniereActivite && Date.now() - new Date(c.derniereActivite) < 7 * JOUR).length;
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
        <div className="kpis">
          <div className="carte kpi"><p className="petit muet">Commerces</p><p className="kpi-valeur">{commerces.length}</p><p className="sous">{actifsSemaine} actifs cette semaine</p></div>
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
              {aRelancer.map((c) => <LigneCommerce key={c.id} c={c} ctx={ctx} />)}
              {!aRelancer.length && <p className="muet petit" style={{ padding: 16 }}>Personne à relancer pour le moment.</p>}
            </div>
          </div>
          <div className="pile">
            <Repartition titre="Par pays" lignes={repartition((c) => paysParId(c.commerce.pays).nom)} total={commerces.length} />
            <Repartition titre="Par activité" lignes={repartition((c) => typeCommerce(c.commerce.type).nom)} total={commerces.length} />
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
            <div className="jauge"><div style={{ width: (n / Math.max(total, 1)) * 100 + '%' }} /></div>
          </div>
        ))}
        {!lignes.length && <p className="muet petit">Aucun commerce pour le moment.</p>}
      </div>
    </div>
  );
}

function LigneCommerce({ c, ctx }) {
  return (
    <button className="liste-item" onClick={() => ctx.ouvrir(c.id)}>
      <span className="mini-emoji teinte-vert">{initiales(c.commerce.nom)}</span>
      <span className="grandit">
        <b className="bloc-texte tronque">{c.commerce.nom}{c.messagesNonLus ? <span className="badge safran" style={{ marginLeft: 6 }}>{c.messagesNonLus} message(s)</span> : null}</b>
        <span className="tres-petit muet tronque bloc-texte">{paysParId(c.commerce.pays).nom} · {c.commerce.ville} · {c.gerant} · {c.commerce.telephone}</span>
      </span>
      <span style={{ textAlign: 'right' }}>
        <span className={`badge ${CLASSE_STATUT[c.etat.statut]}`}>{LIBELLES_STATUT[c.etat.statut]}{c.etat.statut === 'actif' ? ' · ' + c.tarif.nom : ''}</span>
        {c.etat.joursRestants !== null && c.etat.joursRestants > 0 && <span className="tres-petit muet bloc-texte">{c.etat.joursRestants} j restants</span>}
      </span>
    </button>
  );
}

function VueCommerces({ commerces, ctx }) {
  const [filtre, setFiltre] = useState('tous');
  const [recherche, setRecherche] = useState('');
  const r = recherche.trim().toLowerCase();
  const chiffres = r.replace(/\D/g, '');
  const liste = commerces
    .filter((c) => (filtre === 'tous' || c.etat.statut === filtre) && (!r
      || [c.commerce.nom, c.commerce.ville, c.commerce.code, c.gerant].some((x) => (x || '').toLowerCase().includes(r))
      || (chiffres.length >= 4 && [c.commerce.telephone, c.gerantTelephone].some((x) => (x || '').replace(/\D/g, '').includes(chiffres)))))
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
          {liste.map((c) => <LigneCommerce key={c.id} c={c} ctx={ctx} />)}
          {!liste.length && <p className="muet petit" style={{ padding: 16 }}>Aucun commerce.</p>}
        </div>
      </div>
    </>
  );
}

function VuePaiements({ commerces, ctx }) {
  const paiements = paiementsDe(commerces).sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <EnTeteAdmin surTitre={paiements.length + ' paiements'} titre="Paiements" />
      <div className="contenu" style={{ maxWidth: 900 }}>
        <div className="carte kpi" style={{ marginBottom: 14 }}><p className="petit muet">Total encaissé</p><p className="kpi-valeur">{parDevise(paiements)}</p></div>
        <div className="liste">
          {paiements.map((p) => (
            <button key={p.id} className="liste-item" onClick={() => ctx.ouvrir(p.c.id)}>
              <span className="grandit">
                <b className="bloc-texte tronque">{p.c.commerce.nom}</b>
                <span className="tres-petit muet">{formatDate(p.date)} · {p.mois} mois · {p.moyen || '—'}{p.note ? ' · ' + p.note : ''} · par {p.creePar}</span>
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

// ---------- Messages : conversations avec les commerces ----------
function VueMessages({ ctx }) {
  const [onglet, setOnglet] = useState('commerces');
  const [conversations, setConversations] = useState(null);
  const [choisie, setChoisie] = useState(null);
  const charger = useCallback(async () => setConversations((await ctx.api('GET', '/admin/conversations')).conversations), [ctx]);
  useEffect(() => { charger(); const m = setInterval(charger, 20000); return () => clearInterval(m); }, [charger]);
  return (
    <>
      <EnTeteAdmin surTitre="Questions des commerces et des visiteurs" titre="Messages" />
      <div className="contenu" style={{ maxWidth: 1100 }}>
        <div style={{ marginBottom: 14 }}>
          <Puces options={[['commerces', 'Commerces inscrits'], ['visiteurs', 'Visiteurs du site']]} valeur={onglet} surChanger={setOnglet} />
        </div>
        {onglet === 'visiteurs' ? <MessagesVisiteurs ctx={ctx} /> : (
        <div className="grille-ecran deux">
          <div className="liste">
            {conversations?.map((c) => (
              <button key={c.commerceId} className={`liste-item ${choisie === c.commerceId ? 'actif' : ''}`} onClick={() => setChoisie(c.commerceId)}>
                <span className="mini-emoji teinte-vert">{initiales(c.nom)}</span>
                <span className="grandit">
                  <b className="bloc-texte tronque">{c.nom}</b>
                  <span className="tres-petit muet tronque bloc-texte">{c.dernier.auteur === 'amorac' ? 'Vous : ' : ''}{c.dernier.texte}</span>
                </span>
                <span style={{ textAlign: 'right' }}>
                  {c.nonLus > 0 && <span className="badge safran">{c.nonLus}</span>}
                  <span className="tres-petit muet bloc-texte">{formatDate(c.dernier.le)}</span>
                </span>
              </button>
            ))}
            {conversations?.length === 0 && <p className="muet petit" style={{ padding: 16 }}>Aucun message pour le moment.</p>}
            {!conversations && <p className="muet petit" style={{ padding: 16 }}>Chargement…</p>}
          </div>
          {choisie ? <Conversation commerceId={choisie} ctx={ctx} surEnvoi={charger} /> : <p className="astuce">Choisissez une conversation.</p>}
        </div>
        )}
      </div>
    </>
  );
}

// Messages laissés par les visiteurs (bulle du site) : réponse par WhatsApp ou e-mail
function MessagesVisiteurs({ ctx }) {
  const [contacts, setContacts] = useState(null);
  const charger = useCallback(async () => setContacts((await ctx.api('GET', '/admin/contacts')).contacts), [ctx]);
  useEffect(() => { charger(); }, [charger]);
  const marquer = async (id, action) => { await ctx.api('POST', '/admin/contact', { id, action }); await charger(); ctx.recharger(); };
  const lienReponse = (c) => {
    const texte = 'Bonjour ' + c.nom + ', merci pour votre message sur Kaislo. ';
    if (c.contact.includes('@')) return 'mailto:' + c.contact + '?subject=' + encodeURIComponent('Kaislo — votre question') + '&body=' + encodeURIComponent(texte);
    return 'https://wa.me/' + c.contact.replace(/\D/g, '').replace(/^00/, '') + '?text=' + encodeURIComponent(texte);
  };
  if (!contacts) return <p className="muet petit">Chargement…</p>;
  return (
    <div className="pile">
      {!contacts.length && <p className="astuce">Aucun message de visiteur pour le moment.</p>}
      {contacts.map((c) => (
        <div key={c.id} className={'carte pile' + (c.traiteLe ? ' inactif' : '')}>
          <div className="ligne espace">
            <b>{c.nom} <span className="muet petit">· {c.contact}</span></b>
            <span className="tres-petit muet">{formatDate(c.le)} {formatHeure(c.le)}{c.page ? ' · page ' + c.page : ''}</span>
          </div>
          <p className="petit" style={{ whiteSpace: 'pre-wrap' }}>{c.texte}</p>
          <div className="ligne" style={{ flexWrap: 'wrap' }}>
            <a className="btn secondaire petit" href={lienReponse(c)} target="_blank" rel="noreferrer"><Icone nom={c.contact.includes('@') ? 'carnet' : 'whatsapp'} taille="sm" /> Répondre {c.contact.includes('@') ? 'par e-mail' : 'sur WhatsApp'}</a>
            {c.traiteLe
              ? <><span className="tres-petit muet">Traité le {formatDate(c.traiteLe)} par {c.traitePar}</span><button className="lien" onClick={() => marquer(c.id, 'rouvrir')}>Rouvrir</button></>
              : <button className="btn petit" onClick={() => marquer(c.id, 'traiter')}><Icone nom="ok" taille="sm" /> Marquer comme traité</button>}
          </div>
        </div>
      ))}
    </div>
  );
}

function Conversation({ commerceId, ctx, surEnvoi }) {
  const [messages, setMessages] = useState(null);
  const [texte, setTexte] = useState('');
  const [erreur, setErreur] = useState('');
  useEffect(() => {
    let actif = true;
    const lire = () => ctx.api('GET', '/admin/messages?commerce=' + encodeURIComponent(commerceId)).then((r) => actif && setMessages(r.messages)).catch(() => {});
    lire();
    const m = setInterval(lire, 15000);
    return () => { actif = false; clearInterval(m); };
  }, [commerceId, ctx]);
  const envoyer = async () => {
    if (!texte.trim()) return;
    try {
      const r = await ctx.api('POST', '/admin/messages', { commerceId, texte: texte.trim() });
      setMessages(r.messages);
      setTexte('');
      surEnvoi();
    } catch (e) { setErreur(e.message); }
  };
  return (
    <div className="carte messagerie">
      <div className="ligne espace" style={{ padding: '10px 14px', borderBottom: '1px solid var(--bordure)' }}>
        <b>Conversation</b>
        <button className="lien" onClick={() => ctx.ouvrir(commerceId)}>Fiche du commerce</button>
      </div>
      <div className="fil-messages">
        {messages?.map((m) => (
          <div key={m.id} className={'bulle ' + (m.auteur === 'amorac' ? 'moi' : 'equipe')}>
            <p>{m.texte}</p>
            <span className="tres-petit">{m.auteur === 'amorac' ? 'Équipe Kaislo' : m.auteurNom} · {formatDate(m.le)} {formatHeure(m.le)}</span>
          </div>
        ))}
      </div>
      {erreur && <p className="alerte" style={{ margin: '0 14px 10px' }}>{erreur}</p>}
      <div className="saisie-message">
        <textarea value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Votre réponse…" rows={2} onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) envoyer(); }} />
        <button className="btn" onClick={envoyer} disabled={!texte.trim()}>Répondre</button>
      </div>
    </div>
  );
}

// ---------- Tarifs : formules par métier, poste supplémentaire, règles communes ----------
function VueTarifs({ ctx }) {
  const [formules, setFormules] = useState(() => JSON.parse(JSON.stringify(ctx.formules)));
  const [regles, setRegles] = useState(() => ({ ...ctx.regles }));
  const [message, setMessage] = useState(null);
  const maj = (i, x) => setFormules(formules.map((f, j) => (j === i ? { ...f, ...x } : f)));
  const enregistrer = async () => {
    try {
      await ctx.api('POST', '/admin/tarifs', { formules, regles });
      await ctx.recharger();
      setMessage({ ok: true, texte: 'Tarifs enregistrés' });
    } catch (e) { setMessage({ ok: false, texte: e.message }); }
  };
  return (
    <>
      <EnTeteAdmin surTitre="Prix par mois, 1 poste et 5 vendeurs inclus" titre="Tarifs">
        <button className="btn" onClick={enregistrer}>Enregistrer</button>
      </EnTeteAdmin>
      <div className="contenu" style={{ maxWidth: 960 }}>
        {message && <p className={message.ok ? 'info-verte' : 'alerte'} style={{ marginBottom: 14 }}>{message.texte}</p>}
        <div className="carte pile" style={{ marginBottom: 14 }}>
          <h3>Règles communes</h3>
          <div className="grille-3">
            <label className="champ"><span>Paiement annuel : mois offerts</span><input type="number" min="0" max="6" value={regles.moisOffertsAnnuel} onChange={(e) => setRegles({ ...regles, moisOffertsAnnuel: e.target.value })} /></label>
            <label className="champ"><span>Tarif fondateur : remise (%)</span><input type="number" min="0" max="90" value={regles.remiseFondateur} onChange={(e) => setRegles({ ...regles, remiseFondateur: e.target.value })} /></label>
            <label className="champ"><span>Places au tarif fondateur</span><input type="number" min="0" value={regles.placesFondateur} onChange={(e) => setRegles({ ...regles, placesFondateur: e.target.value })} /></label>
          </div>
          <p className="tres-petit muet">Tarif fondateur : {ctx.fondateurs}/{ctx.regles.placesFondateur} places attribuées (case à cocher dans la fiche de chaque commerce). Essai gratuit de {DUREE_ESSAI_JOURS} jours pour tous.</p>
          <h3 style={{ marginTop: 6 }}>Code parrain et prix catalogue</h3>
          <p className="petit muet">Les prix saisis ci-dessous sont ceux des clients inscrits <b>avec un code parrain</b> (vos tarifs actuels). Les nouveaux clients <b>sans code</b> paient le prix catalogue : prix ÷ (1 − remise), arrondi au pas supérieur. Le code donne ainsi une vraie remise sans baisser vos tarifs actuels.</p>
          <div className="grille-3">
            <label className="champ"><span>Remise du code parrain (%)</span><input type="number" min="0" max="40" value={regles.remiseParrain ?? 10} onChange={(e) => setRegles({ ...regles, remiseParrain: e.target.value })} /></label>
            <label className="champ"><span>Prix catalogue pour les nouveaux clients sans code</span>
              <select value={regles.catalogueActif === false ? 'non' : 'oui'} onChange={(e) => setRegles({ ...regles, catalogueActif: e.target.value === 'oui' })}><option value="oui">Oui</option><option value="non">Non (prix actuels pour tous)</option></select>
            </label>
            <label className="champ"><span>Catalogue pour les inscriptions à partir du</span><input type="date" value={regles.catalogueDepuis || ''} onChange={(e) => setRegles({ ...regles, catalogueDepuis: e.target.value })} /></label>
          </div>
          <p className="tres-petit muet">Les commerces déjà inscrits avant cette date gardent leur prix actuel. Si vous choisissez « Non », les clients avec code paient le même prix que les autres : le code ne donne alors aucune remise.</p>
        </div>
        {formules.map((f, i) => (
          <div key={f.id} className="carte pile" style={{ marginBottom: 14 }}>
            <div className="grille-2">
              <label className="champ"><span>Formule</span><input value={f.nom} onChange={(e) => maj(i, { nom: e.target.value })} /></label>
              <label className="champ"><span>Métiers</span><input value={f.types.map((x) => typeCommerce(x).nom).join(', ')} disabled /></label>
            </div>
            <p className="petit muet">Prix par mois (1 poste, 5 vendeurs + le gérant)</p>
            <div className="grille-3">
              {DEVISES.map((dev) => (
                <label key={dev} className="champ"><span>{NOMS_DEVISES[dev] || dev}</span>
                  <ChampMontant valeur={f.prix?.[dev] ?? null} surChanger={(v) => maj(i, { prix: { ...f.prix, [dev]: v } })} />
                </label>
              ))}
            </div>
            <p className="tres-petit muet">Prix catalogue (sans code parrain) : {DEVISES.map((dev) => formatPrix(prixCatalogue(Number(f.prix?.[dev]) || 0, dev, Number(regles.remiseParrain) || 0), dev)).join(' · ')}</p>
            <p className="petit muet">Poste supplémentaire, par mois</p>
            <div className="grille-3">
              {DEVISES.map((dev) => (
                <label key={dev} className="champ"><span>{NOMS_DEVISES[dev] || dev}</span>
                  <ChampMontant valeur={f.prixPoste?.[dev] ?? null} surChanger={(v) => maj(i, { prixPoste: { ...f.prixPoste, [dev]: v } })} />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ---------- Équipe Amorac : comptes et rôles ----------
function VueEquipe({ ctx }) {
  const [equipe, setEquipe] = useState(null);
  const [edition, setEdition] = useState(null);
  const [erreur, setErreur] = useState('');
  useEffect(() => { ctx.api('GET', '/admin/equipe').then((r) => setEquipe(r.equipe)).catch((e) => setErreur(e.message)); }, [ctx]);
  const enregistrer = async () => {
    try {
      const r = await ctx.api('POST', '/admin/equipe', edition);
      setEquipe(r.equipe);
      setEdition(null);
      setErreur('');
    } catch (e) { setErreur(e.message); }
  };
  return (
    <>
      <EnTeteAdmin surTitre="Comptes de l’espace Amorac" titre="Équipe">
        <button className="btn" onClick={() => setEdition({ nom: '', email: '', role: 'support', actif: true, motDePasse: '' })}><Icone nom="plus" /> Compte</button>
      </EnTeteAdmin>
      <div className="contenu" style={{ maxWidth: 800 }}>
        <p className="astuce" style={{ marginBottom: 14 }}><b>Administrateur</b> : tout (abonnements, paiements, offres, équipe). <b>Support</b> : consultation, notes et messages.</p>
        <div className="liste">
          {equipe?.map((a) => (
            <button key={a.id} className={`liste-item ${a.actif ? '' : 'inactif'}`} onClick={() => setEdition({ ...a, motDePasse: '' })}>
              <span className="avatar gerant">{initiales(a.nom)}</span>
              <span className="grandit">
                <b className="bloc-texte">{a.nom} {a.id === ctx.admin.id ? <span className="badge">vous</span> : null}</b>
                <span className="tres-petit muet">{a.email} · dernière connexion {a.vuLe ? formatDate(a.vuLe) : '—'}</span>
              </span>
              <span className={`badge ${a.role === 'admin' ? 'safran' : 'gris'}`}>{a.role === 'admin' ? 'Administrateur' : 'Support'}{a.actif ? '' : ' · désactivé'}</span>
            </button>
          ))}
        </div>
        {erreur && !edition && <p className="alerte" style={{ marginTop: 12 }}>{erreur}</p>}
      </div>
      {edition && (
        <Feuille titre={edition.id ? edition.nom : 'Nouveau compte'} surFermer={() => setEdition(null)} pied={<button className="btn bloc" onClick={enregistrer}>Enregistrer</button>}>
          <div className="pile">
            <label className="champ"><span>Nom</span><input value={edition.nom} onChange={(e) => setEdition({ ...edition, nom: e.target.value })} /></label>
            <label className="champ"><span>E-mail</span><input type="email" value={edition.email} onChange={(e) => setEdition({ ...edition, email: e.target.value })} /></label>
            <label className="champ"><span>Rôle</span>
              <select value={edition.role} onChange={(e) => setEdition({ ...edition, role: e.target.value })}>
                <option value="support">Support</option><option value="admin">Administrateur</option>
              </select>
            </label>
            <label className="champ"><span>{edition.id ? 'Nouveau mot de passe (laisser vide pour le garder)' : 'Mot de passe (10 caractères, lettres et chiffres)'}</span>
              <input type="password" autoComplete="new-password" value={edition.motDePasse} onChange={(e) => setEdition({ ...edition, motDePasse: e.target.value })} />
            </label>
            {edition.id && <label className="case-accord"><input type="checkbox" checked={edition.actif} onChange={(e) => setEdition({ ...edition, actif: e.target.checked })} /><span>Compte actif</span></label>}
            {erreur && <p className="alerte">{erreur}</p>}
          </div>
        </Feuille>
      )}
    </>
  );
}

// ---------- Fiche d'un commerce : abonnement, paiements, suspension, numéro, équipe ----------
function FicheCommerce({ c, ctx, fermer }) {
  const ab = c.commerce.abonnement || {};
  const dev = c.commerce.devise;
  const [formule, setFormule] = useState(c.tarif.formule);
  const [postes, setPostes] = useState(c.tarif.postes);
  const [mois, setMois] = useState(1);
  // Montant proposé : formule + postes supplémentaires, 12 mois = mois offerts, remise fondateur
  const calcul = (f = formule, p = postes, m = mois) => prixAbonnement({ formule: ctx.formules.find((x) => x.id === f), devise: dev, postes: p, mois: m, fondateur: c.commerce.fondateur, regles: ctx.regles, mode: c.tarif.mode });
  const [montant, setMontant] = useState(calcul().total);
  const choisir = (x) => { const n = { formule, postes, mois, ...x }; if ('formule' in x) setFormule(x.formule); if ('postes' in x) setPostes(x.postes); if ('mois' in x) setMois(x.mois); setMontant(calcul(n.formule, n.postes, n.mois).total); };
  const [commerciaux, setCommerciaux] = useState(null);
  // Tarif fondateur coché ou décoché : le montant proposé est recalculé
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setMontant(calcul().total); }, [c.commerce.fondateur, c.tarif.mode]);
  const [moyen, setMoyen] = useState(MOYENS[0]);
  const [notes, setNotes] = useState(c.commerce.notes || '');
  const [telephone, setTelephone] = useState(c.commerce.telephone || '');
  const [detail, setDetail] = useState(null); // équipe et journal
  const [message, setMessage] = useState(null);
  const pays = paysParId(c.commerce.pays);
  useEffect(() => { ctx.api('GET', '/admin/commerce?id=' + encodeURIComponent(c.id)).then(setDetail).catch(() => {}); }, [c.id, ctx]);
  useEffect(() => { if (ctx.estAdmin) ctx.api('GET', '/admin/commerciaux').then((r) => setCommerciaux(r.commerciaux)).catch(() => {}); }, [ctx]);

  const action = async (corps, texte) => {
    try {
      await ctx.api('POST', '/admin/commerce', { id: c.id, ...corps });
      await ctx.recharger();
      setMessage({ ok: true, texte });
    } catch (e) { setMessage({ ok: false, texte: e.message }); }
  };
  const enregistrerPaiement = async () => {
    try {
      await ctx.api('POST', '/admin/paiement', { commerceId: c.id, formule, postes, mois, montant: Number(montant), moyen });
      await ctx.recharger();
      setMessage({ ok: true, texte: 'Paiement enregistré : abonnement actif' });
    } catch (e) { setMessage({ ok: false, texte: e.message }); }
  };
  const telContact = c.gerantTelephone || c.commerce.telephone;
  const lienWhatsApp = telContact ? 'https://wa.me/' + numeroWhatsApp(telContact, c.commerce.pays) : null;

  return (
    <Feuille titre={c.commerce.nom} sousTitre={'Code ' + c.commerce.code + ' · ' + typeCommerce(c.commerce.type).nom} surFermer={fermer} pleine large
      avant={<span className="mini-emoji teinte-vert">{initiales(c.commerce.nom)}</span>}>
      {message && <p className={message.ok ? 'info-verte' : 'alerte'} style={{ marginBottom: 14 }}>{message.texte}</p>}
      <div className="grille-ecran deux">
        <div className="pile">
          <div className="carte pile">
            <h3>Informations</h3>
            <p className="petit"><b>Gérant :</b> {c.gerant}{c.gerantTelephone ? ' · ' + c.gerantTelephone : ''}</p>
            <p className="petit"><b>Pays :</b> {pays.nom} · {c.commerce.ville} · {symbole(dev)}</p>
            <p className="petit"><b>Adresse :</b> {c.commerce.adresse || '—'}</p>
            <p className="petit"><b>Inscrit le :</b> {c.commerce.creeLe ? formatDate(c.commerce.creeLe) : '—'}</p>
            {lienWhatsApp && <a className="btn secondaire petit" href={lienWhatsApp} target="_blank" rel="noreferrer"><Icone nom="whatsapp" taille="sm" /> Contacter sur WhatsApp</a>}
          </div>
          <div className="carte pile">
            <h3>Numéro du commerce (identifiant)</h3>
            <div className="ligne">
              <input className="saisie grandit" value={telephone} onChange={(e) => setTelephone(e.target.value)} disabled={!ctx.estAdmin} />
              {ctx.estAdmin && <button className="btn secondaire petit" onClick={() => action({ action: 'telephone', telephone }, 'Numéro du commerce modifié')}>Modifier</button>}
            </div>
            <p className="tres-petit muet">Format du pays accepté ; le numéro doit être libre dans tout Kaislo.</p>
          </div>
          <div className="carte">
            <h3>Utilisation (30 derniers jours)</h3>
            <div className="grille-2" style={{ marginTop: 12 }}>
              <div><p className="petit muet">Chiffre d’affaires</p><b>{formatPrix(c.ca30, dev)}</b></div>
              <div><p className="petit muet">Tickets</p><b>{c.tickets30}</b></div>
              <div><p className="petit muet">Articles</p><b>{c.nbProduits}</b></div>
              <div><p className="petit muet">Vendeurs actifs</p><b>{c.nbVendeurs}</b></div>
            </div>
            <p className="tres-petit muet" style={{ marginTop: 10 }}>Dernière activité : {c.derniereActivite ? formatDate(c.derniereActivite) + ' ' + formatHeure(c.derniereActivite) : '—'}</p>
          </div>
          <div className="carte pile">
            <h3>Équipe du commerce</h3>
            {detail?.equipe.map((u) => (
              <p key={u.id} className="petit">{u.nom} · {u.role === 'gerant' ? 'Gérant' : 'Vendeur'} · {u.telephone}{u.actif ? '' : ' · désactivé'}</p>
            ))}
            {!detail && <p className="muet petit">Chargement…</p>}
          </div>
          <div className="carte pile">
            <h3>Notes internes</h3>
            <label className="champ"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex : rappelé le 12/10, paiera en début de mois" /></label>
            <button className="btn secondaire petit" onClick={() => action({ action: 'notes', notes }, 'Notes enregistrées')}>Enregistrer les notes</button>
          </div>
        </div>

        <div className="pile">
          <div className="carte pile">
            <div className="ligne espace">
              <h3>Abonnement</h3>
              <span className={`badge ${CLASSE_STATUT[c.etat.statut]}`}>{LIBELLES_STATUT[c.etat.statut]}</span>
            </div>
            <p className="petit">
              Formule : <b>{c.tarif.nom}</b> · {c.tarif.postes} poste(s) · <b>{formatPrix(c.tarif.parMois, dev)}</b>/mois{c.commerce.fondateur ? ' (fondateur)' : ''}
              {c.etat.fin && <> · {c.etat.statut === 'expire' ? 'terminé le ' : 'jusqu’au '}{formatDate(c.etat.fin)}{c.etat.joursRestants > 0 ? ' (' + c.etat.joursRestants + ' j)' : ''}</>}
            </p>
            {ctx.estAdmin && c.etat.statut !== 'suspendu' && (
              <div className="grille-2">
                <button className="btn secondaire petit" onClick={() => action({ action: 'prolonger-essai', jours: 15 }, 'Essai prolongé de 15 jours')}>+15 jours d’essai</button>
                <button className="btn danger petit" onClick={() => confirm('Suspendre « ' + c.commerce.nom + ' » ? Personne ne pourra plus se connecter.') && action({ action: 'suspendre' }, 'Commerce suspendu')}>Suspendre</button>
              </div>
            )}
            {ctx.estAdmin && (
              <label className="case-accord petit">
                <input type="checkbox" checked={!!c.commerce.fondateur} onChange={(e) => action({ action: 'fondateur', valeur: e.target.checked }, e.target.checked ? 'Tarif fondateur appliqué' : 'Tarif fondateur retiré')} />
                <span>Tarif fondateur (−{ctx.regles.remiseFondateur} % à vie · {ctx.fondateurs}/{ctx.regles.placesFondateur} places prises)</span>
              </label>
            )}
            {ctx.estAdmin && c.etat.statut === 'suspendu' && (
              <button className="btn bloc" onClick={() => action({ action: 'reactiver' }, 'Commerce réactivé')}>Réactiver le commerce</button>
            )}
          </div>

          {ctx.estAdmin && (
            <div className="carte pile">
              <h3>Enregistrer un paiement</h3>
              <label className="champ"><span>Formule</span>
                <select value={formule} onChange={(e) => choisir({ formule: e.target.value })}>
                  {ctx.formules.map((f) => <option key={f.id} value={f.id}>{f.nom} · {formatPrix(f.prix?.[dev] || 0, dev)}/mois</option>)}
                </select>
              </label>
              <div className="grille-2">
                <label className="champ"><span>Postes (1 inclus)</span><input type="number" min="1" max="50" value={postes} onChange={(e) => choisir({ postes: Math.max(1, Number(e.target.value) || 1) })} /></label>
                <label className="champ"><span>Durée</span>
                  <select value={mois} onChange={(e) => choisir({ mois: Number(e.target.value) })}>
                    {[1, 3, 6, 12].map((m) => <option key={m} value={m}>{m === 12 ? '12 mois (' + ctx.regles.moisOffertsAnnuel + ' offerts)' : m + ' mois'}</option>)}
                  </select>
                </label>
              </div>
              <p className="tres-petit muet">Prix calculé : {formatPrix(calcul().parMois, dev)}/mois{c.commerce.fondateur ? ' avec la remise fondateur' : ''}{c.tarif.mode === 'catalogue' ? ' (prix catalogue, sans code parrain)' : c.commerce.commercialId ? ' (avec code parrain)' : ''} → <b>{formatPrix(calcul().total, dev)}</b> pour {mois} mois. Saisissez le montant réellement reçu.</p>
              <div className="grille-2">
                <label className="champ"><span>Montant reçu ({symbole(dev)})</span><ChampMontant valeur={montant} surChanger={setMontant} /></label>
                <label className="champ"><span>Moyen de paiement</span>
                  <select value={moyen} onChange={(e) => setMoyen(e.target.value)}>{MOYENS.map((m) => <option key={m}>{m}</option>)}</select>
                </label>
              </div>
              <button className="btn bloc" onClick={enregistrerPaiement}><Icone nom="ok" /> Enregistrer le paiement</button>
              <p className="tres-petit muet">L’abonnement devient actif et l’échéance avance de {mois * 30} jours.</p>
            </div>
          )}

          {ctx.estAdmin && (
            <div className="carte pile">
              <h3>Commercial Kaislo</h3>
              <select value={c.commerce.commercialId || ''} onChange={(e) => action({ action: 'commercial', commercialId: e.target.value }, 'Commercial enregistré')} disabled={!commerciaux}>
                <option value="">Aucun (inscription directe)</option>
                {commerciaux?.map((x) => <option key={x.id} value={x.id}>{x.nom} · {x.code}</option>)}
              </select>
              <p className="tres-petit muet">Le commercial touche sa commission sur les premiers mois payés par ce commerce, après validation (Commerciaux → sa fiche).</p>
            </div>
          )}

          <div className="carte">
            <h3>Historique des paiements</h3>
            {(ab.paiements || []).slice().reverse().map((p) => (
              <div key={p.id} className="ligne espace petit" style={{ marginTop: 10 }}>
                <span>{formatDate(p.date)} · {p.mois} mois · {p.postes || 1} poste(s) · {p.moyen || '—'}</span>
                <b className="chiffre">{formatPrix(p.montant, p.devise)}</b>
              </div>
            ))}
            {!(ab.paiements || []).length && <p className="muet petit" style={{ marginTop: 10 }}>Aucun paiement.</p>}
          </div>

          <div className="carte">
            <h3>Journal</h3>
            {detail?.journal.slice(0, 12).map((j, i) => (
              <p key={i} className="tres-petit" style={{ marginTop: 6 }}><span className="muet">{formatDate(j.le)} {formatHeure(j.le)}</span> · {j.action.replace(/-/g, ' ')}{j.details?.par ? ' · ' + j.details.par : ''}</p>
            ))}
          </div>
        </div>
      </div>
      <p className="tres-petit muet centre" style={{ marginTop: 16 }}><Link href="/app/" className="lien">Ouvrir l’application</Link></p>
    </Feuille>
  );
}
