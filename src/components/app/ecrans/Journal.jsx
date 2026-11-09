'use client';
// ------------------------------------------------------------
// JOURNAL D'ACTIVITÉ (Réglages → Journal, gérant) : qui a fait quoi et quand.
// Les gestes à surveiller (vente annulée, remise, dépense ou article supprimé, prix changé, écart de caisse) sont marqués.
// ------------------------------------------------------------
import { useMemo, useState } from 'react';
import { useKaislo } from '@/store/kaislo';
import { journalActivite, aSurveiller } from '@/lib/donnees/journal';
import { formatDate, formatHeure } from '@/lib/utils/format';
import { Puces } from '@/components/ui';
import { tr } from '@/lib/i18n';

const PAS = 50;

export default function Journal() {
  const { d, prix } = useKaislo();
  const [periode, setPeriode] = useState('semaine');
  const [par, setPar] = useState('');
  const [type, setType] = useState('');
  const [nb, setNb] = useState(PAS);
  const j = useMemo(() => journalActivite(d, { periode, par, type }), [d, periode, par, type]);
  const libelles = {
    annulation: tr('Ventes annulées'), remise: tr('Remises'), depense: tr('Dépenses'), 'depense-supprimee': tr('Dépenses supprimées'), stock: tr('Stock'),
    caisse: tr('Caisse'), 'produit-supprime': tr('Articles supprimés'), prix: tr('Prix changés'), 'client-supprime': tr('Clients supprimés'), restauration: tr('Restaurations'),
  };
  const surveilles = j.lignes.filter(aSurveiller).length;

  const texte = (l) => {
    switch (l.type) {
      case 'annulation': return tr('Vente n° {0} annulée ({1}){2}', [l.numero, prix(l.total), l.motif ? ' · ' + l.motif : '']);
      case 'remise': return tr('Remise de {0} sur la vente n° {1} ({2})', [prix(l.remise), l.numero, prix(l.total)]);
      case 'depense': return tr('Dépense de {0}{1}', [prix(l.montant), l.note ? ' · ' + l.note : '']);
      case 'depense-supprimee': return tr('Dépense supprimée : {0}{1}', [prix(l.montant), l.note ? ' · ' + l.note : '']);
      case 'stock': return l.sens === 'entree'
        ? tr('Entrée de stock : {0} × {1}', [l.produit, l.quantite])
        : tr('Stock corrigé : {0} ({1})', [l.produit, (l.quantite > 0 ? '+' : '') + l.quantite]);
      case 'caisse': return l.etape === 'ouverture'
        ? tr('Caisse ouverte, fond de départ {0}', [prix(l.fond)])
        : l.ecart ? tr('Caisse fermée, écart de {0}', [(l.ecart > 0 ? '+' : '') + prix(l.ecart)]) : tr('Caisse fermée, compte juste');
      case 'produit-supprime': return tr('Article supprimé : {0}', [l.produit]);
      case 'prix': return tr('Prix de {0} changé : {1} → {2}', [l.produit, prix(l.avant), prix(l.apres)]);
      case 'restauration': return tr('Sauvegarde restaurée ({0} ventes, copie du {1})', [l.ventes, l.le ? formatDate(l.le) : '—']);
      case 'client-supprime': return tr('Client supprimé : {0}', [l.client]);
      default: return '';
    }
  };

  return (
    <>
      <p className="petit muet">{tr('Qui a fait quoi, et quand. Les gestes à surveiller sont marqués d’un point d’exclamation.')}</p>
      <Puces enveloppe valeur={periode} surChanger={(v) => { setPeriode(v); setNb(PAS); }}
        options={[['jour', tr('Aujourd’hui')], ['semaine', tr('7 derniers jours')], ['mois', tr('30 jours')], ['tout', tr('Tout')]]} />
      <div className="grille-2" style={{ marginTop: 10 }}>
        <label className="champ"><span>{tr('Personne')}</span>
          <select value={par} onChange={(e) => { setPar(e.target.value); setNb(PAS); }}>
            <option value="">{tr('Tout le monde')}</option>
            {j.personnes.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label className="champ"><span>{tr('Type')}</span>
          <select value={type} onChange={(e) => { setType(e.target.value); setNb(PAS); }}>
            <option value="">{tr('Tout')}</option>
            {Object.entries(libelles).map(([k, v]) => <option key={k} value={k}>{v}{j.comptes[k] ? ` (${j.comptes[k]})` : ''}</option>)}
          </select>
        </label>
      </div>
      {surveilles > 0 && <p className="petit" style={{ marginTop: 10 }}><b>{surveilles}</b> {tr('gestes à surveiller sur cette période')}</p>}
      {!j.lignes.length ? <p className="muet petit" style={{ marginTop: 14 }}>{tr('Rien à afficher pour cette période.')}</p> : (
        <div className="pile" style={{ marginTop: 10 }}>
          {j.lignes.slice(0, nb).map((l) => (
            <div key={l.id} className="carte" style={{ padding: '10px 12px' }}>
              <p style={{ overflowWrap: 'anywhere' }}>{aSurveiller(l) && <b aria-label={tr('À surveiller')} style={{ color: 'var(--rouge, #C8402F)' }}>! </b>}{texte(l)}</p>
              <p className="tres-petit muet">{formatDate(l.date)} {formatHeure(l.date)}{l.par ? ' · ' + l.par : ''}</p>
            </div>
          ))}
          {j.lignes.length > nb && <button className="btn secondaire" onClick={() => setNb(nb + PAS)}>{tr('Afficher plus')}</button>}
        </div>
      )}
    </>
  );
}
