'use client';
// ------------------------------------------------------------
// ESPACE AMORAC → RETOURS : le carnet de ce que disent les commerçants (WhatsApp, appel, visite).
//  - ce qui leur plaît, ce qui les bloque, les fonctions qu'ils demandent ;
//  - un statut par retour (reçu, prévu, fait, refusé) ;
//  - le classement des fonctions les plus demandées (nombre de commerces différents) : c'est elle qu'on construit en premier.
// ------------------------------------------------------------
import { useCallback, useEffect, useState } from 'react';
import { Feuille, Puces } from '@/components/ui';
import { formatDate } from '@/lib/utils/format';

const TYPES = { manque: 'Fonction demandée', probleme: 'Problème ou blocage', aime: 'Ce qui lui plaît', autre: 'Autre' };
const CANAUX = { whatsapp: 'WhatsApp', appel: 'Appel', visite: 'Visite', autre: 'Autre' };
const STATUTS = { recu: 'Reçu', prevu: 'Prévu', fait: 'Fait', refuse: 'Refusé' };
const CLASSE_STATUT = { recu: 'safran', prevu: 'sombre', fait: '', refuse: 'rouge' };
const VIDE = { id: '', commerceId: '', nom: '', contact: '', canal: 'whatsapp', type: 'manque', fonction: '', texte: '', statut: 'recu' };

// Feuille pour noter ou corriger un retour ; `commerces` est la liste pour choisir le commerce (vide = commerce déjà fixé)
function FeuilleRetour({ ctx, depart, commerces, surFermer, surEnregistre }) {
  const [r, setR] = useState({ ...VIDE, ...depart });
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const maj = (x) => setR((v) => ({ ...v, ...x }));
  const enregistrer = async () => {
    setEnvoi(true); setErreur(null);
    try {
      await ctx.api('POST', '/admin/retours', { ...r, action: r.id ? 'modifier' : 'creer' });
      await surEnregistre();
      surFermer();
    } catch (e) { setErreur(e.message); setEnvoi(false); }
  };
  return (
    <Feuille titre={r.id ? 'Modifier le retour' : 'Noter un retour'} surFermer={surFermer}
      pied={<button className="btn" onClick={enregistrer} disabled={envoi || r.texte.trim().length < 3}>{envoi ? 'Enregistrement…' : 'Enregistrer'}</button>}>
      <div className="pile">
        {commerces && (
          <label className="champ"><span>Commerce</span>
            <select value={r.commerceId} onChange={(e) => maj({ commerceId: e.target.value })}>
              <option value="">— Pas encore un commerce Kaislo —</option>
              {commerces.map((c) => <option key={c.id} value={c.id}>{c.commerce.nom}</option>)}
            </select>
          </label>
        )}
        {!r.commerceId && <label className="champ"><span>Nom de la personne</span><input value={r.nom} onChange={(e) => maj({ nom: e.target.value })} maxLength={120} placeholder="Ex. Paulina Ngandza" /></label>}
        <div className="grille-2">
          <label className="champ"><span>Reçu par</span><select value={r.canal} onChange={(e) => maj({ canal: e.target.value })}>{Object.entries(CANAUX).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="champ"><span>Type</span><select value={r.type} onChange={(e) => maj({ type: e.target.value })}>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        </div>
        {r.type === 'manque' && <label className="champ"><span>Fonction demandée (en quelques mots)</span><input value={r.fonction} onChange={(e) => maj({ fonction: e.target.value })} maxLength={80} placeholder="Ex. Facture PDF" /></label>}
        <label className="champ"><span>Ce que la personne a dit</span><textarea rows={4} value={r.texte} onChange={(e) => maj({ texte: e.target.value })} maxLength={2000} placeholder="Ses mots, le plus fidèlement possible" /></label>
        <div className="grille-2">
          <label className="champ"><span>Statut</span><select value={r.statut} onChange={(e) => maj({ statut: e.target.value })}>{Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="champ"><span>Contact (facultatif)</span><input value={r.contact} onChange={(e) => maj({ contact: e.target.value })} maxLength={40} /></label>
        </div>
        {erreur && <p className="alerte">{erreur}</p>}
      </div>
    </Feuille>
  );
}

function CarteRetour({ r, ctx, surModifier, surChanger, montrerCommerce }) {
  const supprimer = async () => {
    if (!window.confirm('Supprimer ce retour définitivement ?')) return;
    try { await ctx.api('POST', '/admin/retours', { action: 'supprimer', id: r.id }); await surChanger(); } catch (e) { window.alert(e.message); }
  };
  const changerStatut = async (statut) => {
    try { await ctx.api('POST', '/admin/retours', { ...r, action: 'modifier', statut }); await surChanger(); } catch (e) { window.alert(e.message); }
  };
  return (
    <div className="carte pile">
      <div className="ligne espace" style={{ flexWrap: 'wrap', gap: 8 }}>
        <b>{r.fonction || TYPES[r.type]}</b>
        <span className={`badge ${CLASSE_STATUT[r.statut]}`}>{STATUTS[r.statut]}</span>
      </div>
      <p style={{ overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>{r.texte}</p>
      <p className="tres-petit muet">
        {TYPES[r.type]} · {CANAUX[r.canal]} · {montrerCommerce ? (r.commerce || r.nom || '—') + ' · ' : ''}{formatDate(r.creeLe)}{r.creePar ? ' · noté par ' + r.creePar : ''}{r.contact ? ' · ' + r.contact : ''}
      </p>
      <div className="ligne" style={{ flexWrap: 'wrap', gap: 8 }}>
        <select className="saisie" value={r.statut} onChange={(e) => changerStatut(e.target.value)} aria-label="Statut du retour" style={{ width: 'auto' }}>
          {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn secondaire petit" onClick={() => surModifier(r)}>Modifier</button>
        {ctx.estAdmin && <button className="btn secondaire petit" onClick={supprimer}>Supprimer</button>}
      </div>
    </div>
  );
}

export function VueRetours({ ctx, commerces, EnTeteAdmin }) {
  const [donnees, setDonnees] = useState(null);
  const [filtre, setFiltre] = useState('ouverts');
  const [edition, setEdition] = useState(null);
  const [erreur, setErreur] = useState(null);
  const charger = useCallback(async () => {
    try { setDonnees(await ctx.api('GET', '/admin/retours')); setErreur(null); } catch (e) { setErreur(e.message); }
  }, [ctx]);
  useEffect(() => { charger(); }, [charger]);
  const liste = (donnees?.retours || []).filter((r) => (filtre === 'ouverts' ? r.statut === 'recu' || r.statut === 'prevu' : filtre === 'tous' || r.statut === filtre || r.type === filtre));
  const c = donnees?.comptes || {};
  return (
    <>
      <EnTeteAdmin surTitre="Ce que disent les commerçants" titre="Retours">
        <button className="btn petit" onClick={() => setEdition({})}>+ Noter un retour</button>
      </EnTeteAdmin>
      <div className="contenu pile" style={{ maxWidth: 760 }}>
        <p className="petit muet">Notez ici ce que les commerçants vous disent (WhatsApp, appel, visite) : ce qui leur plaît, ce qui les bloque, ce qui leur manque. Quand plusieurs commerces demandent la même fonction, elle monte dans le classement : c’est elle qu’il faut construire en premier.</p>
        {erreur && <p className="alerte">{erreur}</p>}
        {donnees?.classement?.length > 0 && (
          <div className="carte pile">
            <h3>Fonctions les plus demandées</h3>
            {donnees.classement.slice(0, 10).map((f, i) => (
              <div key={f.fonction} className="ligne espace" style={{ gap: 8, flexWrap: 'wrap' }}>
                <span><b>{i + 1}. {f.fonction}</b> <span className="petit muet">· {f.demandeurs} commerce{f.demandeurs > 1 ? 's' : ''} ou personne{f.demandeurs > 1 ? 's' : ''}{f.demandes > f.demandeurs ? `, ${f.demandes} demandes` : ''}</span></span>
                <span className={`badge ${CLASSE_STATUT[f.statut]}`}>{STATUTS[f.statut]}</span>
              </div>
            ))}
          </div>
        )}
        <Puces enveloppe valeur={filtre} surChanger={setFiltre}
          options={[['ouverts', `À traiter (${(c.recu || 0) + (c.prevu || 0)})`], ['fait', `Faits (${c.fait || 0})`], ['refuse', `Refusés (${c.refuse || 0})`], ['probleme', 'Problèmes'], ['aime', 'Ce qui plaît'], ['tous', 'Tous']]} />
        {!donnees ? <p className="muet petit">Chargement…</p> : !liste.length ? <p className="muet petit">Aucun retour ici pour le moment.</p>
          : liste.map((r) => <CarteRetour key={r.id} r={r} ctx={ctx} surModifier={setEdition} surChanger={charger} montrerCommerce />)}
      </div>
      {edition && <FeuilleRetour ctx={ctx} depart={edition} commerces={commerces} surFermer={() => setEdition(null)} surEnregistre={charger} />}
    </>
  );
}

// Dans la fiche d'un commerce : ses retours, et un bouton pour en noter un nouveau
export function RetoursCommerce({ c, ctx }) {
  const [liste, setListe] = useState(null);
  const [edition, setEdition] = useState(null);
  const charger = useCallback(async () => {
    try { setListe((await ctx.api('GET', '/admin/retours?commerceId=' + encodeURIComponent(c.id))).retours); } catch { setListe([]); }
  }, [ctx, c.id]);
  useEffect(() => { charger(); }, [charger]);
  return (
    <div className="carte pile">
      <div className="ligne espace" style={{ gap: 8 }}>
        <h3>Retours de ce commerce</h3>
        <button className="btn secondaire petit" onClick={() => setEdition({ commerceId: c.id })}>+ Noter</button>
      </div>
      {!liste ? <p className="muet petit">Chargement…</p> : !liste.length ? <p className="muet petit">Rien de noté pour l’instant. Après un échange (WhatsApp, appel, visite), notez ce qu’il aime, ce qui le bloque ou ce qui lui manque.</p>
        : liste.map((r) => <CarteRetour key={r.id} r={r} ctx={ctx} surModifier={setEdition} surChanger={charger} />)}
      {edition && <FeuilleRetour ctx={ctx} depart={edition} commerces={null} surFermer={() => setEdition(null)} surEnregistre={charger} />}
    </div>
  );
}
