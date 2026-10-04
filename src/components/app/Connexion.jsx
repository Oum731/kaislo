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
import { useKaislo } from '@/store/kaislo';
import { COMMERCES_DEMO } from '@/lib/donnees/demo';
import { telephoneDejaUtilise } from '@/lib/donnees/stockage';
import { TYPES_COMMERCE, PAYS, paysParId, paysDuNavigateur, cleTelephone } from '@/lib/donnees/modeles';
import { symbole, NOMS_DEVISES } from '@/lib/utils/format';
import { CONTACT_WHATSAPP, chemin } from '@/config';
import { Icone, Avatar, ImageStockee, ChampTelephone } from '@/components/ui';
import { normaliserTelephone } from '@/lib/donnees/telephone';
import { nomBiometrie } from '@/lib/biometrie';
import InstallerApp from './InstallerApp';
import Marque from '@/components/Marque';

export default function Connexion() {
  const s = useKaislo();
  const e = s.etapeConnexion;
  return (
    <div className="connexion">
      <PanneauVisuel />
      <div className="connexion-panneau">
        <div className="ligne espace">
          <Link href="/" className="logo"><Marque /> Kaislo</Link>
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
      <span className="logo" style={{ color: 'var(--creme)', position: 'relative' }}><Marque /> Kaislo</span>
      <div style={{ position: 'relative' }}>
        <h2>Vendez plus vite. Comptez moins. Gagnez plus.</h2>
        <p style={{ opacity: 0.75, marginTop: 14, maxWidth: 420 }}>
          Ventes, tickets, carnet de crédit, tables, stock et marges : tout votre commerce dans votre poche.
        </p>
      </div>
      <p className="petit" style={{ opacity: 0.6, position: 'relative' }}>Une solution Amorac</p>
    </div>
  );
}

function Accueil() {
  const s = useKaislo();
  const pays = paysParId(s.prefs.paysDemo || 'MA');
  return (
    <div>
      <div className="intro">
        <h1>La gestion simple de votre commerce.</h1>
        <p>Restaurants, épiceries, boutiques, partout dans le monde : enregistrez vos ventes en quelques touches, imprimez le ticket, suivez vos ventes.</p>
      </div>
      <button className="btn grand bloc" onClick={() => useKaislo.setState({ etapeConnexion: 'connexion' })}>
        <Icone nom="sortie" /> Se connecter
      </button>
      <button className="btn secondaire bloc" style={{ marginTop: 10 }} onClick={() => useKaislo.setState({ etapeConnexion: 'inscription' })}>
        <Icone nom="plus" /> Créer mon commerce
      </button>
      <p className="tres-petit muet centre" style={{ marginTop: 8 }}>Essai gratuit de 30 jours · 2 minutes · sans engagement</p>
      <div style={{ marginTop: 16 }}><InstallerApp /></div>

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
  const s = useKaislo();
  const recents = s.d ? s.comptesRecents() : [];
  const demo = s.d && COMMERCES_DEMO.find((c) => c.id === s.d.commerce.id);
  const [telephone, setTelephone] = useState(recents[0]?.telephone || '');
  // Pays du numéro (indicatif) : le dernier utilisé sur cet appareil, sinon celui du commerce ou du navigateur
  const [pays, setPays] = useState(s.prefs.paysConnexion || s.d?.commerce.pays || paysDuNavigateur());
  const [pin, setPin] = useState('');
  const [erreur, setErreur] = useState('');
  const champPin = useRef(null);
  // Comptes de cet appareil avec l'empreinte / Face ID activé (même commerce, ou tous si aucun commerce ouvert)
  const biometrie = s.comptesBiometrie().filter((b) => !s.d || b.commerceId === s.d.commerce.id);

  const valider = async (tel = telephone, code = pin) => {
    if (s.connexionEnCours) return;
    const err = await s.connecterParTelephone(tel, code, pays); // vérifié par le serveur pour un commerce en ligne
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
        {!demo && (
          <label className="champ"><span>Pays du numéro</span>
            <select value={pays} onChange={(e) => { setPays(e.target.value); setErreur(''); }}>
              {PAYS.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </select>
          </label>
        )}
        <ChampTelephone
          libelle="Numéro de téléphone" pays={pays} verifier={!demo} valeur={telephone} autoFocus={!telephone}
          surChanger={(v) => { setTelephone(v); setErreur(''); }}
          onKeyDown={(e) => e.key === 'Enter' && cleTelephone(telephone) && (e.preventDefault(), champPin.current?.focus())}
        />
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
        <button type="submit" className="btn grand bloc" disabled={s.connexionEnCours}>{s.connexionEnCours ? 'Connexion…' : 'Se connecter'}</button>
      </form>

      {biometrie.length > 0 && (
        <>
          <p className="section-titre">Ou avec {nomBiometrie()}</p>
          {biometrie.map((b) => (
            <button key={b.credentialId} type="button" className="choix-carte" disabled={s.connexionEnCours}
              onClick={async () => { setErreur(''); const err = await s.connecterParBiometrie(b); if (err) setErreur(err); }}>
              <span className="mini-emoji teinte-vert"><Icone nom="bouclier" /></span>
              <span className="grandit"><h3>{b.nom}</h3><span className="petit muet">{b.telephone}</span></span>
              <Icone nom="droite" className="muet" />
            </button>
          ))}
        </>
      )}

      {recents.length > 0 && !demo && (
        <>
          <p className="section-titre">Comptes récents sur cet appareil</p>
          <div className="puces" style={{ flexWrap: 'wrap' }}>
            {recents.map((r) => (
              <button key={r.telephone || r.nom} type="button" className={`puce ${cleTelephone(r.telephone) === cleTelephone(telephone) ? 'actif' : ''}`} onClick={() => choisir(r.telephone)}>{r.nom}</button>
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
          Pas encore de compte ? <button className="lien" onClick={() => useKaislo.setState({ etapeConnexion: 'inscription' })}>Créer mon commerce</button>
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
  const s = useKaislo();
  return (
    <div className="pin-zone">
      <ImageStockee reference={s.d.commerce.logo} className="logo-commerce" alt="" secours={<span className="emoji-grand"><Icone nom="bouclier" /></span>} />
      <h2 style={{ marginTop: 14 }}>{s.d.commerce.nom}</h2>
      <p className="alerte centre" style={{ marginTop: 16 }}>Ce compte est suspendu. Contactez l’équipe Kaislo pour le réactiver.</p>
      <a className="btn bloc" style={{ marginTop: 16 }} href={'https://wa.me/' + CONTACT_WHATSAPP} target="_blank" rel="noreferrer"><Icone nom="whatsapp" /> Contacter Kaislo</a>
      <button className="btn fantome" style={{ marginTop: 10 }} onClick={() => confirm('Déconnecter cet appareil de « ' + s.d.commerce.nom + ' » ?') && s.delierAppareil()}>Déconnecter cet appareil</button>
    </div>
  );
}

// Inscription en 3 étapes : type -> commerce -> gérant
function Inscription() {
  const s = useKaislo();
  const [etape, setEtape] = useState(1);
  const [f, setF] = useState({ type: '', nom: '', pays: paysDuNavigateur(), ville: '', telephone: '', gerantNom: '', gerantTelephone: '', gerantPin: '', gerantPin2: '', accepte: false, codeParrain: s.prefs.codeParrain || '' });
  const maj = (champ) => (e) => setF({ ...f, [champ]: e.target.value });

  const continuer = () => {
    if (!f.nom.trim()) return s.message('Indiquez le nom de votre commerce', 'erreur');
    if (!f.ville.trim()) return s.message('Indiquez la ville', 'erreur');
    // Le numéro du commerce est obligatoire : il identifie le commerce (unique dans tout Kaislo)
    const n = normaliserTelephone(f.telephone, f.pays);
    if (!n.ok) return s.message('Téléphone du commerce : ' + n.erreur.toLowerCase(), 'erreur');
    setEtape(3);
  };
  const terminer = async () => {
    if (s.connexionEnCours) return;
    if (!f.gerantNom.trim()) return s.message('Indiquez votre nom', 'erreur');
    const numero = normaliserTelephone(f.gerantTelephone, f.pays);
    if (!numero.ok) return s.message('Votre numéro : ' + numero.erreur.toLowerCase(), 'erreur');
    if (telephoneDejaUtilise(f.gerantTelephone)) return s.message('Ce numéro est déjà utilisé par un compte Kaislo. Connectez-vous plutôt.', 'erreur');
    const numeroCommerce = normaliserTelephone(f.telephone, f.pays);
    if (!/^\d{4}$/.test(f.gerantPin)) return s.message('Le code PIN doit contenir 4 chiffres', 'erreur');
    if (f.gerantPin !== f.gerantPin2) return s.message('Les deux codes PIN ne sont pas identiques', 'erreur');
    if (!f.accepte) return s.message('Merci d’accepter les conditions d’utilisation pour continuer', 'erreur');
    // En ligne : le commerce est créé sur le serveur (le numéro y est vérifié dans tout Kaislo)
    const err = await s.inscrire({ ...f, conditionsAccepteesLe: new Date().toISOString(), nom: f.nom.trim(), ville: f.ville.trim(), telephone: numeroCommerce.affichage, gerantNom: f.gerantNom.trim(), gerantTelephone: numero.affichage });
    if (err) s.message(err, 'erreur');
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
              <span className="emoji-grand"><Icone nom={t.icone} /></span>
              <span className="grandit"><h3>{t.nom}</h3><span className="petit muet">{t.description}</span></span>
              <Icone nom="droite" className="muet" />
            </button>
          ))}
        </>
      )}

      {etape === 2 && (
        <form className="pile" onSubmit={(e) => { e.preventDefault(); continuer(); }}>
          <div className="intro"><p className="petit muet">Étape 2 sur 3</p><h1 style={{ marginTop: 4 }}>Votre commerce</h1></div>
          <label className="champ"><span>Nom du commerce</span><input value={f.nom} onChange={maj('nom')} placeholder="Ex : Amorac Kaislo" autoFocus /></label>
          <div className="grille-2">
            <label className="champ"><span>Pays</span>
              <select value={f.pays} onChange={maj('pays')}>
                {PAYS.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
            </label>
            <label className="champ"><span>Ville</span><input value={f.ville} onChange={maj('ville')} placeholder={pays.ville ? 'Ex : ' + pays.ville : 'Votre ville'} /></label>
          </div>
          <ChampTelephone libelle="Téléphone du commerce" pays={f.pays} valeur={f.telephone} surChanger={(v) => setF({ ...f, telephone: v })}
            aide="Il identifie votre commerce chez Kaislo et s’imprime sur le ticket. Ce peut être votre numéro personnel." />
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
          <label className="champ"><span>Votre nom et prénom</span><input value={f.gerantNom} onChange={maj('gerantNom')} placeholder="Ex : Amorac Kaislo" autoFocus /></label>
          <ChampTelephone libelle="Votre numéro de téléphone (pour vous connecter)" pays={f.pays} valeur={f.gerantTelephone} surChanger={(v) => setF({ ...f, gerantTelephone: v })} />
          {!f.gerantTelephone && f.telephone && (
            <button type="button" className="lien tres-petit" style={{ textAlign: 'left' }} onClick={() => setF({ ...f, gerantTelephone: f.telephone })}>Utiliser le numéro du commerce</button>
          )}
          <div className="grille-2">
            <label className="champ"><span>Code PIN (4 chiffres)</span><input className="pin-saisie" type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} value={f.gerantPin} onChange={maj('gerantPin')} placeholder="••••" /></label>
            <label className="champ"><span>Confirmez le PIN</span><input className="pin-saisie" type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} value={f.gerantPin2} onChange={maj('gerantPin2')} placeholder="••••" /></label>
          </div>
          <p className="tres-petit muet">Ce code sert aussi à valider les annulations. Ne le donnez pas à vos vendeurs : chacun aura son propre numéro et son propre PIN.</p>
          {/* Code du commercial Kaislo qui vous a présenté l'application (rempli tout seul avec son lien) */}
          <label className="champ"><span>Code parrain (facultatif)</span>
            <input value={f.codeParrain} onChange={(e) => setF({ ...f, codeParrain: e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 12) })} placeholder="Ex : AWA25" autoCapitalize="characters" />
          </label>
          <label className="case-accord">
            <input type="checkbox" checked={f.accepte} onChange={(e) => setF({ ...f, accepte: e.target.checked })} />
            <span>J’accepte les <a href={chemin('/conditions-utilisation/')} target="_blank" rel="noreferrer">conditions d’utilisation</a> et la <a href={chemin('/confidentialite/')} target="_blank" rel="noreferrer">politique de confidentialité</a> de Kaislo.</span>
          </label>
          <button type="submit" className="btn grand bloc" disabled={s.connexionEnCours}>{s.connexionEnCours ? 'Création…' : 'Créer mon commerce'}</button>
        </form>
      )}
    </div>
  );
}
