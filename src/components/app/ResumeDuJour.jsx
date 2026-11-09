'use client';
// ------------------------------------------------------------
// RÉSUMÉ DU JOUR (accueil du gérant) : l'essentiel de la journée en quelques lignes (voir lib/donnees/resume-jour.js).
// Tant qu'il n'y a pas de vente aujourd'hui, il parle d'hier. Un bouton l'envoie par WhatsApp.
// ------------------------------------------------------------
import { useMemo } from 'react';
import { useKaislo } from '@/store/kaislo';
import { resumeDuJour, resumeTexteWhatsApp } from '@/lib/donnees/resume-jour';
import { formatJourLong } from '@/lib/utils/format';
import { Icone } from '@/components/ui';
import { tr } from '@/lib/i18n';

const signe = (n) => (n >= 0 ? '+' : '') + n + ' %';
// Pastille de comparaison : verte si ça progresse, rouge si ça baisse
const Evolution = ({ valeur, libelle }) => (valeur === null ? null : (
  <span className={'badge ' + (valeur < 0 ? 'rouge' : valeur > 0 ? '' : 'gris')} style={{ marginRight: 6 }}>{signe(valeur)} {libelle}</span>
));

export default function ResumeDuJour() {
  const s = useKaislo();
  const { d } = s;
  const r = useMemo(() => resumeDuJour(d), [d.ventes, d.depenses, d.produits]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!r) return null;
  const dateLongue = formatJourLong(r.jour);
  const texte = resumeTexteWhatsApp(r, { commerce: d.commerce, prix: s.prix, dateLongue });
  return (
    <div className="carte pile" style={{ maxWidth: 720 }}>
      <div className="ligne espace">
        <h3>{r.estHier ? tr('Résumé d’hier') : tr('Résumé d’aujourd’hui')}</h3>
        <span className="tres-petit muet">{dateLongue}</span>
      </div>
      <p className="petit">
        <b>{s.prix(r.total)}</b> · {tr('{0} tickets', [r.nb])} · {tr('panier moyen {0}', [s.prix(r.panierMoyen)])}
      </p>
      {(r.vsHier !== null || r.vsSemaine !== null) && (
        <p className="petit" style={{ marginTop: -4 }}>
          <Evolution valeur={r.vsHier} libelle={r.estHier ? tr('vs la veille') : tr('vs hier')} />
          <Evolution valeur={r.vsSemaine} libelle={tr('vs même jour la semaine dernière')} />
        </p>
      )}
      <ul className="petit" style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 6, margin: 0 }}>
        {r.meilleurArticle && <li>{tr('Le plus vendu : {0} ({1})', [r.meilleurArticle.nom, r.meilleurArticle.quantite])}</li>}
        {r.heurePointe && <li>{tr('Beaucoup de monde vers {0} h ({1} tickets)', [r.heurePointe.heure, r.heurePointe.nb])}</li>}
        {r.depenses > 0 && <li>{tr('Dépenses : {0}', [s.prix(r.depenses)])}</li>}
        {r.marge !== null
          ? <li>{tr('Marge : {0} ({1} % des ventes)', [s.prix(r.marge), r.tauxMarge])}</li>
          : <li className="muet">{tr('Marge inconnue :')}{' '}<button className="lien" onClick={() => s.allerA('produits')}>{tr('ajoutez les prix d’achat')}</button></li>}
        {r.annulees.nb > 0 && <li>{tr('Ventes annulées : {0}', [r.annulees.nb])}</li>}
        {r.nbARacheter > 0 && (
          <li>
            {tr('À racheter : {0}', [r.aRacheter.map((p) => `${p.nom} (${p.reste})`).join(', ') + (r.nbARacheter > r.aRacheter.length ? '…' : '')])}{' '}
            <button className="lien" onClick={() => s.allerA('stock')}>{tr('Voir le stock')}</button>
          </li>
        )}
      </ul>
      <div className="grille-2">
        <a className="btn secondaire petit" target="_blank" rel="noreferrer" href={'https://wa.me/?text=' + encodeURIComponent(texte)}><Icone nom="whatsapp" taille="sm" /> {tr('Envoyer sur WhatsApp')}</a>
        <button className="btn secondaire petit" onClick={() => s.ouvrir('rapport', { periode: 'jour' })}><Icone nom="carnet" taille="sm" /> {tr('Rapport détaillé')}</button>
      </div>
      <button className="lien" style={{ justifySelf: 'start' }} onClick={() => s.allerA('ventes')}>{tr('Voir toutes les ventes')}</button>
    </div>
  );
}
