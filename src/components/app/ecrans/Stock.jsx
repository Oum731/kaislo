'use client';
// ------------------------------------------------------------
// ÉCRAN STOCK ET INVENTAIRE (tous les commerces qui l'activent dans Réglages) :
//  - valeur du stock (au prix d'achat), alertes, ruptures
//  - entrée de marchandise (fournisseur, prix d'achat)
//  - inventaire (corriger la quantité réelle)
//  - historique des mouvements
// ------------------------------------------------------------
import { stockDe } from '@/lib/donnees/stock.js';
import { useState } from 'react';
import { useKaislo } from '@/store/kaislo';
import { formatDate, formatHeure, quantiteUnite } from '@/lib/utils/format';
import { Icone, Segment, ImageStockee, initiales } from '@/components/ui';
import { EnTete } from '../EnTete';
import { exporterInventaireCsv } from '@/lib/donnees/export';
import { tr } from '@/lib/i18n';

export default function Stock() {
  const s = useKaislo();
  const { d } = s;
  const [onglet, setOnglet] = useState('produits');
  const [filtre, setFiltre] = useState('tous');
  const [recherche, setRecherche] = useState('');
  const suivis = d.produits.filter((p) => p.suiviStock);
  const bas = (p) => stockDe(p) <= (p.seuilAlerte ?? 5);
  const valeur = suivis.reduce((x, p) => x + stockDe(p) * (p.prixAchat || 0), 0);
  const valeurVente = suivis.reduce((x, p) => x + stockDe(p) * p.prix, 0);
  const etat = (p) => (stockDe(p) <= 0 ? 'rupture' : bas(p) ? 'bas' : 'bon');
  const nb = { bon: suivis.filter((p) => etat(p) === 'bon').length, bas: suivis.filter((p) => etat(p) === 'bas').length, rupture: suivis.filter((p) => etat(p) === 'rupture').length };
  const r = recherche.trim().toLowerCase();
  const liste = suivis
    .filter((p) => (filtre === 'tous' || etat(p) === filtre) && (!r || p.nom.toLowerCase().includes(r) || p.codeBarre === r))
    .sort((a, b) => (bas(b) - bas(a)) || a.nom.localeCompare(b.nom));
  const mouvements = [...(d.mouvements || [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 80);

  return (
    <>
      <EnTete surTitre={tr('{0} articles suivis', [suivis.length])} titre={tr('Stock')}>
        <button className="btn secondaire cache-mobile" onClick={() => exporterInventaireCsv(d)}><Icone nom="installer" /> {tr('Exporter l’inventaire')}</button>
        <button className="btn cache-mobile" onClick={() => s.ouvrir('entreeStock')}><Icone nom="plus" /> {tr('Entrée de marchandise')}</button>
      </EnTete>
      <div className="contenu" style={{ maxWidth: 980 }}>
        <div className="stock-etats" role="group" aria-label={tr('État du stock')}>
          {[['bon', tr('Bon'), nb.bon], ['bas', tr('Bas'), nb.bas], ['rupture', tr('Rupture'), nb.rupture]].map(([cle, libelle, n]) => (
            <button key={cle} className={`${cle} ${filtre === cle ? 'on' : ''}`} onClick={() => { setOnglet('produits'); setFiltre(filtre === cle ? 'tous' : cle); }} aria-pressed={filtre === cle}>
              <span className="n">{n}</span>
              <span className="l"><i />{libelle}</span>
            </button>
          ))}
        </div>
        <div className="stock-valeur">
          <span><small>{tr('Valeur du stock')}</small><b>{s.prix(valeur)}</b></span>
          <Icone nom="droite" className="muet" />
          <span className="droite"><small>{tr('Si tout est vendu')}</small><b className="vert-texte">{s.prix(valeurVente)}</b></span>
        </div>
        <div className="grille-2 seulement-mobile" style={{ marginTop: 14 }}>
          <button className="btn secondaire" onClick={() => exporterInventaireCsv(d)}><Icone nom="installer" /> {tr('Inventaire')}</button>
          <button className="btn" onClick={() => s.ouvrir('entreeStock')}><Icone nom="plus" /> {tr('Entrée')}</button>
        </div>

        <div style={{ maxWidth: 420, margin: '18px 0 14px' }}>
          <Segment options={[['produits', tr('Articles')], ['mouvements', tr('Historique')]]} valeur={onglet} surChanger={setOnglet} />
        </div>

        {onglet === 'produits' && (
          <>
            <div className="ligne" style={{ flexWrap: 'wrap', marginBottom: 12 }}>
              <label className="recherche grandit" style={{ minWidth: 220 }}>
                <Icone nom="recherche" taille="sm" />
                <input type="search" placeholder={tr('Rechercher…')} value={recherche} onChange={(e) => setRecherche(e.target.value)} />
              </label>
            </div>
            <div className="liste">
              {liste.map((p) => {
                const e = etat(p);
                const pct = e === 'rupture' ? 0 : Math.min(100, (stockDe(p) / Math.max((p.seuilAlerte ?? 5) * 4, 1)) * 100);
                return (
                  <div key={p.id} className="liste-item stock-ligne">
                    <ImageStockee reference={p.image} className="mini-photo" alt="" secours={<span className="mini-emoji teinte-vert">{initiales(p.nom)}</span>} />
                    <span className="grandit">
                      <b className="bloc-texte tronque">{p.nom}</b>
                      <span className={`jauge-stock ${e}`} aria-hidden="true"><i style={{ width: Math.max(e === 'rupture' ? 0 : 4, pct) + '%' }} /></span>
                    </span>
                    <span className={`stock-qte ${e}`} title={e === 'rupture' ? tr('Rupture') : tr('Stock')}>{e === 'rupture' ? tr('Rupture') : quantiteUnite(stockDe(p), p.unite)}</span>
                    <button className="icone-btn" aria-label={tr('Entrée de marchandise')} title={tr('Entrée de marchandise')} onClick={() => s.ouvrir('entreeStock', { produitId: p.id })}><Icone nom="plus" taille="sm" /></button>
                    <button className="icone-btn" aria-label={tr('Inventaire (corriger)')} title={tr('Inventaire (corriger)')} onClick={() => s.ouvrir('ajustement', { produit: p })}><Icone nom="reglages" taille="sm" /></button>
                  </div>
                );
              })}
              {!liste.length && <p className="muet petit" style={{ padding: 16 }}>{tr('Aucun article ici.')}</p>}
            </div>
          </>
        )}

        {onglet === 'mouvements' && (
          <div className="liste">
            {mouvements.map((m) => (
              <div key={m.id} className="liste-item">
                <span className="grandit">
                  <b className="bloc-texte tronque">{m.produitNom}</b>
                  <span className="tres-petit muet tronque bloc-texte">
                    {formatDate(m.date)} {formatHeure(m.date)} · {m.type === 'entree' ? tr('Entrée{0}', [m.fournisseur ? ' · ' + m.fournisseur : '']) : tr('Inventaire')}{m.note ? ' · ' + m.note : ''} · {m.utilisateurNom}
                  </span>
                </span>
                <span className={m.quantite >= 0 ? 'mouvement-plus' : 'mouvement-moins'}>{m.quantite >= 0 ? '+' : ''}{m.quantite}</span>
              </div>
            ))}
            {!mouvements.length && <p className="muet petit" style={{ padding: 16 }}>{tr('Aucun mouvement pour l’instant.')}</p>}
          </div>
        )}
      </div>
    </>
  );
}
