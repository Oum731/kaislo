'use client';
// ------------------------------------------------------------
// ÉCRAN STOCK ET INVENTAIRE (tous les commerces qui l'activent dans Réglages) :
//  - valeur du stock (au prix d'achat), alertes, ruptures
//  - entrée de marchandise (fournisseur, prix d'achat)
//  - inventaire (corriger la quantité réelle)
//  - historique des mouvements
// ------------------------------------------------------------
import { useState } from 'react';
import { useKaisly } from '@/store/kaisly';
import { formatDate, formatHeure } from '@/lib/utils/format';
import { Icone, Puces, Segment, initiales } from '@/components/ui';
import { EnTete } from '../EnTete';
import { exporterInventaireCsv } from '@/lib/donnees/export';

export default function Stock() {
  const s = useKaisly();
  const { d } = s;
  const [onglet, setOnglet] = useState('produits');
  const [filtre, setFiltre] = useState('tous');
  const [recherche, setRecherche] = useState('');
  const suivis = d.produits.filter((p) => p.suiviStock);
  const bas = (p) => p.stock <= (p.seuilAlerte ?? 5);
  const valeur = suivis.reduce((x, p) => x + p.stock * (p.prixAchat || 0), 0);
  const valeurVente = suivis.reduce((x, p) => x + p.stock * p.prix, 0);
  const r = recherche.trim().toLowerCase();
  const liste = suivis
    .filter((p) => (filtre === 'tous' || (filtre === 'bas' ? bas(p) && p.stock > 0 : p.stock <= 0)) && (!r || p.nom.toLowerCase().includes(r) || p.codeBarre === r))
    .sort((a, b) => (bas(b) - bas(a)) || a.nom.localeCompare(b.nom));
  const mouvements = [...(d.mouvements || [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 80);

  return (
    <>
      <EnTete surTitre={`${suivis.length} articles suivis`} titre="Stock">
        <button className="btn secondaire cache-mobile" onClick={() => exporterInventaireCsv(d)}><Icone nom="installer" /> Exporter l’inventaire</button>
        <button className="btn cache-mobile" onClick={() => s.ouvrir('entreeStock')}><Icone nom="plus" /> Entrée de marchandise</button>
      </EnTete>
      <div className="contenu" style={{ maxWidth: 980 }}>
        <div className="kpis">
          <div className="carte kpi"><p className="petit muet">Valeur du stock</p><p className="kpi-valeur">{s.prix(valeur)}</p><p className="sous">au prix d’achat</p></div>
          <div className="carte kpi"><p className="petit muet">Valeur à la vente</p><p className="kpi-valeur vert-texte">{s.prix(valeurVente)}</p><p className="sous">bénéfice possible {s.prix(valeurVente - valeur)}</p></div>
          <div className="carte kpi"><p className="petit muet">Alertes</p><p className="kpi-valeur rouge-texte">{suivis.filter(bas).length}</p><p className="sous">{suivis.filter((p) => p.stock <= 0).length} en rupture</p></div>
        </div>
        <div className="grille-2 seulement-mobile" style={{ marginTop: 14 }}>
          <button className="btn secondaire" onClick={() => exporterInventaireCsv(d)}><Icone nom="installer" /> Inventaire</button>
          <button className="btn" onClick={() => s.ouvrir('entreeStock')}><Icone nom="plus" /> Entrée</button>
        </div>

        <div style={{ maxWidth: 420, margin: '18px 0 14px' }}>
          <Segment options={[['produits', 'Articles'], ['mouvements', 'Historique']]} valeur={onglet} surChanger={setOnglet} />
        </div>

        {onglet === 'produits' && (
          <>
            <div className="ligne" style={{ flexWrap: 'wrap', marginBottom: 12 }}>
              <label className="recherche grandit" style={{ minWidth: 220 }}>
                <Icone nom="recherche" taille="sm" />
                <input type="search" placeholder="Rechercher…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
              </label>
              <Puces options={[['tous', 'Tous'], ['bas', 'Stock bas'], ['rupture', 'Rupture']]} valeur={filtre} surChanger={setFiltre} />
            </div>
            <div className="liste">
              {liste.map((p) => (
                <div key={p.id} className="liste-item">
                  <span className="mini-emoji teinte-vert">{initiales(p.nom)}</span>
                  <span className="grandit">
                    <b className="bloc-texte tronque">{p.nom}</b>
                    <span className="tres-petit muet">Alerte à {p.seuilAlerte ?? 5} · achat {p.prixAchat ? s.prix(p.prixAchat) : '—'}</span>
                  </span>
                  <span className={`badge ${p.stock <= 0 ? 'rouge' : bas(p) ? 'safran' : 'gris'}`} style={{ minWidth: 48, justifyContent: 'center' }}>{p.stock}</span>
                  <button className="icone-btn" title="Entrée de marchandise" onClick={() => s.ouvrir('entreeStock', { produitId: p.id })}><Icone nom="plus" taille="sm" /></button>
                  <button className="icone-btn" title="Inventaire (corriger)" onClick={() => s.ouvrir('ajustement', { produit: p })}><Icone nom="reglages" taille="sm" /></button>
                </div>
              ))}
              {!liste.length && <p className="muet petit" style={{ padding: 16 }}>Aucun article ici.</p>}
            </div>
            <p className="tres-petit muet" style={{ marginTop: 14 }}>
              <b>+</b> : marchandise reçue · <b>réglage</b> : inventaire (vous comptez et corrigez la quantité). Pour suivre le stock d’un autre article, activez « Suivre le stock » dans sa fiche produit.
            </p>
          </>
        )}

        {onglet === 'mouvements' && (
          <div className="liste">
            {mouvements.map((m) => (
              <div key={m.id} className="liste-item">
                <span className="grandit">
                  <b className="bloc-texte tronque">{m.produitNom}</b>
                  <span className="tres-petit muet tronque bloc-texte">
                    {formatDate(m.date)} {formatHeure(m.date)} · {m.type === 'entree' ? 'Entrée' + (m.fournisseur ? ' · ' + m.fournisseur : '') : 'Inventaire'}{m.note ? ' · ' + m.note : ''} · {m.utilisateurNom}
                  </span>
                </span>
                <span className={m.quantite >= 0 ? 'mouvement-plus' : 'mouvement-moins'}>{m.quantite >= 0 ? '+' : ''}{m.quantite}</span>
              </div>
            ))}
            {!mouvements.length && <p className="muet petit" style={{ padding: 16 }}>Aucun mouvement pour l’instant.</p>}
          </div>
        )}
      </div>
    </>
  );
}
