'use client';
// ------------------------------------------------------------
// ESPACE AMORAC → COMMERCIAUX (administrateurs)
//  - liste des commerciaux : code parrain, clients, commissions (en attente, à payer, payées)
//  - fiche : ses clients avec le contrôle des 6 mois (mois payés, semaines avec des ventes),
//    validation, annulation, versement des commissions, primes par palier
//  - règles du programme : taux, durée, mois avant validation, primes
// ------------------------------------------------------------
import { useCallback, useEffect, useState } from 'react';
import { paysParId, PAYS, typeCommerce } from '@/lib/donnees/modeles';
import { formatPrix, formatDate, initiales, NOMS_DEVISES } from '@/lib/utils/format';
import { Icone, Feuille, ChampMontant, ChampTelephone } from '@/components/ui';
import { SITE_URL } from '@/config';

const MOYENS_VERSEMENT = ['Wave', 'Orange Money', 'MTN MoMo', 'Moov Money', 'Virement', 'Espèces'];
const LIBELLES = { attente: 'En attente', a_payer: 'À payer', payee: 'Payée', annulee: 'Annulée' };
const CLASSES = { attente: 'safran', a_payer: '', payee: 'gris', annulee: 'rouge' };

// Montants groupés par devise : { FCFA: 21000, MAD: 150 } -> « 21 000 FCFA · 150 DH »
export const totalDevises = (t) => Object.entries(t || {}).filter(([, m]) => m).map(([dev, m]) => formatPrix(m, dev)).join(' · ') || '—';

export default function VueCommerciaux({ ctx, EnTeteAdmin }) {
  const [donnees, setDonnees] = useState(null);
  const [edition, setEdition] = useState(null);
  const [ouvert, setOuvert] = useState(null);
  const [regles, setRegles] = useState(false);
  const charger = useCallback(async () => setDonnees(await ctx.api('GET', '/admin/commerciaux')), [ctx]);
  useEffect(() => { charger(); }, [charger]);
  if (!donnees) return <p className="muet petit" style={{ padding: 20 }}>Chargement…</p>;
  const { commerciaux, programme } = donnees;
  const total = (statut) => {
    const t = {};
    for (const c of commerciaux) for (const [dev, m] of Object.entries(c.totaux[statut] || {})) t[dev] = (t[dev] || 0) + m;
    return totalDevises(t);
  };
  return (
    <>
      <EnTeteAdmin surTitre={commerciaux.length + ' commerciaux · ' + programme.taux + ' % pendant ' + programme.dureeMois + ' mois'} titre="Commerciaux">
        <div className="ligne">
          <button className="btn secondaire" onClick={() => setRegles(true)}>Règles</button>
          <button className="btn" onClick={() => setEdition({ nom: '', telephone: '', pays: 'CI', email: '', code: '', taux: programme.taux, actif: true, notes: '', pin: '' })}><Icone nom="plus" /> Commercial</button>
        </div>
      </EnTeteAdmin>
      <div className="contenu" style={{ maxWidth: 1000 }}>
        <div className="kpis">
          <div className="carte kpi"><p className="petit muet">En attente</p><p className="kpi-valeur petit" style={{ fontSize: 17 }}>{total('attente')}</p><p className="sous">avant les {programme.moisValidation} mois</p></div>
          <div className="carte kpi"><p className="petit muet">À payer</p><p className="kpi-valeur petit vert-texte" style={{ fontSize: 17 }}>{total('a_payer')}</p><p className="sous">clients validés</p></div>
          <div className="carte kpi"><p className="petit muet">Déjà versé</p><p className="kpi-valeur petit" style={{ fontSize: 17 }}>{total('payee')}</p><p className="sous">depuis le début</p></div>
        </div>
        <p className="astuce" style={{ margin: '14px 0' }}>
          Chaque commercial touche <b>{programme.taux} %</b> de ce que paient ses clients pendant <b>{programme.dureeMois} mois</b>. Rien n’est payable avant
          la validation : <b>{programme.moisValidation} mois payés</b> et des ventes chaque semaine. Ensuite, les mois 1 à {programme.moisValidation} sont versés d’un coup, puis chaque mois.
        </p>
        <div className="liste">
          {commerciaux.map((c) => (
            <button key={c.id} className={`liste-item ${c.actif ? '' : 'inactif'}`} onClick={() => setOuvert(c.id)}>
              <span className="avatar">{initiales(c.nom)}</span>
              <span className="grandit">
                <b className="bloc-texte">{c.nom} <span className="badge">{c.code}</span>{c.actif ? '' : <span className="badge rouge" style={{ marginLeft: 6 }}>désactivé</span>}</b>
                <span className="tres-petit muet bloc-texte">{c.telephone} · {c.clients} client(s) · {c.clientsAbonnes} abonné(s) · {c.clientsValides} validé(s)</span>
              </span>
              <span style={{ textAlign: 'right' }}>
                <b className="bloc-texte petit">{totalDevises(c.totaux.a_payer)}</b>
                <span className="tres-petit muet">à payer</span>
              </span>
            </button>
          ))}
          {!commerciaux.length && <p className="muet petit" style={{ padding: 16 }}>Aucun commercial. Créez le premier avec « + Commercial » : il recevra un code parrain à donner aux commerçants.</p>}
        </div>
      </div>
      {edition && <EditionCommercial b={edition} setB={setEdition} ctx={ctx} surFin={() => { setEdition(null); charger(); }} />}
      {ouvert && <FicheCommercial id={ouvert} ctx={ctx} fermer={() => { setOuvert(null); charger(); }} modifier={(c) => { setOuvert(null); setEdition({ ...c, pin: '' }); }} />}
      {regles && <ReglesProgramme programme={programme} ctx={ctx} fermer={() => { setRegles(false); charger(); }} />}
    </>
  );
}

function EditionCommercial({ b, setB, ctx, surFin }) {
  const [erreur, setErreur] = useState('');
  const enregistrer = async () => {
    try { await ctx.api('POST', '/admin/commercial', b); surFin(); } catch (e) { setErreur(e.message); }
  };
  const maj = (c) => (e) => setB({ ...b, [c]: e.target.value });
  return (
    <Feuille titre={b.id ? b.nom : 'Nouveau commercial'} surFermer={() => setB(null)} pied={<button className="btn bloc" onClick={enregistrer}>Enregistrer</button>}>
      <div className="pile">
        <label className="champ"><span>Nom et prénom</span><input value={b.nom} onChange={maj('nom')} autoFocus /></label>
        <label className="champ"><span>Pays</span><select value={b.pays} onChange={maj('pays')}>{PAYS.filter((p) => p.indicatif).map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}</select></label>
        <ChampTelephone libelle="Téléphone (pour se connecter à son espace)" pays={b.pays} valeur={b.telephone} surChanger={(v) => setB({ ...b, telephone: v })} />
        <div className="grille-2">
          <label className="champ"><span>Code parrain</span><input value={b.code} onChange={(e) => setB({ ...b, code: e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 12) })} placeholder="Ex : AWA25" /></label>
          <label className="champ"><span>Commission (%)</span><input type="number" min="0" max="60" value={b.taux} onChange={maj('taux')} /></label>
        </div>
        <label className="champ"><span>E-mail (facultatif)</span><input type="email" value={b.email || ''} onChange={maj('email')} /></label>
        <label className="champ"><span>{b.id ? 'Nouveau code PIN (6 chiffres, laisser vide pour le garder)' : 'Code PIN de son espace (6 chiffres)'}</span>
          <input className="pin-saisie" inputMode="numeric" maxLength={6} value={b.pin} onChange={maj('pin')} placeholder="••••••" />
        </label>
        <label className="champ"><span>Notes internes</span><textarea value={b.notes || ''} onChange={maj('notes')} placeholder="Ex : contrat signé le 12/10, zone Cocody" /></label>
        {b.id && <label className="case-accord"><input type="checkbox" checked={b.actif} onChange={(e) => setB({ ...b, actif: e.target.checked })} /><span>Compte actif (le code parrain est accepté)</span></label>}
        <p className="tres-petit muet">Son espace : {SITE_URL}/commercial/ · connexion avec son numéro et son code PIN.</p>
        {erreur && <p className="alerte">{erreur}</p>}
      </div>
    </Feuille>
  );
}

function FicheCommercial({ id, ctx, fermer, modifier }) {
  const [f, setF] = useState(null);
  const [message, setMessage] = useState(null);
  const [choix, setChoix] = useState({}); // commissions cochées pour le versement
  const [moyen, setMoyen] = useState(MOYENS_VERSEMENT[0]);
  const [prime, setPrime] = useState(null); // { palier, montant, devise }
  const charger = useCallback(async () => setF(await ctx.api('GET', '/admin/commercial?id=' + encodeURIComponent(id))), [ctx, id]);
  useEffect(() => { charger(); }, [charger]);
  const action = async (corps, texte) => {
    try {
      await ctx.api('POST', '/admin/commissions', corps);
      await charger();
      setChoix({});
      setMessage({ ok: true, texte });
    } catch (e) {
      // Activité incomplète : l'équipe peut valider quand même, après confirmation
      if (corps.action === 'valider' && !corps.forcer && /semaines/.test(e.message) && confirm(e.message.replace(' : confirmez pour valider quand même', '') + '.\n\nValider quand même ?')) return action({ ...corps, forcer: true }, texte);
      setMessage({ ok: false, texte: e.message });
    }
  };
  if (!f) return <Feuille titre="Commercial" surFermer={fermer}><p className="muet">Chargement…</p></Feuille>;
  const { commercial: c, clients, primes } = f;
  const aPayer = clients.flatMap((cl) => cl.commissions.filter((m) => m.statut === 'a_payer').map((m) => ({ ...m, client: cl.nom })));
  const coches = aPayer.filter((m) => choix[m.id]);
  const totalCoche = {};
  for (const m of coches) totalCoche[m.devise] = (totalCoche[m.devise] || 0) + m.montant;
  const lien = SITE_URL + '/app/?inscription=1&ref=' + c.code;

  return (
    <Feuille titre={c.nom} sousTitre={'Code ' + c.code + ' · ' + c.taux + ' % · ' + paysParId(c.pays).nom} surFermer={fermer} pleine large
      avant={<span className="avatar">{initiales(c.nom)}</span>}>
      {message && <p className={message.ok ? 'info-verte' : 'alerte'} style={{ marginBottom: 14 }}>{message.texte}</p>}
      <div className="grille-ecran deux">
        <div className="pile">
          <div className="carte pile">
            <h3>Commercial</h3>
            <p className="petit"><b>Téléphone :</b> {c.telephone}{c.email ? ' · ' + c.email : ''}</p>
            <p className="petit"><b>Lien à partager :</b> <span className="tres-petit">{lien}</span></p>
            <p className="petit"><b>Dernière connexion :</b> {c.vuLe ? formatDate(c.vuLe) : '—'}</p>
            {c.notes && <p className="petit muet" style={{ whiteSpace: 'pre-wrap' }}>{c.notes}</p>}
            <button className="btn secondaire petit" onClick={() => modifier(c)}>Modifier</button>
          </div>
          <div className="carte">
            <h3>Commissions</h3>
            <div className="grille-3" style={{ marginTop: 10 }}>
              <div><p className="tres-petit muet">En attente</p><b className="petit">{totalDevises(c.totaux.attente)}</b></div>
              <div><p className="tres-petit muet">À payer</p><b className="petit vert-texte">{totalDevises(c.totaux.a_payer)}</b></div>
              <div><p className="tres-petit muet">Versé</p><b className="petit">{totalDevises(c.totaux.payee)}</b></div>
            </div>
          </div>
          <div className="carte pile">
            <h3>Verser des commissions</h3>
            {aPayer.map((m) => (
              <label key={m.id} className="case-accord petit">
                <input type="checkbox" checked={!!choix[m.id]} onChange={(e) => setChoix({ ...choix, [m.id]: e.target.checked })} />
                <span className="grandit">{m.client} · mois {m.rang}</span><b>{formatPrix(m.montant, m.devise)}</b>
              </label>
            ))}
            {!aPayer.length && <p className="muet petit">Rien à payer pour le moment.</p>}
            {aPayer.length > 0 && (
              <>
                <button className="lien tres-petit" style={{ textAlign: 'left' }} onClick={() => setChoix(Object.fromEntries(aPayer.map((m) => [m.id, true])))}>Tout cocher</button>
                <label className="champ"><span>Moyen de versement</span><select value={moyen} onChange={(e) => setMoyen(e.target.value)}>{MOYENS_VERSEMENT.map((x) => <option key={x}>{x}</option>)}</select></label>
                <button className="btn bloc" disabled={!coches.length} onClick={() => action({ action: 'payer', ids: coches.map((m) => m.id), moyen }, 'Versement enregistré')}>
                  <Icone nom="ok" /> Marquer comme versé {coches.length ? '(' + totalDevises(totalCoche) + ')' : ''}
                </button>
              </>
            )}
          </div>
          <div className="carte pile">
            <h3>Primes par palier</h3>
            {primes.map((p) => (
              <div key={p.clients} className="ligne espace petit">
                <span>{p.clients} clients validés · {totalDevises(p.montant) === '—' ? 'montant à définir' : totalDevises(p.montant)}</span>
                {p.payeeLe ? <span className="badge gris">versée le {formatDate(p.payeeLe)}</span>
                  : p.atteint ? <button className="btn petit" onClick={() => setPrime({ palier: p.clients, montant: Object.values(p.montant)[0] || null, devise: Object.keys(p.montant)[0] || 'FCFA' })}>Verser</button>
                  : <span className="badge safran">{c.clientsValides}/{p.clients}</span>}
              </div>
            ))}
            {prime && (
              <div className="pile">
                <div className="grille-2">
                  <label className="champ"><span>Montant</span><ChampMontant valeur={prime.montant} surChanger={(v) => setPrime({ ...prime, montant: v })} /></label>
                  <label className="champ"><span>Devise</span><select value={prime.devise} onChange={(e) => setPrime({ ...prime, devise: e.target.value })}>{Object.keys(NOMS_DEVISES).map((d) => <option key={d}>{d}</option>)}</select></label>
                </div>
                <button className="btn bloc" onClick={() => action({ action: 'prime', commercialId: c.id, palier: prime.palier, montant: Number(prime.montant), devise: prime.devise, moyen }, 'Prime versée').then(() => setPrime(null))}>Enregistrer la prime versée</button>
              </div>
            )}
          </div>
        </div>
        <div className="pile">
          <h3>Ses clients ({clients.length})</h3>
          {clients.map((cl) => <CarteClient key={cl.id} cl={cl} action={action} />)}
          {!clients.length && <p className="astuce">Aucun client pour le moment. Le commerçant saisit le code {c.code} à l’inscription, ou s’inscrit avec le lien ci-contre.</p>}
        </div>
      </div>
    </Feuille>
  );
}

// Un client du commercial : contrôle des 6 mois et commissions mois par mois
export function CarteClient({ cl, action = null }) {
  const k = cl.controle;
  return (
    <div className="carte pile">
      <div className="ligne espace">
        <b>{cl.nom}</b>
        <span className={`badge ${{ essai: 'safran', actif: '', suspendu: 'rouge' }[cl.statut] ?? 'gris'}`}>{{ essai: 'Essai', actif: 'Abonné', suspendu: 'Suspendu' }[cl.statut] || cl.statut}</span>
      </div>
      <p className="tres-petit muet">{typeCommerce(cl.type).nom} · {cl.ville} · inscrit le {formatDate(cl.inscritLe)}{cl.telephone ? ' · ' + cl.telephone : ''}</p>
      <p className="petit">
        Mois payés : <b>{k.moisPayes}/{k.moisRequis}</b> · semaines avec des ventes : <b>{k.semainesActives}/{k.semaines || '—'}</b>
        {k.valideLe ? <span className="badge" style={{ marginLeft: 6 }}>validé le {formatDate(k.valideLe)}</span> : null}
      </p>
      {cl.commissions.length > 0 && (
        <div className="ligne" style={{ flexWrap: 'wrap', gap: 4 }}>
          {cl.commissions.map((m) => <span key={m.id} className={`badge ${CLASSES[m.statut]}`} title={LIBELLES[m.statut]}>M{m.rang} · {formatPrix(m.montant, m.devise)}</span>)}
        </div>
      )}
      {action && !k.valideLe && cl.commissions.some((m) => m.statut === 'attente') && (
        <div className="grille-2">
          <button className="btn petit" disabled={k.moisPayes < k.moisRequis} onClick={() => action({ action: 'valider', commerceId: cl.id }, 'Client validé : commissions payables')}>Valider les {k.moisRequis} mois</button>
          <button className="btn danger petit" onClick={() => confirm('Le client a arrêté avant ' + k.moisRequis + ' mois ? Ses commissions en attente seront annulées.') && action({ action: 'annuler', commerceId: cl.id }, 'Commissions annulées')}>Client arrêté</button>
        </div>
      )}
    </div>
  );
}

function ReglesProgramme({ programme, ctx, fermer }) {
  const [p, setP] = useState(JSON.parse(JSON.stringify(programme)));
  const [erreur, setErreur] = useState('');
  const enregistrer = async () => {
    try { await ctx.api('POST', '/admin/programme', p); fermer(); } catch (e) { setErreur(e.message); }
  };
  const majPrime = (i, x) => setP({ ...p, primes: p.primes.map((pr, j) => (j === i ? { ...pr, ...x } : pr)) });
  return (
    <Feuille titre="Règles du programme" surFermer={fermer} pied={<button className="btn bloc" onClick={enregistrer}>Enregistrer</button>}>
      <div className="pile">
        <div className="grille-3">
          <label className="champ"><span>Commission (%)</span><input type="number" value={p.taux} onChange={(e) => setP({ ...p, taux: e.target.value })} /></label>
          <label className="champ"><span>Pendant (mois payés)</span><input type="number" value={p.dureeMois} onChange={(e) => setP({ ...p, dureeMois: e.target.value })} /></label>
          <label className="champ"><span>Validation après (mois)</span><input type="number" value={p.moisValidation} onChange={(e) => setP({ ...p, moisValidation: e.target.value })} /></label>
        </div>
        <p className="tres-petit muet">Le taux s’applique aux nouveaux commerciaux ; celui de chaque commercial se change dans sa fiche.</p>
        <p className="section-titre">Primes par palier de clients validés</p>
        {p.primes.map((pr, i) => (
          <div key={i} className="carte pile">
            <label className="champ"><span>Nombre de clients validés</span><input type="number" value={pr.clients} onChange={(e) => majPrime(i, { clients: e.target.value })} /></label>
            <div className="grille-2">
              {['MAD', 'FCFA'].map((dev) => (
                <label key={dev} className="champ"><span>Prime en {NOMS_DEVISES[dev] || dev}</span>
                  <ChampMontant valeur={pr.montant?.[dev] ?? null} surChanger={(v) => majPrime(i, { montant: { ...pr.montant, [dev]: v } })} />
                </label>
              ))}
            </div>
          </div>
        ))}
        {erreur && <p className="alerte">{erreur}</p>}
      </div>
    </Feuille>
  );
}
