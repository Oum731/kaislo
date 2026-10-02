'use client';
// ------------------------------------------------------------
// ACCUEIL DE L'APPLICATION :
//  - créer un commerce (inscription en 3 étapes)
//  - se connecter avec son NUMÉRO DE TÉLÉPHONE + CODE PIN
//  - essayer une démo
// Tous les champs fonctionnent au clavier (ordinateur ou téléphone) :
// Entrée valide, Tab passe au champ suivant.
// ------------------------------------------------------------
import { useState, useRef } from 'react';
import Link from 'next/link';
import { useKaisly } from '@/store/kaisly';
import { COMMERCES_DEMO } from '@/lib/donnees/demo';
import { telephoneDejaUtilise } from '@/lib/donnees/stockage';
import { TYPES_COMMERCE, PAYS, paysParId, paysDuNavigateur, cleTelephone } from '@/lib/donnees/modeles';
import { symbole, NOMS_DEVISES } from '@/lib/utils/format';
import { CONTACT_WHATSAPP } from '@/config';
import { Icone, Avatar, ImageStockee } from '@/components/ui';

export default function Connexion() {
  const s = useKaisly();
  const e = s.etapeConnexion;
  return (
    <div className="connexion">
      <PanneauVisuel />
      <div className="connexion-panneau">
        <div className="ligne espace">
          <Link href="/" className="logo"><span className="logo-marque">K</span> Kaisly</Link>
          {e !== 'accueil' && (e === 'inscription' || !s.d || s.estDemoActuel()) && (
            <button className="bouton-rond" onClick={s.retourConnexion} aria-label="Retour">
              <Icone nom="gauche" />
            </button>
          )}
        </div>
        {e === 'accueil' && <Accueil />}
        {e === 'inscription' && <Inscription />}
        {e === 'connexion' && <ConnexionTelephone />}
        {e === 'suspendu' && s.d && <CommerceSuspendu />}
      </div>
    </div>
  );
}

// Grand écran : panneau vert foncé avec un message
function PanneauVisuel() {
  return (
    <div className="connexion-visuel">
      <span className="cercle" style={{ width: 420, height: 420, right: -140, top: -120, background: 'rgba(233,162,59,.16)' }} />
      <span className="cercle" style={{ width: 260, height: 260, left: -90, bottom: -80, background: 'rgba(30,91,67,.6)' }} />
      <span className="logo" style={{ color: 'var(--creme)', position: 'relative' }}><span className="logo-marque">K</span> Kaisly</span>
      <div style={{ position: 'relative' }}>
        <h2>Encaissez plus vite. Comptez moins. Gagnez plus.</h2>
        <p style={{ opacity: 0.75, marginTop: 14, maxWidth: 420 }}>
          Ventes, tickets, carnet de crédit, tables, stock et marges : tout votre commerce dans votre poche.
        </p>
      </div>
      <p className="petit" style={{ opacity: 0.6, position: 'relative' }}>Une solution Amorac</p>
    </div>
  );
}

function Accueil() {
  const s = useKaisly();
  const pays = paysParId(s.prefs.paysDemo || 'MA');
  return (
    <div>
      <div className="intro">
        <h1>La caisse simple de votre commerce.</h1>
        <p>Restaurants, épiceries, boutiques, partout dans le monde : encaissez en quelques touches, imprimez le ticket, suivez vos ventes.</p>
      </div>
      <button className="btn grand bloc" onClick={() => useKaisly.setState({ etapeConnexion: 'connexion' })}>
        <Icone nom="sortie" /> Se connecter
      </button>
      <button className="btn secondaire bloc" style={{ marginTop: 10 }} onClick={() => useKaisly.setState({ etapeConnexion: 'inscription' })}>
        <Icone nom="plus" /> Créer mon commerce
      </button>
      <p className="tres-petit muet centre" style={{ marginTop: 8 }}>Essai gratuit de 30 jours · 2 minutes · sans engagement</p>

      <p className="section-titre">Essayer avec un commerce d’exemple</p>
      <label className="champ" style={{ marginBottom: 12 }}>
        <span>Pays de la démonstration (devise, ville, moyens de paiement)</span>
        <select value={pays.id} onChange={(e) => s.choisirPaysDemo(e.target.value)}>
          {PAYS.map((p) => <option key={p.id} value={p.id}>{p.nom} · {symbole(p.devise)}</option>)}
        </select>
      </label>
      {COMMERCES_DEMO.map((c) => (
        <button key={c.id} className="choix-carte" onClick={() => s.relierAppareil(c.id)}>
          <ImageStockee reference={c.logo} className="logo-commerce" alt="" secours={<span className="emoji-grand"><Icone nom="caisse" /></span>} />
          <span className="grandit">
            <h3>{c.nom}</h3>
            <span className="petit muet">{c.sousTitre}{pays.ville ? ' · ' + pays.ville : ''}</span>
          </span>
          <span className="badge safran">Démo</span>
        </button>
      ))}
      <p className="tres-petit muet centre" style={{ marginTop: 24 }}>
        Version de démonstration · les données restent sur cet appareil
      </p>
    </div>
  );
}

// Connexion : numéro de téléphone + code PIN (clavier du PC ou du téléphone)
function ConnexionTelephone() {
  const s = useKaisly();
  const recents = s.d ? s.comptesRecents() : [];
  const demo = s.d && COMMERCES_DEMO.find((c) => c.id === s.d.commerce.id);
  const [telephone, setTelephone] = useState(recents[0]?.telephone || '');
  const [pin, setPin] = useState('');
  const [erreur, setErreur] = useState('');
  const champPin = useRef(null);

  const valider = (tel = telephone, code = pin) => {
    const err = s.connecterParTelephone(tel, code);
    if (err) {
      setErreur(err);
      setPin('');
      champPin.current?.focus();
      navigator.vibrate?.(200);
    }
  };
  // Choisir un compte récent (ou un compte de démo) remplit le numéro
  const choisir = (tel) => {
    setTelephone(tel);
    setErreur('');
    setTimeout(() => champPin.current?.focus(), 0);
  };

  return (
    <div>
      <div className="intro">
        {s.d && (
          <div className="ligne" style={{ marginBottom: 10 }}>
            <ImageStockee reference={s.d.commerce.logo} className="logo-commerce" alt="" />
            <p className="petit muet">{s.d.commerce.nom}</p>
          </div>
        )}
        <h1>Connexion</h1>
        <p>Entrez votre numéro de téléphone et votre code PIN.</p>
      </div>

      <form className="pile" onSubmit={(e) => { e.preventDefault(); valider(); }}>
        <label className="champ"><span>Numéro de téléphone</span>
          <input
            type="tel" inputMode="tel" autoComplete="tel" placeholder="Ex : 06 12 34 56 78"
            value={telephone} onChange={(e) => { setTelephone(e.target.value); setErreur(''); }}
            autoFocus={!telephone}
            onKeyDown={(e) => e.key === 'Enter' && cleTelephone(telephone) && (e.preventDefault(), champPin.current?.focus())}
          />
        </label>
        <label className="champ"><span>Code PIN (4 chiffres)</span>
          <input
            ref={champPin} className="pin-saisie" type="password" inputMode="numeric" autoComplete="current-password"
            maxLength={4} placeholder="••••" value={pin} autoFocus={!!telephone}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 4);
              setPin(v);
              setErreur('');
              if (v.length === 4 && cleTelephone(telephone)) valider(telephone, v); // connexion dès le 4e chiffre
            }}
          />
        </label>
        {erreur && <p className="alerte">{erreur}</p>}
        <button type="submit" className="btn grand bloc">Se connecter</button>
      </form>

      {recents.length > 0 && !demo && (
        <>
          <p className="section-titre">Comptes récents sur cet appareil</p>
          <div className="puces" style={{ flexWrap: 'wrap' }}>
            {recents.map((r) => (
              <button key={r.nom} type="button" className={`puce ${cleTelephone(r.telephone) === cleTelephone(telephone) ? 'actif' : ''}`} onClick={() => choisir(r.telephone)}>{r.nom}</button>
            ))}
          </div>
        </>
      )}

      {demo && (
        <>
          <p className="section-titre">Comptes de démonstration (un clic pour remplir)</p>
          {demo.comptes.map(([nom, role, tel, code]) => (
            <button key={tel} type="button" className="choix-carte" onClick={() => { setTelephone(tel); setPin(code); setErreur(''); valider(tel, code); }}>
              <Avatar nom={nom} gerant={role.startsWith('Gérant')} />
              <span className="grandit">
                <h3>{nom}</h3>
                <span className="petit muet">{role} · {tel} · PIN {code}</span>
              </span>
              <Icone nom="droite" className="muet" />
            </button>
          ))}
          <button className="btn fantome bloc" style={{ marginTop: 10 }} onClick={s.delierAppareil}>Quitter la démo</button>
        </>
      )}

      {!s.d && (
        <p className="tres-petit muet centre" style={{ marginTop: 18 }}>
          Pas encore de compte ? <button className="lien" onClick={() => useKaisly.setState({ etapeConnexion: 'inscription' })}>Créer mon commerce</button>
        </p>
      )}
      {s.d && !demo && (
        <p className="tres-petit muet centre" style={{ marginTop: 18 }}>
          Numéro oublié ou nouveau vendeur ? Le gérant gère les comptes dans Réglages → Équipe.
        </p>
      )}
    </div>
  );
}

// Le commerce a été suspendu par l'équipe Amorac
function CommerceSuspendu() {
  const s = useKaisly();
  return (
    <div className="pin-zone">
      <ImageStockee reference={s.d.commerce.logo} className="logo-commerce" alt="" secours={<span className="emoji-grand"><Icone nom="bouclier" /></span>} />
      <h2 style={{ marginTop: 14 }}>{s.d.commerce.nom}</h2>
      <p className="alerte centre" style={{ marginTop: 16 }}>Ce compte est suspendu. Contactez l’équipe Kaisly pour le réactiver.</p>
      <a className="btn bloc" style={{ marginTop: 16 }} href={'https://wa.me/' + CONTACT_WHATSAPP} target="_blank" rel="noreferrer"><Icone nom="whatsapp" /> Contacter Kaisly</a>
      <button className="btn fantome" style={{ marginTop: 10 }} onClick={() => confirm('Déconnecter cet appareil de « ' + s.d.commerce.nom + ' » ?') && s.delierAppareil()}>Déconnecter cet appareil</button>
    </div>
  );
}

// Inscription en 3 étapes : type -> commerce -> gérant
function Inscription() {
  const s = useKaisly();
  const [etape, setEtape] = useState(1);
  const [f, setF] = useState({ type: '', nom: '', pays: paysDuNavigateur(), ville: '', telephone: '', gerantNom: '', gerantTelephone: '', gerantPin: '', gerantPin2: '' });
  const maj = (champ) => (e) => setF({ ...f, [champ]: e.target.value });

  const continuer = () => {
    if (!f.nom.trim()) return s.message('Indiquez le nom de votre commerce', 'erreur');
    if (!f.ville.trim()) return s.message('Indiquez la ville', 'erreur');
    setEtape(3);
  };
  const terminer = () => {
    if (!f.gerantNom.trim()) return s.message('Indiquez votre nom', 'erreur');
    if (!cleTelephone(f.gerantTelephone)) return s.message('Indiquez votre numéro de téléphone : il sert à vous connecter', 'erreur');
    if (telephoneDejaUtilise(f.gerantTelephone)) return s.message('Ce numéro est déjà utilisé par un compte Kaisly. Connectez-vous plutôt.', 'erreur');
    if (!/^\d{4}$/.test(f.gerantPin)) return s.message('Le code PIN doit contenir 4 chiffres', 'erreur');
    if (f.gerantPin !== f.gerantPin2) return s.message('Les deux codes PIN ne sont pas identiques', 'erreur');
    s.inscrire({ ...f, nom: f.nom.trim(), ville: f.ville.trim(), telephone: f.telephone.trim(), gerantNom: f.gerantNom.trim(), gerantTelephone: f.gerantTelephone.trim() });
  };
  const pays = paysParId(f.pays);

  return (
    <div>
      <div className="etapes">{[1, 2, 3].map((n) => <span key={n} className={etape >= n ? 'faite' : ''} />)}</div>
      {etape > 1 && (
        <button className="lien" style={{ marginTop: 14 }} onClick={() => setEtape(etape - 1)}>← Étape précédente</button>
      )}

      {etape === 1 && (
        <>
          <div className="intro"><p className="petit muet">Étape 1 sur 3</p><h1 style={{ marginTop: 4 }}>Quel est votre commerce ?</h1></div>
          {TYPES_COMMERCE.map((t) => (
            <button key={t.id} className="choix-carte" onClick={() => { setF({ ...f, type: t.id }); setEtape(2); }}>
              <span className="emoji-grand"><Icone nom={{ restaurant: 'cuisine', epicerie: 'caisse', autre: 'stock' }[t.id] || 'caisse'} /></span>
              <span className="grandit"><h3>{t.nom}</h3><span className="petit muet">{t.description}</span></span>
              <Icone nom="droite" className="muet" />
            </button>
          ))}
        </>
      )}

      {etape === 2 && (
        <form className="pile" onSubmit={(e) => { e.preventDefault(); continuer(); }}>
          <div className="intro"><p className="petit muet">Étape 2 sur 3</p><h1 style={{ marginTop: 4 }}>Votre commerce</h1></div>
          <label className="champ"><span>Nom du commerce</span><input value={f.nom} onChange={maj('nom')} placeholder="Ex : Amorac Kaisly" autoFocus /></label>
          <div className="grille-2">
            <label className="champ"><span>Pays</span>
              <select value={f.pays} onChange={maj('pays')}>
                {PAYS.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
            </label>
            <label className="champ"><span>Ville</span><input value={f.ville} onChange={maj('ville')} placeholder={pays.ville ? 'Ex : ' + pays.ville : 'Votre ville'} /></label>
          </div>
          <label className="champ"><span>Téléphone du commerce</span><input type="tel" value={f.telephone} onChange={maj('telephone')} placeholder="Facultatif (imprimé sur le ticket)" /></label>
          <p className="astuce">
            Devise : <b>{NOMS_DEVISES[pays.devise] || pays.devise}</b>. Paiements proposés : {pays.paiements.join(', ')} et crédit client.
          </p>
          <button type="submit" className="btn bloc">Continuer</button>
        </form>
      )}

      {etape === 3 && (
        <form className="pile" onSubmit={(e) => { e.preventDefault(); terminer(); }}>
          <div className="intro">
            <p className="petit muet">Étape 3 sur 3</p>
            <h1 style={{ marginTop: 4 }}>Votre compte gérant</h1>
            <p>Vous vous connecterez avec votre numéro de téléphone et votre code PIN.</p>
          </div>
          <label className="champ"><span>Votre nom et prénom</span><input value={f.gerantNom} onChange={maj('gerantNom')} placeholder="Ex : Amorac Kaisly" autoFocus /></label>
          <label className="champ"><span>Votre numéro de téléphone (identifiant de connexion)</span><input type="tel" inputMode="tel" autoComplete="tel" value={f.gerantTelephone} onChange={maj('gerantTelephone')} placeholder="Ex : 06 12 34 56 78" /></label>
          <div className="grille-2">
            <label className="champ"><span>Code PIN (4 chiffres)</span><input className="pin-saisie" type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} value={f.gerantPin} onChange={maj('gerantPin')} placeholder="••••" /></label>
            <label className="champ"><span>Confirmez le PIN</span><input className="pin-saisie" type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} value={f.gerantPin2} onChange={maj('gerantPin2')} placeholder="••••" /></label>
          </div>
          <p className="tres-petit muet">Ce code sert aussi à valider les annulations. Ne le donnez pas à vos vendeurs : chacun aura son propre numéro et son propre PIN.</p>
          <button type="submit" className="btn grand bloc">Créer mon commerce</button>
        </form>
      )}
    </div>
  );
}
