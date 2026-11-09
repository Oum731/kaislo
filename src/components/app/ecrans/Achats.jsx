'use client';
// ------------------------------------------------------------
// ACHATS ET FOURNISSEURS (Stock → Achats, gérant) : ce qu'on doit aux fournisseurs, leurs fiches, les derniers achats.
// Voir lib/donnees/achats.js.
// ------------------------------------------------------------
import { useState } from 'react';
import { useKaislo } from '@/store/kaislo';
import { fournisseursAvecSolde, totalDu } from '@/lib/donnees/achats';
import { formatDate } from '@/lib/utils/format';
import { Icone } from '@/components/ui';
import { tr } from '@/lib/i18n';

export default function Achats() {
  const s = useKaislo();
  const { d } = s;
  const [nom, setNom] = useState('');
  const fournisseurs = fournisseursAvecSolde(d);
  const du = totalDu(d);
  const achats = [...(d.achats || [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
  const ajouter = () => {
    const e = s.enregistrerFournisseur({ nom }, (f) => s.ouvrir('fournisseur', { fournisseurId: f.id }));
    if (e) s.message(e, 'erreur'); else setNom('');
  };
  return (
    <div className="pile">
      <div className="ligne" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button className="btn" onClick={() => s.ouvrir('achat')}><Icone nom="plus" /> {tr('Nouvel achat')}</button>
        {du > 0 && <span className="badge safran">{tr('À payer aux fournisseurs : {0}', [s.prix(du)])}</span>}
      </div>
      <p className="petit muet">{tr('Notez ce que vous achetez chez vos fournisseurs : le stock augmente, le prix d’achat est mis à jour, et vous voyez ce qu’il reste à payer à chacun.')}</p>

      <p className="section-titre">{tr('Fournisseurs')}</p>
      <div className="liste">
        {fournisseurs.map((f) => (
          <button key={f.id} className="liste-item" onClick={() => s.ouvrir('fournisseur', { fournisseurId: f.id })}>
            <span className="grandit" style={{ textAlign: 'left' }}>
              <b className="bloc-texte tronque">{f.nom}</b>
              <span className="tres-petit muet tronque bloc-texte">{f.nbAchats ? tr('{0} achat(s) · {1}', [f.nbAchats, s.prix(f.totalAchete)]) : tr('Aucun achat')}{f.dernierAchat ? ' · ' + tr('dernier le {0}', [formatDate(f.dernierAchat)]) : ''}</span>
            </span>
            {f.solde > 0 ? <b className="chiffre" style={{ color: 'var(--rouge, #C8402F)' }}>{s.prix(f.solde)}</b> : <span className="tres-petit muet">{tr('à jour')}</span>}
          </button>
        ))}
        {!fournisseurs.length && <p className="muet petit" style={{ padding: 16 }}>{tr('Aucun fournisseur pour l’instant.')}</p>}
      </div>
      <div className="ligne">
        <input className="saisie grandit" value={nom} onChange={(e) => setNom(e.target.value)} maxLength={80} placeholder={tr('Nom d’un nouveau fournisseur')} onKeyDown={(e) => e.key === 'Enter' && nom.trim() && ajouter()} />
        <button className="btn secondaire" onClick={ajouter} disabled={!nom.trim()}>{tr('Ajouter')}</button>
      </div>

      <p className="section-titre">{tr('Derniers achats')}</p>
      <div className="liste">
        {achats.map((a) => (
          <button key={a.id} className="liste-item" onClick={() => s.ouvrir('fournisseur', { fournisseurId: a.fournisseurId })}>
            <span className="grandit" style={{ textAlign: 'left' }}>
              <b className="bloc-texte tronque">{a.fournisseurNom}</b>
              <span className="tres-petit muet tronque bloc-texte">{formatDate(a.date)} · {a.lignes.map((l) => l.quantite + ' × ' + l.produitNom).join(', ')}</span>
            </span>
            <span style={{ textAlign: 'right' }}><b className="chiffre">{s.prix(a.total)}</b>{a.total > a.paye && <span className="tres-petit bloc-texte" style={{ color: 'var(--rouge, #C8402F)' }}>{tr('reste {0}', [s.prix(a.total - a.paye)])}</span>}</span>
          </button>
        ))}
        {!achats.length && <p className="muet petit" style={{ padding: 16 }}>{tr('Aucun achat pour l’instant.')}</p>}
      </div>
    </div>
  );
}
