'use client';
// ------------------------------------------------------------
// ESPACE AMORAC (/admin) : gestion de tous les commerces Kaislo, sur le serveur.
//  - tableau de bord : commerces, essais, abonnés, revenus, à relancer
//  - commerces : fiche, abonnement, paiements, suspension, numéro, notes
//  - messages : conversations avec les commerces
//  - paiements, tarifs (formules par métier, postes, fondateur), commerciaux, équipe Kaislo
// Accès : comptes de l'équipe (e-mail + mot de passe), session de 8 heures.
// Rôles : « admin » (tout) ou « support » (consultation, notes et messages).
// ------------------------------------------------------------
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Chargement from '@/components/Chargement';
import Marque from '@/components/Marque';
import { API_ACTIVE, appelApi } from '@/lib/api';
import { etatAbonnement, LIBELLES_STATUT, DUREE_ESSAI_JOURS } from '@/lib/donnees/abonnement';
import { paysParId, typeCommerce, numeroWhatsApp, PAYS } from '@/lib/donnees/modeles';
import { formatPrix, formatDate, formatHeure, symbole, NOMS_DEVISES, initiales } from '@/lib/utils/format';
import { Icone, Feuille, Puces, ChampMontant } from '@/components/ui';
import { prixAbonnement, prixApresJoursOfferts, prixCatalogue, prixListeFormule, prixTouteDevise, TAUX_CHANGE } from '@/lib/donnees/tarifs';
import { ETAPES, etapeRelance, texteRelance, prenomDe } from '@/lib/donnees/relances';
import { memoriserEspace, oublierEspace, enregistrerServiceWorker, ADRESSE_SITE, voirLeSite } from '@/lib/espace';
import VueCommerciaux from './Commerciaux';
import { telechargerFacture } from '@/lib/export/telecharger-facture';
import { etatPush, activerPush, desactiverPush, iosNonInstalle } from '@/lib/push-client';
import { VueRetours, RetoursCommerce } from './Retours';

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
    enregistrerServiceWorker(); // installation sur l'écran d'accueil
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

  if (!etat.pret) return <Chargement texte="Ouverture de l’espace Kaislo…" />;
  if (!API_ACTIVE) return <Cadre><p className="astuce">L’espace Kaislo fonctionne sur le serveur (version hébergée). Cette version de test n’a pas de serveur.</p></Cadre>;
  if (!etat.admin) return etat.installe ? <ConnexionAdmin surConnexion={connecte} /> : <InstallationAdmin surConnexion={connecte} />;
  return <TableauAdmin admin={etat.admin} jeton={etat.jeton} surDeconnexion={deconnexion} />;
}

function Cadre({ children }) {
  return (
    <div className="ecran-chargement" style={{ padding: 20 }}>
      <div className="carte pile" style={{ width: '100%', maxWidth: 440 }}>
        <span className="logo"><Marque /> Kaislo Équipe</span>
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
      <h2>Installer l’espace Kaislo</h2>
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

// Bouton « retour » du téléphone dans l'espace Kaislo : referme la fiche ouverte, et ne quitte l'espace qu'au deuxième appui rapproché
function useRetourTelephone(ficheOuverte, fermerFiche, prevenir) {
  const etat = useRef({ fiche: false, ignorer: false, sortieLe: 0 });
  etat.current.fiche = ficheOuverte;
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!window.history.state?.admin) window.history.pushState({ admin: 'racine' }, '');
    const surRetour = (e) => {
      const r = etat.current;
      if (r.ignorer) { r.ignorer = false; return; }
      if (r.fiche) { fermerFiche(); return; }
      if (!e.state?.admin) {
        if (Date.now() - r.sortieLe < 2000) { r.sortieLe = 0; window.history.back(); return; }
        r.sortieLe = Date.now();
        window.history.pushState({ admin: 'racine' }, '');
        prevenir('Appuyez encore une fois sur retour pour quitter');
      }
    };
    window.addEventListener('popstate', surRetour);
    return () => window.removeEventListener('popstate', surRetour);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Une fiche ouverte ajoute une étape ; refermée autrement que par « retour », on retire cette étape
  useEffect(() => {
    if (ficheOuverte) { window.history.pushState({ admin: 'fiche' }, ''); return; }
    if (window.history.state?.admin === 'fiche') { etat.current.ignorer = true; window.history.back(); }
  }, [ficheOuverte]);
}

function TableauAdmin({ admin, jeton, surDeconnexion }) {
  const [ecran, setEcran] = useState('tableau');
  const [info, setInfo] = useState(null);
  const annoncer = useCallback((texte) => { setInfo(texte); setTimeout(() => setInfo(null), 3500); }, []);
  const [donnees, setDonnees] = useState(null); // { commerces, formules, regles, fondateurs }
  const [ouvert, setOuvert] = useState(null);
  const [nonLus, setNonLus] = useState(0);
  const [plusOuvert, setPlusOuvert] = useState(false);
  const [commerciauxAttente, setCommerciauxAttente] = useState(0);
  const [avisAttente, setAvisAttente] = useState(0);
  const api = useCallback((m, c, corps) => appelApi(m, c, corps, jeton).catch((e) => { if (e.statut === 401) surDeconnexion(); throw e; }), [jeton, surDeconnexion]);
  const alertes = useAlertesEquipe(api, jeton);
  const recharger = useCallback(async () => {
    const rep = await api('GET', '/admin/commerces');
    const commerces = rep.commerces.map((c) => ({ ...c, etat: etatAbonnement(c.commerce.abonnement) }));
    setDonnees({ commerces, formules: rep.formules, regles: rep.regles, fondateurs: rep.fondateurs });
    // Pastille « Messages » : messages des commerces non lus + messages des visiteurs non traités
    setNonLus(commerces.reduce((n, c) => n + c.messagesNonLus, 0) + (rep.contactsNonTraites || 0));
    setAvisAttente(rep.avisEnAttente || 0); // pastille « Avis » : avis à relire avant publication
    setCommerciauxAttente(rep.commerciauxEnAttente || 0); // pastille « Commerciaux » : inscriptions à valider
  }, [api]);
  useEffect(() => { recharger(); const m = setInterval(recharger, 60000); return () => clearInterval(m); }, [recharger]);

  const estAdmin = admin.role === 'admin';
  const liens = [['tableau', 'Accueil', 'accueil'], ['commerces', 'Commerces', 'produits'], ['messages', 'Messages', 'whatsapp', nonLus || null], ['paiements', 'Paiements', 'ventes'], ['avis', 'Avis', 'etoile', avisAttente || null], ['retours', 'Retours', 'whatsapp'],
    ...(estAdmin ? [['commerciaux', 'Commerciaux', 'hausse', commerciauxAttente || null], ['tarifs', 'Tarifs', 'remise'], ['equipe', 'Équipe', 'clients']] : [])];
  const fiche = donnees?.commerces.find((c) => c.id === ouvert);
  useRetourTelephone(!!fiche, () => setOuvert(null), annoncer);
  const ctx = { annoncer, api, recharger, formules: donnees?.formules || [], regles: donnees?.regles || {}, fondateurs: donnees?.fondateurs || 0, estAdmin, ouvrir: setOuvert, admin, allerA: setEcran, avisAttente, jeton, alertes };

  return (
    <div className="coque admin-espace">
      <nav className="menu" aria-label="Menu Kaislo">
        <div className="menu-marque"><span className="logo"><Marque /><span className="logo-texte">Kaislo</span></span></div>
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
              {alertes.etat?.abonne && <button className="menu-plus-lien" onClick={alertes.desactiver} disabled={alertes.enCours}><Icone nom="whatsapp" /><span>Désactiver les alertes</span></button>}
              <a className="menu-plus-lien" href={ADRESSE_SITE} onClick={voirLeSite}><Icone nom="lienExterne" /><span>Voir le site</span></a>
              <button className="menu-plus-lien" onClick={surDeconnexion}><Icone nom="sortie" /><span>Sortir ({initiales(admin.nom)})</span></button>
            </div>
          </div>
        )}
        <div className="menu-pied">
          <a className="menu-lien cache-mobile" href={ADRESSE_SITE} onClick={voirLeSite} style={{ textDecoration: 'none' }}><Icone nom="lienExterne" /><span className="tronque">Voir le site</span></a>
          {alertes.etat?.abonne && <button className="menu-lien cache-mobile" onClick={alertes.desactiver} disabled={alertes.enCours}><Icone nom="whatsapp" /><span className="tronque">Désactiver les alertes</span></button>}
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
            {ecran === 'avis' && <VueAvis ctx={ctx} />}
            {ecran === 'retours' && <VueRetours ctx={ctx} commerces={donnees.commerces} EnTeteAdmin={EnTeteAdmin} />}
            {ecran === 'tarifs' && <VueTarifs ctx={ctx} />}
            {ecran === 'commerciaux' && <VueCommerciaux ctx={ctx} EnTeteAdmin={EnTeteAdmin} />}
            {ecran === 'equipe' && <VueEquipe ctx={ctx} />}
          </>
        )}
      </main>
      {fiche && <FicheCommerce c={fiche} ctx={ctx} fermer={() => setOuvert(null)} />}
      {info && <div className="toast" role="status">{info}</div>}
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

// Alertes sur cet appareil : une notification à chaque nouveau commerce, message d'un commerce ou question d'un visiteur (voir api/lib/alertes-equipe.php)
// L'état est tenu par le tableau de bord : le cadre d'activation disparaît une fois les alertes activées ; « Désactiver » est dans le menu.
function useAlertesEquipe(api, jeton) {
  const [etat, setEtat] = useState(null); // { supporte, permission, abonne }
  const [serveur, setServeur] = useState(null); // { clePublique, appareils }
  const [message, setMessage] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const charger = useCallback(async () => {
    setEtat(await etatPush());
    api('GET', '/admin/push').then(setServeur).catch(() => setServeur(null));
  }, [api]);
  useEffect(() => { charger(); }, [charger]);
  const agir = async (activer) => {
    setEnCours(true); setMessage(null);
    try {
      if (activer) await activerPush(serveur?.clePublique, jeton, '/admin/push'); else await desactiverPush(jeton, '/admin/push');
      await charger();
    } catch (e) {
      setMessage(e.code === 'refuse' ? 'Notifications refusées : autorisez-les dans les réglages du navigateur pour ce site.' : 'Impossible de modifier les alertes sur cet appareil.');
    } finally { setEnCours(false); }
  };
  return { etat, serveur, message, enCours, activer: () => agir(true), desactiver: () => agir(false) };
}

// Cadre d'activation : visible seulement tant que les alertes ne sont pas activées sur cet appareil
function AlertesEquipe({ ctx }) {
  const { etat, serveur, message, enCours, activer } = ctx.alertes;
  if (!etat || etat.abonne) return null;
  const ios = iosNonInstalle();
  return (
    <div className="astuce ligne" style={{ marginTop: 16, flexWrap: 'wrap', gap: 10 }}>
      <span className="grandit">
        <b>Alertes sur ce téléphone</b>
        <span className="petit bloc-texte">Soyez prévenu à chaque nouveau commerce, paiement déclaré, message d’un commerce ou question d’un visiteur (en plus de l’e-mail).</span>
        {ios && <span className="tres-petit muet bloc-texte">Sur iPhone : ajoutez d’abord Kaislo Équipe à l’écran d’accueil (Partager → Sur l’écran d’accueil), puis ouvrez-le depuis l’icône.</span>}
        {!etat.supporte && <span className="tres-petit muet bloc-texte">Ce navigateur ne gère pas les notifications.</span>}
        {message && <span className="tres-petit bloc-texte" style={{ color: 'var(--rouge, #C8402F)' }}>{message}</span>}
      </span>
      {etat.supporte && !ios && <button className="btn petit" onClick={activer} disabled={enCours || !serveur?.clePublique}>Activer les alertes</button>}
    </div>
  );
}

function VueTableau({ commerces, ctx }) {
  const compte = (statut) => commerces.filter((c) => c.etat.statut === statut).length;
  const debutMois = new Date();
  debutMois.setDate(1);
  debutMois.setHours(0, 0, 0, 0);
  const duMois = paiementsDe(commerces).filter((p) => new Date(p.date) >= debutMois);
  const actifsSemaine = commerces.filter((c) => c.derniereActivite && Date.now() - new Date(c.derniereActivite) < 7 * JOUR).length;
  // Chaque commerce à relancer avec l'étape conseillée (bienvenue, pas démarré, fin d'essai…) : les essais qui se terminent d'abord
  const aRelancer = commerces
    .map((c) => ({ c, etape: etapeRelance(c) }))
    .filter((x) => x.etape)
    .sort((a, b) => (a.c.etat.joursRestants ?? 0) - (b.c.etat.joursRestants ?? 0));
  const repartition = (cle) => {
    const m = {};
    for (const c of commerces) m[cle(c)] = (m[cle(c)] || 0) + 1;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  };
  return (
    <>
      <EnTeteAdmin surTitre="Équipe Kaislo" titre="Tableau de bord" />
      <div className="contenu">
        <div className="kpis">
          <div className="carte kpi"><p className="petit muet">Commerces</p><p className="kpi-valeur">{commerces.length}</p><p className="sous">{actifsSemaine} actifs cette semaine</p></div>
          <div className="carte kpi"><p className="petit muet">Abonnés</p><p className="kpi-valeur vert-texte">{compte('actif')}</p><p className="sous">abonnement en cours</p></div>
          <div className="carte kpi"><p className="petit muet">En essai</p><p className="kpi-valeur" style={{ color: 'var(--safran-fonce)' }}>{compte('essai')}</p><p className="sous">{DUREE_ESSAI_JOURS} jours gratuits</p></div>
          <div className="carte kpi"><p className="petit muet">Expirés</p><p className="kpi-valeur rouge-texte">{compte('expire')}</p><p className="sous">à relancer</p></div>
          <div className="carte kpi"><p className="petit muet">Suspendus</p><p className="kpi-valeur">{compte('suspendu')}</p><p className="sous">accès bloqué</p></div>
          <div className="carte kpi"><p className="petit muet">Encaissé ce mois</p><p className="kpi-valeur petit" style={{ fontSize: 17 }}>{parDevise(duMois)}</p><p className="sous">{duMois.length} paiement(s)</p></div>
        </div>
        <AlertesEquipe ctx={ctx} />
        {ctx.avisAttente > 0 && (
          <div className="astuce ligne" style={{ marginTop: 16, flexWrap: 'wrap' }}>
            <span className="grandit"><b>{ctx.avisAttente} avis de commerçant{ctx.avisAttente > 1 ? 's' : ''} à relire</b> avant publication sur le site.</span>
            <button className="btn petit" onClick={() => { ctx.allerA('avis'); window.scrollTo(0, 0); }}>Relire les avis</button>
          </div>
        )}
        <div className="grille-ecran deux" style={{ marginTop: 16 }}>
          <div className="carte">
            <h3>À relancer</h3>
            <p className="tres-petit muet">Le bon message au bon moment : bienvenue, aide au démarrage, conseil, fin d’essai, essai terminé. WhatsApp s’ouvre avec le texte prêt à envoyer.</p>
            <div className="liste" style={{ marginTop: 12 }}>
              {aRelancer.map(({ c, etape }) => <LigneARelancer key={c.id} c={c} ctx={ctx} etape={etape} />)}
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

// Message de relance WhatsApp d'un commerce pour une étape donnée (texte modifiable avant l'envoi)
function messageRelance(c, code, equipe) {
  return texteRelance(code, {
    prenom: prenomDe(c.gerant), commerce: c.commerce.nom, equipe: prenomDe(equipe), joursRestants: c.etat.joursRestants ?? 0,
    prix: formatPrix(c.tarif.parMois, c.commerce.devise),
  });
}
const lienRelance = (c, texte) => {
  const tel = c.gerantTelephone || c.commerce.telephone;
  return tel ? 'https://wa.me/' + numeroWhatsApp(tel, c.commerce.pays) + '?text=' + encodeURIComponent(texte) : null;
};

// Carte « Relance WhatsApp » de la fiche : l'étape conseillée est choisie d'avance, le texte reste modifiable avant l'envoi
function RelanceFiche({ c, ctx }) {
  const conseillee = etapeRelance(c);
  const [etape, setEtape] = useState(conseillee || (c.etat.statut === 'actif' ? 'merci-avis' : 'conseil'));
  const [texte, setTexte] = useState(() => messageRelance(c, etape, ctx.admin.nom));
  const choisir = (code) => { setEtape(code); setTexte(messageRelance(c, code, ctx.admin.nom)); };
  const lien = lienRelance(c, texte);
  return (
    <div className="carte pile">
      <h3>Relance WhatsApp</h3>
      <p className="tres-petit muet">{conseillee ? `Étape conseillée maintenant : ${ETAPES[conseillee].titre}.` : 'Aucune relance urgente. Vous pouvez quand même écrire au commerçant.'}</p>
      <label className="champ"><span>Message</span>
        <select value={etape} onChange={(e) => choisir(e.target.value)}>
          {Object.entries(ETAPES).map(([code, e]) => <option key={code} value={code}>{e.titre}{code === conseillee ? ' (conseillé)' : ''}</option>)}
        </select>
      </label>
      <label className="champ"><textarea rows={7} style={{ minHeight: 170 }} value={texte} onChange={(e) => setTexte(e.target.value)} aria-label="Texte du message" /></label>
      {lien ? <a className="btn bloc" href={lien} target="_blank" rel="noreferrer"><Icone nom="whatsapp" /> Ouvrir WhatsApp avec ce message</a> : <p className="alerte">Aucun numéro de téléphone pour ce commerce.</p>}
    </div>
  );
}

// Ligne « à relancer » : le commerce, l'étape conseillée et un bouton qui ouvre WhatsApp avec le message prêt
function LigneARelancer({ c, ctx, etape }) {
  const lien = lienRelance(c, messageRelance(c, etape, ctx.admin.nom));
  return (
    <div>
      <LigneCommerce c={c} ctx={ctx} />
      <div className="ligne" style={{ gap: 8, flexWrap: 'wrap', padding: '0 14px 12px', alignItems: 'center' }}>
        <span className="badge safran">{ETAPES[etape].titre}</span>
        {lien && <a className="btn petit" href={lien} target="_blank" rel="noreferrer"><Icone nom="whatsapp" taille="sm" /> Relancer sur WhatsApp</a>}
      </div>
    </div>
  );
}

function LigneCommerce({ c, ctx }) {
  return (
    <button className="liste-item" onClick={() => ctx.ouvrir(c.id)}>
      <span className="mini-emoji teinte-vert">{initiales(c.commerce.nom)}</span>
      <span className="grandit" style={{ minWidth: 0 }}>
        <b className="bloc-texte" style={{ overflowWrap: 'anywhere' }}>{c.commerce.nom}</b>
        {(c.messagesNonLus > 0 || c.signaux?.length > 0 || c.autresCommerces?.length > 0) && (
          <span className="badges-ligne">
            {c.messagesNonLus ? <span className="badge safran">{c.messagesNonLus} message(s)</span> : null}
            {c.signaux?.length ? <span className="badge rouge" title={c.signaux[0].texte}>⚠ À vérifier</span> : null}
            {c.autresCommerces?.length ? <span className="badge">{c.autresCommerces.length + 1} commerces</span> : null}
          </span>
        )}
        <span className="tres-petit muet tronque bloc-texte">{paysParId(c.commerce.pays).nom} · {c.commerce.ville}{c.commerce.quartier ? ' (' + c.commerce.quartier + ')' : ''} · {c.gerant} · {c.commerce.telephone}</span>
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
    .filter((c) => (filtre === 'tous' || (filtre === 'verifier' ? c.signaux?.length > 0 : c.etat.statut === filtre)) && (!r
      || [c.commerce.nom, c.commerce.ville, c.commerce.quartier, c.commerce.code, c.gerant].some((x) => (x || '').toLowerCase().includes(r))
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
          <Puces options={[['tous', 'Tous'], ['essai', 'Essai'], ['actif', 'Actifs'], ['expire', 'Expirés'], ['suspendu', 'Suspendus'], ['verifier', '⚠ À vérifier']]} valeur={filtre} surChanger={setFiltre} enveloppe />
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

// ---------- Avis des gérants : relecture avant publication sur le site ----------
function VueAvis({ ctx }) {
  const [liste, setListe] = useState(null);
  const [filtre, setFiltre] = useState('attente');
  const [message, setMessage] = useState(null);
  const charger = useCallback(async () => setListe((await ctx.api('GET', '/admin/avis')).avis), [ctx]);
  useEffect(() => { charger(); }, [charger]);
  const agir = async (id, action) => {
    try { await ctx.api('POST', '/admin/avis', { id, action }); await charger(); await ctx.recharger(); setMessage(null); } catch (e) { setMessage(e.message); }
  };
  const nb = (st) => (liste || []).filter((a) => a.statut === st).length;
  const vus = (liste || []).filter((a) => filtre === 'tous' || a.statut === filtre);
  const LIBELLE = { attente: 'À relire', publie: 'Publié', refuse: 'Refusé' };
  return (
    <>
      <EnTeteAdmin surTitre="Avis des gérants sur Kaislo" titre="Avis" />
      <div className="contenu pile" style={{ maxWidth: 760 }}>
        <p className="petit muet">Seuls les avis que vous publiez ici apparaissent sur le site (prénom, initiale, ville, activité). Ne modifiez jamais le texte : publiez ou refusez.</p>
        {liste && <p className="petit"><b>{liste.length}</b> avis reçu{liste.length > 1 ? 's' : ''}{liste.length ? <> · note moyenne <b>{(liste.reduce((t, a) => t + a.note, 0) / liste.length).toFixed(1).replace('.', ',')} / 5</b></> : null}. Un avis arrive ici dès qu’un gérant l’envoie depuis l’application (Compte → Donner mon avis sur Kaislo) ; vous recevez aussi un e-mail.</p>}
        <Puces enveloppe options={[['attente', `À relire (${nb('attente')})`], ['publie', `Publiés (${nb('publie')})`], ['refuse', `Refusés (${nb('refuse')})`], ['tous', 'Tous']]} valeur={filtre} surChanger={setFiltre} />
        {message && <p className="alerte">{message}</p>}
        {!liste ? <p className="muet petit">Chargement…</p> : !vus.length ? <p className="muet petit">Aucun avis ici pour le moment.</p> : vus.map((a) => (
          <div key={a.id} className="carte pile">
            <div className="ligne espace" style={{ flexWrap: 'wrap', gap: 8 }}>
              <b>{'★'.repeat(a.note)}<span className="muet">{'★'.repeat(5 - a.note)}</span> <span className="petit muet">{a.note}/5</span></b>
              <span className={`badge ${a.statut === 'publie' ? '' : a.statut === 'refuse' ? 'rouge' : 'safran'}`}>{LIBELLE[a.statut]}</span>
            </div>
            <p style={{ overflowWrap: 'anywhere' }}>{a.texte}</p>
            <p className="tres-petit muet">{a.nom} · {typeCommerce(a.activite).nom} · {a.ville} · commerce : {a.commerce || '—'} · {a.le}{a.moderePar ? ' · vu par ' + a.moderePar : ''}</p>
            <div className="grille-2">
              {a.statut !== 'publie' && <button className="btn petit" onClick={() => agir(a.id, 'publier')}>Publier sur le site</button>}
              {a.statut !== 'refuse' && <button className="btn secondaire petit" onClick={() => agir(a.id, 'refuser')}>Refuser</button>}
              {a.statut !== 'attente' && <button className="btn secondaire petit" onClick={() => agir(a.id, 'attente')}>Remettre à relire</button>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ---------- Numéros de paiement mobile (Orange Money, Wave…) affichés aux gérants : Compte → Abonnement → Payer mon abonnement ----------
function MoyensMobiles({ ctx }) {
  const [moyens, setMoyens] = useState(null);
  const [operateurs, setOperateurs] = useState([]);
  const [message, setMessage] = useState(null);
  useEffect(() => { ctx.api('GET', '/admin/paiements-mobiles').then((r) => { setMoyens(r.moyens); setOperateurs(r.operateurs); }).catch((e) => setMessage({ ok: false, texte: e.message })); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const maj = (i, x) => setMoyens(moyens.map((m, j) => (j === i ? { ...m, ...x } : m)));
  const basculer = (i, id) => { const p = moyens[i].pays || []; maj(i, { pays: p.includes(id) ? p.filter((x) => x !== id) : [...p, id] }); };
  const enregistrer = async () => {
    try { const r = await ctx.api('POST', '/admin/paiements-mobiles', { moyens }); setMoyens(r.moyens); setMessage({ ok: true, texte: 'Numéros enregistrés' }); } catch (e) { setMessage({ ok: false, texte: e.message }); }
  };
  return (
    <div className="carte pile" style={{ marginBottom: 14 }}>
      <h3>Numéros de paiement mobile</h3>
      <p className="petit muet">Orange Money, Wave, MTN MoMo… Les gérants des commerces des pays cochés voient le numéro, le code QR et/ou le lien de paiement, leur prix dans leur devise et leur référence <b>KAISLO-code</b>, puis « J’ai payé » vous prévient par la messagerie (et par l’alerte sur votre téléphone). Quand l’argent arrive, enregistrez le paiement avec le moyen correspondant : la facture se crée toute seule.</p>
      {message && <p className={message.ok ? 'info-verte' : 'alerte'}>{message.texte}</p>}
      {(moyens || []).map((m, i) => (
        <div key={i} className="groupe-edition pile">
          <div className="grille-3">
            <label className="champ"><span>Opérateur</span><select value={m.operateur} onChange={(e) => maj(i, { operateur: e.target.value })}>{operateurs.map((o) => <option key={o}>{o}</option>)}</select></label>
            <label className="champ"><span>Numéro (avec l’indicatif)</span><input value={m.numero || ''} onChange={(e) => maj(i, { numero: e.target.value })} placeholder="+225 07 00 00 00 00" /></label>
            <label className="champ"><span>Au nom de (facultatif)</span><input value={m.titulaire || ''} onChange={(e) => maj(i, { titulaire: e.target.value })} maxLength={80} /></label>
          </div>
          <div className="ligne" style={{ gap: 10, flexWrap: 'wrap' }}>
            <span className="petit muet">Pays dont les commerces voient ce moyen (les autres ne voient que le virement) :</span>
            {PAYS.filter((p) => p.id !== 'XX').map((p) => <label key={p.id} className="ligne petit" style={{ gap: 4 }}><input type="checkbox" checked={(m.pays || []).includes(p.id)} onChange={() => basculer(i, p.id)} /> {p.nom}</label>)}
          </div>
          <label className="champ"><span>Code QR à scanner (nom du fichier rangé dans public/paiement/, ex. wave.png)</span><input value={m.qr || ''} onChange={(e) => maj(i, { qr: e.target.value })} maxLength={45} placeholder="wave.png" /></label>
          <label className="champ"><span>Lien de paiement Wave (facultatif ; le montant de la formule s’ajoute tout seul ; utile sur téléphone, où l’on ne peut pas scanner son propre écran)</span><input value={m.lien || ''} onChange={(e) => maj(i, { lien: e.target.value })} maxLength={300} placeholder="https://pay.wave.com/m/…/c/ci/" /></label>
          <label className="champ"><span>Note pour le client (facultatif)</span><input value={m.note || ''} onChange={(e) => maj(i, { note: e.target.value })} maxLength={200} placeholder="Ex : depuis un autre pays, vérifiez que votre opérateur permet l’envoi" /></label>
          <button className="btn secondaire petit" onClick={() => setMoyens(moyens.filter((_, j) => j !== i))}>Retirer ce numéro</button>
        </div>
      ))}
      <div className="grille-2">
        {moyens && moyens.length < 8 && <button className="btn secondaire" onClick={() => setMoyens([...moyens, { operateur: operateurs[0] || 'Orange Money', pays: ['CI'], numero: '', qr: '', lien: '', titulaire: '', note: '' }])}>+ Ajouter un numéro</button>}
        <button className="btn" onClick={enregistrer} disabled={!moyens}>Enregistrer les numéros</button>
      </div>
    </div>
  );
}

// ---------- Comptes bancaires pour les virements (affichés aux gérants : Compte → Abonnement → Payer par virement) ----------
const DEVISES_COMPTES = ['EUR', 'MAD', 'USD', 'CAD', 'FCFA', 'GNF'];
function ComptesVirement({ ctx }) {
  const [comptes, setComptes] = useState(null);
  const [message, setMessage] = useState(null);
  useEffect(() => { ctx.api('GET', '/admin/virement').then((r) => setComptes(r.comptes)).catch((e) => setMessage({ ok: false, texte: e.message })); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const maj = (i, x) => setComptes(comptes.map((c, j) => (j === i ? { ...c, ...x } : c)));
  const enregistrer = async () => {
    try {
      const r = await ctx.api('POST', '/admin/virement', { comptes });
      setComptes(r.comptes);
      setMessage({ ok: true, texte: 'Comptes enregistrés' });
    } catch (e) { setMessage({ ok: false, texte: e.message }); }
  };
  return (
    <div className="carte pile" style={{ marginBottom: 14 }}>
      <h3>Comptes bancaires pour les virements</h3>
      <p className="petit muet">Les gérants les voient dans l’application, avec le montant exact dans la devise du compte (euros : prix de la grille, avec leurs remises) et leur référence <b>KAISLO-code</b> à écrire dans le motif. Quand un virement arrive, enregistrez le paiement du commerce avec le moyen « Virement ».</p>
      {message && <p className={message.ok ? 'info-verte' : 'alerte'}>{message.texte}</p>}
      {(comptes || []).map((c, i) => (
        <div key={i} className="groupe-edition pile">
          <div className="grille-3">
            <label className="champ"><span>Devise du compte</span><select value={c.devise} onChange={(e) => maj(i, { devise: e.target.value })}>{DEVISES_COMPTES.map((d) => <option key={d}>{d}</option>)}</select></label>
            <label className="champ"><span>Bénéficiaire</span><input value={c.beneficiaire} onChange={(e) => maj(i, { beneficiaire: e.target.value })} placeholder="Nom sur le compte" /></label>
            <label className="champ"><span>Banque</span><input value={c.banque} onChange={(e) => maj(i, { banque: e.target.value })} /></label>
          </div>
          <div className="grille-2">
            <label className="champ"><span>IBAN ou RIB</span><input value={c.iban} onChange={(e) => maj(i, { iban: e.target.value })} /></label>
            <label className="champ"><span>BIC / SWIFT (facultatif)</span><input value={c.bic} onChange={(e) => maj(i, { bic: e.target.value })} /></label>
          </div>
          <label className="champ"><span>Note pour le client (facultatif)</span><input value={c.note} onChange={(e) => maj(i, { note: e.target.value })} maxLength={200} /></label>
          <button className="btn secondaire petit" onClick={() => setComptes(comptes.filter((_, j) => j !== i))}>Retirer ce compte</button>
        </div>
      ))}
      <div className="grille-2">
        {comptes && comptes.length < 6 && <button className="btn secondaire" onClick={() => setComptes([...comptes, { devise: 'EUR', beneficiaire: '', banque: '', iban: '', bic: '', note: '' }])}>+ Ajouter un compte</button>}
        <button className="btn" onClick={enregistrer} disabled={!comptes}>Enregistrer les comptes</button>
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
  const taux = { ...TAUX_CHANGE, ...(regles.taux || {}) };
  // Un prix modifié dans une devise recalcule toutes les autres (taux ci-dessous) : la grille reste cohérente
  const changerPrix = (i, champ, dev, v) => maj(i, { [champ]: v == null || v <= 0 ? { ...formules[i][champ], [dev]: v } : prixTouteDevise(v, dev, DEVISES, taux) });
  const recalculer = (dev) => {
    setFormules(formules.map((f) => ({ ...f, ...Object.fromEntries(['prix', 'prixPoste'].map((champ) => [champ, f[champ]?.[dev] > 0 ? prixTouteDevise(f[champ][dev], dev, DEVISES, taux) : f[champ]])) })));
    setMessage({ ok: true, texte: `Toutes les devises ont été recalculées depuis ${NOMS_DEVISES[dev] || dev}. Pensez à enregistrer.` });
  };
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
        <MoyensMobiles ctx={ctx} />
        <ComptesVirement ctx={ctx} />
        <div className="carte pile" style={{ marginBottom: 14 }}>
          <h3>Taux de change</h3>
          <p className="petit muet">Quand vous changez un prix dans une devise, toutes les autres sont recalculées avec ces taux (1 euro = …). Le FCFA est fixe. Montants arrondis : dirhams en …9, FCFA à 500, GNF à 5 000.</p>
          <div className="grille-3">
            {DEVISES.filter((d) => d !== 'EUR').map((dev) => (
              <label key={dev} className="champ"><span>1 € = … {NOMS_DEVISES[dev] || dev}</span>
                <input type="number" min="0" step="any" disabled={dev === 'FCFA'} value={taux[dev]} onChange={(e) => setRegles({ ...regles, taux: { ...taux, [dev]: Number(e.target.value) } })} />
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn secondaire" onClick={() => recalculer('FCFA')}>Recalculer tout depuis le FCFA</button>
            <button className="btn secondaire" onClick={() => recalculer('EUR')}>Recalculer tout depuis l’euro</button>
          </div>
        </div>
        <div className="carte pile" style={{ marginBottom: 14 }}>
          <h3>Règles communes</h3>
          <div className="grille-3">
            <label className="champ"><span>Paiement annuel : mois offerts</span><input type="number" min="0" max="6" value={regles.moisOffertsAnnuel} onChange={(e) => setRegles({ ...regles, moisOffertsAnnuel: e.target.value })} /></label>
            <label className="champ"><span>Tarif fondateur : remise (%)</span><input type="number" min="0" max="90" value={regles.remiseFondateur} onChange={(e) => setRegles({ ...regles, remiseFondateur: e.target.value })} /></label>
            <label className="champ"><span>Jours pour payer après « Activer l’abonnement »</span><input type="number" min="1" max="15" value={regles.joursActivationProvisoire ?? 5} onChange={(e) => setRegles({ ...regles, joursActivationProvisoire: e.target.value })} /></label>
            <label className="champ"><span>Places au tarif fondateur</span><input type="number" min="0" value={regles.placesFondateur} onChange={(e) => setRegles({ ...regles, placesFondateur: e.target.value })} /></label>
          </div>
          <p className="tres-petit muet">Tarif fondateur : {ctx.fondateurs}/{ctx.regles.placesFondateur} places attribuées (case à cocher dans la fiche de chaque commerce). Essai gratuit de {DUREE_ESSAI_JOURS} jours pour tous.</p>
          <h3 style={{ marginTop: 6 }}>Code parrain et prix catalogue</h3>
          <p className="petit muet">Les prix saisis ci-dessous sont ceux des clients inscrits <b>avec un code parrain</b> (vos tarifs actuels). Les nouveaux clients <b>sans code</b> paient le prix catalogue : prix ÷ (1 − remise), arrondi au pas supérieur. Le code donne ainsi une vraie remise sans baisser vos tarifs actuels.</p>
          <div className="grille-3">
            <label className="champ"><span>Remise du code parrain (%)</span><input type="number" min="0" max="40" value={regles.remiseParrain ?? 10} onChange={(e) => setRegles({ ...regles, remiseParrain: e.target.value })} /></label>
            <label className="champ"><span>Remise du 2e commerce et suivants d’un même gérant (%)</span><input type="number" min="0" max="40" value={regles.remiseMultiCommerce ?? 10} onChange={(e) => setRegles({ ...regles, remiseMultiCommerce: e.target.value })} /></label>
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
                  <ChampMontant valeur={f.prix?.[dev] ?? null} surChanger={(v) => changerPrix(i, 'prix', dev, v)} />
                </label>
              ))}
            </div>
            <p className="tres-petit muet">Prix catalogue (sans code parrain) : {DEVISES.map((dev) => formatPrix(prixCatalogue(Number(f.prix?.[dev]) || 0, dev, Number(regles.remiseParrain) || 0), dev)).join(' · ')}</p>
            <p className="petit muet">Poste supplémentaire, par mois</p>
            <div className="grille-3">
              {DEVISES.map((dev) => (
                <label key={dev} className="champ"><span>{NOMS_DEVISES[dev] || dev}</span>
                  <ChampMontant valeur={f.prixPoste?.[dev] ?? null} surChanger={(v) => changerPrix(i, 'prixPoste', dev, v)} />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ---------- Équipe Kaislo : comptes et rôles ----------
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
      <EnTeteAdmin surTitre="Comptes de l’espace Kaislo" titre="Équipe">
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

// Facture d'un paiement (créée toute seule à l'enregistrement du paiement) : télécharge le PDF ; un administrateur peut émettre un avoir
function BoutonFacture({ p, ctx, commerceId }) {
  const [enCours, setEnCours] = useState(false);
  const [avoir, setAvoir] = useState(false);
  if (!p.facture) return null; // paiement enregistré avant les factures : pas de facture
  const telecharger = async (numero, type) => {
    setEnCours(true);
    try {
      const rep = await ctx.api('GET', '/admin/factures?commerceId=' + encodeURIComponent(commerceId));
      const f = (type === 'avoir' ? rep.avoirs : rep.factures).find((x) => x.numero === numero);
      if (f) await telechargerFacture(f);
    } catch (e) { window.alert(e.message || 'Impossible de créer le PDF'); } finally { setEnCours(false); }
  };
  return (
    <>
      <button className="btn secondaire petit" onClick={() => telecharger(p.facture, 'facture')} disabled={enCours}>{'Facture ' + p.facture}</button>
      {(p.avoirs || []).map((a) => <button key={a.numero} className="btn secondaire petit" onClick={() => telecharger(a.numero, 'avoir')} disabled={enCours}>{'Avoir ' + a.numero + ' (' + formatPrix(a.totalTtc, p.devise) + ')'}</button>)}
      {ctx.estAdmin && <button className="btn secondaire petit" onClick={() => setAvoir(true)}>Faire un avoir</button>}
      {avoir && <FeuilleAvoir p={p} ctx={ctx} commerceId={commerceId} surFermer={() => setAvoir(false)} />}
    </>
  );
}

// Facture d'avoir : annule ou rembourse tout ou partie d'une facture (document comptable ; le remboursement et l'abonnement se règlent à part)
function FeuilleAvoir({ p, ctx, commerceId, surFermer }) {
  const [montant, setMontant] = useState('');
  const [motif, setMotif] = useState('');
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const emettre = async () => {
    setEnvoi(true); setErreur(null);
    try {
      const rep = await ctx.api('GET', '/admin/factures?commerceId=' + encodeURIComponent(commerceId));
      const facture = rep.factures.find((x) => x.numero === p.facture);
      const r = await ctx.api('POST', '/admin/avoir', { factureId: facture.id, montant: montant === '' ? null : Number(montant), motif });
      await ctx.recharger();
      await telechargerFacture(r.avoir);
      surFermer();
    } catch (e) { setErreur(e.message); setEnvoi(false); }
  };
  return (
    <Feuille titre={'Avoir sur la facture ' + p.facture} sousTitre={'Facture de ' + formatPrix(p.montant, p.devise)} surFermer={surFermer}
      pied={<button className="btn bloc" onClick={emettre} disabled={envoi || motif.trim().length < 3}>{envoi ? 'Création…' : 'Émettre l’avoir'}</button>}>
      <div className="pile">
        <label className="champ"><span>Montant TTC à créditer (vide = tout ce qui reste)</span><input type="number" inputMode="decimal" min="0" step="any" value={montant} onChange={(e) => setMontant(e.target.value)} placeholder={String(p.montant)} /></label>
        <label className="champ"><span>Motif</span><input value={motif} onChange={(e) => setMotif(e.target.value)} maxLength={200} placeholder="Ex : remboursement, erreur de montant, geste commercial" /></label>
        {erreur && <p className="alerte">{erreur}</p>}
        <p className="tres-petit muet">L’avoir est un document comptable : il prend le prochain numéro AV-… et ne se modifie plus. Il ne rembourse pas l’argent et ne change pas la date de fin d’abonnement : faites-le à part si besoin.</p>
      </div>
    </Feuille>
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
  const calcul = (f = formule, p = postes, m = mois) => {
    const prix = prixAbonnement({ formule: ctx.formules.find((x) => x.id === f), devise: dev, postes: p, mois: m, fondateur: c.commerce.fondateur, regles: ctx.regles, mode: c.tarif.mode });
    // Jours offerts (parrainage) : ils comptent dans le mois, le client ne paie que les jours restants
    const reste = prixApresJoursOfferts(prix.total, m, c.joursOfferts || 0, dev);
    return { ...prix, totalPlein: prix.total, total: reste.montant, joursOfferts: reste.deduits, joursPayes: reste.joursPayes };
  };
  // Équivalent en euros (virement en euros) : prix de la grille en euros, mêmes remises (hors jours offerts)
  const enEuros = (f = formule, p = postes, m = mois) => {
    const fo = ctx.formules.find((x) => x.id === f);
    if (dev === 'EUR' || !(fo?.prix?.EUR > 0)) return null;
    return prixAbonnement({ formule: fo, devise: 'EUR', postes: p, mois: m, fondateur: c.commerce.fondateur, regles: ctx.regles, mode: c.tarif.mode }).total;
  };
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
  const [catalogue, setCatalogue] = useState(false); // fenêtre « produits du commerce » (sans chiffres)
  const [groupe, setGroupe] = useState(false); // formulaire de paiement groupé
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
      ctx.annoncer('Paiement enregistré : abonnement actif');
      fermer();
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
            <p className="petit"><b>Pays :</b> {pays.nom} · {c.commerce.ville}{c.commerce.quartier ? ' · quartier ' + c.commerce.quartier : ''} · {symbole(dev)}</p>
            <p className="petit"><b>Adresse :</b> {c.commerce.adresse || '—'}</p>
            <p className="petit"><b>Inscrit le :</b> {c.commerce.creeLe ? formatDate(c.commerce.creeLe) : '—'}</p>
            {c.parrainCommerce && <p className="petit"><b>Parrainé par :</b> {c.parrainCommerce} <span className="muet">(jours offerts à son parrain au 1er paiement)</span></p>}
            {c.nbFilleuls > 0 && <p className="petit"><b>Commerces parrainés :</b> {c.nbFilleuls}</p>}
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
          <RelanceFiche c={c} ctx={ctx} />
          <RetoursCommerce c={c} ctx={ctx} />
          {c.signaux?.length > 0 && (
            <div className="carte pile" style={{ borderColor: 'var(--rouge, #C8402F)' }}>
              <h3>⚠ Activité à vérifier</h3>
              {c.signaux.map((x) => (
                <p key={x.code} className="petit"><b>{x.texte}</b><br />Formule probable : <b>{x.formuleSuggeree.nom}</b> (+{formatPrix(x.ecartParMois, x.devise)} par mois).</p>
              ))}
              <p className="tres-petit muet">Ce n’est qu’un signal : regardez les produits, puis posez la question au gérant. S’il a bien deux activités, proposez-lui un second commerce (remise de {ctx.regles.remiseMultiCommerce ?? 10} %) ou la formule adaptée.</p>
              <div className="grille-2">
                <button className="btn secondaire petit" onClick={() => setCatalogue(true)}>Voir les produits</button>
                {ctx.estAdmin && <button className="btn petit" onClick={() => { if (window.confirm('Passer « ' + c.commerce.nom + ' » à l’activité ' + c.signaux[0].formuleSuggeree.nom + ' ? Son tarif sera recalculé.')) action({ action: 'activite', formule: c.signaux[0].formuleSuggeree.id }, 'Activité mise à jour : ' + c.signaux[0].formuleSuggeree.nom); }}>Mettre à jour : {c.signaux[0].formuleSuggeree.nom}</button>}
                {ctx.estAdmin && <button className="btn secondaire petit" onClick={() => action({ action: 'signal-ignorer' }, 'Signal ignoré : le commerce reste tel quel')}>Ignorer, tout est normal</button>}
                {lienWhatsApp && <a className="btn secondaire petit" target="_blank" rel="noreferrer" href={lienWhatsApp + '?text=' + encodeURIComponent('Bonjour, nous avons remarqué que « ' + c.commerce.nom + ' » semble avoir une autre activité (' + c.signaux[0].formuleSuggeree.nom + '). Pouvons-nous en parler ? Vous pouvez créer un second commerce dans Kaislo (Mon compte → Mes commerces) avec 10 % de remise.')}><Icone nom="whatsapp" taille="sm" /> Écrire au gérant</a>}
              </div>
            </div>
          )}
          {c.autresCommerces?.length > 0 && (
            <div className="carte pile">
              <h3>Autres commerces du même gérant</h3>
              {c.autresCommerces.map((x) => (
                <button key={x.id} className="liste-item" onClick={() => ctx.ouvrir(x.id)}>
                  <span className="grandit" style={{ minWidth: 0, textAlign: 'left' }}><b>{x.nom}</b><span className="tres-petit muet bloc-texte">{typeCommerce(x.type).nom} · {x.tarif.nom} · {formatPrix(x.tarif.parMois, x.devise)}/mois</span></span>
                  <span className="badge">{x.statut}</span>
                </button>
              ))}
              {ctx.estAdmin && !groupe && <button className="btn secondaire petit" onClick={() => setGroupe(true)}>Enregistrer un paiement groupé</button>}
              {ctx.estAdmin && groupe && <PaiementGroupe c={c} ctx={ctx} fermer={() => setGroupe(false)} surMessage={setMessage} />}
            </div>
          )}
          <div className="carte">
            <h3>Utilisation (30 derniers jours)</h3>
            <div className="grille-2" style={{ marginTop: 12 }}>
              {c.ca30 !== null && c.ca30 !== undefined && <div><p className="petit muet">Chiffre d’affaires</p><b>{formatPrix(c.ca30, dev)}</b></div>}
              {c.tickets30 !== null && c.tickets30 !== undefined && <div><p className="petit muet">Tickets</p><b>{c.tickets30}</b></div>}
              <div><p className="petit muet">Articles</p><b>{c.nbProduits}</b></div>
              <div><p className="petit muet">Vendeurs actifs</p><b>{c.nbVendeurs}</b></div>
            </div>
            <p className="tres-petit muet" style={{ marginTop: 10 }}>Dernière activité : {c.derniereActivite ? formatDate(c.derniereActivite) + ' ' + formatHeure(c.derniereActivite) : '—'}</p>
            {c.ca30 === null && <p className="tres-petit muet">Les chiffres de vente sont réservés aux administrateurs.</p>}
            <button className="btn secondaire petit" onClick={() => setCatalogue(true)}>Voir les produits (sans chiffres)</button>
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
            {ab.provisoire && c.etat.statut !== 'suspendu' && <p className="astuce petit">Activation provisoire : {c.etat.statut === 'expire' ? 'délai passé sans paiement, fonctions limitées (rapports, exports, nouveaux articles et vendeurs, validation des commandes, boutique fermée).' : 'à payer avant le ' + formatDate(c.etat.fin) + '.'}</p>}
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
                  {ctx.formules.map((f) => <option key={f.id} value={f.id}>{f.nom} · {formatPrix(prixListeFormule(f, dev, { regles: ctx.regles, mode: c.tarif.mode }), dev)}/mois{c.tarif.mode === 'catalogue' ? ' (catalogue)' : ''}</option>)}
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
              {enEuros() !== null && <p className="tres-petit muet">Si le client paie par virement en euros : <b>{formatPrix(enEuros(), 'EUR')}</b> pour {mois} mois (prix de la grille en euros). Enregistrez quand même le paiement dans la devise du commerce ({dev}).</p>}
              {calcul().joursOfferts > 0 && <p className="tres-petit info-verte">{calcul().joursOfferts} jours offerts (parrainage) comptent dans le mois : le client paie seulement {calcul().joursPayes} jours sur {mois * 30} ({formatPrix(calcul().totalPlein, dev)} → {formatPrix(calcul().total, dev)}).</p>}
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
              <div key={p.id} className="ligne espace petit" style={{ marginTop: 10, gap: 8, flexWrap: 'wrap' }}>
                <span>{formatDate(p.date)} · {p.mois} mois · {p.postes || 1} poste(s) · {p.moyen || '—'}</span>
                <span className="ligne" style={{ gap: 8 }}>
                  <b className="chiffre">{formatPrix(p.montant, p.devise)}</b>
                  <BoutonFacture p={p} ctx={ctx} commerceId={c.id} />
                </span>
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
      {catalogue && <CatalogueCommerce c={c} ctx={ctx} fermer={() => setCatalogue(false)} />}
    </Feuille>
  );
}

// Produits d'un commerce vus par l'équipe : noms, catégories, unités et choix. Aucun prix, stock ni chiffre de vente.
function CatalogueCommerce({ c, ctx, fermer }) {
  const [rep, setRep] = useState(null);
  const [erreur, setErreur] = useState('');
  useEffect(() => { ctx.api('GET', '/admin/catalogue?commerceId=' + encodeURIComponent(c.id)).then(setRep).catch((e) => setErreur(e.message)); }, [c.id, ctx]);
  const parCategorie = {};
  for (const p of rep?.produits || []) (parCategorie[p.categorie || 'Sans catégorie'] ||= []).push(p);
  return (
    <Feuille titre={'Produits de ' + c.commerce.nom} sousTitre="Consultation sans chiffres : ni prix, ni stock, ni ventes" surFermer={fermer} large>
      {erreur && <p className="alerte">{erreur}</p>}
      {!rep && !erreur && <p className="muet petit">Chargement…</p>}
      {rep && (
        <div className="pile">
          <p className="tres-petit muet">{rep.produits.length} produit(s){rep.nbTables ? ' · ' + rep.nbTables + ' table(s)' : ''}. Cette consultation est notée dans le journal du commerce.</p>
          {Object.entries(parCategorie).map(([categorie, liste]) => (
            <div key={categorie} className="carte pile">
              <h3>{categorie}</h3>
              {liste.map((p, i) => (
                <p key={i} className="petit">
                  {p.emoji ? p.emoji + ' ' : ''}<b>{p.nom}</b> <span className="muet">· {p.unite}</span>
                  {p.groupes.map((g, j) => <span key={j} className="tres-petit muet bloc-texte">{g.nom}{g.obligatoire ? ' (obligatoire)' : ''} : {g.options.join(', ')}</span>)}
                </p>
              ))}
            </div>
          ))}
          {!rep.produits.length && <p className="muet petit">Aucun produit enregistré.</p>}
        </div>
      )}
    </Feuille>
  );
}

// Un seul paiement pour tous les commerces d'un même gérant : chaque commerce reçoit son propre paiement
function PaiementGroupe({ c, ctx, fermer, surMessage }) {
  const lignes = [{ id: c.id, nom: c.commerce.nom, devise: c.commerce.devise, tarif: c.tarif, joursOfferts: c.joursOfferts }, ...c.autresCommerces.filter((x) => x.devise === c.commerce.devise)];
  const [mois, setMois] = useState(1);
  const [moyen, setMoyen] = useState(MOYENS[0]);
  const [coches, setCoches] = useState(() => Object.fromEntries(lignes.map((l) => [l.id, true])));
  const calcul = (l) => prixApresJoursOfferts(prixAbonnement({ formule: ctx.formules.find((f) => f.id === l.tarif.formule), devise: l.devise, postes: l.tarif.postes, mois, fondateur: l.tarif.fondateur, regles: ctx.regles, mode: l.tarif.mode, multi: l.tarif.remiseMulti > 0 }).total, mois, l.joursOfferts, l.devise).montant;
  const [montants, setMontants] = useState({});
  const montantDe = (l) => (montants[l.id] ?? calcul(l));
  const choisies = lignes.filter((l) => coches[l.id]);
  const total = choisies.reduce((n, l) => n + Number(montantDe(l)), 0);
  const envoyer = async () => {
    try {
      const rep = await ctx.api('POST', '/admin/paiement-groupe', { lignes: choisies.map((l) => ({ commerceId: l.id, montant: Number(montantDe(l)), mois, postes: l.tarif.postes, formule: l.tarif.formule })), moyen });
      await ctx.recharger();
      surMessage({ ok: true, texte: 'Paiement groupé enregistré pour ' + rep.commerces.length + ' commerces' });
      fermer();
    } catch (e) { surMessage({ ok: false, texte: e.message }); }
  };
  return (
    <div className="pile">
      {lignes.map((l) => (
        <div key={l.id} className="ligne-paiement">
          <label className="case-accord petit"><input type="checkbox" checked={!!coches[l.id]} onChange={(e) => setCoches({ ...coches, [l.id]: e.target.checked })} /><span><b>{l.nom}</b><br />{l.tarif.nom}</span></label>
          <ChampMontant valeur={montantDe(l)} surChanger={(v) => setMontants({ ...montants, [l.id]: v })} />
        </div>
      ))}
      <div className="grille-2">
        <label className="champ"><span>Durée</span><select value={mois} onChange={(e) => { setMois(Number(e.target.value)); setMontants({}); }}>{[1, 3, 6, 12].map((m) => <option key={m} value={m}>{m === 12 ? '12 mois (' + ctx.regles.moisOffertsAnnuel + ' offerts)' : m + ' mois'}</option>)}</select></label>
        <label className="champ"><span>Moyen de paiement</span><select value={moyen} onChange={(e) => setMoyen(e.target.value)}>{MOYENS.map((m) => <option key={m}>{m}</option>)}</select></label>
      </div>
      <p className="petit"><b>Total reçu : {formatPrix(total, c.commerce.devise)}</b> pour {choisies.length} commerce(s)</p>
      <div className="grille-2">
        <button className="btn secondaire petit" onClick={fermer}>Annuler</button>
        <button className="btn petit" onClick={envoyer} disabled={choisies.length < 2}><Icone nom="ok" /> Enregistrer</button>
      </div>
      {c.autresCommerces.some((x) => x.devise !== c.commerce.devise) && <p className="tres-petit muet">Les commerces dans une autre devise sont à enregistrer séparément.</p>}
    </div>
  );
}
