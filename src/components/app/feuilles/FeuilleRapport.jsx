'use client';
// ------------------------------------------------------------
// Rapport d'activité : jour, semaine, mois ou année, en Excel (.xlsx) et en PDF.
// Les chiffres viennent de construireRapport() : les mêmes que le tableau de bord et la fermeture de la journée.
// Les générateurs de fichiers (exceljs, jsPDF) ne sont chargés qu'au clic.
// ------------------------------------------------------------
import { useMemo, useState } from 'react';
import { useKaislo } from '@/store/kaislo';
import { Feuille, Segment, Icone } from '@/components/ui';
import { construireRapport } from '@/lib/donnees/rapport';
import { livrerFichier, MIME_XLSX, MIME_PDF } from '@/lib/export/livrer';
import { tr } from '@/lib/i18n';

const deux = (n) => String(n).padStart(2, '0');
const valeurChamp = (type, d) => (type === 'mois' ? `${d.getFullYear()}-${deux(d.getMonth() + 1)}` : `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`);

// Décale la date de référence d'une période (n = -1 précédente, +1 suivante)
function decaler(type, ref, n) {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 12);
  if (type === 'jour') d.setDate(d.getDate() + n);
  else if (type === 'semaine') d.setDate(d.getDate() + 7 * n);
  else if (type === 'mois') { d.setDate(1); d.setMonth(d.getMonth() + n); }
  else { d.setDate(1); d.setFullYear(d.getFullYear() + n); }
  return d;
}

const nomFichier = (rapport, ext) => {
  const commerce = rapport.meta.commerce.nom.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'commerce';
  return `kaislo-rapport-${rapport.meta.type}-${commerce}-${rapport.meta.fichier}.${ext}`;
};

export function FeuilleRapport({ periode = 'jour' }) {
  const s = useKaislo();
  const d = s.d;
  const [type, setType] = useState(periode);
  const [ref, setRef] = useState(() => new Date());
  const [occupe, setOccupe] = useState(null); // 'xlsx' | 'pdf'
  const [message, setMessage] = useState(null);
  const rapport = useMemo(() => construireRapport(d, type, ref), [d, type, ref]);
  const val = (cle) => rapport.resume.find((r) => r.cle === cle)?.valeur ?? 0;
  const futur = rapport.meta.debut > new Date();

  const changerChamp = (e) => {
    const v = e.target.value;
    if (!v) return;
    const [a, m = '1', j = '1'] = v.split('-').map(Number);
    if (a >= 2000 && a < 2100) setRef(new Date(a, m - 1, j, 12));
  };

  async function creer(format) {
    setOccupe(format);
    setMessage(null);
    try {
      let octets;
      if (format === 'xlsx') octets = await (await import('@/lib/export/rapport-excel')).octetsExcel(rapport);
      else octets = await (await import('@/lib/export/rapport-pdf')).octetsPdf(rapport);
      const r = await livrerFichier(octets, nomFichier(rapport, format), format === 'xlsx' ? MIME_XLSX : MIME_PDF);
      if (r !== 'annule') setMessage({ ok: true, texte: r === 'partage' ? tr('Fichier prêt : choisissez où l’envoyer ou l’enregistrer.') : tr('Fichier téléchargé.') });
    } catch (e) {
      console.error(e);
      setMessage({ ok: false, texte: tr('Le fichier n’a pas pu être créé. Réessayez.') });
    } finally {
      setOccupe(null);
    }
  }

  return (
    <Feuille titre={tr('Rapport d’activité')} sousTitre={tr('Excel et PDF, prêts pour votre comptable')} surFermer={s.fermer}
      pied={
        <div className="grille-2">
          <button className="btn grand" disabled={!!occupe || rapport.meta.vide} onClick={() => creer('xlsx')}>
            <Icone nom="carnet" /> {occupe === 'xlsx' ? tr('Création…') : tr('Excel (.xlsx)')}
          </button>
          <button className="btn grand secondaire" disabled={!!occupe || rapport.meta.vide} onClick={() => creer('pdf')}>
            <Icone nom="carnet" /> {occupe === 'pdf' ? tr('Création…') : tr('PDF')}
          </button>
        </div>
      }>
      <div className="pile">
        <Segment options={[['jour', tr('Jour')], ['semaine', tr('Semaine')], ['mois', tr('Mois')], ['annee', tr('Année')]]} valeur={type} surChanger={(t) => { setType(t); setMessage(null); }} />
        <div className="ligne espace" style={{ gap: 8 }}>
          <button className="btn secondaire" aria-label={tr('Période précédente')} onClick={() => setRef(decaler(type, ref, -1))}><Icone nom="gauche" /></button>
          {type === 'annee' ? (
            <input className="champ" type="number" min="2000" max="2099" value={ref.getFullYear()} onChange={(e) => { const a = Number(e.target.value); if (a >= 2000 && a < 2100) setRef(new Date(a, 0, 1, 12)); }} style={{ textAlign: 'center' }} />
          ) : (
            <input className="champ" type={type === 'mois' ? 'month' : 'date'} value={valeurChamp(type, ref)} onChange={changerChamp} style={{ textAlign: 'center' }} />
          )}
          <button className="btn secondaire" aria-label={tr('Période suivante')} onClick={() => setRef(decaler(type, ref, 1))}><Icone nom="droite" /></button>
        </div>
        <div className="ligne espace">
          <b>{rapport.meta.titre}</b>
          <button className="btn secondaire" onClick={() => setRef(new Date())}>{tr('Aujourd’hui')}</button>
        </div>

        {rapport.meta.vide ? (
          <p className="astuce">{futur ? tr('Cette période n’a pas encore commencé.') : tr('Aucune vente ni dépense sur cette période.')}</p>
        ) : (
          <div className="carte pile">
            <div className="ligne espace"><span>{tr('Chiffre d’affaires')}</span><b className="chiffre">{s.prix(val('ca'))}</b></div>
            <div className="ligne espace"><span>{tr('Nombre de tickets')}</span><b>{val('tickets')}</b></div>
            <div className="ligne espace"><span>{tr('Dépenses')}</span><b>{s.prix(val('depenses'))}</b></div>
            <div className="ligne espace"><b>{tr('Solde (ventes − dépenses)')}</b><b className="chiffre">{s.prix(val('solde'))}</b></div>
            {val('annulees') > 0 && <p className="tres-petit muet">{tr('{0} vente(s) annulée(s) : listées dans le fichier, non comptées.', [val('annulees')])}</p>}
          </div>
        )}
        <p className="tres-petit muet">{tr('Le fichier Excel contient un onglet par tableau : ventes, articles, paiements, dépenses, crédits, stock. Les montants sont de vrais nombres : vous pouvez trier, filtrer et calculer.')}</p>
        {message && <p className="astuce" role="status">{message.texte}</p>}
      </div>
    </Feuille>
  );
}
