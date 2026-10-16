'use client';
// ------------------------------------------------------------
// ÉCRAN TABLES (restaurant) : libres / occupées, montant en cours,
// depuis combien de temps. Toucher une table ouvre sa commande.
// ------------------------------------------------------------
import { useEffect, useState } from 'react';
import { useKaislo } from '@/store/kaislo';
import { sousTotal } from '@/lib/donnees/vente';
import { EnTete } from '../EnTete';
import { Icone } from '@/components/ui';
import { RappelRestauration } from '../AvisRestauration';
import { tr } from '@/lib/i18n';

const nbArticles = (c) => c.lignes.reduce((x, l) => x + l.quantite, 0);

export default function Tables() {
  const s = useKaislo();
  const { d } = s;
  // Rafraîchit les durées chaque minute
  const [, setMaintenant] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setMaintenant(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const occupees = (d.commandes || []).filter((c) => c.lignes.length);
  const totalEnCours = occupees.reduce((x, c) => x + sousTotal(c.lignes, s.devise()), 0);

  const libres = d.commerce.tables.length - occupees.length;

  return (
    <>
      <EnTete surTitre={d.commerce.nom} titre={tr('Tables')} />
      <div className="contenu">
        <RappelRestauration pays={d.commerce.pays} type={d.commerce.type} />
        <div className="legende-tables">
          <span><i className="pt occupee" />{tr('{0} occupées', [occupees.length])}</span>
          <span><i className="pt" />{tr('{0} libres', [Math.max(0, libres)])}</span>
          {totalEnCours > 0 && <span className="total">{s.prix(totalEnCours)}</span>}
        </div>
        <div className="grille-tables">
          {d.commerce.tables.map((table) => {
            const c = (d.commandes || []).find((x) => x.table === table && x.lignes.length);
            const minutes = c ? Math.floor((Date.now() - new Date(c.ouverteLe)) / 60000) : 0;
            const longue = c && minutes >= 45;
            return (
              <button key={table} className={`table-carte ${c ? 'occupee' : 'libre'} ${longue ? 'longue' : ''}`} onClick={() => s.ouvrirTable(table)} aria-label={c ? tr('{0}, occupée, {1}', [table, s.prix(sousTotal(c.lignes, s.devise()))]) : tr('{0}, libre', [table])}>
                <span className="nom">{table}</span>
                {c ? (
                  <>
                    <span className="montant">{s.prix(sousTotal(c.lignes, s.devise()))}</span>
                    <span className="puces-table">
                      <span className={longue ? 'long' : ''}><Icone nom="horloge" taille="sm" />{minutes < 1 ? tr('maintenant') : minutes + ' min'}</span>
                      <span>{nbArticles(c)} × <Icone nom="cuisine" taille="sm" /></span>
                    </span>
                  </>
                ) : (
                  <span className="plus-table" aria-hidden="true"><Icone nom="plus" /></span>
                )}
              </button>
            );
          })}
        </div>
        {!d.commerce.tables.length && (
          <p className="astuce">{tr('Aucune table configurée. Le gérant peut en ajouter dans Réglages → Tables.')}</p>
        )}
      </div>
    </>
  );
}
