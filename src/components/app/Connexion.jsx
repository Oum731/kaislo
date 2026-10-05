'use client';
// ------------------------------------------------------------
// ACCUEIL DE L'APPLICATION :
//  - créer un commerce (inscription en 3 étapes)
//  - se connecter avec son NUMÉRO DE TÉLÉPHONE + CODE PIN
//  - essayer une démo
// Tous les champs fonctionnent au clavier (ordinateur ou téléphone) :
// Entrée valide, Tab passe au champ suivant.
// ------------------------------------------------------------
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useKaislo } from '@/store/kaislo';
import { COMMERCES_DEMO } from '@/lib/donnees/demo';
import { telephoneDejaUtilise } from '@/lib/donnees/stockage';
import { TYPES_COMMERCE, PAYS, paysParId, paysDuNavigateur, cleTelephone } from '@/lib/donnees/modeles';
import { symbole, NOMS_DEVISES } from '@/lib/utils/format';
import { CONTACT_WHATSAPP, chemin } from '@/config';
import { Icone, Avatar, ImageStockee, ChampTelephone, SelecteurLangueDiscret } from '@/components/ui';
import { normaliserTelephone } from '@/lib/donnees/telephone';
import { nomBiometrie } from '@/lib/biometrie';
import InstallerApp from './InstallerApp';
import Marque from '@/components/Marque';
import { tr, tt, langueActive } from '@/lib/i18n';
import { trouverPays } from '@/lib/pays-visiteur';
import { REGLES_TARIFS } from '@/lib/donnees/tarifs';

export default function Connexion() {
  const s = useKaislo();
  const e = s.etapeConnexion;
  return (
    <div className="connexion">
      <PanneauVisuel />
      <div className="connexion-panneau">
        <div className="ligne espace">
          <Link href="/" className="logo"><Marque /> {tr('Kaislo')}</Link>
          <span className="ligne" style={{ gap: 6 }}>
            {/* Choix de la langue : discret, visible dès l'accueil */}
            <SelecteurLangueDiscret langue={langueActive()} surChanger={s.changerLangue} />
            {e !== 'accueil' && (e === 'inscription' || !s.d || s.estDemoActuel()) && (
              <button className="bouton-rond" onClick={s.retourConnexion} aria-label={tr('Retour')}>
                <Icone nom="gauche" />
              </button>
            )}
          </span>
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
      <span className="logo" style={{ color: 'var(--creme)', position: 'relative' }}><Marque /> {tr('Kaislo')}</span>
      <div style={{ position: 'relative' }}>
        <h2>{tr('Vendez plus vite. Comptez moins. Gagnez plus.')}</h2>
        <p style={{ opacity: 0.75, marginTop: 14, maxWidth: 420 }}>{tr('Ventes, tickets, carnet de crédit, tables, stock et marges : tout votre commerce dans votre poche.')}</p>
      </div>
      <p className="petit" style={{ opacity: 0.6, position: 'relative' }}>{tr('Une solution Amorac')}</p>
    </div>
  );
}

function Accueil() {
  const s = useKaislo();
  const pays = paysParId(s.prefs.paysDemo || 'MA');
  return (
    <div>
      <div className="intro">
        <h1>{tr('Gérez les ventes et le stock de votre commerce, partout dans le monde.')}</h1>
        <p>{tr('Restaurants, épiceries, boutiques, bars, boulangeries : enregistrez vos ventes en quelques touches, suivez votre stock et le crédit de vos clients, et sachez chaque soir ce que vous avez gagné. Toutes les devises. Vos clients vous paient comme d’habitude : Kaislo n’encaisse jamais l’argent.')}</p>
      </div>
      <button className="btn grand bloc" onClick={() => useKaislo.setState({ etapeConnexion: 'connexion' })}>
        <Icone nom="sortie" /> {tr('Se connecter')}</button>
      <button className="btn secondaire bloc" style={{ marginTop: 10 }} onClick={() => useKaislo.setState({ etapeConnexion: 'inscription' })}>
        <Icone nom="plus" /> {tr('Créer mon commerce')}</button>
      <p className="tres-petit muet centre" style={{ marginTop: 8 }}>{tr('Essai gratuit de 30 jours · 2 minutes · sans engagement')}</p>
      <div style={{ marginTop: 16 }}><InstallerApp /></div>

      <p className="section-titre">{tr('Essayer avec un commerce d’exemple')}</p>
      <label className="champ" style={{ marginBottom: 12 }}>
        <span>{tr('Pays de la démonstration (devise, ville, moyens de paiement)')}</span>
        <select value={pays.id} onChange={(e) => s.choisirPaysDemo(e.target.value, true)}>
          {PAYS.map((p) => <option key={p.id} value={p.id}>{tt(p.nom)} · {symbole(p.devise)}</option>)}
        </select>
      </label>
      {COMMERCES_DEMO.map((c) => (
        <button key={c.id} className="choix-carte" onClick={() => s.relierAppareil(c.id)}>
          <ImageStockee reference={c.logo} className="logo-commerce" alt="" secours={<span className="emoji-grand"><Icone nom="caisse" /></span>} />
          <span className="grandit">
            <h3>{c.nom}</h3>
            <span className="petit muet">{tt(c.sousTitre)}{pays.ville ? ' · ' + pays.ville : ''}</span>
          </span>
          <span className="badge safran">{tr('Démo')}</span>
        </button>
      ))}
      <p className="tres-petit muet centre" style={{ marginTop: 24 }}>{tr('Version de démonstration · les données restent sur cet appareil')}</p>
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
        <h1>{tr('Connexion')}</h1>
        <p>{tr('Entrez votre numéro de téléphone et votre code PIN.')}</p>
      </div>

      <form className="pile" onSubmit={(e) => { e.preventDefault(); valider(); }}>
        {!demo && (
          <label className="champ"><span>{tr('Pays du numéro')}</span>
            <select value={pays} onChange={(e) => { setPays(e.target.value); setErreur(''); }}>
              {PAYS.map((p) => <option key={p.id} value={p.id}>{tt(p.nom)}</option>)}
            </select>
          </label>
        )}
        <ChampTelephone
          libelle={tr('Numéro de téléphone')} pays={pays} verifier={!demo} valeur={telephone} autoFocus={!telephone}
          surChanger={(v) => { setTelephone(v); setErreur(''); }}
          onKeyDown={(e) => e.key === 'Enter' && cleTelephone(telephone) && (e.preventDefault(), champPin.current?.focus())}
        />
        <label className="champ"><span>{tr('Code PIN (4 chiffres)')}</span>
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
        <button type="submit" className="btn grand bloc" disabled={s.connexionEnCours}>{s.connexionEnCours ? 'Connexion…' : tr('Se connecter')}</button>
      </form>

      {biometrie.length > 0 && (
        <>
          <p className="section-titre">{tr('Ou avec {0}', [nomBiometrie()])}</p>
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
          <p className="section-titre">{tr('Comptes récents sur cet appareil')}</p>
          <div className="puces" style={{ flexWrap: 'wrap' }}>
            {recents.map((r) => (
              <button key={r.telephone || r.nom} type="button" className={`puce ${cleTelephone(r.telephone) === cleTelephone(telephone) ? 'actif' : ''}`} onClick={() => choisir(r.telephone)}>{r.nom}</button>
            ))}
          </div>
        </>
      )}

      {demo && (
        <>
          <p className="section-titre">{tr('Comptes de démonstration (un clic pour remplir)')}</p>
          {demo.comptes.map(([nom, role, tel, code]) => (
            <button key={tel} type="button" className="choix-carte" onClick={() => { setTelephone(tel); setPin(code); setErreur(''); valider(tel, code); }}>
              <Avatar nom={nom} gerant={role.startsWith('Gérant')} />
              <span className="grandit">
                <h3>{nom}</h3>
                <span className="petit muet">{tr('{0} · {1} · PIN {2}', [tt(role), tel, code])}</span>
              </span>
              <Icone nom="droite" className="muet" />
            </button>
          ))}
          <button className="btn fantome bloc" style={{ marginTop: 10 }} onClick={s.delierAppareil}>{tr('Quitter la démo')}</button>
        </>
      )}

      {!s.d && (
        <p className="tres-petit muet centre" style={{ marginTop: 18 }}>{tr('Pas encore de compte ?')} <button className="lien" onClick={() => useKaislo.setState({ etapeConnexion: 'inscription' })}>{tr('Créer mon commerce')}</button>
        </p>
      )}
      {s.d && !demo && (
        <p className="tres-petit muet centre" style={{ marginTop: 18 }}>{tr('Numéro oublié ou nouveau vendeur ? Le gérant gère les comptes dans Réglages → Équipe.')}</p>
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
      <p className="alerte centre" style={{ marginTop: 16 }}>{tr('Ce compte est suspendu. Contactez l’équipe Kaislo pour le réactiver.')}</p>
      <a className="btn bloc" style={{ marginTop: 16 }} href={'https://wa.me/' + CONTACT_WHATSAPP} target="_blank" rel="noreferrer"><Icone nom="whatsapp" /> {tr('Contacter Kaislo')}</a>
      <button className="btn fantome" style={{ marginTop: 10 }} onClick={() => confirm(tr('Déconnecter cet appareil de « {0} » ?', [s.d.commerce.nom])) && s.delierAppareil()}>{tr('Déconnecter cet appareil')}</button>
    </div>
  );
}

// Inscription en 3 étapes : type -> commerce -> gérant
function Inscription() {
  const s = useKaislo();
  const [etape, setEtape] = useState(1);
  const [f, setF] = useState({ type: '', nom: '', pays: paysDuNavigateur(), ville: '', telephone: '', gerantNom: '', gerantTelephone: '', gerantPin: '', gerantPin2: '', accepte: false, codeParrain: s.prefs.codeParrain || '' });
  const paysTouche = useRef(false);
  const maj = (champ) => (e) => { if (champ === 'pays') paysTouche.current = true; setF({ ...f, [champ]: e.target.value }); };
  // Pays pré-rempli : choix déjà fait, sinon adresse IP / fuseau horaire (sauf si la personne a déjà choisi elle-même)
  useEffect(() => {
    trouverPays((p) => { if (!paysTouche.current) setF((cur) => ({ ...cur, pays: p })); });
  }, []);

  const continuer = () => {
    if (!f.nom.trim()) return s.message(tr('Indiquez le nom de votre commerce'), 'erreur');
    if (!f.ville.trim()) return s.message(tr('Indiquez la ville'), 'erreur');
    // Le numéro du commerce est obligatoire : il identifie le commerce (unique dans tout Kaislo)
    const n = normaliserTelephone(f.telephone, f.pays);
    if (!n.ok) return s.message(tr('Téléphone du commerce : {0}', [n.erreur.toLowerCase()]), 'erreur');
    setEtape(3);
  };
  const terminer = async () => {
    if (s.connexionEnCours) return;
    if (!f.gerantNom.trim()) return s.message(tr('Indiquez votre nom'), 'erreur');
    const numero = normaliserTelephone(f.gerantTelephone, f.pays);
    if (!numero.ok) return s.message(tr('Votre numéro : {0}', [numero.erreur.toLowerCase()]), 'erreur');
    if (telephoneDejaUtilise(f.gerantTelephone)) return s.message(tr('Ce numéro est déjà utilisé par un compte Kaislo. Connectez-vous plutôt.'), 'erreur');
    const numeroCommerce = normaliserTelephone(f.telephone, f.pays);
    if (!/^\d{4}$/.test(f.gerantPin)) return s.message(tr('Le code PIN doit contenir 4 chiffres'), 'erreur');
    if (f.gerantPin !== f.gerantPin2) return s.message(tr('Les deux codes PIN ne sont pas identiques'), 'erreur');
    if (!f.accepte) return s.message(tr('Merci d’accepter les conditions d’utilisation pour continuer'), 'erreur');
    // En ligne : le commerce est créé sur le serveur (le numéro y est vérifié dans tout Kaislo)
    const err = await s.inscrire({ ...f, conditionsAccepteesLe: new Date().toISOString(), nom: f.nom.trim(), ville: f.ville.trim(), telephone: numeroCommerce.affichage, gerantNom: f.gerantNom.trim(), gerantTelephone: numero.affichage });
    if (err) s.message(err, 'erreur');
  };
  const pays = paysParId(f.pays);

  return (
    <div>
      <div className="etapes">{[1, 2, 3].map((n) => <span key={n} className={etape >= n ? 'faite' : ''} />)}</div>
      {etape > 1 && (
        <button className="lien" style={{ marginTop: 14 }} onClick={() => setEtape(etape - 1)}>{tr('← Étape précédente')}</button>
      )}

      {etape === 1 && (
        <>
          <div className="intro"><p className="petit muet">{tr('Étape 1 sur 3')}</p><h1 style={{ marginTop: 4 }}>{tr('Quel est votre commerce ?')}</h1></div>
          {TYPES_COMMERCE.map((t) => (
            <button key={t.id} className="choix-carte" onClick={() => { setF({ ...f, type: t.id }); setEtape(2); }}>
              <span className="emoji-grand"><Icone nom={t.icone} /></span>
              <span className="grandit"><h3>{tt(t.nom)}</h3><span className="petit muet">{tt(t.description)}</span></span>
              <Icone nom="droite" className="muet" />
            </button>
          ))}
        </>
      )}

      {etape === 2 && (
        <form className="pile" onSubmit={(e) => { e.preventDefault(); continuer(); }}>
          <div className="intro"><p className="petit muet">{tr('Étape 2 sur 3')}</p><h1 style={{ marginTop: 4 }}>{tr('Votre commerce')}</h1></div>
          <label className="champ"><span>{tr('Nom du commerce')}</span><input value={f.nom} onChange={maj('nom')} placeholder={tr('Ex : Amorac Kaislo')} autoFocus /></label>
          <div className="grille-2">
            <label className="champ"><span>{tr('Pays')}</span>
              <select value={f.pays} onChange={maj('pays')}>
                {PAYS.map((p) => <option key={p.id} value={p.id}>{tt(p.nom)}</option>)}
              </select>
            </label>
            <label className="champ"><span>{tr('Ville')}</span><input value={f.ville} onChange={maj('ville')} placeholder={pays.ville ? tr('Ex : {0}', [pays.ville]) : tr('Votre ville')} /></label>
          </div>
          <ChampTelephone libelle={tr('Téléphone du commerce')} pays={f.pays} valeur={f.telephone} surChanger={(v) => setF({ ...f, telephone: v })}
            aide={tr('Il identifie votre commerce chez Kaislo et s’imprime sur le ticket. Ce peut être votre numéro personnel.')} />
          <p className="astuce">{tr('Devise :')} <b>{tr(NOMS_DEVISES[pays.devise] || pays.devise)}</b>{tr('. Paiements proposés : {0} et crédit client.', [pays.paiements.join(', ')])}</p>
          <button type="submit" className="btn bloc">{tr('Continuer')}</button>
        </form>
      )}

      {etape === 3 && (
        <form className="pile" onSubmit={(e) => { e.preventDefault(); terminer(); }}>
          <div className="intro">
            <p className="petit muet">{tr('Étape 3 sur 3')}</p>
            <h1 style={{ marginTop: 4 }}>{tr('Votre compte gérant')}</h1>
            <p>{tr('Vous vous connecterez avec votre numéro de téléphone et votre code PIN.')}</p>
          </div>
          <label className="champ"><span>{tr('Votre nom et prénom')}</span><input value={f.gerantNom} onChange={maj('gerantNom')} placeholder={tr('Ex : Amorac Kaislo')} autoFocus /></label>
          <ChampTelephone libelle={tr('Votre numéro de téléphone (pour vous connecter)')} pays={f.pays} valeur={f.gerantTelephone} surChanger={(v) => setF({ ...f, gerantTelephone: v })} />
          {!f.gerantTelephone && f.telephone && (
            <button type="button" className="lien tres-petit" style={{ textAlign: 'left' }} onClick={() => setF({ ...f, gerantTelephone: f.telephone })}>{tr('Utiliser le numéro du commerce')}</button>
          )}
          <div className="grille-2">
            <label className="champ"><span>{tr('Code PIN (4 chiffres)')}</span><input className="pin-saisie" type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} value={f.gerantPin} onChange={maj('gerantPin')} placeholder="••••" /></label>
            <label className="champ"><span>{tr('Confirmez le PIN')}</span><input className="pin-saisie" type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} value={f.gerantPin2} onChange={maj('gerantPin2')} placeholder="••••" /></label>
          </div>
          <p className="tres-petit muet">{tr('Ce code sert aussi à valider les annulations. Ne le donnez pas à vos vendeurs : chacun aura son propre numéro et son propre PIN.')}</p>
          {/* Code du commercial Kaislo qui vous a présenté l'application (rempli tout seul avec son lien) */}
          <label className="champ"><span>{tr('Code parrain (facultatif)')}</span>
            <input value={f.codeParrain} onChange={(e) => setF({ ...f, codeParrain: e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 12) })} placeholder={tr('Ex : AWA25')} autoCapitalize="characters" />
          </label>
          <p className="tres-petit muet">{tr('Avec un code parrain valide, vous bénéficiez d’environ {0} % de remise sur l’abonnement.', [REGLES_TARIFS.remiseParrain])}</p>
          <label className="case-accord">
            <input type="checkbox" checked={f.accepte} onChange={(e) => setF({ ...f, accepte: e.target.checked })} />
            <span>{tr('J’accepte les')} <a href={chemin('/conditions-utilisation/')} target="_blank" rel="noreferrer">{tr('conditions d’utilisation')}</a> {tr('et la')} <a href={chemin('/confidentialite/')} target="_blank" rel="noreferrer">{tr('politique de confidentialité')}</a> {tr('de Kaislo.')}</span>
          </label>
          <button type="submit" className="btn grand bloc" disabled={s.connexionEnCours}>{s.connexionEnCours ? tr('Création…') : tr('Créer mon commerce')}</button>
        </form>
      )}
    </div>
  );
}
