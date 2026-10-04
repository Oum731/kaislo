'use client';
// ------------------------------------------------------------
// ESPACE COMMERCIAL (/commercial/) : chaque commercial Kaislo voit
//  - son code parrain et son lien d'inscription à partager
//  - ses clients, leur ancienneté et le contrôle des 6 mois
//  - ses commissions (en attente, à payer, payées) et ses primes
// Connexion : pays + numéro de téléphone + code PIN à 6 chiffres (donné par l'équipe Amorac).
// ------------------------------------------------------------
import { useCallback, useEffect, useState } from 'react';
import Chargement from '@/components/Chargement';
import Marque from '@/components/Marque';
import { API_ACTIVE, appelApi } from '@/lib/api';
import { PAYS } from '@/lib/donnees/modeles';
import { SITE_URL, CONTACT_WHATSAPP } from '@/config';
import { Icone, ChampTelephone } from '@/components/ui';
import { CarteClient, totalDevises } from './Commerciaux';
import BulleChat from '@/components/BulleChat';

const CLE = 'kaislo:commercial-jeton';
const lireJeton = () => { try { return localStorage.getItem(CLE); } catch { return null; } };
const garderJeton = (j) => { try { j ? localStorage.setItem(CLE, j) : localStorage.removeItem(CLE); } catch { /* rien */ } };

export default function EspaceCommercial() {
  const [etat, setEtat] = useState({ pret: false, jeton: null, infos: null });
  const charger = useCallback(async (jeton) => {
    try {
      const infos = await appelApi('GET', '/commercial/moi', null, jeton);
      setEtat({ pret: true, jeton, infos });
    } catch (e) {
      if (e.statut === 401 || e.statut === 403) garderJeton(null);
      setEtat({ pret: true, jeton: null, infos: null });
    }
  }, []);
  useEffect(() => {
    const jeton = API_ACTIVE ? lireJeton() : null;
    if (jeton) charger(jeton);
    else setEtat({ pret: true, jeton: null, infos: null });
  }, [charger]);
  const sortir = () => {
    appelApi('POST', '/commercial/deconnexion', null, etat.jeton).catch(() => {});
    garderJeton(null);
    setEtat({ pret: true, jeton: null, infos: null });
  };

  if (!etat.pret) return <Chargement texte="Ouverture de votre espace…" />;
  if (!API_ACTIVE) return <Cadre><p className="astuce">L’espace commercial fonctionne sur le site hébergé (kaislo.com).</p></Cadre>;
  return (
    <>
      {etat.infos ? <Tableau infos={etat.infos} sortir={sortir} actualiser={() => charger(etat.jeton)} /> : <ConnexionCommercial surConnexion={(jeton) => { garderJeton(jeton); charger(jeton); }} />}
      <BulleChat />
    </>
  );
}

function Cadre({ children }) {
  return (
    <div className="ecran-chargement" style={{ padding: 20 }}>
      <div className="carte pile" style={{ width: '100%', maxWidth: 440 }}>
        <span className="logo"><Marque /> Kaislo · Commerciaux</span>
        {children}
      </div>
    </div>
  );
}

function ConnexionCommercial({ surConnexion }) {
  const [f, setF] = useState({ pays: 'CI', telephone: '', pin: '' });
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);
  const valider = async (e) => {
    e.preventDefault();
    setEnCours(true);
    try { surConnexion((await appelApi('POST', '/commercial/connexion', f)).jeton); } catch (err) { setErreur(err.message); }
    setEnCours(false);
  };
  return (
    <Cadre>
      <h2>Espace commercial</h2>
      <p className="petit muet">Vos clients, vos commissions et votre lien de parrainage.</p>
      <form className="pile" onSubmit={valider}>
        <label className="champ"><span>Pays du numéro</span>
          <select value={f.pays} onChange={(e) => setF({ ...f, pays: e.target.value })}>{PAYS.filter((p) => p.indicatif).map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}</select>
        </label>
        <ChampTelephone libelle="Votre numéro" pays={f.pays} valeur={f.telephone} surChanger={(v) => setF({ ...f, telephone: v })} autoFocus />
        <label className="champ"><span>Code PIN (6 chiffres)</span><input className="pin-saisie" type="password" inputMode="numeric" maxLength={6} value={f.pin} onChange={(e) => setF({ ...f, pin: e.target.value })} placeholder="••••••" /></label>
        {erreur && <p className="alerte">{erreur}</p>}
        <button className="btn bloc" disabled={enCours}>{enCours ? 'Connexion…' : 'Se connecter'}</button>
      </form>
      <p className="tres-petit muet">Pas encore commercial Kaislo ? <a className="lien" href={'https://wa.me/' + CONTACT_WHATSAPP + '?text=' + encodeURIComponent('Bonjour, je souhaite devenir commercial Kaislo.')} target="_blank" rel="noreferrer">Écrivez-nous sur WhatsApp</a>.</p>
    </Cadre>
  );
}

function Tableau({ infos, sortir, actualiser }) {
  const { commercial: c, clients, primes, programme } = infos;
  const [copie, setCopie] = useState(false);
  const lien = SITE_URL + '/app/?inscription=1&ref=' + c.code;
  const texteWhatsApp = 'Bonjour ! Je vous présente Kaislo : la caisse et la gestion de stock simples, sur téléphone. Essai gratuit de 30 jours : ' + lien;
  const copier = async () => { try { await navigator.clipboard.writeText(lien); setCopie(true); setTimeout(() => setCopie(false), 2000); } catch { /* rien */ } };
  const enEssai = clients.filter((x) => x.statut === 'essai').length;
  const abonnes = clients.filter((x) => x.statut === 'actif').length;

  return (
    <div className="site" style={{ minHeight: '100dvh', background: 'var(--fond)' }}>
      <header className="barre-haut" style={{ padding: '14px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--bordure)' }}>
        <div className="titres"><p className="sur-titre">Commercial Kaislo</p><h1>{c.nom}</h1></div>
        <div className="ligne">
          <button className="btn secondaire petit" onClick={actualiser}>Actualiser</button>
          <button className="btn fantome petit" onClick={sortir}><Icone nom="sortie" taille="sm" /> Sortir</button>
        </div>
      </header>
      <div className="contenu" style={{ maxWidth: 960, margin: '0 auto', paddingTop: 16 }}>
        <div className="carte pile">
          <p className="petit muet">Votre code parrain</p>
          <p style={{ fontSize: 30, fontWeight: 800, letterSpacing: 2 }}>{c.code}</p>
          <p className="tres-petit muet">Le commerçant le saisit à la création de son compte, ou s’inscrit directement avec votre lien :</p>
          <p className="petit" style={{ wordBreak: 'break-all' }}>{lien}</p>
          <div className="grille-2">
            <button className="btn secondaire" onClick={copier}><Icone nom={copie ? 'ok' : 'carnet'} /> {copie ? 'Lien copié' : 'Copier le lien'}</button>
            <a className="btn" href={'https://wa.me/?text=' + encodeURIComponent(texteWhatsApp)} target="_blank" rel="noreferrer"><Icone nom="whatsapp" /> WhatsApp</a>
          </div>
        </div>

        <div className="kpis" style={{ marginTop: 14 }}>
          <div className="carte kpi"><p className="petit muet">Clients</p><p className="kpi-valeur">{clients.length}</p><p className="sous">{enEssai} en essai · {abonnes} abonné(s)</p></div>
          <div className="carte kpi"><p className="petit muet">Validés</p><p className="kpi-valeur vert-texte">{c.clientsValides}</p><p className="sous">{programme.moisValidation} mois payés et utilisés</p></div>
          <div className="carte kpi"><p className="petit muet">En attente</p><p className="kpi-valeur petit" style={{ fontSize: 17 }}>{totalDevises(c.totaux.attente)}</p><p className="sous">avant validation</p></div>
          <div className="carte kpi"><p className="petit muet">À recevoir</p><p className="kpi-valeur petit vert-texte" style={{ fontSize: 17 }}>{totalDevises(c.totaux.a_payer)}</p><p className="sous">prochain versement</p></div>
          <div className="carte kpi"><p className="petit muet">Déjà reçu</p><p className="kpi-valeur petit" style={{ fontSize: 17 }}>{totalDevises(c.totaux.payee)}</p><p className="sous">depuis le début</p></div>
        </div>

        <div className="grille-ecran deux" style={{ marginTop: 14 }}>
          <div className="pile">
            <h3>Vos clients</h3>
            {clients.map((cl) => <CarteClient key={cl.id} cl={cl} />)}
            {!clients.length && <p className="astuce">Pas encore de client. Partagez votre lien : chaque commerce inscrit avec votre code apparaît ici.</p>}
          </div>
          <div className="pile">
            <div className="carte pile">
              <h3>Comment vous êtes payé</h3>
              <p className="petit">Vous touchez <b>{c.taux} %</b> de tout ce que paie chaque client pendant ses <b>{programme.dureeMois} premiers mois</b> (formule et postes supplémentaires compris).</p>
              <p className="petit">Au <b>{programme.moisValidation}e mois payé</b>, si le client a enregistré des ventes chaque semaine, vous recevez d’un coup les commissions des mois 1 à {programme.moisValidation}. Ensuite, chaque mois jusqu’au {programme.dureeMois}e.</p>
              <p className="petit muet">Si le client arrête avant {programme.moisValidation} mois, aucune commission n’est due.</p>
              <p className="tres-petit muet">Exemple : un restaurant à Abidjan avec 2 postes paie 12 000 + 4 000 = 16 000 FCFA par mois → {c.taux} % = {Math.round(16000 * c.taux / 100).toLocaleString('fr-FR')} FCFA par mois pour vous.</p>
            </div>
            <div className="carte pile">
              <h3>Primes</h3>
              {primes.map((p) => (
                <div key={p.clients} className="pile" style={{ gap: 4 }}>
                  <div className="ligne espace petit">
                    <span>{p.clients} clients validés{totalDevises(p.montant) !== '—' ? ' · ' + totalDevises(p.montant) : ''}</span>
                    {p.payeeLe ? <span className="badge gris">reçue</span> : p.atteint ? <span className="badge">atteint</span> : <span className="badge safran">{c.clientsValides}/{p.clients}</span>}
                  </div>
                  <div className="jauge"><div style={{ width: Math.min(100, (c.clientsValides / p.clients) * 100) + '%' }} /></div>
                </div>
              ))}
            </div>
            <ChangerPin />
          </div>
        </div>
      </div>
    </div>
  );
}

function ChangerPin() {
  const [f, setF] = useState({ ancien: '', nouveau: '' });
  const [message, setMessage] = useState(null);
  const valider = async (e) => {
    e.preventDefault();
    try {
      await appelApi('POST', '/commercial/pin', f, lireJeton());
      setF({ ancien: '', nouveau: '' });
      setMessage({ ok: true, texte: 'Code PIN changé' });
    } catch (err) { setMessage({ ok: false, texte: err.message }); }
  };
  return (
    <form className="carte pile" onSubmit={valider}>
      <h3>Changer mon code PIN</h3>
      <div className="grille-2">
        <label className="champ"><span>Code actuel</span><input className="pin-saisie" type="password" inputMode="numeric" maxLength={6} value={f.ancien} onChange={(e) => setF({ ...f, ancien: e.target.value })} /></label>
        <label className="champ"><span>Nouveau code</span><input className="pin-saisie" type="password" inputMode="numeric" maxLength={6} value={f.nouveau} onChange={(e) => setF({ ...f, nouveau: e.target.value })} /></label>
      </div>
      {message && <p className={message.ok ? 'info-verte' : 'alerte'}>{message.texte}</p>}
      <button className="btn secondaire">Changer</button>
    </form>
  );
}
